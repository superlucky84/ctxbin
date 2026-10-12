import { isMap, parseDocument } from "yaml";
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

function parseMarkdown(value: string, name: string, resource: "skill" | "agent") {
  validateInstallName(name);
  const content = stripMetadata(value).replace(/^\uFEFF/, "");
  const opening = /^---[ \t]*\r?\n/.exec(content);
  const fallback = resource === "skill"
    ? `Reusable instructions for ${name}.`
    : `Agent rules for ${name}.`;
  if (!opening) {
    assertBody(content, name);
    return { body: content, metadata: { name, description: fallback }, document: null };
  }

  const closing = /^---[ \t]*(?:\r?\n|$)/m.exec(content.slice(opening[0].length));
  if (!closing) fail("INVALID_INPUT", `${resource} ${name}: unclosed YAML frontmatter`);
  const start = opening[0].length;
  const yamlEnd = start + closing.index;
  const body = content.slice(yamlEnd + closing[0].length);
  const document = parseDocument(content.slice(start, yamlEnd), { strict: true, uniqueKeys: true });
  if (document.errors.length || document.warnings.length || !isMap(document.contents)) {
    fail("INVALID_INPUT", `${resource} ${name}: frontmatter must be a valid YAML mapping`);
  }
  let fields: Record<string, unknown>;
  try {
    fields = document.toJS({ maxAliasCount: 50 }) as Record<string, unknown>;
  } catch {
    return fail("INVALID_INPUT", `${resource} ${name}: unsupported YAML aliases`);
  }
  if (fields.name !== undefined && fields.name !== name) {
    fail("INVALID_INPUT", `${resource} ${name}: frontmatter name must match the remote key`);
  }
  const description = fields.description === undefined ? fallback : fields.description;
  if (typeof description !== "string" || !description.trim()) {
    fail("INVALID_INPUT", `${resource} ${name}: description must be a non-empty string`);
  }
  assertBody(description, name);
  if (resource === "agent") {
    const unsupported = Object.keys(fields).filter(key => key !== "name" && key !== "description");
    if (unsupported.length) {
      fail("INVALID_INPUT", `agent ${name}: unsupported shared frontmatter fields: ${unsupported.join(", ")}; use name and description only`);
    }
  }
  assertBody(body, name);
  if (fields.name === undefined) document.set("name", name);
  if (fields.description === undefined) document.set("description", description);
  return { body, metadata: { name, description }, document };
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
  const { body, metadata, document } = parseMarkdown(value, name, "skill");
  const frontmatter = document
    ? document.toString({ lineWidth: 0 })
    : `name: ${JSON.stringify(metadata.name)}\ndescription: ${JSON.stringify(metadata.description)}\n`;
  return `---\n${frontmatter}---\n${body}`;
}

export function renderAgentMarkdown(value: string, name: string, target: SyncTarget): string {
  const { body, metadata } = parseMarkdown(value, name, "agent");
  assertBody(metadata.description, name);
  if (target === "codex") {
    return `name = ${JSON.stringify(name)}\ndescription = ${JSON.stringify(metadata.description)}\ndeveloper_instructions = ${JSON.stringify(body)}\n`;
  }
  return `---\nname: ${JSON.stringify(name)}\ndescription: ${JSON.stringify(metadata.description)}\n---\n${body}`;
}
