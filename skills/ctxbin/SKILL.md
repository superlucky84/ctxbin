# ctxbin Skill

## Purpose
Help agents preserve and restore **branch-scoped project context** so the next agent can continue work without re-explanation.

## Core Usage (ctx)
`ctx` automatically derives a key from the current Git repo and branch when omitted.
Prefer `npx ctxbin ...` when running commands in agent workflows.

```
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

# Default load (body only)
npx ctxbin ctx load

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

### If any command returns NETWORK
`CTXBIN_ERR NETWORK: fetch failed` means the HTTP request to the remote store failed.
All `save`, `load`, `list`, and `delete` commands call Upstash Redis over HTTPS, so they require outbound network access.

**Common cause:** sandboxed or CI environments that restrict network by default.

Remediation:
1. **Grant network permission** — allow outbound HTTPS in the sandbox/runner config, then retry the same command.
2. **Use `npx --no-install`** — if ctxbin is already installed, skip the npm registry lookup:
   ```bash
   npx --no-install ctxbin ctx load
   ```
3. **Fallback to local file** — when the network is unavailable, save context to a local file and upload later:
   ```bash
   # Save locally first
   echo "summary + next steps" > ctx-pending.md
   # Upload when network is available
   npx ctxbin ctx save --file ctx-pending.md
   ```

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
`agent` requires a key and stores **string values only**.

```bash
npx ctxbin agent save reviewer --value "# Agent role"
npx ctxbin agent load reviewer
```

### List/Delete
```bash
npx ctxbin agent list
npx ctxbin agent delete reviewer
```

## skill Save/Load
`skill` requires a key.

```bash
npx ctxbin skill save my-skill --value "# Skill markdown"
npx ctxbin skill load my-skill
```

### List/Delete
```bash
npx ctxbin skill list
npx ctxbin skill delete my-skill
```

## Input Options (`--file`, `--value`, `--dir`, `--url`)
Use **exactly one** input method.

- `--value`: store a literal string
  ```bash
  npx ctxbin ctx save --value "summary"
  npx ctxbin agent save reviewer --value "# Agent role"
  npx ctxbin skill save my-skill --value "# Skill markdown"
  ```

- `--file`: store file contents
  ```bash
  npx ctxbin ctx save --file context.md
  npx ctxbin agent save reviewer --file agent.md
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
`--append` works with **string inputs only**.
Do not combine `--append` with `--raw`.

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
- `# decisions` is most valuable for handoffs—capture the "why"

## Storage Model (ctx)
Context is stored in Upstash Redis hash `ctx` under field `{project}/{branch}`.

## Do Not
- Don’t store secrets
- Don’t overwrite with trivial messages
