import fs from "node:fs/promises";
import path from "node:path";
import { fail } from "./errors";
import { toPosix } from "./fs-ops";

export async function applyNormalizedPermissions(root: string, execSet: Set<string>): Promise<void> {
  async function walk(absDir: string): Promise<void> {
    const entries = await fs.readdir(absDir, { withFileTypes: true });
    for (const entry of entries) {
      const absPath = path.join(absDir, entry.name);
      if (entry.isDirectory()) {
        await fs.chmod(absPath, 0o755);
        await walk(absPath);
        continue;
      }
      if (entry.isFile()) {
        const rel = toPosix(path.relative(root, absPath));
        const mode = execSet.has(rel) ? 0o755 : 0o644;
        await fs.chmod(absPath, mode);
        continue;
      }
      return fail("IO", `unsupported file type after extract: ${absPath}`);
    }
  }

  await walk(root);
}
