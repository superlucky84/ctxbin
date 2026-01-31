# ctxbin Agent Add‑On

Copy/paste the block between the markers below into your AGENT.md / CLAUDE.md.

<!-- BEGIN CTXBIN AGENT ADDON -->

## ctxbin (Context Persistence)

Use `ctxbin ctx save` to store **branch‑scoped context** so the next agent can continue without re‑explanation.
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
ctxbin ctx save --value "<summary + next steps + decisions>"
```

### Save via stdin
```bash
echo "<context>" | ctxbin ctx save
```

### Load context
```bash
ctxbin ctx load
```

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
