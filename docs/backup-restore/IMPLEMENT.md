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
