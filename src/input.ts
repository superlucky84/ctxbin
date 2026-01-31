import fs from "node:fs/promises";
import process from "node:process";
import { fail } from "./errors";
import { createSkillpackFromDir } from "./skillpack";
import { createSkillrefValue } from "./skillref";

export type SaveInput = { kind: "string" | "skillpack" | "skillref"; value: string };

export interface SaveOptions {
  append: boolean;
  file?: string;
  value?: string;
  dir?: string;
  url?: string;
  ref?: string;
  path?: string;
}

export async function resolveSaveInput(
  resource: string,
  opts: SaveOptions,
  stdinIsTTY: boolean = Boolean(process.stdin.isTTY)
): Promise<SaveInput> {
  const hasFile = typeof opts.file === "string";
  const hasValue = typeof opts.value === "string";
  const hasDir = typeof opts.dir === "string";
  const urlFlagsUsed = Boolean(opts.url || opts.ref || opts.path);
  const hasUrl = Boolean(opts.url && opts.path);
  const explicitCount = [hasFile, hasValue, hasDir, hasUrl].filter(Boolean).length;
  const hasStdin = !stdinIsTTY && explicitCount === 0;

  if (urlFlagsUsed && !hasUrl) {
    return fail("INVALID_INPUT", "--url and --path must be provided together");
  }

  const methods = explicitCount + (hasStdin ? 1 : 0);
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
    const value = createSkillrefValue(opts.url as string, opts.path as string, opts.ref as string | undefined);
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
