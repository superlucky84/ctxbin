import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import os from "node:os";
import zlib from "node:zlib";
import { pipeline } from "node:stream/promises";
import tar from "tar";
import { DEFAULT_EXCLUDES, MAX_SKILLPACK_BYTES, SKILLPACK_HEADER } from "./constants";
import { fail } from "./errors";
import { ensureDir, copyDirContents } from "./fs-ops";
import { applyNormalizedPermissions } from "./perm";
import { assertSafeTarPath } from "./validators";
import { listTarEntries } from "./tar-utils";

const ALLOWED_TYPES = new Set(["File", "Directory"]);

export async function createSkillpackFromDir(dirPath: string): Promise<string> {
  const stats = await fs.stat(dirPath).catch(() => null);
  if (!stats || !stats.isDirectory()) {
    return fail("INVALID_INPUT", `--dir is not a directory: ${dirPath}`);
  }

  const entries = await collectEntries(dirPath);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ctxbin-skillpack-"));
  const tarPath = path.join(tmpDir, "skillpack.tar.gz");

  try {
    const tarStream = tar.c(
      {
        cwd: dirPath,
        portable: true,
        mtime: new Date(0),
      },
      entries
    );

    const gzip = zlib.createGzip({ mtime: 0 });
    await pipeline(tarStream, gzip, createWriteStream(tarPath));

    const stat = await fs.stat(tarPath);
    if (stat.size > MAX_SKILLPACK_BYTES) {
      return fail(
        "SIZE_LIMIT",
        `skillpack tar.gz size ${stat.size} bytes exceeds ${MAX_SKILLPACK_BYTES} bytes`
      );
    }

    const data = await fs.readFile(tarPath);
    const b64 = data.toString("base64");
    return SKILLPACK_HEADER + b64;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

export async function extractSkillpackToDir(value: string, targetDir: string): Promise<void> {
  const base64 = value.slice(SKILLPACK_HEADER.length);
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return fail("IO", "invalid skillpack base64 data");
  }

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ctxbin-skillpack-"));
  const tarPath = path.join(tmpRoot, "skillpack.tar.gz");
  await fs.writeFile(tarPath, buffer);

  try {
    const entries = await listTarEntries(tarPath);
    const execSet = validateTarEntries(entries);

    const extractDir = path.join(tmpRoot, "extract");
    await ensureDir(extractDir);
    await tar.x({
      file: tarPath,
      cwd: extractDir,
      preserveOwner: false,
      noMtime: true,
    });

    await applyNormalizedPermissions(extractDir, execSet);
    await ensureDir(targetDir);
    await copyDirContents(extractDir, targetDir);
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
}

async function collectEntries(root: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(absDir: string, relDir: string): Promise<void> {
    const entries = await fs.readdir(absDir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (DEFAULT_EXCLUDES.includes(entry.name)) {
        if (entry.isDirectory()) {
          continue;
        }
        if (entry.isFile() && entry.name === ".DS_Store") {
          continue;
        }
      }

      const absPath = path.join(absDir, entry.name);
      const relPath = relDir ? path.posix.join(relDir, entry.name) : entry.name;
      const stat = await fs.lstat(absPath);
      if (stat.isSymbolicLink()) {
        return fail("IO", `symlink not allowed in skillpack: ${absPath}`);
      }

      if (entry.isDirectory()) {
        results.push(relPath);
        await walk(absPath, relPath);
        continue;
      }

      if (entry.isFile()) {
        if (entry.name === ".DS_Store") {
          continue;
        }
        results.push(relPath);
        continue;
      }

      return fail("IO", `unsupported file type in skillpack: ${absPath}`);
    }
  }

  await walk(root, "");
  results.sort();
  return results;
}

function validateTarEntries(entries: { path: string; type: string; mode: number }[]): Set<string> {
  const execSet = new Set<string>();
  for (const entry of entries) {
    assertSafeTarPath(entry.path);
    if (!ALLOWED_TYPES.has(entry.type)) {
      return fail("IO", `unsupported entry type in skillpack: ${entry.path}`);
    }
    if (entry.type === "File" && (entry.mode & 0o111)) {
      execSet.add(entry.path);
    }
  }
  return execSet;
}
