import fs from "node:fs/promises";
import path from "node:path";
import { fail } from "./errors";
import { copyDirContents } from "./fs-ops";
import { validateInstallName, SyncTarget } from "./install-format";

const MANIFEST = ".ctxbin-sync.json";
const LOCK = ".ctxbin-sync.lock";

export interface SyncRoot {
  target: SyncTarget;
  resource: "skill" | "agent";
  dir: string;
  manifest: string;
  items: Record<string, string>;
  operations: Array<{ destination: string; staged?: string; exists: boolean; link?: boolean }>;
}

async function lstat(file: string) {
  try { return await fs.lstat(file); }
  catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function canonicalDirectory(input: string, home?: string): Promise<string> {
  const expanded = input === "~" || /^~[\\/]/.test(input)
    ? path.join(home ?? (await import("node:os")).homedir(), input.slice(2)) : input;
  const resolved = path.resolve(expanded);
  if (path.dirname(resolved) === resolved) fail("INVALID_PATH", "filesystem root cannot be a sync destination");
  for (const dir of [resolved, path.dirname(resolved)]) {
    const stat = await lstat(dir);
    if (stat && (stat.isSymbolicLink() || !stat.isDirectory())) {
      fail("INVALID_PATH", `destination and its parent must be real directories: ${dir}`);
    }
  }
  let ancestor = resolved;
  const missing: string[] = [];
  while (!(await lstat(ancestor))) {
    missing.unshift(path.basename(ancestor));
    ancestor = path.dirname(ancestor);
  }
  return path.join(await fs.realpath(ancestor), ...missing);
}

export async function assertDestination(root: SyncRoot, dest: string): Promise<boolean> {
  const stat = await lstat(dest);
  if (!stat) return false;
  if (root.resource === "skill" ? !(stat.isDirectory() || stat.isSymbolicLink()) : (stat.isSymbolicLink() || !stat.isFile())) {
    fail("INVALID_PATH", `refusing unexpected destination type or symlink: ${dest}`);
  }
  return true;
}

export async function isSkillLink(dest: string): Promise<boolean> {
  return Boolean((await lstat(dest))?.isSymbolicLink());
}

export async function sameContents(left: string, right: string): Promise<boolean> {
  const [a, b] = await Promise.all([lstat(left), lstat(right)]);
  if (!a || !b || a.isSymbolicLink() || b.isSymbolicLink()) return false;
  if (process.platform !== "win32" && (a.mode & 0o777) !== (b.mode & 0o777)) return false;
  if (a.isFile() && b.isFile()) {
    if (a.size !== b.size) return false;
    const [x, y] = await Promise.all([fs.readFile(left), fs.readFile(right)]);
    return x.equals(y);
  }
  if (!a.isDirectory() || !b.isDirectory()) return false;
  const [x, y] = await Promise.all([fs.readdir(left), fs.readdir(right)]);
  x.sort(); y.sort();
  if (x.length !== y.length || x.some((name, index) => name !== y[index])) return false;
  for (const name of x) if (!(await sameContents(path.join(left, name), path.join(right, name)))) return false;
  return true;
}

export function warnSync(message: string, onWarning?: (message: string) => void): void {
  try {
    if (onWarning) onWarning(message);
    else process.stderr.write(`CTXBIN_WARN: ${message.replace(/[\r\n]+/g, " ")}\n`);
  } catch { /* Diagnostics must never mask a completed operation or its original error. */ }
}

export async function readManifest(root: SyncRoot): Promise<{ raw: string; items: Record<string, string> }> {
  const file = path.join(root.dir, MANIFEST);
  const stat = await lstat(file);
  if (!stat) return { raw: "", items: {} };
  if (stat.isSymbolicLink() || !stat.isFile()) fail("INVALID_PATH", `invalid sync manifest: ${file}`);
  const raw = await fs.readFile(file, "utf8");
  let parsed: any;
  try { parsed = JSON.parse(raw); }
  catch { return fail("INVALID_INPUT", `invalid JSON sync manifest: ${file}`); }
  if (parsed?.version !== 1 || parsed.target !== root.target || parsed.resource !== root.resource ||
    !parsed.items || typeof parsed.items !== "object" || Array.isArray(parsed.items)) {
    fail("INVALID_INPUT", `invalid sync manifest schema: ${file}`);
  }
  for (const [name, source] of Object.entries(parsed.items)) {
    validateInstallName(name);
    if (typeof source !== "string" || !/^[a-f0-9]{64}$/.test(source)) {
      fail("INVALID_INPUT", `invalid source identity in sync manifest: ${file}`);
    }
  }
  return { raw, items: parsed.items };
}

function manifestText(root: SyncRoot): string {
  const items = Object.fromEntries(Object.entries(root.items).sort(([a], [b]) => a.localeCompare(b)));
  return JSON.stringify({ version: 1, target: root.target, resource: root.resource, items }, null, 2) + "\n";
}

export async function applySyncPlans(roots: SyncRoot[], onWarning?: (message: string) => void): Promise<void> {
  // Empty destinations need no state, lock, or directory creation.
  const active = roots.filter(root => root.operations.length || (root.manifest && root.manifest !== manifestText(root)));
  const locked: string[] = [];
  const transactions: string[] = [];
  const undo: Array<() => Promise<unknown>> = [];
  let preserveBackups = false;
  try {
    for (const root of [...active].sort((a, b) => a.dir.localeCompare(b.dir))) {
      if (await canonicalDirectory(root.dir) !== root.dir) fail("INVALID_PATH", `destination changed: ${root.dir}`);
      await fs.mkdir(root.dir, { recursive: true });
      const lock = path.join(root.dir, LOCK);
      const handle = await fs.open(lock, "wx", 0o600).catch(() =>
        fail("IO", `cannot acquire sync lock; inspect existing lock or permissions: ${lock}`));
      locked.push(lock);
      try { await handle.writeFile(`${process.pid}\n`); } finally { await handle.close(); }
    }
    const prepared: Array<{ destination: string; replacement?: string; backup: string; exists: boolean }> = [];
    for (const root of active) {
      const current = await readManifest(root);
      if (current.raw !== root.manifest) fail("IO", `sync manifest changed during planning: ${root.dir}`);
      const transaction = await fs.mkdtemp(path.join(root.dir, ".ctxbin-sync-txn-"));
      transactions.push(transaction);
      const localOperations: typeof prepared = [];
      for (const [index, operation] of root.operations.entries()) {
        const exists = await assertDestination(root, operation.destination);
        if (exists !== operation.exists) fail("IO", `destination changed during planning: ${operation.destination}`);
        if (exists && (await isSkillLink(operation.destination)) !== Boolean(operation.link)) {
          fail("IO", `destination link changed during planning: ${operation.destination}`);
        }
        let replacement: string | undefined;
        if (operation.staged) {
          replacement = path.join(transaction, `new-${index}`);
          if (root.resource === "skill") await copyDirContents(operation.staged, replacement);
          else await fs.copyFile(operation.staged, replacement);
        }
        localOperations.push({ destination: operation.destination, replacement, backup: path.join(transaction, `old-${index}`), exists });
      }
      const newManifest = path.join(transaction, "manifest-new");
      await fs.writeFile(newManifest, manifestText(root), { mode: 0o600 });
      localOperations.push({ destination: path.join(root.dir, MANIFEST), replacement: newManifest,
        backup: path.join(transaction, "manifest-old"), exists: Boolean(root.manifest) });
      await fs.writeFile(path.join(transaction, "journal.json"), JSON.stringify({ version: 1, operations: localOperations }, null, 2) + "\n", { mode: 0o600 });
      prepared.push(...localOperations);
    }
    // All same-filesystem replacements have been prepared before the first move.
    for (const operation of prepared) {
      if (operation.exists) {
        await fs.rename(operation.destination, operation.backup);
        undo.push(() => fs.rename(operation.backup, operation.destination));
      }
      if (operation.replacement) {
        await fs.rename(operation.replacement, operation.destination);
        undo.push(() => fs.rm(operation.destination, { recursive: true, force: true }));
      }
    }
  } catch (err) {
    const failures: unknown[] = [];
    for (const rollback of undo.reverse()) {
      try { await rollback(); } catch (rollbackError) { failures.push(rollbackError); }
    }
    if (failures.length) {
      preserveBackups = true;
      fail("IO", `sync failed and rollback was incomplete; inspect locks and backups: ${transactions.join(", ")}; ${String(err)}`);
    }
    throw err;
  } finally {
    if (!preserveBackups) {
      // Release every acquired lock even when one cleanup fails.
      const results = await Promise.allSettled(transactions.map(dir => fs.rm(dir, { recursive: true, force: true })));
      const lockResults = await Promise.allSettled(locked.map(lock => fs.unlink(lock)));
      const failure = [...results, ...lockResults].find(result => result.status === "rejected");
      if (failure?.status === "rejected") warnSync(`sync cleanup failed; inspect retained temporary data or locks: ${String(failure.reason)}`, onWarning);
    }
  }
}
