# ctxbin

Minimal, deterministic CLI to save and load **context**, **agents**, and **skills** in Upstash Redis hashes.
It is designed for fast handoff between AI agents working on the same repo/branch.

> **Core idea:** ctxbin exists to make AI-agent handoffs reliable and repeatable.

## Agent workflow (core)
This is the most important usage. Paste the add-on into your agent instruction file
so agents consistently save and load branch context.

- Add: [`agent-addon.md`](agent-addon.md) → copy the block into your project's agent instruction file
  (e.g. `AGENT.md`, `CLAUDE.md`, or any equivalent).
- Then you can simply ask:
  - “Use ctxbin to save the current context.”
  - “Use ctxbin to load the current context.”

The add-on tells agents how to format context (summary, next steps, decisions) and how to use
`ctxbin ctx save/load` correctly.

## Features
- Branch-scoped `ctx` keys (auto-inferred from git repo + branch)
- `agent` and `skill` storage for reusable prompts and workflows
- `skillpack`: tar.gz + Base64 directory bundles (deterministic)
- `skillref`: GitHub directory reference (default branch or pinned commit)
- `list` command with type mapping (`--value`, `--dir`, `--url`)

## Install
Recommended (no install):
```bash
npx ctxbin --version
```

Or add it to your toolchain:
```bash
pnpm add -g ctxbin
```

## Upstash requirement
ctxbin stores data in **Upstash Redis**. You need an Upstash database and its REST URL/token.

- Create a database at: https://upstash.com/
- Use the REST URL and token as `CTXBIN_STORE_URL` / `CTXBIN_STORE_TOKEN`

## Configure storage
Use environment variables (recommended):
```bash
export CTXBIN_STORE_URL="https://..."
export CTXBIN_STORE_TOKEN="..."
```

Or create `~/.ctxbin/config.json` via interactive init:
```bash
npx ctxbin init
```

## Quick usage
### ctx (branch-scoped, key optional in git repos)
```bash
ctxbin ctx save --value "summary / next steps"
ctxbin ctx load
ctxbin ctx list
ctxbin ctx delete
```

When the key is omitted (inside a git repo):
```
key = {project}/{branch}
project = git repository root directory name
branch  = git rev-parse --abbrev-ref HEAD
```

Explicit key example (useful outside git repos; not recommended for normal use):
```bash
ctxbin ctx save my-project/main --value "summary / next steps"
ctxbin ctx load my-project/main
ctxbin ctx delete my-project/main
```

### agent (string-only)
```bash
ctxbin agent save reviewer --value "# Agent role"
ctxbin agent load reviewer
ctxbin agent list
ctxbin agent delete reviewer
```

### skill (string, skillpack, or skillref)
```bash
ctxbin skill save my-skill --value "# Skill markdown"
ctxbin skill load my-skill
ctxbin skill list
ctxbin skill delete my-skill
```

Skillpack (directory bundle):
```bash
ctxbin skill save fp-pack --dir ./skills/fp-pack
ctxbin skill load fp-pack --dir ./tmp/fp-pack
```

Skillref (GitHub directory reference):
```bash
# Track default branch
ctxbin skill save fp-pack \
  --url https://github.com/OWNER/REPO \
  --path skills/fp-pack

# Pin to a commit
ctxbin skill save fp-pack \
  --url https://github.com/OWNER/REPO \
  --ref <40-hex-commit-sha> \
  --path skills/fp-pack
```

> `skill load` for skillpack/skillref requires `--dir`.

## Built-in guidance
Print the bundled ctxbin skill text:
```bash
npx ctxbin skill load ctxbin
```

## Development
```bash
pnpm install
pnpm build
pnpm test
```

## License
MIT
