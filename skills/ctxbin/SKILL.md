# ctxbin Skill

## Sandbox/Network Policy (Important)
All `ctx`, `agent`, and `skill` `save`, `load`, `list`, and `delete` commands require outbound HTTPS to the remote Upstash store.
Do not run those commands first in a restricted sandbox, network-disabled runner, or any environment that is likely to block outbound HTTPS.

Execution priority:
1. Run in an `unrestricted` or `network-enabled` environment.
2. Use a `restricted` sandbox only for local file work that does not call the remote store. It is not recommended for `ctxbin` store operations.

Retry rule:
- If a restricted sandbox produces a timeout, `fetch failed`, `CTXBIN_ERR NETWORK`, or any other network-denied behavior, do not retry there.
- Switch immediately to an `unrestricted` or `network-enabled` environment and rerun once.
- `help` is local-only; the remote store is not involved.

## Command Launcher Preference
Use `pnpm exec ctxbin ...` as the default command form when `ctxbin` is already available in the workspace.
Use `npx --no-install ctxbin ...` only as a fallback when the package is already installed or cached locally.
Avoid plain `npx ctxbin ...` in restricted environments because it may try to reach the npm registry before the CLI starts.

## Network Failure Triage
### `npx` package installation failure
This fails before the CLI starts, usually with npm registry DNS/TLS/timeout errors and no `CTXBIN_ERR` prefix.
Immediate action: switch to an `unrestricted` or `network-enabled` environment, make `ctxbin` available locally, then rerun with `pnpm exec ctxbin ...`. If the package is already present, use `npx --no-install ctxbin ...`.

### `CTXBIN_ERR NETWORK`
This means the CLI started, but the remote store API call failed.
Immediate action: do not retry in the restricted sandbox. Switch immediately to an `unrestricted` or `network-enabled` environment and rerun the same command once.

### Local-file fallback when network is unavailable
Keep the handoff in a local file first, then upload it as soon as network access is available.

```bash
# Save locally while blocked
printf '%s\n' "summary + next steps" > ctx-pending.md

# Upload later from a network-enabled environment
pnpm exec ctxbin ctx save --file ctx-pending.md
```

## Purpose
Help agents preserve and restore branch-scoped project context so the next agent can continue work without re-explanation.

## Core Usage (ctx)
`ctx` automatically derives a key from the current Git repo and branch when omitted.
Prefer `pnpm exec ctxbin ...` for normal workflows because it avoids an extra package-install lookup when `ctxbin` is already present.

```text
key = {project}/{branch}
project = package.json "name" field, or folder name if no package.json
branch  = git rev-parse --abbrev-ref HEAD
```

> **Note:** If `package.json` exists, the `name` field is used as the project name.
> If the name differs from the folder name, a warning is printed.
> Without `package.json`, the folder name is used. Use an explicit key if needed.

### Save (most common)
```bash
# Auto-key (inferred from git)
pnpm exec ctxbin ctx save --value "summary / next steps / notes"

# Explicit key (when folder name differs or outside git)
pnpm exec ctxbin ctx save my-project/main --value "summary / next steps / notes"
```
Or via stdin:
```bash
echo "summary" | pnpm exec ctxbin ctx save
```

### Load
```bash
pnpm exec ctxbin ctx load
```

### Metadata (`--meta`, `--by`)
`ctx save`, `agent save`, and string-based `skill save` automatically add metadata:
- `savedAt`: ISO timestamp
- `by` (optional): agent identifier from `--by`

Default load hides metadata and prints only body text.
Use `--meta` to include metadata in output.

```bash
# Save with actor id
pnpm exec ctxbin ctx save --by codex --value "summary / next steps"

# Default load (body only)
pnpm exec ctxbin ctx load

# Load with metadata block
pnpm exec ctxbin ctx load --meta
```

### Raw passthrough (`--raw`)
Use `--raw` when you need exact stored payload I/O (including metadata wrapper).

```bash
# Save exact payload (no savedAt/by injection or update)
pnpm exec ctxbin ctx save my-project/main --raw --value "ctxbin-meta@1
{\"savedAt\":\"2025-01-01T00:00:00.000Z\"}
---
body"

# Load exact payload (no metadata stripping)
pnpm exec ctxbin ctx load my-project/main --raw
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
- `pnpm exec ctxbin ctx save --value "<summary + next steps>"`, or
- Provide the current context directly.

### If load returns NOT_IN_GIT
`CTXBIN_ERR NOT_IN_GIT` means the command ran outside a git repository.
Tell the user to run it inside the project repo, or use an explicit key:
```bash
pnpm exec ctxbin ctx load <project>/<branch>
```

### If load returns INVALID_INPUT
`CTXBIN_ERR INVALID_INPUT` usually means flags were used incorrectly.
For `ctx load`, do not pass `--value`, `--file`, or other input flags.

### If any command returns NETWORK
`CTXBIN_ERR NETWORK: fetch failed` means the HTTP request to the remote store failed.
All `save`, `load`, `list`, and `delete` commands call Upstash Redis over HTTPS, so they require outbound network access.

Immediate response:
1. Do not retry in the restricted sandbox.
2. Move to an `unrestricted` or `network-enabled` environment and rerun.
3. If network access is still unavailable, save to a local file and upload later:
   ```bash
   printf '%s\n' "summary + next steps" > ctx-pending.md
   pnpm exec ctxbin ctx save --file ctx-pending.md
   ```

### List
```bash
pnpm exec ctxbin ctx list
```

### Delete
```bash
# Auto-key
pnpm exec ctxbin ctx delete

# Explicit key
pnpm exec ctxbin ctx delete my-project/main
```

## agent Save/Load
`agent` requires a key and stores string values only.

```bash
pnpm exec ctxbin agent save reviewer --value "# Agent role"
pnpm exec ctxbin agent load reviewer
```

### List/Delete
```bash
pnpm exec ctxbin agent list
pnpm exec ctxbin agent delete reviewer
```

## skill Save/Load
`skill` requires a key.

```bash
pnpm exec ctxbin skill save my-skill --value "# Skill markdown"
pnpm exec ctxbin skill load my-skill
```

### List/Delete
```bash
pnpm exec ctxbin skill list
pnpm exec ctxbin skill delete my-skill
```

## Input Options (`--file`, `--value`, `--dir`, `--url`)
Use exactly one input method.

- `--value`: store a literal string
  ```bash
  pnpm exec ctxbin ctx save --value "summary"
  pnpm exec ctxbin agent save reviewer --value "# Agent role"
  pnpm exec ctxbin skill save my-skill --value "# Skill markdown"
  ```

- `--file`: store file contents
  ```bash
  pnpm exec ctxbin ctx save --file context.md
  pnpm exec ctxbin agent save reviewer --file agent.md
  pnpm exec ctxbin skill save my-skill --file SKILL.md
  ```

- `--dir`: store a directory as a skillpack (skill-only)
  ```bash
  pnpm exec ctxbin skill save my-skill --dir ./skills/my-skill
  pnpm exec ctxbin skill load my-skill --dir ./tmp/my-skill
  ```

- `--url` (+ `--path`, optional `--ref`): GitHub directory reference (skill-only)
  ```bash
  # Pin to a specific commit
  pnpm exec ctxbin skill save my-skill \
    --url https://github.com/OWNER/REPO \
    --ref <40-hex-commit-sha> \
    --path skills/my-skill

  # Track default branch (omit --ref)
  pnpm exec ctxbin skill save my-skill \
    --url https://github.com/OWNER/REPO \
    --path skills/my-skill
  ```

## `--append` Examples
`--append` works with string inputs only.
Do not combine `--append` with `--raw`.

```bash
pnpm exec ctxbin ctx save --append --value "more notes"
pnpm exec ctxbin agent save reviewer --append --value "extra role details"
pnpm exec ctxbin skill save my-skill --append --value "extra string"
```

## Fallback Launcher Example
If `ctxbin` is already installed or cached but `pnpm exec` is unavailable, use `npx --no-install`.
Do not use plain `npx ctxbin ...` as the first attempt in a restricted sandbox.

```bash
npx --no-install ctxbin ctx load
npx --no-install ctxbin agent list
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
