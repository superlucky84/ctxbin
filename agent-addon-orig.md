# ctxbin Agent Add‑On

Copy/paste the block between the markers below into your AGENT.md / CLAUDE.md.

<!-- BEGIN CTXBIN AGENT ADDON -->

## ctxbin (Context Persistence)

Use `npx ctxbin ...` when running commands in agent workflows.
Use `npx ctxbin ctx save` to store **branch‑scoped context** so the next agent can continue without re‑explanation.
> Tip: `npx ctxbin skill load ctxbin` prints the bundled ctxbin skill text
> so agents can reference the full ctxbin guidance.

### How ctx keys are inferred (when key is omitted)
```
key = {project}/{branch}
project = git repository root directory name
branch  = git rev-parse --abbrev-ref HEAD
```

### Save context (preferred)
```bash
npx ctxbin ctx save --value "<summary + next steps + decisions>"
```

### Save via stdin
```bash
echo "<context>" | npx ctxbin ctx save
```

### Load context
```bash
npx ctxbin ctx load
```

### If load returns NOT_FOUND
If you see `CTXBIN_ERR NOT_FOUND: no value for ctx:<project>/<branch>`, it means no context was saved yet.
Tell the user and suggest one of:
- Ask them to run `npx ctxbin ctx save --value "<summary + next steps>"`, or
- Ask them to provide the current context directly.

### If load returns NOT_IN_GIT
If you see `CTXBIN_ERR NOT_IN_GIT`, the command was run outside a git repository.
Tell the user to run it inside the project repo, or use an explicit key:
```bash
npx ctxbin ctx load <project>/<branch>
```

### If load returns INVALID_INPUT
If you see `CTXBIN_ERR INVALID_INPUT`, check the command flags.
For `ctx load`, do not pass `--value`, `--file`, or other input flags.

### What to include in ctx
- What changed (summary)
- What remains (next steps)
- Completed vs remaining checklist items
- Important decisions/constraints
- Files touched and why
- Failing tests or warnings

### Do not
- Don’t store secrets
- Don’t overwrite with trivial messages

<!-- END CTXBIN AGENT ADDON -->
