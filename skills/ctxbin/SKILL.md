# ctxbin Skill

## Sandbox/Network Policy (Important)
All `ctx`, `agent`, and `skill` `save`, `load`, `list`, and `delete` commands require outbound HTTPS to the remote Upstash store.
`sync` also requires remote-store access; skillrefs additionally download from GitHub.
Do not run those commands first in a restricted sandbox, network-disabled runner, or any environment that is likely to block outbound HTTPS.
`help` is local-only; the remote store is not involved.

> Quick decision:
> - Remote command? Run it first in an `unrestricted` or `network-enabled` environment.
> - Timeout, `fetch failed`, or `CTXBIN_ERR NETWORK` in `restricted`? Do not retry there. Switch immediately.
> - Network unavailable? Save to a local file now and sync later.

Launcher choice:
1. If `ctxbin` is already installed locally, prefer `pnpm exec ctxbin ...`.
2. If it is not installed locally, use `npx ctxbin ...`.
3. If it is installed locally but you want `npx`, use `npx --no-install ctxbin ...`.

Failure triage:
### `npx` package installation failure
This fails before the CLI starts, usually with npm registry DNS/TLS/timeout errors and no `CTXBIN_ERR` prefix.
Immediate action: switch to an `unrestricted` or `network-enabled` environment and rerun. If the package is already present locally, use `pnpm exec ctxbin ...` or `npx --no-install ctxbin ...`.

### `CTXBIN_ERR NETWORK`
This means the CLI started, but the remote store API call failed.
Immediate action: do not retry in the restricted sandbox. Switch immediately to an `unrestricted` or `network-enabled` environment and rerun the same command once.

### Local-file fallback when network is unavailable
Keep the handoff in a local file first, then upload it as soon as network access is available.

```bash
# Save locally while blocked
printf '%s\n' "summary + next steps" > ctx-pending.md

# Upload later from a network-enabled environment
# If installed locally
pnpm exec ctxbin ctx save --file ctx-pending.md

# Otherwise
npx ctxbin ctx save --file ctx-pending.md
```

## Purpose
Help agents preserve and restore branch-scoped project context so the next agent can continue work without re-explanation.
Store reusable skills and agent rules remotely, then install them into local Claude Code
or Codex when the user requests it.

## Command overview

| Command | Purpose |
| --- | --- |
| `ctx save/load/list/delete` | Store and retrieve branch context |
| `agent save/load/list/delete` | Manage remote agent Markdown |
| `skill save/load/list/delete` | Manage remote Markdown, directory bundles, and GitHub references |
| `sync --target claude\|codex\|all` | Install every remote skill and agent into the selected local clients |
| `help` | Print this bundled guide without remote access |
| `init` | Configure remote-store credentials interactively |

`sync` uses existing `CTXBIN_STORE_URL` / `CTXBIN_STORE_TOKEN` or
`~/.ctxbin/config.json`, including for `--dry-run`. It does not require a Git
repository or key. Context replication between local and remote stores is provided
by the companion `ctxloc`; `ctxbin sync` installs skills and agents.

## Core Usage (ctx)
`ctx` automatically derives a key from the current Git repo and branch when omitted.
Examples below use `npx` for portability.

```text
key = {project}/{branch}
project = package.json "name" field, or folder name if no package.json
branch  = git rev-parse --abbrev-ref HEAD
```

> If the package name differs from the folder name, a warning is printed.
> Use an explicit key to override inference.

### Save (most common)
```bash
# Auto-key (inferred from git)
npx ctxbin ctx save --value "summary / next steps / notes"

# Explicit key (when folder name differs or outside git)
npx ctxbin ctx save my-project/main --value "summary / next steps / notes"
```
Or via stdin:
```bash
echo "summary" | npx ctxbin ctx save
```

### Load
```bash
npx ctxbin ctx load
```

### Metadata (`--meta`, `--by`)
`ctx save`, `agent save`, and string-based `skill save` automatically add metadata:
- `savedAt`: ISO timestamp
- `by` (optional): agent identifier from `--by`

Default load hides metadata and prints only body text.
Use `--meta` to include metadata in output.

```bash
# Save with actor id
npx ctxbin ctx save --by codex --value "summary / next steps"

# Load with metadata block
npx ctxbin ctx load --meta
```

### Raw passthrough (`--raw`)
Use `--raw` when you need exact stored payload I/O (including metadata wrapper).

```bash
# Save exact payload (no savedAt/by injection or update)
npx ctxbin ctx save my-project/main --raw --value "ctxbin-meta@1
{\"savedAt\":\"2025-01-01T00:00:00.000Z\"}
---
body"

# Load exact payload (no metadata stripping)
npx ctxbin ctx load my-project/main --raw
```

Rules:
- `save --raw` only applies to string input methods (`--value`, `--file`, or stdin)
- `save --raw` cannot be combined with `--append` or `--by`
- `load --raw` cannot be combined with `--meta` or `--dir`
- `--raw` is for sync/migration exact-payload workflows; normal agent work should use default `save`/`load`
- `--raw` prints `CTXBIN_WARN` by default; automation can set `CTXBIN_SUPPRESS_RAW_WARN=1`

### If load returns NOT_FOUND
`CTXBIN_ERR NOT_FOUND: no value for ctx:<project>/<branch>` means nothing has been saved for this branch yet.
Tell the user and suggest:
- `npx ctxbin ctx save --value "<summary + next steps>"`, or
- Provide the current context directly.

### If load returns NOT_IN_GIT
`CTXBIN_ERR NOT_IN_GIT` means the command ran outside a git repository.
Tell the user to run it inside the project repo, or use an explicit key:
```bash
npx ctxbin ctx load <project>/<branch>
```

### If load returns INVALID_INPUT
`CTXBIN_ERR INVALID_INPUT` usually means flags were used incorrectly.
For `ctx load`, do not pass `--value`, `--file`, or other input flags.

### List
```bash
npx ctxbin ctx list
```

### Delete
```bash
# Auto-key
npx ctxbin ctx delete

# Explicit key
npx ctxbin ctx delete my-project/main
```

## agent Save/Load
`agent` requires a key and stores string values only.

```bash
npx ctxbin agent save reviewer --value "# Agent role"
npx ctxbin agent load reviewer
npx ctxbin agent list
npx ctxbin agent delete reviewer
```

## Install remote skills and agents locally

Use sync when the user explicitly requests local installation or synchronization.
Select the target explicitly; sync reads only the remote `skill` and `agent` hashes.
Prefer already installed definitions during ordinary work.

```bash
npx ctxbin sync --target all --dry-run
npx ctxbin sync --target all
npx ctxbin sync --target claude
npx ctxbin sync --target codex --prune
# Existing local layout (single-target override)
npx ctxbin sync --target codex --skills-dir ~/.codex/skills
```

- Claude paths: `~/.claude/skills/<name>/SKILL.md`, `~/.claude/agents/<name>.md`.
- Codex paths: `~/.agents/skills/<name>/SKILL.md`, `~/.codex/agents/<name>.toml`.
- Keys: 1–64 lowercase letters/digits with single `-`/`_` separators; unsafe/reserved names fail.

### Sync options

| Option | Meaning |
| --- | --- |
| `--target claude\|codex\|all` | Required; select one client or both |
| `--dry-run` | Download, validate, and preview without destination changes |
| `--prune` | Remove tracked installs from this store that are now absent remotely |
| `--skills-dir <path>` | Override the skills root for a single target |
| `--agents-dir <path>` | Override the agents root for a single target |

These flags apply only to `sync`. Directory overrides cannot be used with
`--target all`. Save/load flags such as `--file`, `--dir`, `--raw`, and `--append`
are not accepted by sync. Sync never uploads or accesses `ctx`.

### Shared rule format

Save the following as `reviewer.md`, then use
`npx ctxbin agent save reviewer --file reviewer.md` before syncing:

```markdown
---
name: reviewer
description: Review code changes for correctness and missing tests.
---

Inspect changed code and report actionable findings.
```

Shared agents accept only `name` and `description` frontmatter. Provider-specific
model/tool fields cause an error rather than being silently dropped. Names must match
remote keys; sync renders Claude Markdown or Codex TOML.
Legacy Markdown defaults are `Agent rules for <name>.` for agents and
`Reusable instructions for <name>.` for skills; supply a description to improve discovery.
Skills support strings, packs, and refs, preserving frontmatter and supporting files.
Bundles need root `SKILL.md`; sync never adds the bundled ctxbin fallback to the remote list.

Existing `skill load <key> --dir <path>` copies matching files and leaves extra files
alone. Sync replaces complete matching skill directories, so removed remote files
inside those directories also disappear locally; agents are replaced as complete files.
Upload local changes with existing
`skill save --dir` / `agent save --file` commands.

### Tracking and recovery

Each destination root keeps `.ctxbin-sync.json` with item ownership and a digest of
the store URL. No URL/token or rule content is stored in this manifest. Without
`--prune`, removed remote entries stay installed and tracked for later pruning.
Prune preserves unmanaged and other-store items. Installing a same-name item from a
different store transfers ownership to that store. Empty stores succeed with no
actions, or prune this store's tracked entries when requested.

All downloads, validation, and replacement preparation precede destructive moves.
Ordinary apply errors restore replaced/deleted items and manifests. Process termination
and power loss are outside that rollback guarantee. An existing `.ctxbin-sync.lock`
returns an `IO` error; inspect it before retrying. If rollback cannot finish, the
error reports retained `.ctxbin-sync-txn-*` backups. Their `journal.json` maps the
destination and backup paths for manual recovery. Root/parent symlinks, named
destination symlinks, overlapping roots, and malformed manifests are rejected.

Output fields: action (`create`, `replace`, `delete`), target, resource, name, and
absolute path, separated by tabs. Preview adds a leading `dry-run` field:

```text
dry-run	create	claude	skill	my-skill	/Users/example/.claude/skills/my-skill
dry-run	create	codex	agent	reviewer	/Users/example/.codex/agents/reviewer.toml
```

Malformed metadata/options return `INVALID_INPUT`; unsafe names/destinations return
`INVALID_PATH`; store/GitHub failures return `NETWORK`. Errors go to stderr and exit 1;
action output appears only after successful validation/apply. Preview has the same
validation and network error behavior.

## skill Save/Load
`skill` requires a key.

```bash
npx ctxbin skill save my-skill --value "# Skill markdown"
npx ctxbin skill load my-skill
npx ctxbin skill list
npx ctxbin skill delete my-skill
```

## Input Options (`--file`, `--value`, `--dir`, `--url`)
Use exactly one input method.

- `--value`: store a literal string

- `--file`: store file contents
  ```bash
  npx ctxbin ctx save --file context.md
  npx ctxbin skill save my-skill --file SKILL.md
  ```

- `--dir`: store a directory as a skillpack (skill-only)
  ```bash
  npx ctxbin skill save my-skill --dir ./skills/my-skill
  npx ctxbin skill load my-skill --dir ./tmp/my-skill
  ```

- `--url` (+ `--path`, optional `--ref`): GitHub directory reference (skill-only)
  ```bash
  # Pin to a specific commit
  npx ctxbin skill save my-skill \
    --url https://github.com/OWNER/REPO \
    --ref <40-hex-commit-sha> \
    --path skills/my-skill

  # Track default branch (omit --ref)
  npx ctxbin skill save my-skill \
    --url https://github.com/OWNER/REPO \
    --path skills/my-skill
  ```

## `--append` Examples
`--append` works with string inputs only.

```bash
npx ctxbin ctx save --append --value "more notes"
npx ctxbin agent save reviewer --append --value "extra role details"
npx ctxbin skill save my-skill --append --value "extra string"
```

## What agents must include in ctx
Use this format so the next agent can continue immediately:

```markdown
# summary
Brief description of what was done and current state.

# decisions
Key decisions made and why (alternatives considered, trade-offs).

# open
Unresolved issues, open questions, or blocked items.

# next
What to do next, in priority order.

# risks
Potential problems, warnings, or things to watch out for.
```

**Guidelines:**
- Omit sections that don't apply (e.g., no `# risks` if none)
- Keep each section concise but informative
- `# decisions` is most valuable for handoffs; capture the why

## Storage Model (ctx)
Context is stored in Upstash Redis hash `ctx` under field `{project}/{branch}`.

## Do Not
- Do not store secrets.
- Do not overwrite useful context with trivial messages.
