# Skill and agent backup/restore — implementation

## Phase 1: Requirements and design

- [x] Define opaque snapshot schema and separate backup/restore commands.
- [x] Resolve existing-file protection, conflict force, and rollback limitations.
- Exit: requirements/design/manual checks aligned, all decisions resolved.

## Phase 2: Implementation

- [x] Implement capture, schema/checksum validation, and atomic file publication.
- [x] Implement restore planning, exact values, conflict guard, preview, and rollback.
- [x] Add CLI routing and user-facing documentation.
- Baseline: memory-store round trip and CLI mock-store recovery.
- Exit: users can export and recover skill/agent data without client installation.

## Phase 3: Test Hardening

- [x] Cover corrupt/unsupported files, duplicate/arbitrary keys, empty values/stores.
- [x] Cover file overwrite/publication faults and remote conflicts/unchanged items.
- [x] Cover ambiguous writes, concurrency guards, rollback failures, and preservation.
- [x] Reject malformed store responses before replacing an existing backup.
- Baseline: focused tests and TypeScript check.
- Exit: failures never silently destroy existing backups or unrelated remote entries.

## Phase 4: Integration Test

- [x] Run complete CLI suite, type check, bilingual site build, and package smoke check.
- [x] Align help/source, public docs, PR scope, and validation record.
- Exit: implementation reviewable together with selective sync; publishing is separate.

## Handoff

- Done: requirements, schema, backup/restore engine, CLI, fault coverage, user docs,
  and integration validation. The combined feature package is prepared as `1.5.0`.
- Next: review/merge the combined feature PR, then follow `docs/RELEASING.md` for
  publication. Live-store recovery, process interruption, and Windows checks remain manual.
- Blockers: none.
- Base commit: `182e181fe4103ee3df74e9ec75eafda6170ac3ff` (`ctxbin@1.4.1`).
- Current work is on `feat/selective-sync-and-backup`.
  The feature commit is recorded in that branch's history.

## Validation record — 2026-10-12

Environment: macOS, Node `v22.23.3`, pnpm `10.13.1`, npm `10.9.9`.

- `pnpm test`: 90 cases, 88 passed, 2 existing environment skips, 0 failures.
  `tests/backup.test.js` covers 13 cases, including opaque metadata/frontmatter,
  packs/assets/ref pointers, empty/arbitrary keys, file publication faults,
  conflicts, ambiguous writes, concurrent changes, rollback failures, and a CLI
  recovery round trip through a disposable HTTP store.
- Malformed API envelopes and null/false/zero HGETALL results produce NETWORK and
  preserve an existing backup even when force is requested.
- `pnpm exec tsc --noEmit` and `pnpm --dir docs build --emptyOutDir`: passed.
  Both documentation languages expose backup/recovery and selective sync.
- `npm pack` and `npm publish --dry-run`: passed with the expected 11 files.
  An actual isolated npx install of the final tarball printed `1.5.0` and help
  identical to the bundled skill; the installed bundle includes the response guard.
- The installed library's backup/restore round trip preserved raw metadata and
  unrelated remote values. All fixtures use disposable directories and mock/memory
  stores; no real store or native user installation was modified.
- Skillref recovery retains stored pointers, not a GitHub content snapshot. Restore
  rollback is best effort, not an atomic transaction under interruption or outage.
- No npm publication, merge, release tag, or site deployment was performed.

## Review follow-up — 2026-10-13

- Reviewed parent: `107c1d7c0378d9083e72703ce67d5d488c45c3d5`, PR #4.
- [x] Requirements/design: force guards, error-code preservation, bounded rollback,
  BOM acceptance, stable ordering, and hard-link compatibility policy resolved.
- [x] Implementation: update backup validation/publication and restore failure handling.
- [x] Test Hardening: data-loss guards, unsupported links, network rollback, BOM/sorting.
- [x] Integration Test: suite, types/site, final package smoke and PR documentation.
- Retain atomic hard-link/rename publication; unsupported links get an actionable
  error and an explicit force/rename path instead of a partial-copy fallback.
- Done: review fixes, help/site alignment, fault regressions, and integration validation.
  The follow-up commit is recorded in `feat/selective-sync-and-backup` history.
- Next: review/merge PR #4 and follow `docs/RELEASING.md`; real drives, Windows,
  and interruption/live-store workflows remain manual. Blockers: none.

### Review-fix validation

- Full suite: 98 cases, 96 passed, 2 existing environment skips, 0 failures.
  Backup coverage now has 19 tests: source/empty-resource force guards, rechecking a
  destination changed during staging, unsupported links and force/rename, BOM and
  locale-independent ordering, and NETWORK rollback in the library and actual CLI.
- A 50-key ambiguous-write/outage fixture verifies one failed rollback request,
  preserved NETWORK classification, and reporting all attempted unresolved keys.
  CLI mock-store failure verifies exactly one CTXBIN_ERR prefix.
- Existing-file refusal is INVALID_INPUT. Empty/other-source snapshots can use new
  filenames; force can still repair invalid files. Existing backup format/checksums
  remain compatible because parsing does not reorder the checksum payload.
- Type checking, 14 help/launcher tests, bilingual site build, and diff review passed.
  Source help is 426 lines/18,298 bytes; only the changed command contracts were added.
- `npm pack`: expected 11 files. An isolated npx installation of that final tarball
  passed version/help and installed-library BOM/backup protection/prune checks.
- No remote data, native installation, npm publication, merge, or deployment was changed.
