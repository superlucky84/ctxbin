import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createWriteStream } from "node:fs";
import { SKILLREF_HEADER, MAX_SKILLREF_DOWNLOAD_BYTES, MAX_SKILLREF_EXTRACT_BYTES, MAX_SKILLREF_FILES, SKILLREF_CONNECT_TIMEOUT_MS, SKILLREF_DOWNLOAD_TIMEOUT_MS } from "./constants";
import { fail, CtxbinError } from "./errors";
import { normalizeGithubUrl, normalizeSkillPath, validateCommitSha, assertSafeTarPath } from "./validators";
import { listTarEntries, TarEntryInfo } from "./tar-utils";
import tar from "tar";
import { ensureDir, copyDirContents } from "./fs-ops";
import { applyNormalizedPermissions } from "./perm";

const ALLOWED_TYPES = new Set(["File", "Directory"]);

export interface Skillref {
  url: string;
  path: string;
  ref?: string;
  track?: "default";
}

export function createSkillrefValue(url: string, skillPath: string, ref?: string): string {
  const normalizedUrl = normalizeGithubUrl(url);
  const normalizedPath = normalizeSkillPath(skillPath);
  const payload = ref
    ? JSON.stringify({ url: normalizedUrl, path: normalizedPath, ref: validateCommitSha(ref) })
    : JSON.stringify({ url: normalizedUrl, path: normalizedPath, track: "default" });
  return SKILLREF_HEADER + payload;
}

export function parseSkillrefValue(value: string): Skillref {
  if (!value.startsWith(SKILLREF_HEADER)) {
    return fail("TYPE_MISMATCH", "value is not a skillref");
  }
  const raw = value.slice(SKILLREF_HEADER.length);
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail("IO", "invalid skillref payload JSON");
  }
  if (!parsed || typeof parsed.url !== "string" || typeof parsed.path !== "string") {
    return fail("IO", "invalid skillref payload fields");
  }
  const normalized = {
    url: normalizeGithubUrl(parsed.url),
    path: normalizeSkillPath(parsed.path),
  } satisfies Pick<Skillref, "url" | "path">;

  if (typeof parsed.ref === "string") {
    return { ...normalized, ref: validateCommitSha(parsed.ref) };
  }

  if (parsed.track === "default") {
    return { ...normalized, track: "default" };
  }

  return fail("IO", "invalid skillref payload fields");
}

export async function loadSkillrefToDir(value: string, targetDir: string): Promise<void> {
  const skillref = parseSkillrefValue(value);
  const resolvedRef = skillref.ref ?? (await fetchDefaultBranch(skillref.url));
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ctxbin-skillref-"));
  const tarPath = path.join(tmpRoot, "skillref.tar.gz");

  try {
    await downloadArchive(skillref.url, resolvedRef, tarPath);

    const entries = await listTarEntries(tarPath).catch(() => fail("IO", "failed to parse tar archive"));
    const analysis = analyzeEntries(entries, skillref.path);

    const extractDir = path.join(tmpRoot, "extract");
    await ensureDir(extractDir);

    const stripCount = 1 + skillref.path.split("/").length;
    await tar.x({
      file: tarPath,
      cwd: extractDir,
      preserveOwner: false,
      noMtime: true,
      strip: stripCount,
      filter: (p, entry) => {
        const entryPath = entry?.path ?? p;
        return isUnderPath(entryPath, analysis.prefix, skillref.path);
      },
    });

    await applyNormalizedPermissions(extractDir, analysis.execSet);
    await ensureDir(targetDir);
    await copyDirContents(extractDir, targetDir);
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
}

async function downloadArchive(repoUrl: string, ref: string, outPath: string): Promise<void> {
  const { owner, repo } = splitGithubUrl(repoUrl);
  const url = `https://codeload.github.com/${owner}/${repo}/tar.gz/${ref}`;
  const controller = new AbortController();
  const totalTimer = setTimeout(() => controller.abort(), SKILLREF_DOWNLOAD_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetchWithRedirect(url, 1, controller, ["github.com", "codeload.github.com"]);
  } catch (err) {
    clearTimeout(totalTimer);
    return fail("NETWORK", `download failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!res.ok) {
    clearTimeout(totalTimer);
    const text = await res.text();
    return fail("NETWORK", `download failed (${res.status}): ${text}`);
  }
  if (!res.body) {
    clearTimeout(totalTimer);
    return fail("NETWORK", "download failed: empty response body");
  }

  const fileStream = createWriteStream(outPath);
  let total = 0;
  let magic = Buffer.alloc(0);

  try {
    for await (const chunk of res.body as AsyncIterable<Buffer>) {
      if (magic.length < 2) {
        const needed = 2 - magic.length;
        magic = Buffer.concat([magic, chunk.subarray(0, needed)]);
        if (magic.length === 2) {
          if (magic[0] !== 0x1f || magic[1] !== 0x8b) {
            fileStream.close();
            controller.abort();
            return fail("IO", "downloaded file is not gzip data");
          }
        }
      }

      total += chunk.length;
      if (total > MAX_SKILLREF_DOWNLOAD_BYTES) {
        fileStream.close();
        controller.abort();
        return fail(
          "SIZE_LIMIT",
          `downloaded archive size ${total} exceeds ${MAX_SKILLREF_DOWNLOAD_BYTES} bytes`
        );
      }

      fileStream.write(chunk);
    }
  } catch (err) {
    fileStream.close();
    clearTimeout(totalTimer);
    if (err instanceof CtxbinError) {
      throw err;
    }
    return fail("NETWORK", `download failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(totalTimer);
  }

  if (magic.length < 2) {
    fileStream.close();
    return fail("IO", "downloaded file is incomplete");
  }

  await new Promise<void>((resolve, reject) => {
    fileStream.end(() => resolve());
    fileStream.on("error", reject);
  });
}

async function fetchWithRedirect(
  url: string,
  redirectsLeft: number,
  controller: AbortController,
  allowedHosts: string[],
  init?: RequestInit
): Promise<Response> {
  const connectTimer = setTimeout(() => controller.abort(), SKILLREF_CONNECT_TIMEOUT_MS);

  const res = await fetch(url, {
    ...init,
    signal: controller.signal,
    redirect: "manual",
  });

  clearTimeout(connectTimer);

  if (isRedirect(res.status)) {
    if (redirectsLeft <= 0) {
      return fail("NETWORK", "too many redirects");
    }
    const location = res.headers.get("location");
    if (!location) {
      return fail("NETWORK", "redirect without location header");
    }
    const nextUrl = new URL(location, url).toString();
    const host = new URL(nextUrl).hostname;
    if (!allowedHosts.includes(host)) {
      return fail("NETWORK", `redirected to unsupported host: ${host}`);
    }
    return fetchWithRedirect(nextUrl, redirectsLeft - 1, controller, allowedHosts, init);
  }

  return res;
}

function isRedirect(status: number): boolean {
  return [301, 302, 303, 307, 308].includes(status);
}

function splitGithubUrl(repoUrl: string): { owner: string; repo: string } {
  const url = new URL(repoUrl);
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 2) {
    return fail("INVALID_URL", "URL must be https://github.com/<owner>/<repo>");
  }
  return { owner: parts[0], repo: parts[1] };
}

async function fetchDefaultBranch(repoUrl: string): Promise<string> {
  const { owner, repo } = splitGithubUrl(repoUrl);
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const controller = new AbortController();
  const totalTimer = setTimeout(() => controller.abort(), SKILLREF_DOWNLOAD_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetchWithRedirect(url, 1, controller, ["github.com", "api.github.com"], {
      headers: {
        "User-Agent": "ctxbin",
        Accept: "application/vnd.github+json",
      },
    });
  } catch (err) {
    clearTimeout(totalTimer);
    return fail("NETWORK", `default branch lookup failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!res.ok) {
    clearTimeout(totalTimer);
    const text = await res.text();
    return fail("NETWORK", `default branch lookup failed (${res.status}): ${text}`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    clearTimeout(totalTimer);
    return fail("NETWORK", "default branch lookup returned invalid JSON");
  }

  clearTimeout(totalTimer);
  if (!data || typeof data.default_branch !== "string" || data.default_branch.length === 0) {
    return fail("NETWORK", "default branch lookup returned no default_branch");
  }
  return data.default_branch;
}

function analyzeEntries(entries: TarEntryInfo[], requestedPath: string): {
  prefix: string;
  execSet: Set<string>;
} {
  if (entries.length === 0) {
    return fail("NOT_FOUND", "archive contained no entries");
  }

  const prefix = entries[0].path.split("/")[0];
  if (!prefix) {
    return fail("IO", "unable to determine archive prefix");
  }

  const execSet = new Set<string>();
  let entryCount = 0;
  let totalSize = 0;
  let matched = false;

  for (const entry of entries) {
    assertSafeTarPath(entry.path);
    if (!ALLOWED_TYPES.has(entry.type)) {
      return fail("IO", `unsupported entry type in archive: ${entry.path}`);
    }

    if (entry.path === prefix) {
      continue;
    }
    if (!entry.path.startsWith(`${prefix}/`)) {
      return fail("IO", "archive has unexpected top-level layout");
    }

    const rel = entry.path.slice(prefix.length + 1);
    if (!rel) {
      continue;
    }

    const relToReq = stripRequestedPath(rel, requestedPath);
    if (relToReq === null) {
      continue;
    }

    matched = true;
    entryCount += 1;
    if (rel === requestedPath && entry.type === "File") {
      return fail("INVALID_PATH", "requested path is not a directory");
    }
    if (entry.type === "File") {
      totalSize += entry.size ?? 0;
      if (entry.mode & 0o111) {
        execSet.add(relToReq);
      }
    }
  }

  if (!matched) {
    return fail("NOT_FOUND", "requested path not found in archive");
  }
  if (entryCount > MAX_SKILLREF_FILES) {
    return fail("SIZE_LIMIT", `extracted entry count ${entryCount} exceeds ${MAX_SKILLREF_FILES}`);
  }
  if (totalSize > MAX_SKILLREF_EXTRACT_BYTES) {
    return fail("SIZE_LIMIT", `extracted size ${totalSize} exceeds ${MAX_SKILLREF_EXTRACT_BYTES}`);
  }

  return { prefix, execSet };
}

function stripRequestedPath(rel: string, requestedPath: string): string | null {
  if (rel === requestedPath) {
    return "";
  }
  const prefix = requestedPath + "/";
  if (rel.startsWith(prefix)) {
    return rel.slice(prefix.length);
  }
  return null;
}

function isUnderPath(entryPath: string, prefix: string, requestedPath: string): boolean {
  if (entryPath === prefix) {
    return false;
  }
  if (!entryPath.startsWith(`${prefix}/`)) {
    return false;
  }
  const rel = entryPath.slice(prefix.length + 1);
  if (!rel) {
    return false;
  }
  if (rel === requestedPath || rel.startsWith(requestedPath + "/")) {
    return true;
  }
  return false;
}
