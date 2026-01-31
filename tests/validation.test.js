const test = require("node:test");
const assert = require("node:assert/strict");

const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");

const {
  normalizeGithubUrl,
  validateCommitSha,
  normalizeSkillPath,
  detectSkillValueType,
  SKILLPACK_HEADER,
  SKILLREF_HEADER,
  createSkillpackFromDir,
  createSkillrefValue,
  parseSkillrefValue,
  resolveSaveInput,
  CtxbinError,
} = require("../dist/index.js");

test("normalizeGithubUrl strips .git and normalizes", () => {
  assert.equal(normalizeGithubUrl("https://github.com/acme/repo"), "https://github.com/acme/repo");
  assert.equal(normalizeGithubUrl("https://github.com/acme/repo.git"), "https://github.com/acme/repo");
  assert.throws(() => normalizeGithubUrl("http://github.com/acme/repo"));
});

test("validateCommitSha enforces 40-hex", () => {
  const ref = "a".repeat(40);
  assert.equal(validateCommitSha(ref), ref);
  assert.throws(() => validateCommitSha("deadbeef"));
});

test("normalizeSkillPath rejects absolute and traversal", () => {
  assert.equal(normalizeSkillPath("skills/react-native/"), "skills/react-native");
  assert.throws(() => normalizeSkillPath("/abs/path"));
  assert.throws(() => normalizeSkillPath("../bad"));
});

test("detectSkillValueType detects headers", () => {
  assert.equal(detectSkillValueType(`${SKILLPACK_HEADER}abc`), "skillpack");
  assert.equal(detectSkillValueType(`${SKILLREF_HEADER}xyz`), "skillref");
  assert.equal(detectSkillValueType("plain"), "string");
});

test("resolveSaveInput enforces single input method", async () => {
  await assert.rejects(
    () =>
      resolveSaveInput("skill", {
        append: false,
        file: "/tmp/file.md",
        value: "hello",
      }, true),
    (err) => err instanceof CtxbinError && err.code === "INVALID_INPUT"
  );
});

test("resolveSaveInput accepts url+path without ref", async () => {
  const result = await resolveSaveInput(
    "skill",
    {
      append: false,
      url: "https://github.com/acme/repo",
      path: "skills/example",
    },
    true
  );
  assert.equal(result.kind, "skillref");
  const parsed = parseSkillrefValue(result.value);
  assert.equal(parsed.track, "default");
});

test("createSkillpackFromDir returns header and enforces size limit", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ctxbin-test-"));
  try {
    const smallDir = path.join(tmp, "small");
    await fs.mkdir(smallDir);
    await fs.writeFile(path.join(smallDir, "a.txt"), "hello");
    const packed = await createSkillpackFromDir(smallDir);
    assert.ok(packed.startsWith(SKILLPACK_HEADER));

    const largeDir = path.join(tmp, "large");
    await fs.mkdir(largeDir);
    const bigPath = path.join(largeDir, "big.bin");
    const big = crypto.randomBytes(8 * 1024 * 1024);
    await fs.writeFile(bigPath, big);
    await assert.rejects(
      () => createSkillpackFromDir(largeDir),
      (err) => err instanceof CtxbinError && err.code === "SIZE_LIMIT"
    );
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test("skillref value round-trip and type mismatch", () => {
  const value = createSkillrefValue(
    "https://github.com/acme/repo",
    "skills/example",
    "a".repeat(40)
  );
  const parsed = parseSkillrefValue(value);
  assert.equal(parsed.url, "https://github.com/acme/repo");
  assert.equal(parsed.ref, "a".repeat(40));
  assert.equal(parsed.path, "skills/example");

  assert.throws(() => parseSkillrefValue("plain"), (err) => {
    return err instanceof CtxbinError && err.code === "TYPE_MISMATCH";
  });
});

test("skillref default branch tracking payload", () => {
  const value = createSkillrefValue("https://github.com/acme/repo", "skills/example");
  const parsed = parseSkillrefValue(value);
  assert.equal(parsed.url, "https://github.com/acme/repo");
  assert.equal(parsed.path, "skills/example");
  assert.equal(parsed.track, "default");
});
