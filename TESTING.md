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

## Notes
- Skillpack has a 7MB tar.gz size limit.
- Skillref supports public GitHub repositories only.
- Errors are printed as `CTXBIN_ERR <CODE>: <message>`.
