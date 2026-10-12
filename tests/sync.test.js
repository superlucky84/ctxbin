const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const { spawn } = require("node:child_process");
const tar = require("tar");
const YAML = require("yaml");
const TOML = require("smol-toml");
const {
  syncResources, syncSourceId, createSkillpackFromDir, createSkillrefValue,
  normalizeSkillMarkdown, renderAgentMarkdown, validateInstallName,
} = require("../dist/index.js");

const sourceId = syncSourceId("https://test-store.invalid");
const secondSource = syncSourceId("https://second-store.invalid");
const manifestName = ".ctxbin-sync.json";

function memoryStore(skills = {}, agents = {}) {
  const data = { skill: skills, agent: agents };
  const calls = [];
  return {
    data, calls,
    async list(hash) {
      calls.push(hash);
      assert.ok(hash === "skill" || hash === "agent", "sync must only read skill and agent");
      return Object.entries(data[hash]).map(([field, value]) => ({ field, value }));
    },
    async set() { assert.fail("sync must not write remotely"); },
    async delete() { assert.fail("sync must not delete remotely"); },
  };
}

async function fixture(t) {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "ctxbin-sync-test-"));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  return { home, target: "all", sourceId };
}

async function exists(file) {
  return fs.lstat(file).then(() => true, err => {
    if (err.code === "ENOENT") return false;
    throw err;
  });
}

async function snapshot(root) {
  const result = {};
  async function visit(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      const key = path.relative(root, file);
      if (entry.isDirectory()) { result[key] = "directory"; await visit(file); }
      else if (entry.isSymbolicLink()) result[key] = `symlink:${await fs.readlink(file)}`;
      else result[key] = (await fs.readFile(file)).toString("base64");
    }
  }
  await visit(root);
  return result;
}

function skillFields(content) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(content);
  assert.ok(match, "valid YAML frontmatter");
  return { fields: YAML.parse(match[1]), body: content.slice(match[0].length) };
}

test("legacy skill metadata defaults and existing YAML fields/body survive", () => {
  assert.deepEqual(skillFields(normalizeSkillMarkdown("# Rules\n\nDo work.\n", "review")), {
    fields: { name: "review", description: "Reusable instructions for review." },
    body: "# Rules\n\nDo work.\n",
  });
  const content = "---\r\nname: review\r\ndescription: >-\r\n  Review code\r\n  carefully\r\ndisable-model-invocation: true\r\nallowed-tools: [Read, Bash]\r\n---\r\n# 검토\r\n";
  const parsed = skillFields(normalizeSkillMarkdown(content, "review"));
  assert.equal(parsed.fields.description, "Review code carefully");
  assert.equal(parsed.fields["disable-model-invocation"], true);
  assert.deepEqual(parsed.fields["allowed-tools"], ["Read", "Bash"]);
  assert.equal(parsed.body, "# 검토\r\n");
});

test("native agent YAML and TOML round-trip rules, quotes, Unicode, and metadata", () => {
  const body = '# 검토 🐾\nUse "quotes", C:\\work,\ttabs, and triple quotes: """.\n';
  const value = `ctxbin-meta@1\n{"savedAt":"now"}\n---\n---\nname: review\ndescription: "Review code: carefully"\n---\n${body}`;
  const claude = skillFields(renderAgentMarkdown(value, "review", "claude"));
  assert.deepEqual(claude.fields, { name: "review", description: "Review code: carefully" });
  assert.equal(claude.body, body);
  assert.deepEqual({ ...TOML.parse(renderAgentMarkdown(value, "review", "codex")) }, {
    name: "review", description: "Review code: carefully", developer_instructions: body,
  });
  assert.equal(TOML.parse(renderAgentMarkdown(body, "review", "codex")).description, "Agent rules for review.");
});

test("malformed and unsupported metadata and unsafe portable names are rejected", () => {
  for (const name of ["../escape", "/escape", "x/y", "x\\y", ".system", "UPPER", "synced", "anthropic-skills", "con", "nul", "a".repeat(65)]) {
    assert.throws(() => validateInstallName(name), /installation name/);
  }
  for (const value of [
    "---\nname: review\n", "---\nname: [broken\n---\nbody", "---\n- name\n---\nbody",
    "---\nname: other\n---\nbody", "---\nname: review\nname: review\n---\nbody",
    "---\ndescription: 10\n---\nbody", "---\ndescription: ''\n---\nbody", "  ",
    "---\nname: review\n---\n", "---\ndescription: !unknown value\n---\nbody",
  ]) assert.throws(() => normalizeSkillMarkdown(value, "review"));
  assert.throws(() => renderAgentMarkdown("---\ntools: [Bash]\n---\nbody", "review", "claude"), /unsupported/);
  assert.throws(() => renderAgentMarkdown("\ud800", "review", "codex"), /Unicode/);
});

test("all-target sync installs strings and packs at native paths without remote mutations", async t => {
  const opts = await fixture(t);
  const packDir = path.join(opts.home, "input-pack");
  await fs.mkdir(path.join(packDir, "scripts"), { recursive: true });
  await fs.writeFile(path.join(packDir, "SKILL.md"), "---\nname: pack\ndescription: Bundled workflow\n---\nRun script.\n");
  await fs.writeFile(path.join(packDir, "scripts", "run.sh"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  const store = memoryStore({ text: "# Skill\nText rules", pack: await createSkillpackFromDir(packDir) }, { review: "# Agent\nReview carefully." });
  const actions = await syncResources(store, opts);
  assert.equal(actions.length, 6);
  assert.deepEqual(store.calls.sort(), ["agent", "skill"]);
  for (const root of [path.join(opts.home, ".claude", "skills"), path.join(opts.home, ".agents", "skills")]) {
    assert.equal(skillFields(await fs.readFile(path.join(root, "text", "SKILL.md"), "utf8")).fields.name, "text");
    assert.ok(await exists(path.join(root, "pack", "scripts", "run.sh")));
    if (process.platform !== "win32") assert.equal((await fs.stat(path.join(root, "pack", "scripts", "run.sh"))).mode & 0o777, 0o755);
    const state = JSON.parse(await fs.readFile(path.join(root, manifestName), "utf8"));
    assert.equal(state.items.pack, sourceId);
    assert.equal(JSON.stringify(state).includes("test-store"), false);
  }
  assert.equal(TOML.parse(await fs.readFile(path.join(opts.home, ".codex", "agents", "review.toml"), "utf8")).developer_instructions, "# Agent\nReview carefully.");
  assert.ok(await exists(path.join(opts.home, ".claude", "agents", "review.md")));
  assert.ok(Object.keys(await snapshot(opts.home)).every(name => !name.includes(".ctxbin-sync-txn-") && !name.endsWith(".ctxbin-sync.lock")));
});

test("replacement removes stale skill files and keeps unrelated local entries", async t => {
  const opts = { ...await fixture(t), target: "claude" };
  const store = memoryStore({ review: "Version one" }, { reviewer: "Old agent rules" });
  await syncResources(store, opts);
  const root = path.join(opts.home, ".claude", "skills");
  await fs.writeFile(path.join(root, "review", "stale.txt"), "obsolete");
  await fs.mkdir(path.join(root, ".system"));
  await fs.writeFile(path.join(root, ".system", "keep"), "local");
  store.data.skill.review = "Version two";
  store.data.agent.reviewer = "New agent rules";
  const actions = await syncResources(store, opts);
  assert.ok(actions.every(action => action.action === "replace"));
  assert.equal(await exists(path.join(root, "review", "stale.txt")), false);
  assert.equal(await fs.readFile(path.join(root, ".system", "keep"), "utf8"), "local");
  assert.equal(skillFields(await fs.readFile(path.join(root, "review", "SKILL.md"), "utf8")).body, "Version two");
});

test("dry-run validates content and previews replacement/prune without any destination writes", async t => {
  const opts = await fixture(t);
  const store = memoryStore({ review: "Old" }, { reviewer: "Old" });
  const initial = await snapshot(opts.home);
  assert.equal((await syncResources(store, { ...opts, dryRun: true })).length, 4);
  assert.deepEqual(await snapshot(opts.home), initial);
  await syncResources(store, opts);
  const before = await snapshot(opts.home);
  store.data.skill = {};
  store.data.agent.reviewer = "Updated";
  const actions = await syncResources(store, { ...opts, dryRun: true, prune: true });
  assert.equal(actions.filter(action => action.action === "delete").length, 2);
  assert.equal(actions.filter(action => action.action === "replace").length, 2);
  assert.deepEqual(await snapshot(opts.home), before);
});

test("prune keeps unmanaged and other-source entries, and transfers shared ownership", async t => {
  const opts = { ...await fixture(t), target: "claude" };
  const store = memoryStore({ shared: "A", first: "A" }, { reviewer: "A" });
  await syncResources(store, opts);
  const root = path.join(opts.home, ".claude", "skills");
  await fs.mkdir(path.join(root, "local"));
  await fs.writeFile(path.join(root, "local", "SKILL.md"), "local");
  store.data.skill = { shared: "B", second: "B" };
  store.data.agent = {};
  await syncResources(store, { ...opts, sourceId: secondSource });
  store.data.skill = {};
  await syncResources(store, { ...opts, sourceId: secondSource });
  assert.ok(await exists(path.join(root, "second")), "without prune removed remote item stays installed/tracked");
  await syncResources(store, { ...opts, sourceId: secondSource, prune: true });
  assert.equal(await exists(path.join(root, "shared")), false);
  assert.equal(await exists(path.join(root, "second")), false);
  assert.ok(await exists(path.join(root, "first")));
  assert.ok(await exists(path.join(opts.home, ".claude", "agents", "reviewer.md")));
  await syncResources(store, { ...opts, prune: true });
  assert.equal(await exists(path.join(root, "first")), false);
  assert.equal(await exists(path.join(opts.home, ".claude", "agents", "reviewer.md")), false);
  assert.ok(await exists(path.join(root, "local")));
});

test("prune updates tracking for missing entries and empty store leaves new destinations absent", async t => {
  const opts = { ...await fixture(t), target: "codex" };
  const store = memoryStore();
  assert.deepEqual(await syncResources(store, opts), []);
  assert.deepEqual(await fs.readdir(opts.home), []);
  store.data.skill.review = "Rules";
  await syncResources(store, opts);
  const root = path.join(opts.home, ".agents", "skills");
  await fs.rm(path.join(root, "review"), { recursive: true });
  store.data.skill = {};
  assert.deepEqual(await syncResources(store, { ...opts, prune: true }), []);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, manifestName))).items, {});
});

test("invalid last remote item or failed download preserves every existing target", async t => {
  const opts = await fixture(t);
  const store = memoryStore({ review: "Original" }, { reviewer: "Original" });
  await syncResources(store, opts);
  const before = await snapshot(opts.home);
  store.data.skill.review = "Changed";
  store.data.agent.zzbroken = "---\nname: mismatch\n---\nBad";
  await assert.rejects(syncResources(store, opts), /must match/);
  assert.deepEqual(await snapshot(opts.home), before);
  delete store.data.agent.zzbroken;
  store.data.skill.zzreference = createSkillrefValue("https://github.com/example/repo", "skill", "a".repeat(40));
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new Error("offline"); };
  try { await assert.rejects(syncResources(store, opts), /offline/); }
  finally { global.fetch = originalFetch; }
  assert.deepEqual(await snapshot(opts.home), before);
});

test("skillref installs assets and dry-run downloads/validates it", async t => {
  const opts = { ...await fixture(t), target: "codex" };
  const archiveRoot = path.join(opts.home, "archive-input");
  const source = path.join(archiveRoot, "repo-sha", "skills", "remote");
  await fs.mkdir(path.join(source, "references"), { recursive: true });
  await fs.writeFile(path.join(source, "SKILL.md"), "# Remote workflow\nInstructions.");
  await fs.writeFile(path.join(source, "references", "guide.md"), "Remote reference");
  const archive = path.join(opts.home, "reference.tar.gz");
  await tar.c({ gzip: true, file: archive, cwd: archiveRoot }, ["repo-sha"]);
  const data = await fs.readFile(archive);
  const originalFetch = global.fetch;
  let downloads = 0;
  global.fetch = async url => {
    assert.match(String(url), /^https:\/\/codeload\.github\.com\//);
    downloads++;
    return new Response(data, { status: 200 });
  };
  try {
    const store = memoryStore({ remote: createSkillrefValue("https://github.com/example/repo", "skills/remote", "a".repeat(40)) });
    await syncResources(store, { ...opts, dryRun: true });
    assert.equal(await exists(path.join(opts.home, ".agents")), false);
    await syncResources(store, opts);
    assert.equal(downloads, 2);
    assert.equal(await fs.readFile(path.join(opts.home, ".agents", "skills", "remote", "references", "guide.md"), "utf8"), "Remote reference");
  } finally { global.fetch = originalFetch; }
});

test("bundles without root SKILL.md fail without installing", async t => {
  const opts = await fixture(t);
  const input = path.join(opts.home, "input");
  await fs.mkdir(input);
  await fs.writeFile(path.join(input, "other.md"), "Rules");
  const store = memoryStore({ pack: await createSkillpackFromDir(input) });
  const before = await snapshot(opts.home);
  await assert.rejects(syncResources(store, opts), /root SKILL.md/);
  assert.deepEqual(await snapshot(opts.home), before);
});

test("custom roots work and overlapping or unsafe destinations are rejected", async t => {
  const opts = { ...await fixture(t), target: "codex" };
  const custom = path.join(opts.home, "custom-skills");
  const agents = path.join(opts.home, "custom-agents");
  await syncResources(memoryStore({ review: "Rules" }, { reviewer: "Rules" }), { ...opts, skillsDir: custom, agentsDir: agents });
  assert.ok(await exists(path.join(custom, "review", "SKILL.md")));
  assert.ok(await exists(path.join(agents, "reviewer.toml")));
  const store = memoryStore();
  await assert.rejects(syncResources(store, { ...opts, skillsDir: custom, agentsDir: path.join(custom, "nested") }), /overlap/);
  assert.deepEqual(store.calls, [], "root validation precedes remote requests");
  await assert.rejects(syncResources(store, { ...opts, target: "all", skillsDir: custom }), /single/);
  await assert.rejects(syncResources(store, { ...opts, skillsDir: "" }), /empty/);
  await assert.rejects(syncResources(memoryStore({ "../escape": "rules" }), opts), /installation name/);
});

test("symlinked roots/parents/manifests fail closed while skill links are replaced without following", async t => {
  const opts = { ...await fixture(t), target: "claude" };
  const outside = path.join(opts.home, "outside");
  await fs.mkdir(outside);
  const link = path.join(opts.home, "linked");
  await fs.symlink(outside, link, "dir");
  const store = memoryStore({ review: "Rules" });
  await assert.rejects(syncResources(store, { ...opts, skillsDir: link }), /real directories/);
  await fs.symlink(outside, path.join(opts.home, ".claude"), "dir");
  await assert.rejects(syncResources(store, opts), /real directories/);
  await fs.unlink(path.join(opts.home, ".claude"));
  await syncResources(store, opts);
  const root = path.join(opts.home, ".claude", "skills");
  await fs.rm(path.join(root, "review"), { recursive: true });
  await fs.symlink(outside, path.join(root, "review"), "dir");
  await syncResources(store, opts);
  assert.equal((await fs.lstat(path.join(root, "review"))).isSymbolicLink(), false);
  await fs.rm(path.join(root, "review"), { recursive: true });
  await fs.unlink(path.join(root, manifestName));
  await fs.symlink(path.join(outside, "state"), path.join(root, manifestName));
  await assert.rejects(syncResources(store, opts), /manifest/);
  assert.deepEqual(await fs.readdir(outside), []);
});

test("corrupt tracking state fails before applying valid remote replacements", async t => {
  const opts = { ...await fixture(t), target: "claude" };
  const store = memoryStore({ review: "Original" }, { reviewer: "Original" });
  await syncResources(store, opts);
  const file = path.join(opts.home, ".claude", "agents", manifestName);
  for (const state of ["{", JSON.stringify({ version: 2 }), JSON.stringify({ version: 1, target: "claude", resource: "agent", items: { "../escape": sourceId } })]) {
    await fs.writeFile(file, state);
    const before = await snapshot(opts.home);
    store.data.skill.review = "Changed";
    await assert.rejects(syncResources(store, { ...opts, prune: true }));
    assert.deepEqual(await snapshot(opts.home), before);
  }
});

test("lock conflicts leave installations intact and release only acquired locks", async t => {
  const opts = await fixture(t);
  const store = memoryStore({ review: "Original" }, { reviewer: "Original" });
  await syncResources(store, opts);
  const foreign = path.join(opts.home, ".codex", "agents", ".ctxbin-sync.lock");
  await fs.writeFile(foreign, "other process");
  const before = await snapshot(opts.home);
  store.data.skill.review = "Changed";
  store.data.agent.reviewer = "Changed";
  await assert.rejects(syncResources(store, opts), /sync lock/);
  assert.deepEqual(await snapshot(opts.home), before);
});

test("apply failure restores replacements, pruned entries, and manifests across targets", async t => {
  const opts = await fixture(t);
  const store = memoryStore({ review: "Original", stale: "Keep until successful prune" }, { reviewer: "Original" });
  await syncResources(store, opts);
  const before = await snapshot(opts.home);
  store.data.skill = { review: "Changed" };
  store.data.agent.reviewer = "Changed";
  const originalRename = fs.rename;
  let injected = false;
  fs.rename = async (from, to) => {
    if (!injected && from.includes(".ctxbin-sync-txn-") && path.basename(from) === "new-0" && to.endsWith("reviewer.toml")) {
      injected = true;
      throw new Error("injected rename failure");
    }
    return originalRename(from, to);
  };
  try { await assert.rejects(syncResources(store, { ...opts, prune: true }), /injected rename failure/); }
  finally { fs.rename = originalRename; }
  assert.ok(injected);
  assert.deepEqual(await snapshot(opts.home), before);
});

test("replacement preparation failure makes no destructive moves and cleans locks/backups", async t => {
  const opts = await fixture(t);
  const store = memoryStore({ review: "Original" }, { reviewer: "Original" });
  await syncResources(store, opts);
  const before = await snapshot(opts.home);
  store.data.skill.review = "Changed";
  const originalCopy = fs.copyFile;
  fs.copyFile = async (from, to, ...args) => {
    if (to.includes(".ctxbin-sync-txn-")) throw new Error("injected preparation failure");
    return originalCopy(from, to, ...args);
  };
  try { await assert.rejects(syncResources(store, opts), /injected preparation failure/); }
  finally { fs.copyFile = originalCopy; }
  assert.deepEqual(await snapshot(opts.home), before);
});

test("incomplete rollback retains a journal, old data, and locks for recovery", async t => {
  const opts = await fixture(t);
  const store = memoryStore({ review: "Original" }, { reviewer: "Original" });
  await syncResources(store, opts);
  store.data.agent.reviewer = "Changed";
  const originalRename = fs.rename;
  fs.rename = async (from, to) => {
    if (from.includes(".ctxbin-sync-txn-") && to.endsWith("reviewer.toml")) throw new Error("persistent rename failure");
    return originalRename(from, to);
  };
  try { await assert.rejects(syncResources(store, opts), /rollback was incomplete; inspect locks and backups/); }
  finally { fs.rename = originalRename; }
  const root = path.join(opts.home, ".codex", "agents");
  assert.ok(await exists(path.join(root, ".ctxbin-sync.lock")));
  const transaction = (await fs.readdir(root)).find(name => name.startsWith(".ctxbin-sync-txn-"));
  assert.ok(transaction);
  const journal = JSON.parse(await fs.readFile(path.join(root, transaction, "journal.json"), "utf8"));
  const entry = journal.operations.find(operation => operation.destination.endsWith("reviewer.toml"));
  assert.equal(TOML.parse(await fs.readFile(entry.backup, "utf8")).developer_instructions, "Original");
});

function runCli(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, "..", "dist", "cli.js"), ...args], { env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", data => stdout += data);
    child.stderr.on("data", data => stderr += data);
    child.on("error", reject);
    child.on("close", status => resolve({ status, stdout, stderr }));
  });
}

test("realistic frontmatter retains templates, comments, and line endings without Node warnings", () => {
  const emitWarning = process.emitWarning;
  process.emitWarning = () => assert.fail("frontmatter must not emit Node warnings");
  try {
    const full = "---\r\nname: review\r\ndescription: Review rules\r\n# Keep placeholder verbatim\r\nversion: {{version}}\r\n---\r\nBody\r\n";
    assert.equal(normalizeSkillMarkdown(full, "review"), full);
    const missing = "---\nversion: {{version}}\n# Authored comment\n---\nBody\n";
    const updated = normalizeSkillMarkdown(missing, "review");
    assert.ok(updated.startsWith("---\nversion: {{version}}\n# Authored comment\n"));
    assert.ok(updated.includes('name: "review"\ndescription: "Reusable instructions for review."'));
  } finally { process.emitWarning = emitWarning; }
});

test("plain colon-space descriptions are repaired locally without rewriting unrelated metadata", () => {
  const source = "---\nname: review\ndescription: 현재 엔진: commons-jexl3 3.1\nversion: {{version}}\n---\nBody\n";
  const repaired = normalizeSkillMarkdown(source, "review");
  assert.equal(repaired, source.replace("description: 현재 엔진: commons-jexl3 3.1", 'description: "현재 엔진: commons-jexl3 3.1"'));
  assert.throws(() => normalizeSkillMarkdown("---\nname: review\ndescription: okay\nother: [bad\n---\nBody", "review"));
});

test("missing metadata is inserted into flow mappings and before document-end markers as valid YAML", () => {
  const cases = [
    "{description: d}\n",
    "# keep\r\n{description: d, } # tail\r\n",
    "{version: {{version}}}\n",
    "{}\n",
    "description: d\n...\n",
    "description: d\n# keep tail\n... # end\n# after end\n",
    "name: review\n...\n",
  ];
  for (const header of cases) {
    const content = `---\n${header}---\nBody\n`;
    const result = normalizeSkillMarkdown(content, "review");
    const parsed = YAML.parseDocument(/^---\n([\s\S]*?)^---\n/m.exec(result)[1]);
    assert.deepEqual(parsed.errors, [], header);
    assert.deepEqual(parsed.warnings, [], header);
    assert.equal(parsed.get("name"), "review");
    assert.equal(parsed.get("description"), header.includes("description: d") ? "d" : "Reusable instructions for review.");
    assert.ok(result.endsWith("---\nBody\n"));
    if (header.includes("{{version}}")) assert.ok(result.includes("version: {{version}}"));
    if (header.includes("# tail")) assert.ok(result.includes("} # tail\r\n"));
  }
  const complete = "---\n{name: review, description: d, version: {{version}}}\n---\nBody\n";
  assert.equal(normalizeSkillMarkdown(complete, "review"), complete);
});

test("legacy remote agents retain each native local description and explicit remote descriptions win", async t => {
  const opts = await fixture(t);
  for (const target of ["claude", "codex"]) {
    const root = path.join(opts.home, `.${target}`, "agents");
    await fs.mkdir(root, { recursive: true });
    const content = target === "claude"
      ? "---\nname: reviewer\ndescription: Documentation-first design partner. Use when planning.\ntools: Read\n---\nOld rules"
      : "name = 'reviewer'\ndescription = 'Documentation-first designer for implementation planning.'\ndeveloper_instructions = 'Old rules'\n";
    await fs.writeFile(path.join(root, `reviewer.${target === "claude" ? "md" : "toml"}`), content);
  }
  const store = memoryStore({}, { reviewer: "Shared new rules" });
  await syncResources(store, { ...opts, force: true });
  const claudeFile = path.join(opts.home, ".claude", "agents", "reviewer.md");
  const codexFile = path.join(opts.home, ".codex", "agents", "reviewer.toml");
  assert.equal(skillFields(await fs.readFile(claudeFile, "utf8")).fields.description, "Documentation-first design partner. Use when planning.");
  assert.equal(TOML.parse(await fs.readFile(codexFile, "utf8")).description, "Documentation-first designer for implementation planning.");
  store.data.agent.reviewer = "---\nname: reviewer\ndescription: Explicit remote choice\n---\nShared rules";
  await syncResources(store, opts);
  assert.equal(TOML.parse(await fs.readFile(codexFile, "utf8")).description, "Explicit remote choice");
});

test("unmanaged skill workspaces survive unless force is explicit and preview distinguishes ownership", async t => {
  const opts = { ...await fixture(t), target: "claude" };
  const dest = path.join(opts.home, ".claude", "skills", "review");
  await fs.mkdir(path.join(dest, ".git"), { recursive: true });
  await fs.writeFile(path.join(dest, "notes.md"), "local work");
  const store = memoryStore({ review: "Remote rules" });
  const before = await snapshot(opts.home);
  const preview = await syncResources(store, { ...opts, dryRun: true });
  assert.equal(preview[0].action, "replace-unmanaged");
  await assert.rejects(syncResources(store, opts), /--force/);
  assert.deepEqual(await snapshot(opts.home), before);
  await syncResources(store, { ...opts, force: true });
  assert.equal(await exists(path.join(dest, "notes.md")), false);
  assert.ok(await exists(path.join(dest, "SKILL.md")));
});

test("constructor is unmanaged until explicitly installed and cannot bypass force via Object.prototype", async t => {
  const opts = { ...await fixture(t), target: "claude" };
  const skill = path.join(opts.home, ".claude", "skills", "constructor");
  const agentRoot = path.join(opts.home, ".claude", "agents");
  await fs.mkdir(skill, { recursive: true });
  await fs.mkdir(agentRoot, { recursive: true });
  await fs.writeFile(path.join(skill, "notes.md"), "Local notes must survive");
  await fs.writeFile(path.join(agentRoot, "constructor.md"), "Local agent");
  const store = memoryStore({ constructor: "Remote skill" }, { constructor: "Remote agent" });
  const before = await snapshot(opts.home);
  const preview = await syncResources(store, { ...opts, dryRun: true });
  assert.equal(preview.length, 2);
  assert.ok(preview.every(action => action.action === "replace-unmanaged"));
  await assert.rejects(syncResources(store, opts), /--force/);
  assert.deepEqual(await snapshot(opts.home), before);
  await syncResources(store, { ...opts, force: true });
  const state = JSON.parse(await fs.readFile(path.join(opts.home, ".claude", "skills", manifestName), "utf8"));
  assert.ok(Object.hasOwn(state.items, "constructor"));
  assert.ok((await syncResources(store, opts)).every(action => action.action === "unchanged"));
});

test("all-target force replaces an unmanaged skill link itself while leaving its external workspace intact", async t => {
  const opts = await fixture(t);
  const external = path.join(opts.home, ".codex", "skills", "review");
  const root = path.join(opts.home, ".agents", "skills");
  await fs.mkdir(external, { recursive: true });
  await fs.writeFile(path.join(external, "SKILL.md"), "Local version");
  await fs.writeFile(path.join(external, "notes.md"), "Keep this");
  await fs.mkdir(root, { recursive: true });
  await fs.symlink(external, path.join(root, "review"), "dir");
  const store = memoryStore({ review: "Remote version" });
  assert.ok((await syncResources(store, { ...opts, dryRun: true })).some(item => item.target === "codex" && item.action === "replace-unmanaged"));
  await syncResources(store, { ...opts, force: true });
  assert.equal((await fs.lstat(path.join(root, "review"))).isSymbolicLink(), false);
  assert.equal(await fs.readFile(path.join(external, "SKILL.md"), "utf8"), "Local version");
  assert.equal(await fs.readFile(path.join(external, "notes.md"), "utf8"), "Keep this");
});

test("preflight aggregates realistic invalid items across resources and installs none", async t => {
  const opts = await fixture(t);
  const store = memoryStore({ first: "---\nname: mismatch\n---\nBody", second: "---\ndescription: []\n---\nBody" },
    { third: "---\ntools: Bash\n---\nBody" });
  for (const dryRun of [true, false]) {
    await assert.rejects(syncResources(store, { ...opts, dryRun }), error => {
      for (const name of ["first", "second", "third"]) assert.ok(error.message.includes(name));
      return true;
    });
    assert.deepEqual(await fs.readdir(opts.home), []);
  }
});

test("identical managed sync avoids replacement and preserves file timestamps", async t => {
  const opts = await fixture(t);
  const store = memoryStore({ review: "Rules" }, { reviewer: "Rules" });
  await syncResources(store, opts);
  const file = path.join(opts.home, ".agents", "skills", "review", "SKILL.md");
  const original = await fs.stat(file);
  const before = await snapshot(opts.home);
  const actions = await syncResources(store, opts);
  assert.ok(actions.every(item => item.action === "unchanged"));
  assert.equal((await fs.stat(file)).mtimeMs, original.mtimeMs);
  assert.deepEqual(await snapshot(opts.home), before);
});

test("quoted tilde overrides expand to the selected home and TOML escapes DEL", async t => {
  const opts = { ...await fixture(t), target: "codex", skillsDir: "~/.codex/skills", agentsDir: "~/custom-agents" };
  await syncResources(memoryStore({ review: "Rules" }, { reviewer: "Rules\u007fwith DEL" }), opts);
  assert.ok(await exists(path.join(opts.home, ".codex", "skills", "review", "SKILL.md")));
  const text = await fs.readFile(path.join(opts.home, "custom-agents", "reviewer.toml"), "utf8");
  assert.equal(text.includes("\u007f"), false);
  assert.equal(TOML.parse(text).developer_instructions, "Rules\u007fwith DEL");
});

test("bundle requires exact SKILL.md casing consistently on every platform", async t => {
  const opts = await fixture(t);
  const input = path.join(opts.home, "case-input");
  await fs.mkdir(input);
  await fs.writeFile(path.join(input, "skill.md"), "Rules");
  await assert.rejects(syncResources(memoryStore({ review: await createSkillpackFromDir(input) }), opts), /exact root SKILL.md/);
  assert.equal(await exists(path.join(opts.home, ".agents")), false);
});

test("cleanup faults warn without masking successful apply or an original apply error", async t => {
  const opts = { ...await fixture(t), target: "claude" };
  const store = memoryStore({ review: "Original" });
  const warnings = [];
  const rm = fs.rm;
  fs.rm = async (file, ...args) => {
    if (String(file).includes(".ctxbin-sync-txn-")) throw new Error("injected cleanup fault");
    return rm(file, ...args);
  };
  try { await syncResources(store, { ...opts, onWarning: message => warnings.push(message) }); }
  finally { fs.rm = rm; }
  assert.ok(warnings.some(message => message.includes("cleanup")));
  const file = path.join(opts.home, ".claude", "skills", "review", "SKILL.md");
  assert.equal(skillFields(await fs.readFile(file, "utf8")).body, "Original");
  const rename = fs.rename;
  store.data.skill.review = "Changed";
  fs.rename = async () => { throw new Error("original apply fault"); };
  fs.rm = async (file, ...args) => {
    if (String(file).includes(".ctxbin-sync-txn-")) throw new Error("cleanup masks original");
    return rm(file, ...args);
  };
  try { await assert.rejects(syncResources(store, { ...opts, onWarning: message => warnings.push(message) }), /original apply fault/); }
  finally { fs.rename = rename; fs.rm = rm; }
  assert.equal(skillFields(await fs.readFile(file, "utf8")).body, "Original");
});

test("selection deduplicates names, skips invalid unselected content and refs, and previews both targets", async t => {
  const opts = { ...await fixture(t), skills: ["beta", "alpha", "alpha"], agents: ["reviewer", "reviewer"] };
  const store = memoryStore({
    alpha: "Alpha rules", beta: "Beta rules", broken: "---\nname: [bad\n---\nRules",
    "../unsafe": "Rules",
    unused: createSkillrefValue("https://github.com/example/unused", "skills/unused"),
  }, { reviewer: "Review rules", broken: "---\nmodel: unsupported\n---\nRules" });
  const fetch = global.fetch;
  global.fetch = async () => { assert.fail("unselected skillref must not download"); };
  try {
    const before = await snapshot(opts.home);
    const preview = await syncResources(store, { ...opts, dryRun: true });
    assert.equal(preview.length, 6);
    assert.deepEqual(await snapshot(opts.home), before);
    const applied = await syncResources(store, opts);
    assert.deepEqual(applied, preview);
    assert.ok(applied.every(item => ["alpha", "beta", "reviewer"].includes(item.name)));
    for (const root of [path.join(opts.home, ".claude", "skills"), path.join(opts.home, ".agents", "skills")]) {
      assert.deepEqual(Object.keys(JSON.parse(await fs.readFile(path.join(root, manifestName), "utf8")).items), ["alpha", "beta"]);
      assert.equal(await exists(path.join(root, "broken")), false);
    }
    const file = path.join(opts.home, ".claude", "skills", "alpha", "SKILL.md");
    const mtime = (await fs.stat(file)).mtimeMs;
    assert.ok((await syncResources(store, opts)).every(item => item.action === "unchanged"));
    assert.equal((await fs.stat(file)).mtimeMs, mtime);
  } finally { global.fetch = fetch; }
});

test("skill-only selection ignores the agent hash and unsafe agent destination", async t => {
  const opts = { ...await fixture(t), target: "claude", skills: ["alpha"] };
  opts.skillsDir = path.join(opts.home, "project", ".claude", "skills");
  opts.agentsDir = path.join(opts.home, "unused-agents");
  await fs.writeFile(opts.agentsDir, "Not a directory; excluded from selection");
  const store = memoryStore({ alpha: "Skill rules" }, { broken: "Invalid" });
  const list = store.list;
  store.list = hash => { assert.equal(hash, "skill"); return list(hash); };
  const before = await snapshot(opts.home);
  await syncResources(store, { ...opts, dryRun: true });
  assert.deepEqual(await snapshot(opts.home), before);
  const actions = await syncResources(store, opts);
  assert.equal(actions.length, 1);
  assert.ok(await exists(path.join(opts.skillsDir, "alpha", "SKILL.md")));
  assert.equal(await fs.readFile(opts.agentsDir, "utf8"), "Not a directory; excluded from selection");
  assert.equal(await exists(path.join(opts.home, ".claude")), false);
  assert.deepEqual(store.calls, ["skill", "skill"]);
});

test("agent-only selection skips the skill hash and installs native TOML into a project override", async t => {
  const opts = { ...await fixture(t), target: "codex", agents: ["reviewer"] };
  opts.skillsDir = path.join(opts.home, "unused-skills");
  opts.agentsDir = path.join(opts.home, "project", ".codex", "agents");
  await fs.writeFile(opts.skillsDir, "Excluded skill destination");
  const store = memoryStore({ broken: "Invalid" }, {
    reviewer: "---\nname: reviewer\ndescription: Review after implementation.\n---\nReview rules.",
    "../unsafe": "Invalid",
  });
  const list = store.list;
  store.list = hash => { assert.equal(hash, "agent"); return list(hash); };
  const actions = await syncResources(store, opts);
  assert.equal(actions.length, 1);
  const agent = TOML.parse(await fs.readFile(path.join(opts.agentsDir, "reviewer.toml"), "utf8"));
  assert.equal(agent.description, "Review after implementation.");
  assert.equal(agent.developer_instructions, "Review rules.");
  assert.deepEqual(store.calls, ["agent"]);
  assert.equal(await exists(path.join(opts.home, ".agents")), false);
});

test("invalid selector arrays and names fail before store reads or writes", async t => {
  const opts = await fixture(t);
  const store = memoryStore({ alpha: "Rules" });
  for (const selection of [{ skills: [] }, { agents: [] }, { skills: "alpha" }, { skills: [1] },
    { skills: ["../escape"] }, { agents: [""] }, { skills: ["*"] }]) {
    await assert.rejects(syncResources(store, { ...opts, ...selection }),
      err => err.code === "INVALID_INPUT" || err.code === "INVALID_PATH");
  }
  assert.deepEqual(store.calls, []);
  assert.deepEqual(await snapshot(opts.home), {});
});

test("missing selected names are aggregated and prevent applying otherwise valid replacements", async t => {
  const opts = await fixture(t);
  const store = memoryStore({ alpha: "Original" }, { reviewer: "Original" });
  await syncResources(store, opts);
  store.data.skill.alpha = "Changed";
  const before = await snapshot(opts.home);
  for (const dryRun of [true, false]) {
    await assert.rejects(syncResources(store, { ...opts, skills: ["alpha", "missing-skill"], agents: ["missing-agent"], dryRun }),
      err => err.code === "NOT_FOUND" && /missing-skill/.test(err.message) && /missing-agent/.test(err.message));
    assert.deepEqual(await snapshot(opts.home), before);
  }
});

test("selective prune keeps unselected tracking, other-source installs, and unmanaged entries", async t => {
  const opts = await fixture(t);
  const store = memoryStore({ drop: "Remove", retained: "Unselected stale", foreign: "Original" }, { reviewer: "Agent" });
  await syncResources(store, opts);
  await syncResources(memoryStore({ foreign: "Other store" }), { ...opts, sourceId: secondSource, skills: ["foreign"] });
  const roots = [path.join(opts.home, ".claude", "skills"), path.join(opts.home, ".agents", "skills")];
  for (const root of roots) {
    await fs.mkdir(path.join(root, "local"));
    await fs.writeFile(path.join(root, "local", "notes.md"), "Unmanaged work");
  }
  store.data.skill = {};
  store.data.agent.reviewer = "Unselected change";
  const selected = { ...opts, skills: ["drop"], prune: true };
  const before = await snapshot(opts.home);
  for (const name of ["foreign", "local", "already-gone"]) {
    await assert.rejects(syncResources(store, { ...selected, skills: ["drop", name] }),
      err => err.code === "NOT_FOUND" && /same-source installation tracking/.test(err.message));
    assert.deepEqual(await snapshot(opts.home), before);
  }
  const preview = await syncResources(store, { ...selected, dryRun: true });
  assert.equal(preview.length, 2);
  assert.ok(preview.every(item => item.action === "delete" && item.name === "drop"));
  assert.deepEqual(await snapshot(opts.home), before);
  assert.deepEqual(await syncResources(store, selected), preview);
  for (const root of roots) {
    assert.equal(await exists(path.join(root, "drop")), false);
    assert.ok(await exists(path.join(root, "retained", "SKILL.md")));
    assert.equal(await fs.readFile(path.join(root, "local", "notes.md"), "utf8"), "Unmanaged work");
    const items = JSON.parse(await fs.readFile(path.join(root, manifestName), "utf8")).items;
    assert.deepEqual(items, { foreign: secondSource, retained: sourceId });
  }
  assert.equal(skillFields(await fs.readFile(path.join(opts.home, ".claude", "agents", "reviewer.md"), "utf8")).body, "Agent");
  const after = await snapshot(opts.home);
  await assert.rejects(syncResources(store, selected), err => err.code === "NOT_FOUND");
  assert.deepEqual(await snapshot(opts.home), after);
  const fullPrune = await syncResources(store, { ...opts, prune: true });
  assert.equal(fullPrune.filter(item => item.name === "retained" && item.action === "delete").length, 2);
  for (const root of roots) assert.ok(await exists(path.join(root, "foreign", "SKILL.md")));
});

test("prune accepts tracking from one selected target even when its local item is already missing", async t => {
  const opts = await fixture(t);
  const store = memoryStore({ workflow: "Rules" });
  await syncResources(store, { ...opts, target: "claude", skills: ["workflow"] });
  await fs.rm(path.join(opts.home, ".claude", "skills", "workflow"), { recursive: true });
  store.data.skill = {};
  const before = await snapshot(opts.home);
  await assert.rejects(syncResources(store, { ...opts, target: "codex", skills: ["workflow"], prune: true }),
    err => err.code === "NOT_FOUND");
  assert.deepEqual(await snapshot(opts.home), before);
  const selection = { ...opts, skills: ["workflow"], prune: true };
  assert.deepEqual(await syncResources(store, { ...selection, dryRun: true }), []);
  assert.deepEqual(await snapshot(opts.home), before);
  assert.deepEqual(await syncResources(store, selection), []);
  const manifest = JSON.parse(await fs.readFile(path.join(opts.home, ".claude", "skills", manifestName), "utf8"));
  assert.deepEqual(manifest.items, {});
});

test("force authorizes only selected unmanaged collisions", async t => {
  const opts = { ...await fixture(t), target: "claude", skills: ["alpha"] };
  const store = memoryStore({ alpha: "Original", beta: "Remote beta", other: "Remote other" });
  await syncResources(store, opts);
  const root = path.join(opts.home, ".claude", "skills");
  for (const name of ["beta", "other"]) {
    await fs.mkdir(path.join(root, name));
    await fs.writeFile(path.join(root, name, "notes.md"), "Local work");
  }
  assert.equal((await syncResources(store, opts))[0].action, "unchanged");
  const before = await snapshot(opts.home);
  await assert.rejects(syncResources(store, { ...opts, skills: ["beta"] }), /unmanaged destination/);
  assert.deepEqual(await snapshot(opts.home), before);
  const preview = await syncResources(store, { ...opts, skills: ["beta"], dryRun: true });
  assert.equal(preview[0].action, "replace-unmanaged");
  await syncResources(store, { ...opts, skills: ["beta"], force: true });
  assert.equal(await exists(path.join(root, "beta", "notes.md")), false);
  assert.equal(await fs.readFile(path.join(root, "other", "notes.md"), "utf8"), "Local work");
  const items = JSON.parse(await fs.readFile(path.join(root, manifestName), "utf8")).items;
  assert.deepEqual(Object.keys(items), ["alpha", "beta"]);
});

test("selective multi-target apply failure restores selected files and all unselected tracking", async t => {
  const opts = await fixture(t);
  const store = memoryStore({ alpha: "Original", retained: "Keep" }, { reviewer: "Original", other: "Keep" });
  await syncResources(store, opts);
  const before = await snapshot(opts.home);
  store.data.skill.alpha = "Changed";
  store.data.agent.reviewer = "Changed";
  const rename = fs.rename;
  let failed = false;
  fs.rename = async (from, to) => {
    if (!failed && String(from).includes(".ctxbin-sync-txn-") && String(to).endsWith(path.join(".codex", "agents", "reviewer.toml"))) {
      failed = true;
      throw new Error("selective apply fault");
    }
    return rename(from, to);
  };
  try { await assert.rejects(syncResources(store, { ...opts, skills: ["alpha"], agents: ["reviewer"] }), /selective apply fault/); }
  finally { fs.rename = rename; }
  assert.equal(failed, true);
  assert.deepEqual(await snapshot(opts.home), before);
});

test("CLI requires explicit target and rejects foreign/conflicting sync flags before config", async () => {
  const env = { ...process.env, CTXBIN_STORE_URL: "", CTXBIN_STORE_TOKEN: "" };
  for (const args of [
    ["sync"], ["sync", "--target", "other"], ["sync", "extra", "--target", "claude"],
    ["sync", "--target", "claude", "--file", "rules.md"],
    ["sync", "--target", "all", "--skills-dir", "custom"],
    ["skill", "list", "--prune"], ["help", "--dry-run"],
    ["agent", "list", "--force"],
    ["agent", "save", "reviewer", "--skill", "alpha"], ["help", "--agent", "reviewer"],
    ["sync", "--target", "claude", "--skill"],
  ]) {
    const result = await runCli(args, env);
    assert.equal(result.status, 1, JSON.stringify(args));
    assert.match(result.stderr, /CTXBIN_ERR INVALID_INPUT/);
    assert.doesNotMatch(result.stderr, /missing CTXBIN_STORE/);
  }
  for (const flag of ["--skill", "--agent"]) {
    for (const name of ["", "../escape", "*", "alpha,beta"]) {
      const result = await runCli(["sync", "--target", "claude", flag, name], env);
      assert.match(result.stderr, /CTXBIN_ERR INVALID_PATH/);
      assert.doesNotMatch(result.stderr, /missing CTXBIN_STORE/);
    }
  }
});

test("CLI repeated selectors install only requested project entries and preserve authored agent metadata", async t => {
  const opts = await fixture(t);
  const calls = [];
  const authored = "---\nname: reviewer\ndescription: Review after implementation.\n---\nReview rules.\n";
  const data = { skill: { alpha: "Alpha", beta: "Beta", broken: "---\nname: [broken\n---\nRules" }, agent: {} };
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => {
      const [command, hash, field, value] = JSON.parse(Buffer.concat(chunks));
      calls.push([command, hash]);
      let result;
      if (command === "HGETALL") result = Object.entries(data[hash]).flat();
      else if (command === "HSET") { data[hash][field] = value; result = 1; }
      else if (command === "HGET") result = data[hash][field] ?? null;
      else assert.fail(`unexpected command ${command}`);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ result }));
    });
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const env = { ...process.env, CTXBIN_STORE_URL: `http://127.0.0.1:${server.address().port}`, CTXBIN_STORE_TOKEN: "test-token" };
  const input = path.join(opts.home, "reviewer.md");
  await fs.writeFile(input, authored);
  assert.equal((await runCli(["agent", "save", "reviewer", "--file", input], env)).status, 0);
  const loaded = await runCli(["agent", "load", "reviewer"], env);
  assert.equal(loaded.stdout, authored);
  assert.match(data.agent.reviewer, /^ctxbin-meta@1/);
  const skills = path.join(opts.home, "project", ".agents", "skills");
  const agents = path.join(opts.home, "project", ".codex", "agents");
  const base = ["sync", "--target", "codex", "--skills-dir", skills, "--agents-dir", agents];
  const selection = ["--skill", "alpha", "--skill", "beta", "--skill", "alpha", "--agent", "reviewer"];
  const preview = await runCli([...base, ...selection, "--dry-run"], env);
  assert.equal(preview.status, 0, preview.stderr);
  assert.equal(preview.stdout.trim().split("\n").length, 3);
  assert.equal(await exists(skills), false);
  const applied = await runCli([...base, ...selection], env);
  assert.equal(applied.status, 0, applied.stderr);
  assert.equal(applied.stdout.trim().split("\n").length, 3);
  const agent = TOML.parse(await fs.readFile(path.join(agents, "reviewer.toml"), "utf8"));
  assert.equal(agent.description, "Review after implementation.");
  assert.equal(agent.developer_instructions, "Review rules.\n");
  assert.equal(await exists(path.join(skills, "broken")), false);
  const before = await snapshot(opts.home);
  const missing = await runCli([...base, "--skill", "missing"], env);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /CTXBIN_ERR NOT_FOUND/);
  assert.equal(missing.stdout, "");
  assert.deepEqual(await snapshot(opts.home), before);
  for (const dryRun of [[], ["--dry-run"]]) {
    const typo = await runCli([...base, "--skill", "alhpa", "--prune", ...dryRun], env);
    assert.equal(typo.status, 1);
    assert.match(typo.stderr, /CTXBIN_ERR NOT_FOUND/);
    assert.equal(typo.stdout, "");
    assert.deepEqual(await snapshot(opts.home), before);
  }
  delete data.skill.alpha;
  const start = calls.length;
  const pruned = await runCli([...base, "--skill", "alpha", "--prune"], env);
  assert.equal(pruned.status, 0, pruned.stderr);
  assert.match(pruned.stdout, /^delete\tcodex\tskill\talpha\t/);
  assert.deepEqual(calls.slice(start), [["HGETALL", "skill"]]);
  assert.equal(await exists(path.join(skills, "alpha")), false);
  assert.ok(await exists(path.join(skills, "beta", "SKILL.md")));
  assert.ok(await exists(path.join(agents, "reviewer.toml")));
});

test("CLI mock-store sync prints stable actions and never uploads", async t => {
  const opts = await fixture(t);
  const calls = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => {
      const [command, hash] = JSON.parse(Buffer.concat(chunks));
      calls.push([command, hash]);
      assert.equal(command, "HGETALL");
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ result: hash === "skill" ? ["review", "Skill rules"] : ["reviewer", "Agent rules"] }));
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const env = { ...process.env, CTXBIN_STORE_URL: `http://127.0.0.1:${server.address().port}`, CTXBIN_STORE_TOKEN: "test-token" };
  const skills = path.join(opts.home, "skills");
  const agents = path.join(opts.home, "agents");
  const args = ["sync", "--target", "codex", "--skills-dir", skills, "--agents-dir", agents];
  const preview = await runCli([...args, "--dry-run"], env);
  assert.equal(preview.status, 0, preview.stderr);
  assert.match(preview.stdout, /^dry-run\tcreate\tcodex\tskill\treview\t/);
  assert.equal(await exists(skills), false);
  const applied = await runCli(args, env);
  assert.equal(applied.status, 0, applied.stderr);
  assert.match(applied.stdout, /^create\tcodex\tskill\treview\t/);
  assert.ok(await exists(path.join(agents, "reviewer.toml")));
  assert.equal(calls.length, 4);
  assert.ok(calls.every(([command]) => command === "HGETALL"));
  const state = await fs.readFile(path.join(skills, manifestName), "utf8");
  assert.doesNotMatch(state, /test-token|127\.0\.0\.1/);
});
