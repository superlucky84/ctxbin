# Local sync — implementation and handoff

## Phase 1: Requirements and design

- [x] Create branch and inspect the local designer skill.
- [x] Capture requirements, decisions, architecture, and manual checks.
- [x] Verify native installation paths and agent formats against official docs.
- Exit: four aligned feature documents; all decisions resolved.
- Baseline: repository clean before changes; base commit recorded below.

## Phase 2: Formatting and synchronization

- [x] Implement YAML metadata parsing, compatibility defaults, native agent rendering.
- [x] Implement planning/staging, source-scoped manifests, whole-item replacement.
- [x] Implement preview, prune, locking, and rollback.
- Baseline tests: conversions, default/override paths, create/replace, all value types.
- Exit: both targets supported without remote mutations.

## Phase 3: CLI and user documentation

- [x] Route sync and reject conflicting/foreign flags.
- [x] Update README, bundled help, root design links, English/Korean site pages.
- Baseline tests: CLI mock-store round trip and invalid option tests; site build.
- Exit: commands are discoverable and existing CLI behavior remains compatible.

## Phase 4: Test Hardening

- [x] Test malformed YAML/names/manifests, symlinks, overlapping paths, stale files.
- [x] Test managed/unmanaged/other-source pruning and no-write preview.
- [x] Test preparation failures, lock conflicts, rollback, recovery-data retention, and cleanup.
- Baseline: targeted sync tests plus TypeScript check.
- Exit: destructive operations and failure paths have meaningful regression coverage.

## Phase 5: Integration Test and closeout

- [x] Run complete CLI test suite and build docs site.
- [x] Review diff, document automated results and pending platform/manual checks.
- Baseline: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm --dir docs build`.
- Exit: appropriate checks pass; manual limitations are reported explicitly.

## Phase 6: Complete documentation coverage (user follow-up)

- [x] Expand help body and generated discovery metadata; clarify flags/credentials,
  examples, output, legacy defaults, tracking, and recovery.
- [x] Cover home/introduction/quick start and all related English/Korean site topics.
- [x] Align README, add-on source/copyable site blocks, testing guide, and design overview.
- Baseline: build CLI, compare help/fallback to generated source, run existing
  validation tests, build site, review topic links, `git diff --check`.
- Exit: help and both site languages expose the complete current command contract.

## Phase 7: Review fixes

- [x] Preserve raw frontmatter, narrowly quote malformed plain descriptions, aggregate errors.
- [x] Preserve legacy local descriptions; handle skill links, unmanaged force, identical items.
- [x] Expand tilde paths, escape TOML DEL, require exact manifest filename, preserve cleanup results.
- [x] Add realistic review fixtures/fault injection and align user documentation/PR.
- Baseline: full suite, TypeScript/site builds, snapshot and native-parser checks.
- Deferred: automatic stale-lock recovery, skillref caching, persistent successful backups.

## Handoff

- Done: requirements/design, sync engine, CLI, source-scoped prune, native rendering,
  rollback/recovery journal, complete help/site/add-on/testing documentation coverage,
  and automated validation.
- Next: review the feature PR, then complete native-client discovery, browser checks,
  and Windows checks in the manual checklist before a later release. No real user
  folders were installed.
- Blockers: none.
- Base commit SHA: `c6d6fc9d15c7d42a03b6162ea656f2fd650fddce`.
  Reviewed feature commit: `873379450827c3a7457c24f0cd0bbdc057fc2d56`.
  The feature commit is recorded in the `feat/local-agent-skill-sync` branch history.

## Validation record — 2026-10-12

Environment: macOS, Node `v22.12.0`, pnpm `10.13.1`.

- `pnpm test`: 55 cases, 53 passed, 2 skipped, 0 failed. Skips are the existing
  Windows-only permission test and opt-in real Upstash integration test.
- `tests/sync.test.js`: 20 new feature tests, including native YAML/TOML parsing,
  packs/refs/assets/permissions, full replacement, source ownership, preview,
  invalid inputs, symlinks, locks, injected apply/preparation/rollback failures,
  and a CLI round trip with an isolated local mock store.
- `pnpm exec tsc --noEmit`: passed. Added matching `@types/tar`; removed the unsupported
  gzip `mtime` option (Node writes zero timestamps), used tar filter's path argument,
  and reject unknown tar entry types. No loader overwrite-policy changes.
- `pnpm --dir docs build`: passed, including TypeScript checking of new bilingual routes.
- `git diff --check`: passed.
- No writes to real remote data or native user installation roots. GitHub responses
  were mocked for deterministic sync tests. Real-client discovery, live GitHub/Upstash
  workflow, process-interruption recovery, and Windows behavior remain manual checks.

To try this unreleased branch after building:

```sh
node dist/cli.js sync --target all --dry-run
node dist/cli.js sync --target all
```

## Documentation follow-up validation — 2026-10-12

- `pnpm build`: passed; generated help includes the updated source body and discovery
  description covering explicitly requested local sync.
- `node --test tests/validation.test.js`: 13 passed, 0 skipped/failed, including
  help output, bundled fallback, and network-guidance checks.
- Direct comparison: `node dist/cli.js help` equals the bundled SKILL.md and contains
  the complete source body, all five sync options, and updated discovery metadata.
- All 29 site page source files include sync guidance or links. Existing navigation
  preserves selected language; the sync guide supplies localized examples and option tables.
- English copyable add-on block equals the active `agent-addon.md` markers;
  packaged `dist/agent-addon.md` equals that source. Korean block has the same rule.
- `pnpm --dir docs build`: passed, including TypeScript checking for all page changes.
- `git diff --check`: passed. This follow-up changes documentation/metadata only;
  the full sync regression suite passed in the preceding implementation validation.
- Browser traversal and real native-client/platform checks remain manual release checks.

## Help deduplication — 2026-10-12

- User requested light removal of repeated explanations, retaining the complete guide.
- Source `skills/ctxbin/SKILL.md`: 380 → 344 lines; 14,485 → 12,673 bytes.
  Consolidated repeated launcher/key/metadata guidance, sync summaries versus detailed
  rules, repeated save/install examples, and agent/skill command blocks. All flags,
  formats, replacement/prune/recovery rules, and handoff guidance remain documented.
- `pnpm build`: passed; generated help is 352 lines including discovery frontmatter.
- `node --test tests/validation.test.js`: 13 passed, 0 failed/skipped.
- Direct comparison confirmed built help matches the bundled file and updated source.

## Review-fix validation — 2026-10-12

- Fixed the five release concerns: realistic description YAML, symlinked skill
  entries, legacy local descriptions, unmanaged replacements, and raw template preservation.
- Additional fixes: complete preflight diagnostics, unchanged managed items, quoted
  tilde overrides, DEL escaping, exact SKILL.md casing, and cleanup-result preservation.
- `pnpm test`: 65 cases, 63 passed, 2 existing environment skips, 0 failures.
  `tests/sync.test.js` now contains 30 tests, including 10 review regressions.
- `pnpm exec tsc --noEmit` and `pnpm --dir docs build`: passed.
- Live `node dist/cli.js sync --target all --dry-run`: passed against the configured
  store and native default roots. All 8 skills and 3 agents were validated for both
  targets (22 preview actions), including the reported colon-space description,
  template-valued metadata, and the installed skill symlink. No Node warnings appeared.
- Live validation was preview only: no native installation roots/manifests or remote
  values were changed. Apply/rollback regressions use disposable homes and fixtures.
- Deliberately retain manual stale-lock recovery, fresh skillref downloads, and
  documented lack of persistent successful-run backups. Force is required for unmanaged
  replacements and preview labels those entries. Windows/native-client checks remain manual.
