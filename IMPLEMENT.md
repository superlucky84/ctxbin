# Implementation Notes (ctxbin)

Purpose: preserve implementation context so another model/agent can resume quickly.
Record key decisions, progress, and checklists.

## Current Status
- Initial scaffolding complete (`package.json`, `tsconfig.json`, `tsup.config.ts`).
- Core modules implemented (CLI, store, skillpack, skillref, config).
- Minimum test suite added and expanded.
- `list` command implemented (store list + output rules).
- Windows compatibility (best-effort chmod) implemented and tested (Windows-only).
- skillref default branch tracking (`--ref` omitted) implemented and tested.
- ctxbin bundled skill fallback implemented and tested.
- Plan document: `DESIGN.md`.
- Package manager: **pnpm**.
- Base layout: `src/`, `tests/`.
- Testing strategy: **start minimal, then expand**.

## Recent Work Summary (2026-01-30)
- Added core modules in `src/`: `cli.ts`, `store.ts`, `skillpack.ts`, `skillref.ts`, `config.ts`.
- Added `tests/validation.test.js` (input/header validation).
- Scaffolding finished for `package.json`/`tsconfig.json`/`tsup.config.ts`.

Next priority: run `pnpm build` and `pnpm test`, then fix any regressions before adding more features.

## Key Decisions
- CLI name: **ctxbin** (not ctxkit).
- Storage: Upstash Redis hashes (`ctx`, `agent`, `skill`).
- `skill` value types:
  - string (Markdown)
  - **skillpack**: tar.gz + Base64
  - **skillref**: GitHub directory reference
- Skillpack rules:
  - tar.gz paths are relative to `--dir`
  - sorted entries, gzip mtime=0, uid/gid=0
  - default excludes: `.git/`, `node_modules/`, `.DS_Store`
  - no `.ctxbinignore`
  - **symlinks are rejected**
  - extract with normalized permissions (dirs 0755, files 0644, exec files 0755)
  - do not preserve owner/timestamps
  - size limit: **tar.gz > 7MB fails**
- Skillref rules:
  - GitHub **public only**; no other hosts, no private repos
  - `--url`, `--path` required; `--ref` optional
  - `--url` is `https://github.com/<owner>/<repo>` (optional `.git` suffix removed)
  - `--ref` must be a **40-hex commit SHA** when provided
  - `--path` must be a **directory**
  - fetch: `https://codeload.github.com/<owner>/<repo>/tar.gz/<ref>`
  - load overwrite policy: **overwrite same paths**, keep others
  - validate gzip/tar regardless of content-type
  - timeouts: connect 5s, total 30s
  - size limits: download 20MB, extracted total 100MB
  - file count limit: 5,000
  - redirect: 1 hop, only within `github.com`/`codeload.github.com`
  - symlinks/special files are errors
  - no retries; extract to temp dir then atomic move
- Error format:
  - `CTXBIN_ERR <CODE>: <message>` (stderr, exit 1)
  - example codes: INVALID_INPUT, INVALID_URL, INVALID_REF, INVALID_PATH, NOT_FOUND,
    TYPE_MISMATCH, SIZE_LIMIT, NETWORK, IO
- Output rules:
  - load: string to stdout; skillpack/skillref require `--dir`
  - save/delete: no stdout
- Build/Distribution:
  - npm tarball; `npx ctxbin` entry
  - **CJS** bundle; Node **>= 18**
  - TypeScript with `tsup`
  - tsup defaults: format cjs, platform node, target es2022, bundle true,
    splitting false, sourcemap true, minify false, banner shebang

## Implementation Plan (Summary)
1) Scaffold
2) CLI structure
3) Storage layer
4) Resource handlers
5) skillpack
6) skillref
7) Error handling & output rules
8) Minimum tests

## Progress Checklist (Detailed)

Scaffolding
- [x] `package.json` (pnpm) + base scripts
- [x] `src/`, `tests/` directories
- [x] `tsconfig.json` + `tsup.config.ts`

CLI parsing/input rules
- [x] command structure + `ctx` key inference
- [x] single input source enforcement (`--file`/`--value`/stdin/`--dir`/`--url+--ref+--path`)
- [x] skill-only flags validation (`--dir`, `--url/--ref/--path`)
- [x] `list` parsing (no key, no input flags)

Storage (Upstash REST)
- [x] config resolution order (ENV → ~/.ctxbin/config.json)
- [x] hash get/set/delete + network error handling
- [x] hash list (HGETALL)

ctx/agent
- [x] load/save/delete + output rules
- [x] list output (key + type)

skill (string)
- [x] load/save/delete + `--append`
- [x] list output (key + type)
- [x] `skill load ctxbin` local bundled fallback

skillpack
- [x] tar.gz creation rules (sorted/mtime=0/uid=0/gid=0/default excludes, no symlink)
- [x] 7MB limit + Base64/header
- [x] extract rules (permission normalization/special-file rejection/overwrite)
- [x] Windows chmod failures are best-effort

skillref
- [x] URL/REF/PATH validation + `.git` normalization
- [x] codeload URL generation + download limits (redirect/timeout/size)
- [x] gzip/tar validation + file count limit
- [x] temp extraction + overwrite policy
- [x] Windows chmod failures are best-effort
- [x] optional `--ref` + default branch tracking
- [x] GitHub API call for `default_branch`

Errors/Output
- [x] error format + exit code + stdout/stderr rules

Minimum tests
- [x] single input source enforcement
- [x] `--url/--ref/--path` validation
- [x] skillpack header/size limit
- [x] skillref header parsing
- [x] type mismatch errors

Test expansion (quality)
- [x] ctx key inference (inside/outside git)
- [x] `--append` with/without existing value
- [x] skillpack permission normalization
- [x] skillref download limits (redirect/timeout/size)
- [x] error format validation (CTXBIN_ERR)
- [x] list output format/sort/type mapping
- [x] Windows behavior test (chmod best-effort, Windows-only)
- [x] Upstash integration tests (ctx/agent/skill/skillpack) when env vars set
- [x] skillref default branch tracking test
- [x] `--version` output test
- [x] `skill load ctxbin` bundled fallback test

## Implementation Notes
- `AGENTS.md`, `CLAUDE.md`, `.claude` are listed in `.gitignore` (not committed).
- `DESIGN.md` is the source of truth for specs.
