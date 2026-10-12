# Local sync — design

## Command contract

```sh
ctxbin sync --target all
ctxbin sync --target claude --dry-run
ctxbin sync --target codex --prune
ctxbin sync --target codex --skills-dir ~/.codex/skills
```

`--target` is required. Only `--target`, `--dry-run`, `--prune`, `--force`, `--skills-dir`,
and `--agents-dir` are accepted by sync. Directory overrides require a single target.
Sync flags on old commands are rejected before accessing configuration or Redis.
Validation and I/O errors use existing `CTXBIN_ERR` codes and exit 1.
Success prints tab-separated `create|replace|replace-unmanaged|unchanged|delete`, target, resource, name,
and absolute path to stdout; preview prefixes each action with `dry-run`.
Empty stores succeed with zero actions (and may prune tracked items when requested).
Preview labels unmanaged collisions; apply requires force for those items. Quoted
leading `~` paths expand to the selected home. All item preflight errors are reported
together; errors prevent all application, including otherwise valid items.

| Target | Skills | Agents |
| --- | --- | --- |
| Claude | `~/.claude/skills/<name>/SKILL.md` | `~/.claude/agents/<name>.md` |
| Codex | `~/.agents/skills/<name>/SKILL.md` | `~/.codex/agents/<name>.toml` |

## Modules and flow

`install-format.ts` parses YAML with the `yaml` package, validates portable names,
normalizes skill metadata, and converts shared agent Markdown. `sync.ts` owns
planning, staging, tracking manifests, locks, replacement, and rollback. CLI loads
the existing store configuration and calls sync directly, without shelling out to
other ctxbin commands. `Store.list` fetches both hashes once; values are sorted.

1. Resolve and validate roots/options, fetch the two hash snapshots.
2. Validate every key. Stage skills once in a disposable temporary directory;
   strip ctxbin metadata from strings, extract packs/refs, and normalize root SKILL.md.
3. Render agents for every selected provider. Reject invalid YAML, mismatched
   supplied names, empty bodies/descriptions, unsupported agent fields, and unsafe names.
4. Read and validate manifests and destination types; compute stable plans.
5. Preview returns the plans without creating installation roots/locks/manifests.
6. Apply acquires exclusive per-root `.ctxbin-sync.lock` files in sorted root order,
   rechecks manifests/destinations, prepares replacements on each destination filesystem,
   and backs up old entries inside hidden transaction directories under each root.
   A `journal.json` records destination/replacement/backup paths for manual recovery.
7. Rename staged replacements into place and atomically replace manifests. On an
   ordinary failure, undo moves in reverse order and restore manifests; clean temporary
   files and release locks. Keep backups and report their paths if rollback fails.

Staging precedes all destructive moves, including for `--target all`. Sync reads
the remote store only. Existing skill loaders retain their merge-copy semantics.

## Format policy

Names: 1–64 lowercase ASCII letters/digits with single hyphen/underscore separators.
Reject Windows device names, Claude `synced` and `anthropic-skills` namespaces.
These conservative portable names also prevent traversal and case collisions.
If frontmatter supplies `name`, it must equal the Redis key. Keys are install identities.

Skills preserve original frontmatter/body. Read required scalar fields from the YAML
AST without converting or reserializing unrelated values such as `{{version}}`.
Narrowly quote an unquoted single-line plain description containing colon-space if
the repair produces valid YAML; other malformed documents fail. Missing required
fields are inserted without rewriting existing fields. Legacy agents prefer valid
local descriptions parsed from Claude YAML or Codex TOML before generic defaults.
Explicit remote descriptions win. Bundles require exact root SKILL.md;
supporting files and executable permissions are preserved from normalized extraction.
Agent frontmatter may contain only `name` and `description`; body is preserved.
Codex TOML uses quoted `name`, `description`, and `developer_instructions` strings;
escaping must preserve quotes, backslashes, newlines, Unicode, and DEL. Model/tool/runtime
configuration inherits from the provider; no cross-provider mapping is inferred.

## Tracking and prune

Each destination root contains `.ctxbin-sync.json`:

```json
{
  "version": 1,
  "target": "claude",
  "resource": "skill",
  "items": { "review": "sha256-of-store-url" }
}
```

No URL/token or remote body is written into state. Ownership transfers to the source
that last installs the same name. Entries absent remotely remain tracked without
`--prune`, so a later prune still finds them. Prune only acts on tracked names whose
owner matches the current source; other-source and unmanaged entries are retained.
Missing tracked destinations are removed from state by prune without a delete action.
Malformed/symlinked manifests fail closed. Roots may not overlap or be shared across
resources/targets. Symlinked provider directories/roots and agent entries are refused.
Skill-entry links are renamed or removed as links, never written through. Unmanaged
collisions require force. Identical managed files/trees (bytes and permissions) are
reported unchanged without rewriting. Skillrefs still download to check freshness.
Normal system ancestors may resolve through symlinks (for example macOS `/var`);
root aliases are compared by their resolved filesystem paths.
Cleanup warnings use `CTXBIN_WARN` and preserve the primary result/error. Incomplete
rollback retains locks/backups; stale locks are not auto-removed.

## Decisions and test gates

- [x] IC1: Reuse loaders into isolated staging, then rename whole installed items.
  Test: pack stale files disappear; ref assets and executable files arrive.
- [x] IC2: Source-scoped manifest prevents pruning another store's installs.
  Test: switch mocked source identity, transfer same-name ownership, prune.
- [x] IC3: No installation-root mutation during preview or invalid remote content.
  Test: before/after directory snapshots, malformed last item, rejected paths.
- [x] IC4: Per-root locks and reversible renames cover normal apply failures.
  Test: lock collision and injected filesystem failure restore files and manifests.
- [x] IC5: No claim of crash-safe multi-root transactions. Preserve recovery data
  when rollback cannot complete; document manual inspection.

## Documentation contract

`skills/ctxbin/SKILL.md` is the help body. `scripts/copy-skills.js` adds discovery
frontmatter and copies the result into `dist/skills/ctxbin/SKILL.md`; `help` and
the bundled fallback must return that generated document. Discovery description
includes context handoff, skill/agent management, and explicitly requested local sync.

The full command contract lives in README/help and the shared bilingual
`SyncCommands.tsx` page. Each existing site topic adds the explanation relevant to it
and links to `/commands/sync` using the language-aware navigation helper:

- Home/introduction/quick start: remote-to-local workflow, preview/apply examples,
  and distinction from ctxloc's context replication.
- Agent/skill pages: shared agent frontmatter, keys/descriptions, native formats,
  bundles with root SKILL.md, and existing save commands for uploads.
- Skillpack/skillref pages: `load --dir` copies matching files and keeps extras;
  sync replaces complete matching skills and chooses installation destinations.
- Config pages: existing credentials also apply to preview, CLI path overrides,
  and per-destination tracking distinct from credential config.
- Storage/errors/key inference: no extra Redis hash, source-scoped local prune,
  errors/recovery, and no Git/key argument required for sync.
- Add-on: read help, prefer local definitions, sync only on explicit user request.

Historical `agent-addon-orig.md` is not an active documentation entrypoint.

## Official references checked 2026-10-12

- [Claude skills](https://code.claude.com/docs/en/skills)
- [Claude agents](https://code.claude.com/docs/en/sub-agents)
- [Codex skills](https://learn.chatgpt.com/docs/build-skills)
- [Codex agents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
