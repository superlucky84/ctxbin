import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import type { Store } from "./store";
import { CtxbinError, fail, formatError } from "./errors";
import { extractSkillpackToDir } from "./skillpack";
import { loadSkillrefToDir } from "./skillref";
import { detectSkillValueType } from "./value";
import { localAgentDescription, normalizeSkillMarkdown, renderAgentMarkdown, validateInstallName, SyncTarget } from "./install-format";
import { applySyncPlans, assertDestination, canonicalDirectory, isSkillLink, readManifest, sameContents, warnSync, SyncRoot } from "./sync-files";

export interface SyncOptions {
  target: SyncTarget | "all";
  sourceId: string;
  home?: string;
  skillsDir?: string;
  agentsDir?: string;
  dryRun?: boolean;
  prune?: boolean;
  force?: boolean;
  onWarning?: (message: string) => void;
}

export interface SyncAction {
  action: "create" | "replace" | "replace-unmanaged" | "unchanged" | "delete";
  target: SyncTarget;
  resource: "skill" | "agent";
  name: string;
  path: string;
}

export function syncSourceId(storeUrl: string): string {
  return createHash("sha256").update(storeUrl.replace(/\/+$/, "")).digest("hex");
}

export async function syncResources(store: Store, opts: SyncOptions): Promise<SyncAction[]> {
  if (!["claude", "codex", "all"].includes(opts.target)) {
    fail("INVALID_INPUT", "sync requires --target claude, codex, or all");
  }
  if (!/^[a-f0-9]{64}$/.test(opts.sourceId)) fail("INVALID_INPUT", "invalid sync source identity");
  if (opts.target === "all" && (opts.skillsDir !== undefined || opts.agentsDir !== undefined)) {
    fail("INVALID_INPUT", "directory overrides require a single --target");
  }
  if (opts.skillsDir === "" || opts.agentsDir === "") fail("INVALID_PATH", "destination directories must not be empty");
  const home = opts.home ?? os.homedir();
  const targets: SyncTarget[] = opts.target === "all" ? ["claude", "codex"] : [opts.target];
  const roots: SyncRoot[] = [];
  for (const target of targets) {
    for (const resource of ["skill", "agent"] as const) {
      const configured = resource === "skill"
        ? opts.skillsDir ?? path.join(home, target === "claude" ? ".claude" : ".agents", "skills")
        : opts.agentsDir ?? path.join(home, `.${target}`, "agents");
      roots.push({
        target, resource, dir: await canonicalDirectory(configured, home),
        manifest: "", items: {}, operations: [],
      });
    }
  }
  for (let i = 0; i < roots.length; i++) {
    for (let j = i + 1; j < roots.length; j++) {
      const a = roots[i].dir;
      const b = roots[j].dir;
      if (a === b || a.startsWith(b + path.sep) || b.startsWith(a + path.sep)) {
        fail("INVALID_PATH", "sync destination directories must not overlap");
      }
    }
  }

  const [skills, agents] = await Promise.all([store.list("skill"), store.list("agent")]);
  const failures: Array<{ label: string; error: unknown }> = [];
  for (const entries of [skills, agents]) {
    const names = new Set<string>();
    for (let index = entries.length - 1; index >= 0; index--) {
      const { field } = entries[index];
      try {
        validateInstallName(field);
        if (names.has(field)) fail("INVALID_INPUT", `duplicate remote name: ${field}`);
        names.add(field);
      } catch (error) {
        failures.push({ label: `${entries === skills ? "skill" : "agent"}:${JSON.stringify(field)}`, error });
        entries.splice(index, 1);
      }
    }
    entries.sort((a, b) => a.field.localeCompare(b.field));
  }

  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "ctxbin-sync-"));
  try {
    const stagedSkills = new Map<string, string>();
    for (const { field, value } of skills) {
      try {
        const dir = path.join(temp, "skills", field);
        await fs.mkdir(dir, { recursive: true });
        const kind = detectSkillValueType(value);
        if (kind === "skillpack") await extractSkillpackToDir(value, dir);
        if (kind === "skillref") await loadSkillrefToDir(value, dir);
        if (kind !== "string" && !(await fs.readdir(dir)).includes("SKILL.md")) {
          fail("INVALID_INPUT", `skill ${field}: bundle must contain exact root SKILL.md`);
        }
        const skillPath = path.join(dir, "SKILL.md");
        const content = kind === "string" ? value : await fs.readFile(skillPath, "utf8").catch(() =>
          fail("INVALID_INPUT", `skill ${field}: bundle must contain root SKILL.md`));
        await fs.writeFile(skillPath, normalizeSkillMarkdown(content, field), { mode: 0o644 });
        stagedSkills.set(field, dir);
      } catch (error) { failures.push({ label: `skill:${field}`, error }); }
    }
    const actions: SyncAction[] = [];
    for (const root of roots) {
      try {
        const previous = await readManifest(root);
        root.manifest = previous.raw;
        root.items = { ...previous.items };
        const entries = root.resource === "skill" ? skills : agents;
        const remoteNames = new Set(entries.map(entry => entry.field));
        for (const { field, value } of entries) {
          if (root.resource === "skill" && !stagedSkills.has(field)) continue;
          try {
            const dest = itemPath(root, field);
            const exists = await assertDestination(root, dest);
            const link = exists && await isSkillLink(dest);
            let staged = stagedSkills.get(field)!;
            if (root.resource === "agent") {
              staged = path.join(temp, `${root.target}-agents`, `${field}.${root.target === "claude" ? "md" : "toml"}`);
              await fs.mkdir(path.dirname(staged), { recursive: true });
              const localDescription = exists
                ? localAgentDescription(await fs.readFile(dest, "utf8"), field, root.target) : undefined;
              await fs.writeFile(staged, renderAgentMarkdown(value, field, root.target, localDescription), { mode: 0o644 });
            }
            const managed = Object.hasOwn(previous.items, field);
            const unchanged = exists && managed && !link && await sameContents(staged, dest);
            if (exists && !managed && !opts.force && !opts.dryRun) {
              fail("INVALID_INPUT", `unmanaged destination ${dest}; preview and use --force to replace it`);
            }
            if (!unchanged) root.operations.push({ destination: dest, staged, exists, link });
            root.items[field] = opts.sourceId;
            actions.push({ action: unchanged ? "unchanged" : exists ? managed ? "replace" : "replace-unmanaged" : "create",
              target: root.target, resource: root.resource, name: field, path: dest });
          } catch (error) { failures.push({ label: `${root.target}:${root.resource}:${field}`, error }); }
        }
        if (opts.prune) {
          for (const name of Object.keys(previous.items).sort()) {
            if (previous.items[name] !== opts.sourceId || remoteNames.has(name)) continue;
            try {
              const dest = itemPath(root, name);
              const exists = await assertDestination(root, dest);
              if (exists) {
                root.operations.push({ destination: dest, exists, link: await isSkillLink(dest) });
                actions.push({ action: "delete", target: root.target, resource: root.resource, name, path: dest });
              }
              delete root.items[name];
            } catch (error) { failures.push({ label: `${root.target}:${root.resource}:${name}`, error }); }
          }
        }
      } catch (error) { failures.push({ label: `${root.target}:${root.resource}`, error }); }
    }
    failures.sort((a, b) => a.label.localeCompare(b.label));
    if (failures.length === 1) throw failures[0].error;
    if (failures.length) {
      const codes = failures.map(({ error }) => error instanceof CtxbinError ? error.code : "IO");
      const code = codes.every(value => value === codes[0]) ? codes[0] : "INVALID_INPUT";
      throw new CtxbinError(code, `sync preflight failed (${failures.length} issues): ` +
        failures.map(({ label, error }) => `${label}: ${formatError(error).replace(/[\r\n]+/g, " ")}`).join("; "));
    }
    if (!opts.dryRun) await applySyncPlans(roots, opts.onWarning);
    return actions;
  } finally {
    try { await fs.rm(temp, { recursive: true, force: true }); }
    catch (error) { warnSync(`sync staging cleanup failed: ${String(error)}`, opts.onWarning); }
  }
}

function itemPath(root: SyncRoot, name: string): string {
  return path.join(root.dir, root.resource === "skill" ? name : `${name}.${root.target === "claude" ? "md" : "toml"}`);
}
