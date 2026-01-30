import { execFile } from "node:child_process";
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

export async function inferCtxKey(): Promise<string> {
  const root = await git(["rev-parse", "--show-toplevel"]);
  const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const project = path.basename(root);
  if (!project || !branch) {
    return fail("NOT_IN_GIT", "unable to infer ctx key from git repository");
  }
  return `${project}/${branch}`;
}
