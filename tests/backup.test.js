const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { backupResources, parseResourceBackup, readResourceBackup, restoreResources,
  syncSourceId, createSkillpackFromDir, createSkillrefValue, CtxbinError } = require("../dist/index.js");

const sourceId = syncSourceId("https://backup-store.invalid");
function memoryStore(skill = [], agent = []) {
  const data = { skill: new Map(skill), agent: new Map(agent) };
  const calls = [];
  const check = (command, resource, field) => {
    assert.ok(resource === "skill" || resource === "agent", "backup/restore must never access ctx");
    calls.push([command, resource, field]);
  };
  return {
    data, calls,
    async list(resource) { check("list", resource); return [...data[resource]].map(([field, value]) => ({ field, value })); },
    async get(resource, field) { check("get", resource, field); return data[resource].get(field) ?? null; },
    async set(resource, field, value) { check("set", resource, field); data[resource].set(field, value); },
    async delete(resource, field) { check("delete", resource, field); data[resource].delete(field); },
  };
}
const state = store => ({ skill: [...store.data.skill], agent: [...store.data.agent] });
const writes = store => store.calls.filter(([command]) => command === "set" || command === "delete");
async function fixture(t, store = memoryStore()) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ctxbin-backup-test-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return { dir, store, file: path.join(dir, "backups", "resources.json") };
}
async function capture(t, store) {
  const opts = await fixture(t, store);
  await backupResources(store, { file: opts.file, sourceId });
  return { ...opts, backup: await readResourceBackup(opts.file) };
}

test("backup preserves raw metadata, frontmatter, packs, refs, and arbitrary Redis fields", async t => {
  const opts = await fixture(t);
  const packDir = path.join(opts.dir, "input-pack");
  await fs.mkdir(packDir);
  await fs.writeFile(path.join(packDir, "SKILL.md"), "Pack rules");
  await fs.writeFile(path.join(packDir, "asset.txt"), "Important asset");
  const pack = await createSkillpackFromDir(packDir);
  const ref = createSkillrefValue("https://github.com/example/source", "skills/example");
  const metadata = 'ctxbin-meta@1\n{"savedAt":"original","by":"author"}\n---\n---\nname: reviewer\ndescription: Review after implementation.\n---\nRules\r\n';
  const store = memoryStore([["pack", pack], ["ref", ref], ["__proto__", "---\ninvalid YAML"], ["", ""]],
    [["folder/legacy", metadata], ["constructor", "Original rules"]]);
  const fetch = global.fetch;
  global.fetch = async () => assert.fail("backup must not download skillref content");
  try {
    const result = await backupResources(store, { file: opts.file, sourceId });
    assert.equal(result.skills, 4);
    assert.equal(result.agents, 2);
    const backup = await readResourceBackup(opts.file);
    assert.equal(backup.sourceId, sourceId);
    assert.deepEqual(new Map(backup.resources.skill.map(({ field, value }) => [field, value])), store.data.skill);
    assert.deepEqual(new Map(backup.resources.agent.map(({ field, value }) => [field, value])), store.data.agent);
    assert.deepEqual(store.calls.map(([command, hash]) => [command, hash]), [["list", "skill"], ["list", "agent"]]);
    assert.equal(writes(store).length, 0);
    assert.equal((await fs.readFile(opts.file, "utf8")).includes("https://backup-store.invalid"), false);
    if (process.platform !== "win32") assert.equal((await fs.stat(opts.file)).mode & 0o777, 0o600);
    const recovered = memoryStore();
    await restoreResources(recovered, backup);
    assert.deepEqual(recovered.data, store.data);
  } finally { global.fetch = fetch; }
});

test("empty backups restore without remote reads or writes", async t => {
  const { backup } = await capture(t, memoryStore());
  const target = memoryStore([["keep", "Unrelated"]]);
  assert.deepEqual(await restoreResources(target, backup), []);
  assert.deepEqual(target.calls, []);
  assert.equal(target.data.skill.get("keep"), "Unrelated");
});

test("existing backups require force and failed captures preserve previous bytes", async t => {
  const store = memoryStore([["workflow", "Original"]]);
  const opts = await capture(t, store);
  const original = await fs.readFile(opts.file);
  store.calls.length = 0;
  store.data.skill.set("workflow", "Changed");
  await assert.rejects(backupResources(store, { file: opts.file, sourceId }),
    err => err.code === "INVALID_INPUT" && /already exists/.test(err.message));
  assert.deepEqual(store.calls, []);
  assert.deepEqual(await fs.readFile(opts.file), original);
  const list = store.list;
  store.list = hash => hash === "agent" ? Promise.reject(new Error("capture failed")) : list(hash);
  await assert.rejects(backupResources(store, { file: opts.file, sourceId, force: true }), /capture failed/);
  assert.deepEqual(await fs.readFile(opts.file), original);
  store.list = list;
  await backupResources(store, { file: opts.file, sourceId, force: true });
  assert.equal((await readResourceBackup(opts.file)).resources.skill[0].value, "Changed");
});

test("force preserves valid backups when source changes or either resource unexpectedly empties", async t => {
  const store = memoryStore([["workflow", "Original"]], [["reviewer", "Rules"]]);
  const opts = await capture(t, store);
  const original = await fs.readFile(opts.file);
  await assert.rejects(backupResources(store, { file: opts.file,
    sourceId: syncSourceId("https://another-store.invalid"), force: true }),
    err => err.code === "INVALID_INPUT" && /another store/.test(err.message));
  assert.deepEqual(await fs.readFile(opts.file), original);
  for (const resource of ["skill", "agent"]) {
    const saved = store.data[resource];
    store.data[resource] = new Map();
    await assert.rejects(backupResources(store, { file: opts.file, sourceId, force: true }),
      err => err.code === "INVALID_INPUT" && err.message.includes(`nonempty ${resource}`));
    assert.deepEqual(await fs.readFile(opts.file), original);
    store.data[resource] = saved;
  }
  const emptyFile = path.join(opts.dir, "empty.json");
  await backupResources(memoryStore(), { file: emptyFile, sourceId });
  assert.equal((await readResourceBackup(emptyFile)).resources.skill.length, 0);
  const corrupt = path.join(opts.dir, "corrupt.json");
  await fs.writeFile(corrupt, "invalid old file");
  await backupResources(store, { file: corrupt, sourceId, force: true });
  assert.equal((await readResourceBackup(corrupt)).resources.skill[0].value, "Original");
});

test("force replacement rechecks a backup changed while staging", async t => {
  const opts = await capture(t, memoryStore([["workflow", "Original"]]));
  const foreign = { ...opts.backup, sourceId: syncSourceId("https://another-store.invalid") };
  const bytes = JSON.stringify(foreign);
  const open = fs.open;
  fs.open = async (...args) => {
    const handle = await open(...args);
    if (String(args[0]).includes(".ctxbin-backup-")) {
      const writeFile = handle.writeFile.bind(handle);
      handle.writeFile = async (...writeArgs) => {
        await writeFile(...writeArgs);
        await fs.writeFile(opts.file, bytes);
      };
    }
    return handle;
  };
  try { await assert.rejects(backupResources(opts.store, { file: opts.file, sourceId, force: true }), /another store/); }
  finally { fs.open = open; }
  assert.equal(await fs.readFile(opts.file, "utf8"), bytes);
  assert.deepEqual(await fs.readdir(path.dirname(opts.file)), ["resources.json"]);
});

test("unsupported hard links have actionable errors and explicit force uses staged rename", async t => {
  const opts = await fixture(t, memoryStore([["workflow", "Rules"]]));
  const link = fs.link;
  let attempts = 0;
  fs.link = async () => { attempts++; throw Object.assign(new Error("unsupported"), { code: "ENOTSUP" }); };
  try {
    await assert.rejects(backupResources(opts.store, { file: opts.file, sourceId }),
      err => err.code === "IO" && /--force.*rename/.test(err.message));
    await assert.rejects(fs.stat(opts.file), err => err.code === "ENOENT");
    await backupResources(opts.store, { file: opts.file, sourceId, force: true });
    assert.equal((await readResourceBackup(opts.file)).resources.skill[0].value, "Rules");
    assert.equal(attempts, 1);
  } finally { fs.link = link; }
});

test("backup accepts a BOM and capture/restore ordering is independent of locale", async t => {
  const keys = ["z", "ä", "A", "a", "Å", "Z"];
  const opts = await fixture(t, memoryStore(keys.map(key => [key, `Value for ${key}`])));
  const localeCompare = String.prototype.localeCompare;
  String.prototype.localeCompare = () => assert.fail("snapshot order must not depend on locale");
  try {
    await backupResources(opts.store, { file: opts.file, sourceId });
    const raw = await fs.readFile(opts.file, "utf8");
    await fs.writeFile(opts.file, "\uFEFF" + raw);
    const backup = await readResourceBackup(opts.file);
    assert.deepEqual(backup.resources.skill.map(entry => entry.field), [...keys].sort());
    assert.deepEqual(parseResourceBackup(raw), backup);
    const actions = await restoreResources(memoryStore(), backup);
    assert.deepEqual(actions.map(item => item.name), [...keys].sort());
  } finally { String.prototype.localeCompare = localeCompare; }
});

test("backup refuses symlinks and directories and preserves old files on publication failure", async t => {
  const opts = await capture(t, memoryStore([["workflow", "Original"]]));
  const original = await fs.readFile(opts.file);
  const link = path.join(opts.dir, "link.json");
  await fs.symlink(opts.file, link, "file");
  for (const file of [link, opts.dir]) {
    await assert.rejects(backupResources(opts.store, { file, sourceId, force: true }), err => err.code === "INVALID_PATH");
  }
  const rename = fs.rename;
  fs.rename = async () => { throw new Error("publication fault"); };
  try { await assert.rejects(backupResources(opts.store, { file: opts.file, sourceId, force: true }), /publication fault/); }
  finally { fs.rename = rename; }
  assert.deepEqual(await fs.readFile(opts.file), original);
  assert.deepEqual(await fs.readdir(path.dirname(opts.file)), ["resources.json"]);
});

test("backup exclusive publication preserves a concurrently created destination", async t => {
  const opts = await fixture(t, memoryStore([["workflow", "Rules"]]));
  const link = fs.link;
  fs.link = async (from, to) => {
    await fs.writeFile(to, "Concurrent backup");
    return link(from, to);
  };
  try { await assert.rejects(backupResources(opts.store, { file: opts.file, sourceId }), err => err.code === "EEXIST"); }
  finally { fs.link = link; }
  assert.equal(await fs.readFile(opts.file, "utf8"), "Concurrent backup");
  assert.deepEqual(await fs.readdir(path.dirname(opts.file)), ["resources.json"]);
});

test("backup cleanup failure reports a warning without changing successful publication", async t => {
  const opts = await fixture(t, memoryStore([["workflow", "Rules"]]));
  const rm = fs.rm;
  const write = process.stderr.write;
  const warnings = [];
  fs.rm = async (file, ...args) => String(file).includes(".ctxbin-backup-") ? Promise.reject(new Error("cleanup fault")) : rm(file, ...args);
  process.stderr.write = message => { warnings.push(String(message)); return true; };
  try {
    await backupResources(opts.store, { file: opts.file, sourceId });
    assert.equal((await readResourceBackup(opts.file)).resources.skill[0].value, "Rules");
  } finally { fs.rm = rm; process.stderr.write = write; }
  assert.ok(warnings.some(message => message.startsWith("CTXBIN_WARN:")));
});

test("backup schema, duplicate fields, and checksum are validated before store reads", async t => {
  const { backup } = await capture(t, memoryStore([["workflow", "Original"]]));
  const target = memoryStore();
  const variants = [null, {}, { ...backup, version: 2 }, { ...backup, createdAt: "invalid" },
    { ...backup, sourceId: "invalid" }, { ...backup, resources: { skill: [] } },
    { ...backup, resources: { ...backup.resources, ctx: [] } },
    { ...backup, resources: { ...backup.resources, skill: [{ field: "workflow", value: 1 }] } },
    { ...backup, resources: { ...backup.resources, skill: [backup.resources.skill[0], backup.resources.skill[0]] } },
    { ...backup, resources: { ...backup.resources, skill: [{ field: "workflow", value: "Tampered" }] } }];
  assert.throws(() => parseResourceBackup("{"), /valid JSON/);
  for (const variant of variants) {
    await assert.rejects(restoreResources(target, variant), err => err.code === "INVALID_INPUT");
  }
  assert.deepEqual(target.calls, []);
});

test("restore preview, conflicts, force, exact values, unrelated names, and repeat no-ops", async t => {
  const { backup } = await capture(t, memoryStore([["alpha", ""], ["beta", "Backup"]], [["reviewer", "Raw rules"]]));
  const target = memoryStore([["beta", "Conflict"], ["unrelated", "Keep"]], [["reviewer", "Raw rules"]]);
  const before = state(target);
  const preview = await restoreResources(target, backup, { dryRun: true });
  assert.deepEqual(preview.map(({ action }) => action), ["create", "replace", "unchanged"]);
  assert.deepEqual(state(target), before);
  await assert.rejects(restoreResources(target, backup), /use --force/);
  assert.equal(writes(target).length, 0, "reject all conflicts before creating a missing entry");
  await restoreResources(target, backup, { force: true });
  assert.equal(target.data.skill.get("alpha"), "");
  assert.equal(target.data.skill.get("beta"), "Backup");
  assert.equal(target.data.skill.get("unrelated"), "Keep");
  target.calls.length = 0;
  assert.ok((await restoreResources(target, backup)).every(item => item.action === "unchanged"));
  assert.equal(writes(target).length, 0);
});

test("restore rolls back prior and ambiguous failed writes while retaining the backup", async t => {
  const opts = await capture(t, memoryStore([["alpha", "Created"], ["beta", "Restored"]]));
  const target = memoryStore([["beta", "Original"], ["unrelated", "Keep"]]);
  const before = state(target);
  const set = target.set;
  target.set = async (hash, field, value) => {
    await set(hash, field, value);
    if (field === "beta" && value === "Restored") throw new Error("response lost after write");
  };
  await assert.rejects(restoreResources(target, opts.backup, { force: true }), /response lost after write/);
  assert.deepEqual(state(target), before);
  assert.deepEqual(await readResourceBackup(opts.file), opts.backup);
});

test("restore guards concurrent changes and reports incomplete rollback without overwriting third parties", async t => {
  const { backup } = await capture(t, memoryStore([["alpha", "Created"], ["beta", "Restored"]]));
  const target = memoryStore([["beta", "Original"]]);
  const get = target.get;
  target.get = async (hash, field) => {
    if (field === "beta") target.data.skill.set("beta", "Concurrent writer");
    return get(hash, field);
  };
  await assert.rejects(restoreResources(target, backup, { force: true }), /changed during restore/);
  assert.equal(target.data.skill.has("alpha"), false);
  assert.equal(target.data.skill.get("beta"), "Concurrent writer");
  const target2 = memoryStore();
  const set2 = target2.set;
  target2.set = async (hash, field, value) => {
    if (field === "beta") {
      target2.data.skill.set("alpha", "Concurrent writer");
      throw new Error("apply fault");
    }
    return set2(hash, field, value);
  };
  await assert.rejects(restoreResources(target2, backup), err => err.code === "IO" && /rollback incomplete/.test(err.message));
  assert.equal(target2.data.skill.get("alpha"), "Concurrent writer");
});

test("restore preserves NETWORK errors and stops rollback at the first network failure", async t => {
  const keys = Array.from({ length: 50 }, (_, index) => `key-${String(index).padStart(2, "0")}`);
  const { backup } = await capture(t, memoryStore(keys.map(key => [key, key])));
  const target = memoryStore();
  const set = target.set, get = target.get;
  let outage = false, rollbackRequests = 0;
  target.set = async (...args) => {
    await set(...args);
    if (args[1] === keys.at(-1)) {
      outage = true;
      throw new CtxbinError("NETWORK", "apply response lost");
    }
  };
  target.get = async (...args) => {
    if (outage) { rollbackRequests++; throw new CtxbinError("NETWORK", "rollback timed out"); }
    return get(...args);
  };
  await assert.rejects(restoreResources(target, backup), err => {
    assert.equal(err.code, "NETWORK");
    assert.match(err.message, /^apply response lost; restore rollback incomplete/);
    assert.match(err.message, /rollback stopped after NETWORK/);
    assert.doesNotMatch(err.message, /CTXBIN_ERR/);
    for (const key of keys) assert.ok(err.message.includes(JSON.stringify(key)), key);
    return true;
  });
  assert.equal(rollbackRequests, 1, "an outage must not incur one timeout per attempted key");
  assert.equal(target.data.skill.size, 50);
});

function runCli(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, "..", "dist", "cli.js"), ...args], { env });
    let stdout = "", stderr = "";
    child.stdout.on("data", chunk => stdout += chunk);
    child.stderr.on("data", chunk => stderr += chunk);
    child.on("error", reject);
    child.on("close", status => resolve({ status, stdout, stderr }));
  });
}

test("backup/restore CLI validates flags and corrupt input before configuration access", async t => {
  const opts = await fixture(t);
  const env = { ...process.env, CTXBIN_STORE_URL: "invalid", CTXBIN_STORE_TOKEN: "test" };
  for (const args of [["backup"], ["restore"], ["backup", "extra", "--file", opts.file],
    ["backup", "--file", opts.file, "--dry-run"], ["backup", "--file", opts.file, "--target", "all"],
    ["restore", "--file", opts.file, "--prune"], ["restore", "--file", opts.file, "--skill", "workflow"]]) {
    const result = await runCli(args, env);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /CTXBIN_ERR INVALID_INPUT/);
    assert.doesNotMatch(result.stderr, /CTXBIN_ERR NETWORK/);
  }
  const bad = path.join(opts.dir, "bad.json");
  await fs.writeFile(bad, "{}");
  const result = await runCli(["restore", "--file", bad], env);
  assert.match(result.stderr, /invalid ctxbin backup schema/);
  assert.doesNotMatch(result.stderr, /CTXBIN_ERR NETWORK/);
});

test("CLI backup rejects malformed store snapshots instead of replacing an existing backup with empty data", async t => {
  const opts = await capture(t, memoryStore([["workflow", "Original"]]));
  const original = await fs.readFile(opts.file);
  let reply = {};
  const server = http.createServer((req, res) => {
    req.resume();
    req.on("end", () => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(reply)); });
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const env = { ...process.env, CTXBIN_STORE_URL: `http://127.0.0.1:${server.address().port}`, CTXBIN_STORE_TOKEN: "test-token" };
  for (reply of [{}, { result: null }, { result: false }, { result: 0 }]) {
    const result = await runCli(["backup", "--file", opts.file, "--force"], env);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /CTXBIN_ERR NETWORK/);
    assert.deepEqual(await fs.readFile(opts.file), original);
  }
});

test("CLI restore reports one NETWORK prefix and stops requests when rollback cannot reach the store", async t => {
  const opts = await capture(t, memoryStore([["alpha", "One"], ["beta", "Two"]]));
  let outage = false, rollbackRequests = 0;
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => {
      const [command, , field] = JSON.parse(Buffer.concat(chunks));
      if (outage || (command === "HSET" && field === "beta")) {
        if (outage) rollbackRequests++;
        outage = true;
        res.statusCode = 503;
        res.end("store unavailable");
        return;
      }
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ result: command === "HGETALL" ? [] : command === "HGET" ? null : 1 }));
    });
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const env = { ...process.env, CTXBIN_STORE_URL: `http://127.0.0.1:${server.address().port}`, CTXBIN_STORE_TOKEN: "test-token" };
  const result = await runCli(["restore", "--file", opts.file], env);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^CTXBIN_ERR NETWORK:/);
  assert.equal((result.stderr.match(/CTXBIN_ERR/g) || []).length, 1);
  assert.match(result.stderr, /rollback incomplete.*skill:"beta".*skill:"alpha"/);
  assert.equal(rollbackRequests, 1);
});

test("CLI backup and restore recover original remote data after loss without native installation", async t => {
  const originalAgent = 'ctxbin-meta@1\n{"savedAt":"original","by":"author"}\n---\n---\nname: reviewer\ndescription: Review after implementation.\n---\nRules\n';
  const store = memoryStore([["workflow", "Original skill"], ["empty", ""]], [["reviewer", originalAgent]]);
  const opts = await fixture(t, store);
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", async () => {
      const [command, hash, field, value] = JSON.parse(Buffer.concat(chunks));
      let result;
      if (command === "HGETALL") result = (await store.list(hash)).flatMap(entry => [entry.field, entry.value]);
      else if (command === "HGET") result = await store.get(hash, field);
      else if (command === "HSET") { await store.set(hash, field, value); result = 1; }
      else if (command === "HDEL") { await store.delete(hash, field); result = 1; }
      else assert.fail(`unexpected command ${command}`);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ result }));
    });
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  const env = { ...process.env, CTXBIN_STORE_URL: url, CTXBIN_STORE_TOKEN: "backup-test-token", CTXBIN_QUIET: "0" };
  const saved = await runCli(["backup", "--file", opts.file], env);
  assert.equal(saved.status, 0, saved.stderr);
  assert.match(saved.stdout, /^backup\t/);
  assert.match(saved.stderr, /CTXBIN_OK: backup saved/);
  const raw = await fs.readFile(opts.file, "utf8");
  assert.equal(raw.includes(url), false);
  assert.equal(raw.includes("backup-test-token"), false);
  store.data.skill.clear(); store.data.agent.clear();
  store.data.skill.set("unrelated", "Keep");
  const before = state(store);
  const preview = await runCli(["restore", "--file", opts.file, "--dry-run"], env);
  assert.equal(preview.status, 0, preview.stderr);
  assert.match(preview.stdout, /^dry-run\tcreate\tskill\t/);
  assert.deepEqual(state(store), before);
  const restored = await runCli(["restore", "--file", opts.file], env);
  assert.equal(restored.status, 0, restored.stderr);
  assert.equal(store.data.skill.get("workflow"), "Original skill");
  assert.equal(store.data.skill.get("empty"), "");
  assert.equal(store.data.agent.get("reviewer"), originalAgent);
  assert.equal(store.data.skill.get("unrelated"), "Keep");
  const loaded = await runCli(["agent", "load", "reviewer"], env);
  assert.match(loaded.stdout, /^---\nname: reviewer\ndescription:/);
  assert.equal(loaded.stdout.includes("ctxbin-meta@1"), false);
  assert.deepEqual(await fs.readdir(opts.dir), ["backups"]);
});
