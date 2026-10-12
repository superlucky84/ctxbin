import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import type { Store } from "./store";
import { CtxbinError, fail } from "./errors";

type Resource = "skill" | "agent";
type Entry = { field: string; value: string };
const resources = ["skill", "agent"] as const;
const compareFields = (a: Entry, b: Entry): number => a.field < b.field ? -1 : a.field > b.field ? 1 : 0;

export interface ResourceBackup {
  format: "ctxbin-backup";
  version: 1;
  createdAt: string;
  sourceId: string;
  resources: Record<Resource, Entry[]>;
  checksum: string;
}

export interface RestoreAction {
  action: "create" | "replace" | "unchanged";
  resource: Resource;
  name: string;
}

function digest(value: ResourceBackup["resources"]): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function entries(value: unknown, resource: Resource): Entry[] {
  if (!Array.isArray(value)) fail("INVALID_INPUT", `backup ${resource} entries must be an array`);
  const names = new Set<string>();
  return value.map(entry => {
    if (!entry || typeof entry.field !== "string" || typeof entry.value !== "string" ||
      Object.keys(entry).some(key => key !== "field" && key !== "value")) {
      fail("INVALID_INPUT", `backup ${resource} entries require string field/value pairs`);
    }
    if (names.has(entry.field)) fail("INVALID_INPUT", `duplicate backup ${resource} field ${JSON.stringify(entry.field)}`);
    names.add(entry.field);
    return { field: entry.field, value: entry.value };
  });
}

export function parseResourceBackup(raw: string): ResourceBackup {
  let value: any;
  try { value = JSON.parse(raw.replace(/^\uFEFF/, "")); }
  catch { return fail("INVALID_INPUT", "backup file must be valid JSON"); }
  if (!value || value.format !== "ctxbin-backup" || value.version !== 1 ||
    typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt)) ||
    typeof value.sourceId !== "string" || !/^[a-f0-9]{64}$/.test(value.sourceId) ||
    typeof value.checksum !== "string" || !/^[a-f0-9]{64}$/.test(value.checksum) ||
    !value.resources || typeof value.resources !== "object" || Array.isArray(value.resources) ||
    Object.keys(value.resources).some(key => !resources.includes(key as Resource))) {
    fail("INVALID_INPUT", "unsupported or invalid ctxbin backup schema");
  }
  const payload = { skill: entries(value.resources.skill, "skill"), agent: entries(value.resources.agent, "agent") };
  if (digest(payload) !== value.checksum) fail("INVALID_INPUT", "backup payload checksum mismatch");
  return { format: "ctxbin-backup", version: 1, createdAt: value.createdAt,
    sourceId: value.sourceId, resources: payload, checksum: value.checksum };
}

export function resolveBackupFile(input: string): string {
  if (typeof input !== "string" || !input) fail("INVALID_INPUT", "backup and restore require --file <path>");
  return path.resolve(input === "~" || /^~[\\/]/.test(input) ? path.join(os.homedir(), input.slice(2)) : input);
}

async function backupDestination(file: string, force: boolean): Promise<void> {
  const stat = await fs.lstat(file).catch(error => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (stat && (!stat.isFile() || stat.isSymbolicLink())) fail("INVALID_PATH", `backup destination must be a regular file: ${file}`);
  if (stat && !force) fail("INVALID_INPUT", `backup already exists; choose a new file or use --force: ${file}`);
}

async function guardBackupReplacement(file: string, backup: ResourceBackup): Promise<void> {
  const raw = await fs.readFile(file, "utf8").catch(error => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (raw === null) return;
  let previous: ResourceBackup;
  try { previous = parseResourceBackup(raw); }
  catch (error) {
    if (error instanceof CtxbinError && error.code === "INVALID_INPUT") return;
    throw error;
  }
  if (previous.sourceId !== backup.sourceId) {
    fail("INVALID_INPUT", "backup belongs to another store; choose a new filename to preserve it");
  }
  for (const resource of resources) {
    if (previous.resources[resource].length && !backup.resources[resource].length) {
      fail("INVALID_INPUT", `backup would replace nonempty ${resource} data with an empty snapshot; choose a new filename`);
    }
  }
}

export async function backupResources(store: Store, opts: { file: string; sourceId: string; force?: boolean }): Promise<{ path: string; skills: number; agents: number }> {
  const file = resolveBackupFile(opts.file);
  if (!/^[a-f0-9]{64}$/.test(opts.sourceId)) fail("INVALID_INPUT", "invalid backup source identity");
  await backupDestination(file, Boolean(opts.force));
  const [skills, agents] = await Promise.all([store.list("skill"), store.list("agent")]);
  const payload = { skill: entries(skills, "skill"), agent: entries(agents, "agent") };
  for (const resource of resources) payload[resource].sort(compareFields);
  const backup: ResourceBackup = { format: "ctxbin-backup", version: 1, createdAt: new Date().toISOString(),
    sourceId: opts.sourceId, resources: payload, checksum: digest(payload) };
  if (opts.force) await guardBackupReplacement(file, backup);
  const parent = path.dirname(file);
  await fs.mkdir(parent, { recursive: true });
  const temp = await fs.mkdtemp(path.join(parent, ".ctxbin-backup-"));
  try {
    const staged = path.join(temp, "backup.json");
    const handle = await fs.open(staged, "wx", 0o600);
    try { await handle.writeFile(JSON.stringify(backup, null, 2) + "\n", "utf8"); await handle.sync(); }
    finally { await handle.close(); }
    await backupDestination(file, Boolean(opts.force));
    if (opts.force) {
      await guardBackupReplacement(file, backup);
      await fs.rename(staged, file);
    } else {
      try { await fs.link(staged, file); }
      catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (["ENOTSUP", "EOPNOTSUPP", "ENOSYS", "EPERM", "EINVAL", "EXDEV"].includes(code ?? "")) {
          fail("IO", `backup hard-link publication failed (${code}); choose another directory or use --force for staged rename after checking the destination`);
        }
        throw error;
      }
    }
    return { path: file, skills: payload.skill.length, agents: payload.agent.length };
  } finally {
    try { await fs.rm(temp, { recursive: true, force: true }); }
    catch {
      try { process.stderr.write("CTXBIN_WARN: backup staging cleanup failed\n"); }
      catch { /* A cleanup diagnostic must not mask the backup result. */ }
    }
  }
}

export async function readResourceBackup(file: string): Promise<ResourceBackup> {
  return parseResourceBackup(await fs.readFile(resolveBackupFile(file), "utf8"));
}

export async function restoreResources(store: Store, input: ResourceBackup, opts: { dryRun?: boolean; force?: boolean } = {}): Promise<RestoreAction[]> {
  // Library callers receive the same full schema/checksum validation as CLI file input.
  const backup = parseResourceBackup(JSON.stringify(input));
  const plans: Array<RestoreAction & { value: string; previous: string | null }> = [];
  for (const resource of resources) {
    if (!backup.resources[resource].length) continue;
    const current = new Map(entries(await store.list(resource), resource).map(entry => [entry.field, entry.value]));
    for (const { field, value } of [...backup.resources[resource]].sort(compareFields)) {
      const previous = current.get(field) ?? null;
      plans.push({ resource, name: field, value, previous,
        action: previous === value ? "unchanged" : previous === null ? "create" : "replace" });
    }
  }
  const actions = plans.map(({ action, resource, name }) => ({ action, resource, name }));
  if (opts.dryRun) return actions;
  const conflicts = plans.filter(plan => plan.action === "replace");
  if (conflicts.length && !opts.force) {
    fail("INVALID_INPUT", "restore would replace existing values; preview and use --force: " +
      conflicts.map(plan => `${plan.resource}:${JSON.stringify(plan.name)}`).join(", "));
  }
  const attempted: typeof plans = [];
  try {
    for (const plan of plans) {
      if (plan.action === "unchanged") continue;
      if (await store.get(plan.resource, plan.name) !== plan.previous) {
        fail("IO", `remote value changed during restore: ${plan.resource}:${JSON.stringify(plan.name)}`);
      }
      attempted.push(plan);
      await store.set(plan.resource, plan.name, plan.value);
    }
  } catch (error) {
    const unresolved: string[] = [];
    let rollbackNetwork: CtxbinError | undefined;
    const rollback = attempted.reverse();
    for (let index = 0; index < rollback.length; index++) {
      const plan = rollback[index];
      try {
        const current = await store.get(plan.resource, plan.name);
        if (current === plan.previous) continue;
        if (current !== plan.value) throw new Error("concurrent change");
        if (plan.previous === null) await store.delete(plan.resource, plan.name);
        else await store.set(plan.resource, plan.name, plan.previous);
      } catch (rollbackError) {
        unresolved.push(`${plan.resource}:${JSON.stringify(plan.name)}`);
        if (rollbackError instanceof CtxbinError && rollbackError.code === "NETWORK") {
          rollbackNetwork = rollbackError;
          unresolved.push(...rollback.slice(index + 1).map(item => `${item.resource}:${JSON.stringify(item.name)}`));
          break;
        }
      }
    }
    if (unresolved.length) {
      const code = error instanceof CtxbinError ? error.code : "IO";
      const message = error instanceof Error ? error.message : String(error);
      const stopped = rollbackNetwork ? `; rollback stopped after NETWORK: ${rollbackNetwork.message}` : "";
      throw new CtxbinError(code, `${message}; restore rollback incomplete${stopped}; inspect remote values before retrying: ${unresolved.join(", ")}`);
    }
    throw error;
  }
  return actions;
}
