#!/usr/bin/env node
import { parseArgs } from "node:util";
import fs from "node:fs/promises";
import process from "node:process";
import { formatError, fail } from "./errors";
import { loadConfig, writeConfig } from "./config";
import { createStore } from "./store";
import { inferCtxKey } from "./git";
import { createSkillpackFromDir, extractSkillpackToDir } from "./skillpack";
import { createSkillrefValue, loadSkillrefToDir } from "./skillref";
import { detectSkillValueType } from "./value";

async function main(): Promise<void> {
  let positionals: string[];
  let values: Record<string, unknown>;
  try {
    ({ positionals, values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        append: { type: "boolean" },
        file: { type: "string" },
        value: { type: "string" },
        dir: { type: "string" },
        url: { type: "string" },
        ref: { type: "string" },
        path: { type: "string" },
      },
      allowPositionals: true,
    }));
  } catch (err) {
    return fail("INVALID_INPUT", err instanceof Error ? err.message : "invalid arguments");
  }

  const [resource, command, keyArg, ...extra] = positionals;
  if (!resource) {
    return fail("INVALID_INPUT", "missing resource");
  }

  if (resource === "init") {
    if (command || keyArg || extra.length) {
      return fail("INVALID_INPUT", "init does not accept additional arguments");
    }
    await runInit();
    return;
  }

  if (!command) {
    return fail("INVALID_INPUT", "missing command");
  }
  if (extra.length > 0) {
    return fail("INVALID_INPUT", "too many positional arguments");
  }

  const opts = {
    append: Boolean(values.append),
    file: values.file as string | undefined,
    value: values.value as string | undefined,
    dir: values.dir as string | undefined,
    url: values.url as string | undefined,
    ref: values.ref as string | undefined,
    path: values.path as string | undefined,
  };

  const storeConfig = await loadConfig();
  const store = createStore(storeConfig.url, storeConfig.token);

  const hash = resolveHash(resource);

  if (command === "list") {
    if (keyArg) {
      return fail("INVALID_INPUT", "list does not accept a key");
    }
    ensureNoListFlags(opts);
    await handleList(store, resource, hash);
    return;
  }

  const key = await resolveKey(resource, keyArg);

  switch (command) {
    case "load":
      await handleLoad(store, resource, hash, key, opts);
      return;
    case "save":
      await handleSave(store, resource, hash, key, opts);
      return;
    case "delete":
      await handleDelete(store, resource, hash, key, opts);
      return;
    default:
      return fail("INVALID_INPUT", `unknown command: ${command}`);
  }
}

async function runInit(): Promise<void> {
  const readline = await import("node:readline/promises");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const url = (await rl.question("CTXBIN_STORE_URL: ")).trim();
  const token = (await rl.question("CTXBIN_STORE_TOKEN: ")).trim();
  await rl.close();

  if (!url || !token) {
    return fail("INVALID_INPUT", "both URL and token are required");
  }

  await writeConfig({ url, token });
}

function resolveHash(resource: string): "ctx" | "agent" | "skill" {
  if (resource === "ctx" || resource === "agent" || resource === "skill") {
    return resource;
  }
  return fail("INVALID_INPUT", `unknown resource: ${resource}`);
}

async function resolveKey(resource: string, keyArg?: string): Promise<string> {
  if (resource === "ctx") {
    if (keyArg) return keyArg;
    return inferCtxKey();
  }
  if (!keyArg) {
    return fail("MISSING_KEY", "key is required");
  }
  return keyArg;
}

async function handleLoad(
  store: ReturnType<typeof createStore>,
  resource: string,
  hash: string,
  key: string,
  opts: {
    append: boolean;
    file?: string;
    value?: string;
    dir?: string;
    url?: string;
    ref?: string;
    path?: string;
  }
): Promise<void> {
  ensureNoSaveInput(opts, "load");

  const value = await store.get(hash, key);
  if (value === null) {
    return fail("NOT_FOUND", `no value for ${hash}:${key}`);
  }

  if (resource === "skill") {
    const kind = detectSkillValueType(value);
    if (kind === "string") {
      if (opts.dir) {
        return fail("TYPE_MISMATCH", "--dir cannot be used with string values");
      }
      process.stdout.write(value);
      return;
    }
    if (!opts.dir) {
      return fail("TYPE_MISMATCH", "--dir is required for skillpack/skillref load");
    }
    if (kind === "skillpack") {
      await extractSkillpackToDir(value, opts.dir);
      return;
    }
    if (kind === "skillref") {
      await loadSkillrefToDir(value, opts.dir);
      return;
    }
  }

  if (opts.dir) {
    return fail("TYPE_MISMATCH", "--dir is only valid for skill values");
  }
  process.stdout.write(value);
}

async function handleSave(
  store: ReturnType<typeof createStore>,
  resource: string,
  hash: string,
  key: string,
  opts: {
    append: boolean;
    file?: string;
    value?: string;
    dir?: string;
    url?: string;
    ref?: string;
    path?: string;
  }
): Promise<void> {
  const input = await resolveSaveInput(resource, opts);

  if (opts.append) {
    if (input.kind !== "string") {
      return fail("INVALID_INPUT", "--append only applies to string inputs");
    }
    const existing = await store.get(hash, key);
    if (resource === "skill" && existing && detectSkillValueType(existing) !== "string") {
      return fail("TYPE_MISMATCH", "cannot append to skillpack/skillref values");
    }
    const merged = existing ? `${existing}\n\n${input.value}` : input.value;
    await store.set(hash, key, merged);
    return;
  }

  if (input.kind !== "string" && resource !== "skill") {
    return fail("TYPE_MISMATCH", "non-string inputs are only valid for skill" );
  }

  await store.set(hash, key, input.value);
}

async function handleDelete(
  store: ReturnType<typeof createStore>,
  resource: string,
  hash: string,
  key: string,
  opts: {
    append: boolean;
    file?: string;
    value?: string;
    dir?: string;
    url?: string;
    ref?: string;
    path?: string;
  }
): Promise<void> {
  ensureNoSaveInput(opts, "delete");
  if (opts.dir) {
    return fail("INVALID_INPUT", "--dir is not valid for delete");
  }
  await store.delete(hash, key);
}

async function handleList(
  store: ReturnType<typeof createStore>,
  resource: string,
  hash: string
): Promise<void> {
  const entries = await store.list(hash);
  if (entries.length === 0) return;

  const lines = entries.map(({ field, value }) => {
    let type = "--value";
    if (resource === "skill") {
      const kind = detectSkillValueType(value);
      if (kind === "skillpack") type = "--dir";
      if (kind === "skillref") type = "--url";
    }
    return `${field}\t${type}`;
  });

  process.stdout.write(lines.join("\n"));
}

async function resolveSaveInput(
  resource: string,
  opts: {
    append: boolean;
    file?: string;
    value?: string;
    dir?: string;
    url?: string;
    ref?: string;
    path?: string;
  }
): Promise<{ kind: "string" | "skillpack" | "skillref"; value: string }> {
  const hasFile = typeof opts.file === "string";
  const hasValue = typeof opts.value === "string";
  const hasDir = typeof opts.dir === "string";
  const urlFlagsUsed = Boolean(opts.url || opts.ref || opts.path);
  const hasUrl = Boolean(opts.url && opts.ref && opts.path);
  const hasStdin = !process.stdin.isTTY;

  if (urlFlagsUsed && !hasUrl) {
    return fail("INVALID_INPUT", "--url, --ref, and --path must be provided together");
  }

  const methods = [hasFile, hasValue, hasDir, hasUrl, hasStdin].filter(Boolean).length;
  if (methods !== 1) {
    return fail("INVALID_INPUT", "exactly one input method must be used");
  }

  if (hasDir && resource !== "skill") {
    return fail("INVALID_INPUT", "--dir is only valid for skill save");
  }
  if (hasUrl && resource !== "skill") {
    return fail("INVALID_INPUT", "--url/--ref/--path are only valid for skill save");
  }
  if (opts.append && (hasDir || hasUrl)) {
    return fail("INVALID_INPUT", "--append cannot be used with --dir or --url");
  }

  if (hasDir) {
    const value = await createSkillpackFromDir(opts.dir as string);
    return { kind: "skillpack", value };
  }

  if (hasUrl) {
    const value = createSkillrefValue(opts.url as string, opts.ref as string, opts.path as string);
    return { kind: "skillref", value };
  }

  if (hasFile) {
    const content = await fs.readFile(opts.file as string, "utf8");
    return { kind: "string", value: content };
  }

  if (hasValue) {
    return { kind: "string", value: opts.value as string };
  }

  const stdin = await readStdin();
  return { kind: "string", value: stdin };
}

function ensureNoSaveInput(
  opts: {
    append: boolean;
    file?: string;
    value?: string;
    dir?: string;
    url?: string;
    ref?: string;
    path?: string;
  },
  command: "load" | "delete"
): void {
  if (opts.append || opts.file || opts.value || opts.url || opts.ref || opts.path) {
    return fail("INVALID_INPUT", `${command} does not accept input flags`);
  }
}

function ensureNoListFlags(opts: {
  append: boolean;
  file?: string;
  value?: string;
  dir?: string;
  url?: string;
  ref?: string;
  path?: string;
}): void {
  if (opts.append || opts.file || opts.value || opts.dir || opts.url || opts.ref || opts.path) {
    return fail("INVALID_INPUT", "list does not accept input flags");
  }
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

main().catch((err) => {
  process.stderr.write(formatError(err) + "\n");
  process.exit(1);
});
