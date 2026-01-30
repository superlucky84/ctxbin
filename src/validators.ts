import path from "node:path";
import { fail } from "./errors";

export function normalizeGithubUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return fail("INVALID_URL", "invalid URL");
  }

  if (url.protocol !== "https:") {
    return fail("INVALID_URL", "URL must use https");
  }
  if (url.hostname !== "github.com") {
    return fail("INVALID_URL", "only github.com is supported");
  }
  if (url.search || url.hash) {
    return fail("INVALID_URL", "URL must not include query or hash");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 2) {
    return fail("INVALID_URL", "URL must be https://github.com/<owner>/<repo>");
  }
  const owner = parts[0];
  let repo = parts[1];
  if (repo.endsWith(".git")) {
    repo = repo.slice(0, -4);
  }
  if (!owner || !repo) {
    return fail("INVALID_URL", "URL must be https://github.com/<owner>/<repo>");
  }

  return `https://github.com/${owner}/${repo}`;
}

export function validateCommitSha(ref: string): string {
  if (!/^[0-9a-f]{40}$/.test(ref)) {
    return fail("INVALID_REF", "ref must be a 40-hex commit SHA");
  }
  return ref;
}

export function normalizeSkillPath(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return fail("INVALID_PATH", "path must be a non-empty directory path");
  }
  const cleaned = trimmed.replace(/\\/g, "/");
  if (cleaned.startsWith("/")) {
    return fail("INVALID_PATH", "path must be relative, not absolute");
  }
  const normalized = path.posix.normalize(cleaned).replace(/^\.\//, "");
  if (normalized === "." || normalized === "") {
    return fail("INVALID_PATH", "path must be a non-empty directory path");
  }
  if (normalized.startsWith("../") || normalized.includes("/../") || normalized === "..") {
    return fail("INVALID_PATH", "path must not include .. segments");
  }
  if (normalized.endsWith("/")) {
    return normalized.slice(0, -1);
  }
  return normalized;
}

export function assertSafeTarPath(entryPath: string): void {
  const cleaned = entryPath.replace(/\\/g, "/");
  if (cleaned.startsWith("/")) {
    return fail("INVALID_PATH", `tar entry path must be relative: ${entryPath}`);
  }
  const normalized = path.posix.normalize(cleaned);
  if (normalized.startsWith("../") || normalized === ".." || normalized.includes("/../")) {
    return fail("INVALID_PATH", `tar entry path contains traversal: ${entryPath}`);
  }
}
