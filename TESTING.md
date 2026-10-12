# Testing Guide

This guide explains how to test `ctxbin` against a real Upstash Redis instance.

## Prerequisites
- Node.js 18+
- pnpm
- Upstash Redis REST URL/TOKEN

Use environment variables or the local config file.

### Environment variables (recommended)
```bash
export CTXBIN_STORE_URL="https://..."
export CTXBIN_STORE_TOKEN="..."
```

### Config file
```json
// ~/.ctxbin/config.json
{
  "store_url": "https://...",
  "store_token": "..."
}
```

> `ctxbin init` is for interactive setup.

## Local build
```bash
pnpm install
pnpm build
```

## Basic workflow check
After building, run:

```bash
node dist/cli.js ctx save --value "hello"
node dist/cli.js ctx load
node dist/cli.js ctx delete
```

> `ctx` can only infer keys inside a git repository.

## agent/skill checks
```bash
node dist/cli.js agent save reviewer --value "# Agent role"
node dist/cli.js agent load reviewer
node dist/cli.js agent delete reviewer
```

### Skillpack (directory storage)
```bash
node dist/cli.js skill save fp-pack --dir ./skills/ctxbin
node dist/cli.js skill load fp-pack --dir ./tmp/skill
```

### Skillref (GitHub reference)
```bash
node dist/cli.js skill save fp-pack \
  --url https://github.com/superlucky84/ctxbin \
  --path skills/ctxbin

node dist/cli.js skill load fp-pack --dir ./tmp/skill
```

## Test script
```bash
pnpm test
```

## Local sync checks

After building this branch, use `node dist/cli.js` to test the unreleased command.
Use a dedicated test store: sync reads every stored skill and agent, and all items
must satisfy its name/frontmatter requirements. It never uploads changes.

```bash
# Preview default client destinations without installing
node dist/cli.js sync --target all --dry-run

# Install into disposable folders instead of real user directories
node dist/cli.js sync --target claude --skills-dir ./tmp/claude-skills --agents-dir ./tmp/claude-agents
node dist/cli.js sync --target codex --skills-dir ./tmp/codex-skills --agents-dir ./tmp/codex-agents

# Preview and apply source-scoped cleanup
node dist/cli.js sync --target claude --skills-dir ./tmp/claude-skills --agents-dir ./tmp/claude-agents --prune --dry-run
node dist/cli.js sync --target claude --skills-dir ./tmp/claude-skills --agents-dir ./tmp/claude-agents --prune
```

Ensure a bundle has root `SKILL.md` and a supplied frontmatter name matches the
remote key. The generated `dist/skills/ctxbin` bundle declares `name: ctxbin`, so
save that bundle under key `ctxbin` for sync. The `fp-pack` load examples above
exercise raw directory extraction, which does not enforce the sync identity contract.

Confirm stale files inside replaced skills disappear, local-only items survive,
and native Claude Markdown/Codex TOML preserve shared rules. After deleting an item
from the dedicated remote store, normal sync should retain its local install;
prune should remove only this store's previously tracked entry. Keep manifests
to preserve tracking; inspect locks and transaction journals after interruption.

`tests/sync.test.js` uses temporary folders and mock stores/GitHub responses for
conversion, bundles, preview/prune, source ownership, symlinks, locks, and rollback.
Native client discovery and platform checks are listed in
[the sync manual checklist](docs/local-sync/MANUAL_TEST_CHECKLIST.md).

## Help and site documentation checks

```bash
pnpm build
node dist/cli.js help
node --test tests/validation.test.js
pnpm --dir docs build
```

Help should include sync targets, options, paths, credentials, shared-rule examples,
tracked pruning, output, and recovery behavior. Check English and Korean home,
quick-start, command, config, storage, error, and add-on pages, following links to
the appropriate language's sync guide.

## Notes
- Skillpack has a 7MB tar.gz size limit.
- Skillref supports public GitHub repositories only.
- Errors are printed as `CTXBIN_ERR <CODE>: <message>`.
