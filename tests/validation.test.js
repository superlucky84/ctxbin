const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeGithubUrl,
  validateCommitSha,
  normalizeSkillPath,
  detectSkillValueType,
  SKILLPACK_HEADER,
  SKILLREF_HEADER,
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
