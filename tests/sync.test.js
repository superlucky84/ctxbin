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
  const match = /^---\n([\s\S]*?)\n---\n/.exec(content);
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

test("symlinked roots, provider parents, entries, and manifests fail closed", async t => {
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
  await assert.rejects(syncResources(store, opts), /symlink/);
  await fs.unlink(path.join(root, "review"));
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

test("CLI requires explicit target and rejects foreign/conflicting sync flags before config", async () => {
  const env = { ...process.env, CTXBIN_STORE_URL: "", CTXBIN_STORE_TOKEN: "" };
  for (const args of [
    ["sync"], ["sync", "--target", "other"], ["sync", "extra", "--target", "claude"],
    ["sync", "--target", "claude", "--file", "rules.md"],
    ["sync", "--target", "all", "--skills-dir", "custom"],
    ["skill", "list", "--prune"], ["help", "--dry-run"],
  ]) {
    const result = await runCli(args, env);
    assert.equal(result.status, 1, JSON.stringify(args));
    assert.match(result.stderr, /CTXBIN_ERR INVALID_INPUT/);
    assert.doesNotMatch(result.stderr, /missing CTXBIN_STORE/);
  }
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
