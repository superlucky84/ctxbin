import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import type { Store } from "./store";
import { fail } from "./errors";
import { extractSkillpackToDir } from "./skillpack";
import { loadSkillrefToDir } from "./skillref";
import { detectSkillValueType } from "./value";
import { normalizeSkillMarkdown, renderAgentMarkdown, validateInstallName, SyncTarget } from "./install-format";
import { applySyncPlans, assertDestination, canonicalDirectory, readManifest, SyncRoot } from "./sync-files";

export interface SyncOptions {
  target: SyncTarget | "all";
  sourceId: string;
  home?: string;
  skillsDir?: string;
  agentsDir?: string;
  dryRun?: boolean;
  prune?: boolean;
}

export interface SyncAction {
  action: "create" | "replace" | "delete";
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
        target, resource, dir: await canonicalDirectory(configured),
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
  for (const entries of [skills, agents]) {
    const names = new Set<string>();
    for (const { field } of entries) {
      validateInstallName(field);
      if (names.has(field)) fail("INVALID_INPUT", `duplicate remote name: ${field}`);
      names.add(field);
    }
    entries.sort((a, b) => a.field.localeCompare(b.field));
  }

  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "ctxbin-sync-"));
  try {
    const stagedSkills = new Map<string, string>();
    for (const { field, value } of skills) {
      const dir = path.join(temp, "skills", field);
      await fs.mkdir(dir, { recursive: true });
      const kind = detectSkillValueType(value);
      if (kind === "skillpack") await extractSkillpackToDir(value, dir);
      if (kind === "skillref") await loadSkillrefToDir(value, dir);
      const skillPath = path.join(dir, "SKILL.md");
      const content = kind === "string" ? value : await fs.readFile(skillPath, "utf8").catch(() =>
        fail("INVALID_INPUT", `skill ${field}: bundle must contain root SKILL.md`));
      await fs.writeFile(skillPath, normalizeSkillMarkdown(content, field), { mode: 0o644 });
      stagedSkills.set(field, dir);
    }
    const actions: SyncAction[] = [];
    for (const root of roots) {
      const previous = await readManifest(root);
      root.manifest = previous.raw;
      root.items = { ...previous.items };
      const entries = root.resource === "skill" ? skills : agents;
      const remoteNames = new Set(entries.map(entry => entry.field));
      for (const { field, value } of entries) {
        const dest = itemPath(root, field);
        const exists = await assertDestination(root, dest);
        let staged = stagedSkills.get(field)!;
        if (root.resource === "agent") {
          staged = path.join(temp, `${root.target}-agents`, `${field}.${root.target === "claude" ? "md" : "toml"}`);
          await fs.mkdir(path.dirname(staged), { recursive: true });
          await fs.writeFile(staged, renderAgentMarkdown(value, field, root.target), { mode: 0o644 });
        }
        root.operations.push({ destination: dest, staged, exists });
        root.items[field] = opts.sourceId;
        actions.push({ action: exists ? "replace" : "create", target: root.target, resource: root.resource, name: field, path: dest });
      }
      if (opts.prune) {
        for (const name of Object.keys(previous.items).sort()) {
          if (previous.items[name] !== opts.sourceId || remoteNames.has(name)) continue;
          const dest = itemPath(root, name);
          const exists = await assertDestination(root, dest);
          if (exists) {
            root.operations.push({ destination: dest, exists });
            actions.push({ action: "delete", target: root.target, resource: root.resource, name, path: dest });
          }
          delete root.items[name];
        }
      }
    }
    if (!opts.dryRun) await applySyncPlans(roots);
    return actions;
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}

function itemPath(root: SyncRoot, name: string): string {
  return path.join(root.dir, root.resource === "skill" ? name : `${name}.${root.target === "claude" ? "md" : "toml"}`);
}
