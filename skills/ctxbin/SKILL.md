# ctxbin Skill

## Purpose
Help agents preserve and restore **branch-scoped project context** so the next agent can continue work without re-explanation.

## Core Usage (ctx)
`ctx` automatically derives a key from the current Git repo and branch when omitted.
Prefer `npx ctxbin ...` when running commands in agent workflows.

```
key = {project}/{branch}
project = git repository root directory name
branch  = git rev-parse --abbrev-ref HEAD
```

### Save (most common)
```bash
npx ctxbin ctx save --value "summary / next steps / notes"
```
Or via stdin:
```bash
echo "summary" | npx ctxbin ctx save
```

### Load
```bash
npx ctxbin ctx load
```

### List
```bash
npx ctxbin ctx list
```

### Delete
```bash
npx ctxbin ctx delete
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

```bash
npx ctxbin ctx save --append --value "more notes"
npx ctxbin agent save reviewer --append --value "extra role details"
npx ctxbin skill save my-skill --append --value "extra string"
```

## What agents must include in ctx
Ensure the next agent can continue immediately:

- What changed (summary)
- What remains (next steps)
- Completed vs remaining checklist items
- Important decisions/constraints
- Files touched and why
- Failing tests or warnings

## Storage Model (ctx)
Context is stored in Upstash Redis hash `ctx` under field `{project}/{branch}`.

## Do Not
- Don’t store secrets
- Don’t overwrite with trivial messages
