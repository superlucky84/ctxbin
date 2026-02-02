import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fail } from "./errors";

const execFileAsync = promisify(execFile);

async function git(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, { encoding: "utf8" });
    return stdout.trim();
  } catch {
    return fail("NOT_IN_GIT", "not inside a git repository");
  }
}

async function getPackageJsonName(root: string): Promise<string | null> {
  try {
    const content = await readFile(path.join(root, "package.json"), "utf8");
    const pkg = JSON.parse(content);
    return typeof pkg.name === "string" ? pkg.name : null;
  } catch {
    return null;
  }
}

export async function inferCtxKey(): Promise<string> {
  const root = await git(["rev-parse", "--show-toplevel"]);
  const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const folderName = path.basename(root);

  if (!folderName || !branch) {
    return fail("NOT_IN_GIT", "unable to infer ctx key from git repository");
  }

  const pkgName = await getPackageJsonName(root);

  if (pkgName) {
    if (pkgName !== folderName) {
      process.stderr.write(
        `CTXBIN_WARN: package.json name "${pkgName}" differs from folder name "${folderName}". Using "${pkgName}".\n`
      );
    }
    return `${pkgName}/${branch}`;
  }

  return `${folderName}/${branch}`;
}
