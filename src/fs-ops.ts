import fs from "node:fs/promises";
import path from "node:path";
import { fail } from "./errors";
import { safeChmod } from "./chmod";

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

export async function copyDirContents(src: string, dest: string): Promise<void> {
  await ensureDir(dest);
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirContents(srcPath, destPath);
      const stat = await fs.stat(srcPath);
      await safeChmod(destPath, stat.mode & 0o777);
      continue;
    }
    if (entry.isFile()) {
      await ensureDir(path.dirname(destPath));
      await fs.copyFile(srcPath, destPath);
      const stat = await fs.stat(srcPath);
      await safeChmod(destPath, stat.mode & 0o777);
      continue;
    }
    return fail("IO", `unsupported file type during copy: ${srcPath}`);
  }
}
