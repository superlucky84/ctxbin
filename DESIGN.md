
# ctxbin — Design Specification (Final)

## What This Is

`ctxbin` is a **minimal, deterministic Node.js CLI tool** executed via `npx`, designed for **AI coding agents** to store, load, append, and delete **markdown-based context, agent roles, and skills (single-file, directory bundles, or GitHub references)** using a **simple key–value store backed by Upstash Redis**.

This tool is **not**:

* AI memory
* RAG system
* semantic search
* intelligent retrieval

This tool **is**:

* a thin Redis HASH client
* non-interactive (except `init`)
* explicit and predictable
* agent-safe by design

---

## Execution Model

* Runtime: **Node.js**
* Distribution: **npm**
* Execution: `npx ctxbin ...`
* Platform: macOS / Linux / Windows
* Shell assumptions: none

All commands except `init` must be **non-interactive**.

---

## Storage Backend

* Backend: **Upstash Redis**
* Access: **HTTP REST API**
* Redis data type used: **HASH only**
* No other Redis features are used

---

## Redis Data Model

Each resource maps to **one Redis hash**.

### Context (`ctx`)

```text
Redis Key (HASH): ctx
Field           : {project}/{branch}
Value           : markdown string (UTF-8)
```

Example:

```text
HSET ctx my-project/main "# Context markdown..."
HDEL ctx my-project/main
```

---

### Agent

```text
Redis Key (HASH): agent
Field           : {agent-name}
Value           : markdown string
```

Example:

```text
HSET agent frontend-reviewer "# Agent role markdown..."
HDEL agent frontend-reviewer
```

---

### Skill

```text
Redis Key (HASH): skill
Field           : {skill-name}
Value           : markdown string OR skillpack (tar.gz + Base64) OR skillref (GitHub directory reference)
```

Example:

```text
HSET skill fp-pack "# Skill markdown..."
HDEL skill fp-pack
```

> Skillpacks allow storing an entire skill directory; skillrefs store a GitHub directory reference. See below.

---

## CLI ↔ Redis Mapping Rule

### CLI key format (user-facing)

```text
ctx    → {project}/{branch}
agent  → {agent-name}
skill  → {skill-name}
```

> The resource name (`ctx`, `agent`, `skill`) already defines the Redis hash.
> Keys passed to the CLI always represent **Redis fields**, not full paths.

### Internal normalization

```text
Redis HASH  = resource name (ctx | agent | skill)
Redis FIELD = key argument
```

Example:

```bash
ctxbin ctx save my-project/main --file ctx.md
```

→ Redis:

```text
HSET ctx my-project/main "<markdown>"
```

---

## Key Inference (ctx only)

### Rules

* **Only `ctx` allows key omission**
* `agent` and `skill` always require explicit keys

### Preconditions

* Must be executed inside a **git repository**
* If not inside git → fail fast (no fallback)

### Inference Logic

```text
project = git repository root directory name
branch  = git rev-parse --abbrev-ref HEAD
```

Resulting field:

```text
{project}/{branch}
```

---

## CLI Command Structure

```bash
ctxbin <resource> <command> [key] [flags]
```

* `resource`: `ctx | agent | skill`
* `command`: `load | save | delete | list`
* `key`: optional **only** for `ctx`

Global flags:

* `--version` / `-v` prints the CLI version and exits

---

## ctx Commands

### Load

```bash
# auto-key
ctxbin ctx load

# explicit key
ctxbin ctx load my-project/main
```

---

### List

```bash
ctxbin ctx list
```

---

### Save (Replace — default)

```bash
ctxbin ctx save --file context.md
ctxbin ctx save --value "markdown string"
cat context.md | ctxbin ctx save

ctxbin ctx save my-project/main --file context.md
```

---

### Save (Append)

```bash
ctxbin ctx save --append --file note.md
ctxbin ctx save my-project/main --append --file note.md
```

---

### Delete

```bash
ctxbin ctx delete
ctxbin ctx delete my-project/main
```

Behavior:

* Maps to `HDEL ctx {project}/{branch}`
* No confirmation prompt
* Non-interactive
* Fails fast if key cannot be inferred

---

## agent Commands (key required)

### Load

```bash
ctxbin agent load frontend-reviewer
```

### List

```bash
ctxbin agent list
```

### Save

```bash
ctxbin agent save frontend-reviewer --file agent.md
ctxbin agent save frontend-reviewer --value "markdown string"
```

### Append

```bash
ctxbin agent save frontend-reviewer --append --file addition.md
```

### Delete

```bash
ctxbin agent delete frontend-reviewer
```

Behavior:

* Maps to `HDEL agent {agent-name}`
* Missing key → immediate error

---

## skill Commands (key required)

### Load

```bash
ctxbin skill load fp-pack
ctxbin skill load fp-pack --dir ./skills/fp-pack
```

### List

```bash
ctxbin skill list
```

### Save

```bash
ctxbin skill save fp-pack --file SKILL.md
ctxbin skill save fp-pack --value "markdown string"
ctxbin skill save fp-pack --dir ../fp-kit/skills/fp-pack
ctxbin skill save fp-pack --url https://github.com/acme/skills --ref <commit_sha> --path skills/fp-pack
ctxbin skill save fp-pack --url https://github.com/acme/skills --path skills/fp-pack
```

### Append

```bash
ctxbin skill save fp-pack --append --file addition.md
```

### Delete

```bash
ctxbin skill delete fp-pack
```

Behavior:

* Maps to `HDEL skill {skill-name}`
* Missing key → immediate error

---

## Bundled ctxbin Skill

To improve first-time usability, the packaged CLI includes a bundled skill text at:

```
dist/skills/ctxbin/SKILL.md
```

Behavior:

* `ctxbin skill load ctxbin` returns the bundled skill text when Redis is not configured **or** the key is missing.
* This fallback returns a **string value** (same behavior as `--value`).

---

## Skillpack (Directory) Format

Skillpacks store a whole skill directory as a single Redis value. The on-wire format is:

```text
ctxbin-skillpack@1\n<base64(tar.gz bytes)>
```

Rules:

* The tarball contains relative paths from the provided `--dir` root.
* File entries are sorted lexicographically for determinism.
* gzip mtime is set to `0`; uid/gid are `0`.
* Default excludes: `.git/`, `node_modules/`, `.DS_Store`.
* No `.ctxbinignore` support; only the default excludes are applied.
* Symlinks are not allowed; `save --dir` must fail if any are found.

Extraction:

* `load --dir` creates the target directory if missing.
* Existing files at the same paths are overwritten; extra files are left untouched.
* Only regular files and directories are allowed; hardlinks, device files, and other types are rejected.
* Permissions are normalized: directories `0755`, files `0644`, executable files `0755`; strip setuid/setgid/sticky.
* Windows note: permission normalization is best-effort on Windows; chmod failures should be ignored.
* Do not preserve timestamps, owners, or groups.

Size limits:

* `save --dir` must fail fast if the **compressed tarball** exceeds `7 MB`.
* Rationale: Base64 adds ~33% overhead, and backend request size limits are typically smaller than record size limits.
* The error message should clearly state the computed tar.gz size and suggest removing large/binary files.

---

## Skillref (GitHub Directory Reference)

Skillrefs store a GitHub directory pointer as a single Redis value. The on-wire format is:

```text
ctxbin-skillref@1\n{"url":"https://github.com/OWNER/REPO","path":"skills/react-native-skills","ref":"<40-hex-sha>"}
ctxbin-skillref@1\n{"url":"https://github.com/OWNER/REPO","path":"skills/react-native-skills","track":"default"}
```

Rules:

* `--url` and `--path` are required.
* `--ref` is optional. If provided, it must be a **full 40-hex commit SHA** (tags/branches are not allowed).
* If `--ref` is omitted, the skillref **tracks the repository default branch**.
* `--url` must be HTTPS GitHub repo root: `https://github.com/<owner>/<repo>` (no `/tree/...`).
  * `.git` suffix is allowed and should be stripped during normalization.
* `--path` must be a **directory path** within the repo (no leading `/`, no `..`).
* `save --url ...` **does not fetch**; it only stores the reference.
* Fetch method: download `https://codeload.github.com/<owner>/<repo>/tar.gz/<ref>` and extract.

Load behavior:

* `load --dir` is required for skillrefs; otherwise error.
* If `ref` is set (40-hex), fetch `ref`. If `track` is `default`, resolve the default branch at load time and fetch it.
* Resolve default branch via GitHub API: `https://api.github.com/repos/<owner>/<repo>` (read `default_branch`).
* The loader fetches a tar.gz archive from GitHub, extracts `path` into the target dir.
* Network failures or missing paths must fail fast with a clear error.
* Timeouts: connect `5s`, total download `30s`.
* Size limits: max download `20 MB` (compressed), max extracted total `100 MB`.
* Permissions: directories `0755`, files `0644`, executable files `0755`; strip setuid/setgid/sticky.
* Symlinks: reject and fail with a clear error (no symlink traversal).
* File count limit: max `5,000` entries after extraction.
* Redirects: allow at most `1`, and only within `github.com` / `codeload.github.com` / `api.github.com`.
* Target overwrite policy: existing files at the same paths are overwritten; other files remain untouched.
* Content-type is not trusted; validate gzip magic bytes and tar parsing before extraction.
* No retries. Use a temp directory for extraction and atomically move into place only on success; failures must not leave partial files in the target.
* Windows note: permission normalization is best-effort on Windows; chmod failures should be ignored.

Tarball handling:

* GitHub archives contain a single top-level folder named `<repo>-<ref>/`.
* Resolve `path` within that top-level folder after extraction; path traversal (`..`, absolute paths) is invalid.
* Only regular files and directories are allowed; hardlinks, device files, and other types are rejected.
* Do not preserve tar owner/group or timestamps; apply normalized permissions only.

GitHub-only:

* Only public GitHub repositories are supported.
* No SSH, no private repo auth, no other hosts.

---

## Deletion Rules (Important)

* **Deletion is always explicit**
* Saving an empty value **never deletes data**
* `delete` is the only way to remove stored content
* No soft-delete
* No confirmation prompts (agent-safe)

---

## Value Input Rules (Strict)

Exactly **one** input method must be used:

1. `--file <path>`
2. `--value <string>`
3. `stdin`
4. `--dir <path>` (skill save only)
5. `--url <repo> --path <dir> [--ref <sha>]` (skill save only)

If zero or multiple inputs are provided → error.
`--url` and `--path` (plus optional `--ref`) are treated as a single combined input method.

---

## `--append` Option

* Pure string concatenation
* No parsing
* No merge
* No deduplication
* Separator: `\n\n`
* Not valid with `--dir`
* Not valid with `--url/--ref/--path`
* If the stored value is a skillpack, `--append` → error
* If the stored value is a skillref, `--append` → error

### Append Behavior

1. Load existing value
2. Append new value
3. Save combined value back

If the key does not exist, behaves the same as normal `save`.

---

## Output Rules

### load

* For string values: print raw markdown to `stdout` (no decoration)
* For skillpacks: `--dir` is required, otherwise error
* For skillrefs: `--dir` is required, otherwise error
* `--dir` on string values → error
* `load --dir` produces no stdout output

### list

* Print one entry per line: `<key>\t<type>`
* Entries are sorted lexicographically by key
* `list` does not accept a key or input flags
* `type` values:
  * `--value` for string values (original input source is not retained; `--file` and stdin are reported as `--value`)
  * `--dir` for skillpacks
  * `--url` for skillrefs
* Empty hash → no output

### save / delete

* No output
* Exit code `0`

---

## Configuration & Credentials

### Required Environment Variables

```text
CTXBIN_STORE_URL
CTXBIN_STORE_TOKEN
```

### Resolution Order

1. Environment variables
2. `~/.ctxbin/config.json`

If environment variables are set, `ctxbin init` is **not required**.

---

## `ctxbin init` (Human-only)

```bash
ctxbin init
```

* Interactive
* Saves credentials to `~/.ctxbin/config.json`
* Never used by agents

---

## Non-Interactive Guarantee

All commands except `init` must:

* never prompt
* never block
* fail fast with clear errors

---

## Error Message Format

All errors must:

* write to `stderr` only (no stdout)
* exit with code `1`
* use a single-line format:

```text
CTXBIN_ERR <CODE>: <message>
```

Where `<CODE>` is uppercase snake-case. Recommended codes:

* `INVALID_INPUT` (missing/extra/combined flags)
* `MISSING_KEY`
* `INVALID_URL`
* `INVALID_REF`
* `INVALID_PATH`
* `NOT_IN_GIT`
* `NOT_FOUND` (missing key or remote path)
* `TYPE_MISMATCH` (e.g., `--dir` with string value)
* `SIZE_LIMIT`
* `NETWORK`
* `IO`

---

## Build & Distribution

`ctxbin` is distributed via npm and executed with `npx`. Publishing uses npm's default tarball packaging (`.tgz`), so no custom archive distribution is required.

Recommendations:

* Bundle to a single executable JS file (e.g., `dist/cli.js`) to minimize install and startup time.
* Use `package.json` `bin` entry: `{ "ctxbin": "dist/cli.js" }`.
* Include only build output and required docs via the `files` field (e.g., `dist/`, `README.md`, `LICENSE`).
* Run build in `prepublishOnly` to ensure published tarballs are always up to date.
* If using TypeScript, prefer `tsup` (esbuild-powered) for CLI bundling.
* Copy `skills/ctxbin/SKILL.md` into `dist/skills/ctxbin/SKILL.md` during build for the bundled skill fallback.
* Recommended `tsup` defaults (CLI-focused):
  * `format: ["cjs"]`, `platform: "node"`, `target: "es2022"`
  * `bundle: true`, `splitting: false`, `sourcemap: true`
  * `minify: false` (enable only for release builds if needed)
  * `banner: "#!/usr/bin/env node"`
* Default build format is **CJS** for maximum compatibility.
  * Switching to ESM is a project-level decision (not per-user) and requires updating `package.json` (`"type": "module"`) and `tsup` format to `esm`, plus a minimum Node version policy.
* Minimum supported Node.js version: **18.x**.

---

## Internal Storage Interface

```ts
interface Store {
  get(hash: string, field: string): string | null
  set(hash: string, field: string, value: string): void
  delete(hash: string, field: string): void
  list(hash: string): Array<{ field: string; value: string }>
}
```

---

## Non-Goals (Explicit)

* No RAG
* No embeddings
* No search
* No versioning
* No history
* No merge
* No permissions
* No inference
* No chunked / multi-key storage for a single skillpack
* No non-GitHub hosts for skill references
* No private repository access for skill references

---

## One-Sentence Summary

> **ctxbin is an npx-executed Node.js CLI that explicitly stores, appends, loads, and deletes markdown context and skill bundles (local or GitHub-referenced) using Redis hashes, with zero inference and full agent safety.**
