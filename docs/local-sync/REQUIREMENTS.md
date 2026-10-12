# Local skill and agent sync — requirements

## Ownership and scope

Canonical feature documents live in `docs/local-sync/`, alongside the existing
documentation site. Implementation scope: `src/sync.ts`, `src/install-format.ts`,
CLI routing, sync tests, README, bundled help, and documentation-site command pages.
The root `DESIGN.md` and `IMPLEMENT.md` link here for this feature's contract.

The user approved a remote-to-local sync and requested a new branch plus the
locally installed `doc-driven-designer-v1` workflow. Branch:
`feat/local-agent-skill-sync`. Existing save/load/list/delete behavior stays compatible.

## Requirements

- R1: `ctxbin sync --target claude|codex|all` installs every remote `skill` and
  `agent`; the target is required. It never accesses or changes `ctx`.
- R2: Same-name local skills are replaced as complete directories; obsolete
  files inside an installed skill disappear. Agents are replaced as complete files.
  Unmanaged collisions require `--force`; preview labels them `replace-unmanaged`.
  Identical managed entries are `unchanged` and are not rewritten.
- R3: Local-only entries survive. `--prune` removes only entries previously
  installed by ctxbin from the same remote source and now absent remotely.
- R4: `--dry-run` fetches and validates remote content, prints create/replace/
  replace-unmanaged/unchanged/delete
  actions, and changes no installation directories, manifests, or locks.
  Temporary download/extraction files are allowed and cleaned up.
- R5: Skills support string, skillpack, and skillref values. Existing extraction
  and permission normalization are reused; a bundle must contain root `SKILL.md`.
- R6: Agents use shared Markdown remotely and are installed as Claude Markdown
  with YAML frontmatter or Codex TOML. Rules remain intact; Redis metadata is stripped.
- R7: Legacy Markdown without frontmatter receives key-based name and description
  fallback metadata, without AI inference. Existing skill frontmatter and supporting files
  survive without reserialization. A plain single-line description containing an
  unquoted `: ` may be quoted locally; other malformed frontmatter fails. Missing
  agent descriptions preserve valid local descriptions before using defaults.
  All item preflight failures are collected before apply.
- R8: Default paths follow current official documentation. Single-target
  `--skills-dir` and `--agents-dir` overrides support existing local layouts.
- R9: Download and validation finish before installing. Ordinary apply failures
  restore replaced/deleted entries and manifests. Concurrent writes to the same
  destination are rejected by exclusive locks.
- R10: Reject unsafe names, reserved installation names, root/agent symlinks,
  overlapping destination roots, and invalid tracking manifests before replacement.
  Skill-entry symlinks may be replaced/pruned as links; their targets are untouched.
- R11: Remote values and credentials are never modified; manifests contain only
  a digest of the configured store URL as source identity.
- R12: Automated tests cover conversion, all value types, stale-file removal,
  pruning boundaries, preview, failure/rollback, and CLI validation.
- R13: Help (including generated skill discovery metadata), README, and every
  relevant English/Korean site page describe or link to sync. Home/introduction,
  quick start, agent/skill commands, pack/ref loaders, credentials, storage/errors,
  key inference, and agent add-on explain their respective sync boundaries.
  The user explicitly requested this complete documentation pass after implementation.
- R14: Expand leading `~` in quoted overrides. Escape TOML DEL. Cleanup failures
  emit structured warnings, preserving the original apply result/error.
- R15: Require exact `SKILL.md` casing on every platform. Skillref freshness still
  requires downloads, including preview; no cache is introduced.
- R16: Determine ownership from a manifest's own keys, never inherited object
  properties. Normalization must produce valid YAML for both block and flow mappings,
  including documents with explicit end markers; validate after inserting fields.
- R17: The released npm package must launch through its installed `ctxbin` bin
  link and `npx`, without an explicit Node invocation. Pack/publish rebuilds the
  bundle; TypeScript checking must not overwrite it. Release fixes use a new patch
  version when the broken version is already published.

## Boundaries and operational limits

No local-to-remote sync command, conflict merging, automatic background sync,
project-scope selector, or provider-specific model/tool-setting translation.
Agent frontmatter for this first version supports `name` and `description` only;
unsupported fields fail explicitly rather than disappearing during conversion.
Legacy descriptions use `Reusable instructions for <name>.` for skills and
`Agent rules for <name>.` for agents without usable local descriptions. Authors can
supply meaningful descriptions. Force authorizes unmanaged whole-item replacement;
persistent backups of successful replacements are not added.

Atomicity is per rename, with rollback across destinations on ordinary failures.
Process termination/power loss and manual concurrent edits are outside that guarantee;
a leftover lock or retained transaction directory must be inspected before retrying.
Installing into real user directories is a manual release check, not an automated test.

## Decisions

- [x] DC1: Require explicit target; a bare `sync` must not alter both providers.
- [x] DC2: Replace changed managed items whole; require force for unmanaged collisions.
  Never wipe parent trees or follow skill links during replacement.
- [x] DC3: Track ownership per destination and source; prune only the current source.
- [x] DC4: Codex default skills path is `~/.agents/skills`; allow an explicit override
  such as `~/.codex/skills` for a user's existing installation.
- [x] DC5: Preserve legacy Markdown and valid local agent descriptions before defaults.
- [x] DC6: Shared agents use minimal provider-neutral frontmatter; validate unsupported fields.
- [x] DC7: Keep feature plans in `docs/local-sync/` and preserve the existing site.

## Validation map

DC1/R1 → CLI option tests; DC2/R2 → stale-file replacement test;
DC3/R3 → unmanaged/source-scoped prune tests; DC4/R8 → path resolution/override tests;
DC5–6/R5–7 → YAML/TOML conversion and bundle/ref tests;
R4/R9–11 → snapshot, invalid input, locking, rollback, and mock-store checks.
R13 → built help/fallback matches source, option/example review, bilingual site build.
R17 → POSIX bin-link regression, no-emit preservation, corrupt-artifact prepack
repair, and isolated tarball execution through npx before publication.

See [design](DESIGN.md), [implementation](IMPLEMENT.md), and
[manual checks](MANUAL_TEST_CHECKLIST.md).
