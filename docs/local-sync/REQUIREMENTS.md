# Local skill and agent sync — requirements

## Ownership and scope

Canonical feature documents live in `docs/local-sync/`, alongside the existing
documentation site. Implementation scope: `src/sync.ts`, `src/install-format.ts`,
CLI routing, sync tests, README, bundled help, and documentation-site command pages.
The root `DESIGN.md` and `IMPLEMENT.md` link here for this feature's contract.

The user approved a remote-to-local sync and requested a new branch plus the
locally installed `doc-driven-designer-v1` workflow. Branch:
`feat/local-agent-skill-sync`. Selection follow-up: `feat/selective-sync-and-backup`,
based on released `ctxbin@1.4.1` commit `182e181`. Existing save/load/list/delete
behavior stays compatible.
The same branch adds separate [remote backup/recovery](../backup-restore/REQUIREMENTS.md).

## Requirements

- R1: `ctxbin sync --target claude|codex|antigravity|all` installs every remote `skill` and
  `agent` by default; the target is required. Repeatable `--skill`/`--agent`
  selectors install only the named entries. It never accesses or changes `ctx`.
- R2: Same-name local skills are replaced as complete directories; obsolete
  files inside an installed skill disappear. Agents are replaced as complete files.
  Unmanaged collisions require `--force`; preview labels them `replace-unmanaged`.
  Identical managed entries are `unchanged` and are not rewritten.
- R3: Local-only entries survive. `--prune` removes only entries previously
  installed by ctxbin from the same remote source and now absent remotely.
  In selection mode, pruning is limited to the explicitly selected resource/names.
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
- R18: Each selector takes one exact remote key; repeat flags for multiple items.
  Any selector enables selection mode: the resource without selectors is excluded.
  Duplicate names are deduplicated. Validate names before configuration/network access.
- R19: Excluded resources have no store reads or destination/manifest inspection.
  In included resources, filter before validating content or downloading skillrefs;
  malformed unselected entries do not block selection. Retain all unselected tracking.
- R20: A selected remote name that is absent fails with `NOT_FOUND` before applying
  any change. With `--prune`, an absent name is allowed only when at least one
  selected target still tracks it for this source. Unmanaged/other-source names
  remain untouched; unknown names and repeated cleanup after tracking removal fail
  with `NOT_FOUND`, rather than silently accepting a typo.
- R21: Selectors work with both targets, preview, force, and existing single-target
  path overrides. Project directories are ordinary overrides, not a new scope flag.
- R22: Help/README/bilingual pages clearly distinguish shared remote agent Markdown
  with YAML name/description from installed Claude Markdown and Codex TOML. Recommend
  explicit descriptions describing the role and when to use it; preserve frontmatter
  separately from ctxbin's savedAt/by wrapper on save/load.
- R23: `ctxbin sync --target antigravity` installs skills at
  `~/.gemini/config/skills/<name>/SKILL.md` and agents at
  `~/.gemini/config/agents/<name>.md`, the documented Antigravity global locations.
  Agents are Markdown with YAML `name`/`description` frontmatter (the same
  rendering as Claude); skills use the existing normalized SKILL.md bundles.
- R24: `--target all` selects every supported client: Claude, Codex, and Antigravity.
  This changes the previous two-client meaning; help, README, site, and release
  notes state it explicitly. Single targets keep their current behavior.
- R25: Every existing sync contract applies unchanged to Antigravity: selectors,
  preview, prune, force, single-target overrides, tracking manifests
  (`"target": "antigravity"`), locks, rollback, symlink and overlap checks, and
  preservation of valid local agent descriptions parsed from Markdown frontmatter.
- R26: Antigravity project installation uses existing overrides
  (`--skills-dir .agents/skills --agents-dir .agents/agents`); no scope flag is added.
  A destination root tracked for one target is never silently adopted by another.
- R27: Help (including discovery metadata), README, package metadata, and every
  English/Korean site page that lists sync targets or paths include Antigravity.
- R28: Release as the additive minor version `1.6.0`; release documentation
  references the new version.

## Boundaries and operational limits

No local-to-remote sync command, conflict merging, automatic background sync,
dedicated project-scope flag, wildcard selectors, selection profiles, or
provider-specific model/tool-setting translation. Project installation is supported
through existing destination overrides.
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

Antigravity boundaries: no Antigravity rules (`.agents/rules`, `GEMINI.md`), plugin,
workflow, or `agent.md`-folder layout installation; no mapping of Antigravity-only
agent fields (`tools`, `model`, `mainAgent`, `subagent`, `commandExecutionPolicy`,
`mcpServers`, `skills`), which keep Antigravity defaults. As with `~/.claude` and
`~/.codex`, a symlinked destination root or its parent (`~/.gemini/config`) is refused.
Codex and Antigravity both read project skills from `<project>/.agents/skills`; one
sync target owns such a shared root, and the other target fails closed there.

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
- [x] DC8: Repeat exact-key selectors; specifying one resource excludes the other.
- [x] DC9: Missing selected names fail unless prune finds same-source installation
  tracking in a selected target. No-op unknown selectors are not successful cleanup.
- [x] DC10: Skip excluded resource roots/hashes and preserve unselected manifest items.
- [x] DC11: `--target all` includes Antigravity (user decision, 2026-11-24). Rationale:
  "all" should mean every supported client; the behavior change is called out in
  help, README, site, and release notes instead of adding a second "all" variant.
- [x] DC12: Default Antigravity paths are `~/.gemini/config/skills` and
  `~/.gemini/config/agents` per the official skills/subagents documentation (user
  decision, 2026-11-24). Project installation uses existing overrides (R21, R26).
- [x] DC13: Antigravity agents reuse the Claude Markdown renderer and DC6's
  `name`/`description`-only shared format; both fields are required by Antigravity.
- [x] DC14: Keep one manifest per root and target. A root tracked by another target
  fails with `INVALID_INPUT` naming the owning target, instead of being adopted;
  skill content is target-independent, so syncing a shared project root once suffices.

## Validation map

DC1/R1 → CLI option tests; DC2/R2 → stale-file replacement test;
DC3/R3 → unmanaged/source-scoped prune tests; DC4/R8 → path resolution/override tests;
DC5–6/R5–7 → YAML/TOML conversion and bundle/ref tests;
R4/R9–11 → snapshot, invalid input, locking, rollback, and mock-store checks.
R13 → built help/fallback matches source, option/example review, bilingual site build.
R17 → POSIX bin-link regression, no-emit preservation, corrupt-artifact prepack
repair, and isolated tarball execution through npx before publication.
R18–21/DC8–10 → selection/duplicates/missing-name tests, excluded invalid content and
paths, filtered prune/ownership preservation, rollback, and CLI mock-store checks.
R22 → generated help/source comparison, metadata round trips, and bilingual site build.
R23/DC12–13 → Antigravity default-path and Markdown agent rendering tests;
R24/DC11 → all-target three-client installation, preview, and rollback tests;
R25 → Antigravity prune/selection/local-description tests on the existing engine;
R26/DC14 → project override test and cross-target manifest rejection test;
R27–28 → CLI target validation, generated help comparison, site build, package smoke check.

See [design](DESIGN.md), [implementation](IMPLEMENT.md), and
[manual checks](MANUAL_TEST_CHECKLIST.md).
