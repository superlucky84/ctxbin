import { isMap, isScalar, parseDocument } from "yaml";
import { parse as parseToml } from "smol-toml";
import { fail } from "./errors";
import { stripMetadata } from "./metadata";

export type SyncTarget = "claude" | "codex";

export function validateInstallName(name: string): void {
  if (
    name.length > 64 ||
    !/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(name) ||
    /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/.test(name) ||
    name === "synced" || name === "anthropic-skills" || name.startsWith("anthropic-skills-")
  ) {
    fail("INVALID_PATH", `unsafe or reserved installation name: ${JSON.stringify(name)}`);
  }
}

function parseMarkdown(value: string, name: string, resource: "skill" | "agent", localDescription?: string) {
  validateInstallName(name);
  const content = stripMetadata(value).replace(/^\uFEFF/, "");
  const opening = /^---[ \t]*\r?\n/.exec(content);
  const fallback = resource === "skill"
    ? `Reusable instructions for ${name}.`
    : localDescription ?? `Agent rules for ${name}.`;
  if (!opening) {
    assertBody(content, name);
    assertBody(fallback, name);
    return { body: content, metadata: { name, description: fallback }, descriptionSupplied: false,
      normalized: `---\nname: ${JSON.stringify(name)}\ndescription: ${JSON.stringify(fallback)}\n---\n${content}` };
  }

  const closing = /^---[ \t]*(?:\r?\n|$)/m.exec(content.slice(opening[0].length));
  if (!closing) fail("INVALID_INPUT", `${resource} ${name}: unclosed YAML frontmatter`);
  const start = opening[0].length;
  const yamlEnd = start + closing.index;
  const body = content.slice(yamlEnd + closing[0].length);
  let yamlText = content.slice(start, yamlEnd);
  const options = { strict: true, uniqueKeys: true };
  let document = parseDocument(yamlText, options);
  // Repair only an unquoted, single-line plain description. Unrelated YAML remains untouched.
  const descriptions = [...yamlText.matchAll(/^(description:[ \t]+)([^\r\n]*)(\r?)$/gm)];
  if (document.errors.length && descriptions.length === 1) {
    const match = descriptions[0];
    const plain = match[2].trim();
    if (/:[ \t]/.test(plain) && !"\"'|>!&*{[".includes(plain[0]) &&
      document.errors.every(error => error.pos[0] >= match.index! && error.pos[0] <= match.index! + match[0].length)) {
      yamlText = yamlText.slice(0, match.index) + match[1] + JSON.stringify(plain) + match[3] + yamlText.slice(match.index! + match[0].length);
      document = parseDocument(yamlText, options);
    }
  }
  if (document.errors.length || document.warnings.length || !isMap(document.contents)) {
    fail("INVALID_INPUT", `${resource} ${name}: frontmatter must be a valid YAML mapping`);
  }
  // Access required scalar fields only; converting arbitrary template values emits Node warnings.
  const suppliedName = document.get("name");
  const suppliedDescription = document.get("description");
  if (suppliedName !== undefined && suppliedName !== name) {
    fail("INVALID_INPUT", `${resource} ${name}: frontmatter name must match the remote key`);
  }
  const description = suppliedDescription === undefined ? fallback : suppliedDescription;
  if (typeof description !== "string" || !description.trim()) {
    fail("INVALID_INPUT", `${resource} ${name}: description must be a non-empty string`);
  }
  assertBody(description, name);
  if (resource === "agent") {
    const unsupported = document.contents.items.map(pair => isScalar(pair.key) ? String(pair.key.value) : "non-scalar key")
      .filter(key => key !== "name" && key !== "description");
    if (unsupported.length) {
      fail("INVALID_INPUT", `agent ${name}: unsupported shared frontmatter fields: ${unsupported.join(", ")}; use name and description only`);
    }
  }
  assertBody(body, name);
  const newline = opening[0].endsWith("\r\n") ? "\r\n" : "\n";
  if (suppliedName === undefined) yamlText += `name: ${JSON.stringify(name)}${newline}`;
  if (suppliedDescription === undefined) yamlText += `description: ${JSON.stringify(description)}${newline}`;
  return { body, metadata: { name, description }, descriptionSupplied: suppliedDescription !== undefined,
    normalized: opening[0] + yamlText + closing[0] + body };
}

function assertBody(body: string, name: string): void {
  if (!body.trim()) fail("INVALID_INPUT", `${name}: instructions must not be empty`);
  // TOML strings require Unicode scalar values; reject malformed UTF-16 in every format.
  for (const char of body) {
    const code = char.codePointAt(0)!;
    if (code >= 0xd800 && code <= 0xdfff) {
      fail("INVALID_INPUT", `${name}: instructions contain invalid Unicode`);
    }
  }
}

export function normalizeSkillMarkdown(value: string, name: string): string {
  return parseMarkdown(value, name, "skill").normalized;
}

export function renderAgentMarkdown(value: string, name: string, target: SyncTarget, localDescription?: string): string {
  const { body, metadata } = parseMarkdown(value, name, "agent", localDescription);
  assertBody(metadata.description, name);
  if (target === "codex") {
    const quote = (text: string) => JSON.stringify(text).replace(/\u007f/g, "\\u007f");
    return `name = ${quote(name)}\ndescription = ${quote(metadata.description)}\ndeveloper_instructions = ${quote(body)}\n`;
  }
  return `---\nname: ${JSON.stringify(name)}\ndescription: ${JSON.stringify(metadata.description)}\n---\n${body}`;
}

export function localAgentDescription(value: string, name: string, target: SyncTarget): string | undefined {
  try {
    if (target === "codex") {
      const fields = parseToml(value);
      if (fields.name === name && typeof fields.description === "string" && fields.description.trim()) {
        assertBody(fields.description, name);
        return fields.description;
      }
    } else {
      const parsed = parseMarkdown(value, name, "skill");
      if (parsed.descriptionSupplied) return parsed.metadata.description;
    }
  } catch { /* A malformed local file cannot provide a usable description. */ }
  return undefined;
}
