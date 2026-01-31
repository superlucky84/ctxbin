const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const crypto = require("node:crypto");
const { execFileSync, spawn } = require("node:child_process");

const {
  SKILLPACK_HEADER,
  SKILLREF_HEADER,
  createSkillrefValue,
  loadSkillrefToDir,
  safeChmod,
  CtxbinError,
} = require("../dist/index.js");

const CLI_PATH = path.join(__dirname, "..", "dist", "cli.js");

function runCli(args, options = {}) {
  return new Promise((resolve) => {
    const proc = spawn("node", [CLI_PATH, ...args], {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));

    proc.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

function hasGit() {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function createMockUpstash() {
  const data = new Map();
  const sockets = new Set();

  const server = http.createServer((req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end();
      return;
    }
    res.setHeader("Connection", "close");

    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      let payload;
      try {
        payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "invalid JSON" }));
        return;
      }

      if (!Array.isArray(payload)) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "invalid payload" }));
        return;
      }

      const [cmd, ...args] = payload;
      let result = null;

      switch (cmd) {
        case "HGET": {
          const [hash, field] = args;
          const map = data.get(hash);
          result = map ? map.get(field) ?? null : null;
          break;
        }
        case "HSET": {
          const [hash, field, value] = args;
          const map = data.get(hash) ?? new Map();
          map.set(field, value);
          data.set(hash, map);
          result = 1;
          break;
        }
        case "HDEL": {
          const [hash, field] = args;
          const map = data.get(hash);
          result = map && map.delete(field) ? 1 : 0;
          break;
        }
        case "HGETALL": {
          const [hash] = args;
          const map = data.get(hash);
          if (!map) {
            result = null;
            break;
          }
          const flat = [];
          for (const [field, value] of map.entries()) {
            flat.push(field, value);
          }
          result = flat;
          break;
        }
        default:
          res.statusCode = 400;
          res.end(JSON.stringify({ error: `unknown command ${cmd}` }));
          return;
      }

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ result }));
    });
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  server.unref();
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}`;
  return {
    url,
    data,
    close: () => {
      for (const socket of sockets) {
        socket.destroy();
      }
      return new Promise((resolve) => server.close(resolve));
    },
  };
}

async function createTempGitRepo() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ctxbin-git-"));
  execFileSync("git", ["init"], { cwd: dir, stdio: "ignore" });
  execFileSync(
    "git",
    ["-c", "user.name=ctxbin", "-c", "user.email=ctxbin@example.com", "commit", "-m", "init", "--allow-empty"],
    { cwd: dir, stdio: "ignore" }
  );
  const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: dir,
    encoding: "utf8",
  }).trim();
  const project = path.basename(dir);
  return { dir, branch, project };
}

test("ctx key inference uses repo name and branch", async (t) => {
  if (!hasGit()) {
    t.skip("git not available");
    return;
  }

  const repo = await createTempGitRepo();
  const store = await createMockUpstash();
  const env = {
    ...process.env,
    CTXBIN_STORE_URL: store.url,
    CTXBIN_STORE_TOKEN: "test",
  };

  try {
    const result = await runCli(["ctx", "save", "--value", "hello"], { cwd: repo.dir, env });
    assert.equal(result.status, 0, result.stderr);
    const key = `${repo.project}/${repo.branch}`;
    assert.equal(store.data.get("ctx").get(key), "hello");
  } finally {
    await store.close();
    await fs.rm(repo.dir, { recursive: true, force: true });
  }
});

test("ctx key inference fails outside git repository", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ctxbin-nogit-"));
  const store = await createMockUpstash();
  const env = {
    ...process.env,
    CTXBIN_STORE_URL: store.url,
    CTXBIN_STORE_TOKEN: "test",
  };

  try {
    const result = await runCli(["ctx", "load"], { cwd: dir, env });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^CTXBIN_ERR NOT_IN_GIT:/);
  } finally {
    await store.close();
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("--append merges with existing value", async (t) => {
  if (!hasGit()) {
    t.skip("git not available");
    return;
  }

  const repo = await createTempGitRepo();
  const store = await createMockUpstash();
  const env = {
    ...process.env,
    CTXBIN_STORE_URL: store.url,
    CTXBIN_STORE_TOKEN: "test",
  };

  try {
    let result = await runCli(["ctx", "save", "--value", "first"], { cwd: repo.dir, env });
    assert.equal(result.status, 0, result.stderr);
    result = await runCli(["ctx", "save", "--append", "--value", "second"], { cwd: repo.dir, env });
    assert.equal(result.status, 0, result.stderr);
    const key = `${repo.project}/${repo.branch}`;
    assert.equal(store.data.get("ctx").get(key), "first\n\nsecond");
  } finally {
    await store.close();
    await fs.rm(repo.dir, { recursive: true, force: true });
  }
});

test("--append sets value when missing", async (t) => {
  if (!hasGit()) {
    t.skip("git not available");
    return;
  }

  const repo = await createTempGitRepo();
  const store = await createMockUpstash();
  const env = {
    ...process.env,
    CTXBIN_STORE_URL: store.url,
    CTXBIN_STORE_TOKEN: "test",
  };

  try {
    const result = await runCli(["ctx", "save", "--append", "--value", "solo"], {
      cwd: repo.dir,
      env,
    });
    assert.equal(result.status, 0, result.stderr);
    const key = `${repo.project}/${repo.branch}`;
    assert.equal(store.data.get("ctx").get(key), "solo");
  } finally {
    await store.close();
    await fs.rm(repo.dir, { recursive: true, force: true });
  }
});

test("skillpack extraction normalizes permissions", async (t) => {
  if (process.platform === "win32") {
    t.skip("permissions are not enforced on Windows");
    return;
  }

  const store = await createMockUpstash();
  const env = {
    ...process.env,
    CTXBIN_STORE_URL: store.url,
    CTXBIN_STORE_TOKEN: "test",
  };

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ctxbin-skillpack-"));
  const srcDir = path.join(tmp, "src");
  const outDir = path.join(tmp, "out");

  try {
    await fs.mkdir(srcDir);
    const scriptPath = path.join(srcDir, "script.sh");
    const notePath = path.join(srcDir, "note.txt");
    await fs.writeFile(scriptPath, "#!/bin/sh\necho ok\n");
    await fs.writeFile(notePath, "note");
    await fs.chmod(scriptPath, 0o755);
    await fs.chmod(notePath, 0o644);

    let result = await runCli(["skill", "save", "perm-test", "--dir", srcDir], { env });
    assert.equal(result.status, 0, result.stderr);

    result = await runCli(["skill", "load", "perm-test", "--dir", outDir], { env });
    assert.equal(result.status, 0, result.stderr);

    const scriptMode = (await fs.stat(path.join(outDir, "script.sh"))).mode & 0o777;
    const noteMode = (await fs.stat(path.join(outDir, "note.txt"))).mode & 0o777;
    assert.equal(scriptMode, 0o755);
    assert.equal(noteMode, 0o644);
  } finally {
    await store.close();
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test("list output is sorted with type mapping", async () => {
  const store = await createMockUpstash();
  const env = {
    ...process.env,
    CTXBIN_STORE_URL: store.url,
    CTXBIN_STORE_TOKEN: "test",
  };

  try {
    let result = await runCli(["skill", "save", "zeta", "--value", "plain"], { env });
    assert.equal(result.status, 0, result.stderr);
    result = await runCli(["skill", "save", "alpha", "--value", `${SKILLPACK_HEADER}abc`], { env });
    assert.equal(result.status, 0, result.stderr);
    result = await runCli(["skill", "save", "beta", "--value", `${SKILLREF_HEADER}{}`], { env });
    assert.equal(result.status, 0, result.stderr);

    result = await runCli(["skill", "list"], { env });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "alpha\t--dir\nbeta\t--url\nzeta\t--value");
  } finally {
    await store.close();
  }
});

test("error output follows CTXBIN_ERR format", async () => {
  const store = await createMockUpstash();
  const env = {
    ...process.env,
    CTXBIN_STORE_URL: store.url,
    CTXBIN_STORE_TOKEN: "test",
  };

  try {
    const result = await runCli(["ctx", "list", "--value", "oops"], { env });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^CTXBIN_ERR INVALID_INPUT:/);
  } finally {
    await store.close();
  }
});

test("safeChmod ignores chmod errors on Windows", async (t) => {
  if (process.platform !== "win32") {
    t.skip("windows-only behavior");
    return;
  }
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ctxbin-win-"));
  try {
    await assert.doesNotReject(() => safeChmod(path.join(tmp, "missing"), 0o644));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test("skillref download behaviors", async (t) => {
  await t.test("rejects redirect to unsupported host", async () => {
    const originalFetch = global.fetch;
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ctxbin-skillref-"));
    try {
      global.fetch = async () =>
        new Response(null, { status: 302, headers: { location: "https://evil.example.com" } });

      const value = createSkillrefValue(
        "https://github.com/acme/repo",
        "skills/example",
        "a".repeat(40)
      );
      await assert.rejects(
        () => loadSkillrefToDir(value, tmp),
        (err) => err instanceof CtxbinError && err.code === "NETWORK"
      );
    } finally {
      global.fetch = originalFetch;
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  await t.test("enforces download size limit", async () => {
    const originalFetch = global.fetch;
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ctxbin-skillref-"));
    try {
      const size = 20 * 1024 * 1024 + 1;
      const big = Buffer.alloc(size, 0);
      big[0] = 0x1f;
      big[1] = 0x8b;
      global.fetch = async () => new Response(big, { status: 200 });

      const value = createSkillrefValue(
        "https://github.com/acme/repo",
        "skills/example",
        "a".repeat(40)
      );
      await assert.rejects(
        () => loadSkillrefToDir(value, tmp),
        (err) => err instanceof CtxbinError && err.code === "SIZE_LIMIT"
      );
    } finally {
      global.fetch = originalFetch;
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  await t.test("handles timeouts as network errors", async () => {
    const originalFetch = global.fetch;
    const originalSetTimeout = global.setTimeout;
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ctxbin-skillref-"));
    try {
      global.setTimeout = (fn, _ms, ...args) => originalSetTimeout(fn, 1, ...args);
      global.fetch = (_url, init = {}) =>
        new Promise((_resolve, reject) => {
          const signal = init.signal;
          if (!signal) {
            return;
          }
          if (signal.aborted) {
            reject(new Error("aborted"));
            return;
          }
          signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        });

      const value = createSkillrefValue(
        "https://github.com/acme/repo",
        "skills/example",
        "a".repeat(40)
      );
      await assert.rejects(
        () => loadSkillrefToDir(value, tmp),
        (err) => err instanceof CtxbinError && err.code === "NETWORK"
      );
    } finally {
      global.fetch = originalFetch;
      global.setTimeout = originalSetTimeout;
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});

test("upstash integration (manual)", {
  skip: !process.env.CTXBIN_STORE_URL || !process.env.CTXBIN_STORE_TOKEN,
}, async () => {
  const env = {
    ...process.env,
    CTXBIN_STORE_URL: process.env.CTXBIN_STORE_URL,
    CTXBIN_STORE_TOKEN: process.env.CTXBIN_STORE_TOKEN,
  };

  const suffix = crypto.randomUUID().slice(0, 8);
  const ctxKey = `integration-ctx-${suffix}`;
  const agentKey = `integration-agent-${suffix}`;
  const skillKey = `integration-skill-${suffix}`;
  const skillpackKey = `integration-skillpack-${suffix}`;
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ctxbin-upstash-"));
  const srcDir = path.join(tmp, "skillpack-src");
  const outDir = path.join(tmp, "skillpack-out");

  try {
    // ctx save/load + append
    let result = await runCli(["ctx", "save", ctxKey, "--value", "hello"], { env });
    assert.equal(result.status, 0, result.stderr);
    result = await runCli(["ctx", "load", ctxKey], { env });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "hello");

    result = await runCli(["ctx", "save", ctxKey, "--append", "--value", "more"], { env });
    assert.equal(result.status, 0, result.stderr);
    result = await runCli(["ctx", "load", ctxKey], { env });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "hello\n\nmore");

    // ctx list contains key
    result = await runCli(["ctx", "list"], { env });
    assert.equal(result.status, 0, result.stderr);
    const ctxLines = result.stdout.trim().split("\n");
    assert.ok(ctxLines.some((line) => line === `${ctxKey}\t--value`));

    // agent save/load/delete
    result = await runCli(["agent", "save", agentKey, "--value", "agent"], { env });
    assert.equal(result.status, 0, result.stderr);
    result = await runCli(["agent", "load", agentKey], { env });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "agent");
    result = await runCli(["agent", "delete", agentKey], { env });
    assert.equal(result.status, 0, result.stderr);

    // skill string save/load/list/delete
    result = await runCli(["skill", "save", skillKey, "--value", "skill"], { env });
    assert.equal(result.status, 0, result.stderr);
    result = await runCli(["skill", "load", skillKey], { env });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "skill");
    result = await runCli(["skill", "list"], { env });
    assert.equal(result.status, 0, result.stderr);
    const skillLines = result.stdout.trim().split("\n");
    assert.ok(skillLines.some((line) => line === `${skillKey}\t--value`));

    // skillpack save/load
    await fs.mkdir(srcDir);
    await fs.writeFile(path.join(srcDir, "note.txt"), "skillpack");
    result = await runCli(["skill", "save", skillpackKey, "--dir", srcDir], { env });
    assert.equal(result.status, 0, result.stderr);
    result = await runCli(["skill", "load", skillpackKey, "--dir", outDir], { env });
    assert.equal(result.status, 0, result.stderr);
    const contents = await fs.readFile(path.join(outDir, "note.txt"), "utf8");
    assert.equal(contents, "skillpack");

    result = await runCli(["skill", "delete", skillKey], { env });
    assert.equal(result.status, 0, result.stderr);
    result = await runCli(["skill", "delete", skillpackKey], { env });
    assert.equal(result.status, 0, result.stderr);

    // delete ctx and verify missing
    result = await runCli(["ctx", "delete", ctxKey], { env });
    assert.equal(result.status, 0, result.stderr);
    result = await runCli(["ctx", "load", ctxKey], { env });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^CTXBIN_ERR NOT_FOUND:/);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
