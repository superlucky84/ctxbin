# ctxbin Skill

## Purpose
Help agents preserve and restore **branch-scoped project context** so the next agent can continue work without re-explanation.

## Core Usage (ctx)
`ctx` automatically derives a key from the current Git repo and branch when omitted.

```
key = {project}/{branch}
project = git repository root directory name
branch  = git rev-parse --abbrev-ref HEAD
```

### Save (most common)
```bash
ctxbin ctx save --value "summary / next steps / notes"
```
Or via stdin:
```bash
echo "summary" | ctxbin ctx save
```

### Load
```bash
ctxbin ctx load
```

### List
```bash
ctxbin ctx list
```

### Delete
```bash
ctxbin ctx delete
```

## agent Save/Load
`agent` requires a key and stores **string values only**.

```bash
ctxbin agent save reviewer --value "# Agent role"
ctxbin agent load reviewer
```

### List/Delete
```bash
ctxbin agent list
ctxbin agent delete reviewer
```

## skill Save/Load
`skill` requires a key.

```bash
ctxbin skill save my-skill --value "# Skill markdown"
ctxbin skill load my-skill
```

### List/Delete
```bash
ctxbin skill list
ctxbin skill delete my-skill
```

## Input Options (`--file`, `--value`, `--dir`, `--url`)
Use **exactly one** input method.

- `--value`: store a literal string
  ```bash
  ctxbin ctx save --value "summary"
  ctxbin agent save reviewer --value "# Agent role"
  ctxbin skill save my-skill --value "# Skill markdown"
  ```

- `--file`: store file contents
  ```bash
  ctxbin ctx save --file context.md
  ctxbin agent save reviewer --file agent.md
  ctxbin skill save my-skill --file SKILL.md
  ```

- `--dir`: store a directory as a skillpack (skill-only)
  ```bash
  ctxbin skill save my-skill --dir ./skills/my-skill
  ctxbin skill load my-skill --dir ./tmp/my-skill
  ```

- `--url` (+ `--path`, optional `--ref`): GitHub directory reference (skill-only)
  ```bash
  # Pin to a specific commit
  ctxbin skill save my-skill \
    --url https://github.com/OWNER/REPO \
    --ref <40-hex-commit-sha> \
    --path skills/my-skill

  # Track default branch (omit --ref)
  ctxbin skill save my-skill \
    --url https://github.com/OWNER/REPO \
    --path skills/my-skill
  ```

## `--append` Examples
`--append` works with **string inputs only**.

```bash
ctxbin ctx save --append --value "more notes"
ctxbin agent save reviewer --append --value "extra role details"
ctxbin skill save my-skill --append --value "extra string"
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

