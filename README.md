# <img src="https://superlucky84.github.io/ctxbin/ctxbin.png" alt="ctxbin" width="24" height="24" style="vertical-align: -4px; margin-right: 8px;" /> ctxbin

Minimal, deterministic CLI to save and load **context**, **agents**, and **skills** in Upstash Redis hashes,
and install remote skills and agents into local **Claude Code** and **Codex**.
It is designed for fast handoff between AI agents working on the same repo/branch,
with branch-based [context keys inferred](https://superlucky84.github.io/ctxbin/#/guide/key-inference) inside git repositories.

Docs: https://superlucky84.github.io/ctxbin/

> Companion: for local-first `ctx` workflows with explicit sync, see [ctxloc](https://github.com/superlucky84/ctxloc).

> **Core idea:** ctxbin exists to make AI-agent handoffs reliable and repeatable.

> ⚠️ **Prerequisite:** ctxbin requires [Upstash Redis](https://upstash.com/) for storage.
> Create a free database, then run `npx ctxbin init` to configure.

## Agent workflow (core)
This is the most important usage. Let agents consistently save and load branch context.

### Option 1: Zero-setup (simplest)
Just ask your AI agent directly:
```
"Run `npx ctxbin help`, read the output, then save the current context."
```
The agent will self-discover the usage guide and follow it.

### Option 2: Add-on file
For consistent behavior across sessions, copy the add-on into your agent instruction file:

- Add: [agent add-on guide](https://superlucky84.github.io/ctxbin/#/guide/agent-addon) → copy the block into your project's agent instruction file
  (e.g. `AGENT.md`, `CLAUDE.md`, or any equivalent).
- Then you can simply ask:
  - "Use npx ctxbin to save the current context."
  - "Use npx ctxbin to load the current context."

The add-on tells agents how to format context (summary, next steps, decisions) and how to use
`npx ctxbin ctx save/load` correctly.

You can also ask agents to save/load skills with simple commands like `--url` or `--dir`. See [Quick Start](https://superlucky84.github.io/ctxbin/#/guide/quick-start) for examples.
To install all remote skills and agents into local Claude Code/Codex, preview with
`npx ctxbin sync --target all --dry-run`, then run `npx ctxbin sync --target all`.
See the [sync command guide](https://superlucky84.github.io/ctxbin/#/commands/sync)
([한국어](https://superlucky84.github.io/ctxbin/#/ko/commands/sync)).

## Features
- Branch-scoped `ctx` keys (auto-inferred from git repo + branch)
- `agent` and `skill` storage for reusable prompts and workflows
- `skillpack`: tar.gz + Base64 directory bundles (deterministic)
- `skillref`: GitHub directory reference (default branch or pinned commit)
- `list` command with type mapping (`--value`, `--dir`, `--url`)
- Remote-to-local skill/agent installation for Claude Code and Codex (`sync`)

## Companion Project: ctxloc
- `ctxbin` is the remote-storage-oriented CLI.
- [`ctxloc`](https://github.com/superlucky84/ctxloc) is a local-first companion focused on `ctx` + explicit sync.
- Context replication lives in `ctxloc` (`ctxloc sync`). `ctxbin sync` installs
  remote skills and agents into Claude Code/Codex and does not access `ctx`.

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
npx ctxbin ctx save --value "summary / next steps"
npx ctxbin ctx load
npx ctxbin ctx list
npx ctxbin ctx delete
```

When the key is omitted, ctxbin infers it **only inside a git repository**.
See [Key Inference](https://superlucky84.github.io/ctxbin/#/guide/key-inference) for details.

Explicit key example (useful outside git repos; not recommended for normal use):
```bash
npx ctxbin ctx save my-project/main --value "summary / next steps"
npx ctxbin ctx load my-project/main
npx ctxbin ctx delete my-project/main
```

Raw passthrough (exact payload I/O for string values):
```bash
# Save exactly as provided (no metadata injection/update)
npx ctxbin ctx save my-project/main --raw --file context.raw

# Load exactly as stored (no metadata stripping)
npx ctxbin ctx load my-project/main --raw
```

`--raw` is intended for sync/migration tooling. It prints a warning by default.
For automation, suppress this warning with `CTXBIN_SUPPRESS_RAW_WARN=1`.

### agent (string-only)
```bash
npx ctxbin agent save reviewer --value "# Agent role"
npx ctxbin agent load reviewer
npx ctxbin agent list
npx ctxbin agent delete reviewer
```

### skill (string, skillpack, or skillref)
```bash
npx ctxbin skill save my-skill --value "# Skill markdown"
npx ctxbin skill load my-skill
npx ctxbin skill list
npx ctxbin skill delete my-skill
```

Skillpack (directory bundle):
```bash
npx ctxbin skill save fp-pack --dir ./skills/fp-pack
npx ctxbin skill load fp-pack --dir ./tmp/fp-pack
```

Skillref (GitHub directory reference):
```bash
# Track default branch
npx ctxbin skill save fp-pack \
  --url https://github.com/OWNER/REPO \
  --path skills/fp-pack

# Pin to a commit
npx ctxbin skill save fp-pack \
  --url https://github.com/OWNER/REPO \
  --ref <40-hex-commit-sha> \
  --path skills/fp-pack
```

> `skill load` for skillpack/skillref requires `--dir`.

### Install remote skills and agents locally

`sync` downloads all stored skills and agents. Choose a target explicitly:
It uses the existing store credentials, including for preview; no Git repository
or key argument is required.

```bash
npx ctxbin sync --target all --dry-run
npx ctxbin sync --target all
npx ctxbin sync --target claude
npx ctxbin sync --target codex --prune
```

| Option | Purpose |
| --- | --- |
| `--target claude\|codex\|all` | Required installation target |
| `--dry-run` | Download, validate, and preview without destination changes |
| `--prune` | Delete this store's tracked installs that are now absent remotely |
| `--skills-dir <path>` | Override skill root for one target |
| `--agents-dir <path>` | Override agent root for one target |

Sync flags belong to sync only; save/load input flags are rejected. Path overrides
require a single target. `--raw` is not needed for installation.

Matching skill directories are replaced completely, including removal of stale
files inside them. Local-only skills/agents remain. `--prune` deletes only items
previously installed by ctxbin from the same remote store and now absent remotely.
Without `--prune`, removed remote items remain installed and tracked for later pruning.
`--dry-run` downloads and validates content and prints actions without changing
installation directories or tracking state. Sync only reads the remote store.

| Target | Skills | Agents |
| --- | --- | --- |
| Claude Code | `~/.claude/skills/<name>/SKILL.md` | `~/.claude/agents/<name>.md` |
| Codex | `~/.agents/skills/<name>/SKILL.md` | `~/.codex/agents/<name>.toml` |

Override destinations for a single target, for example an existing Codex layout:

```bash
npx ctxbin sync --target codex --skills-dir ~/.codex/skills
npx ctxbin sync --target claude --skills-dir ./local-skills --agents-dir ./local-agents
```

Skills may be Markdown strings, skillpacks, or skillrefs. Bundles must include a
root `SKILL.md`; supporting files and normalized executable permissions are kept.
Portable remote keys use 1–64 lowercase letters/digits with single `-` or `_`
separators. Unsafe/reserved names fail. A supplied frontmatter `name` must match the key.

Shared agent Markdown accepts only `name` and `description` frontmatter, followed
by the rules. Sync generates native Claude Markdown or Codex TOML from it:

```markdown
---
name: reviewer
description: Review code changes for correctness and missing tests.
---

Inspect changed code and report actionable findings.
```

Save with `ctxbin agent save reviewer --file reviewer.md`. Legacy Markdown without
frontmatter works too: sync fills the name from the key and uses
`Agent rules for <name>.` (agent) or `Reusable instructions for <name>.` (skill)
as the default description. Other skill frontmatter fields are preserved.
Provider-specific agent model/tool settings are not translated; unsupported
shared agent frontmatter fails with an error.

Sync stages and validates every item before replacement, locks each destination,
and rolls back entries/manifests on ordinary apply failures. Tracking is stored in
`.ctxbin-sync.json` within each destination; it contains source URL digests, never
credentials. Whole-command crash atomicity is not guaranteed: after an interrupted
run, inspect leftover `.ctxbin-sync.lock` and `.ctxbin-sync-txn-*` backups before retrying.
Destination/root symlinks and overlapping overrides are refused.
Recovery transaction directories contain `journal.json` mapping backups to their
destinations. Installing a same-name item from another store transfers tracking
ownership to that store. Empty stores succeed and can prune this store's tracked
entries when `--prune` is supplied.
Output is tab-separated action, target, resource, name, and absolute path;
preview adds a leading `dry-run` field.
Existing `skill load --dir` keeps extra destination files; sync replaces matching
skill directories completely. The bundled fallback skill is not automatically added
to the remote sync list.

See [feature design](docs/local-sync/DESIGN.md) and
[release checks](docs/local-sync/MANUAL_TEST_CHECKLIST.md).

## Built-in guidance
Print the bundled ctxbin usage guide:
```bash
npx ctxbin help
```

## Development
```bash
pnpm install
pnpm build
pnpm test
```

## License
MIT
