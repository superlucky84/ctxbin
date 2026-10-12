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

## Phase 8: Re-review boundary fixes

- [x] Use own-key ownership checks; verify constructor collisions keep local data.
- [x] Insert missing fields into valid flow/block mappings and revalidate output.
- Baseline: regression tests, complete CLI suite, TypeScript check, and diff review.
- Retained decisions: force for all unmanaged collisions, narrow description repair,
  manual crash recovery. Startup lazy-loading is an optional performance improvement.

## Phase 9: Release preparation

- [x] Bump the public CLI package to `1.4.0` for the additive sync command.
- [x] Document post-merge npm publication, GitHub tags/releases, and Pages deployment.
- [x] Verify generated metadata, the npm package preview, and an isolated tarball install.
- Baseline: CLI/help validation, TypeScript/site builds, package inspection, and diff review.
- Exit: release version and instructions are committed; publication remains a maintainer step.

## Handoff

- Done: requirements/design, sync engine, CLI, source-scoped prune, native rendering,
  rollback/recovery journal, complete help/site/add-on/testing documentation coverage,
  and automated validation.
- Next: review/merge the follow-up PR for `1.5.0` on `feat/selective-sync-and-backup`,
  then follow `docs/RELEASING.md`. Version `1.4.1` is published and tagged. Native-client discovery,
  browser checks, and Windows checks remain in the manual checklist.
- Blockers: none.
- Base commit SHA: `c6d6fc9d15c7d42a03b6162ea656f2fd650fddce`.
  Latest reviewed parent commit: `182e181fe4103ee3df74e9ec75eafda6170ac3ff` (`ctxbin@1.4.1`).
  Original sync commits are recorded in `feat/local-agent-skill-sync`; selection
  and backup/recovery commits are recorded in `feat/selective-sync-and-backup`.

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

## Re-review validation — 2026-10-12

- Fixed `constructor` ownership bypass using `Object.hasOwn`; the regression covers
  unmanaged skill/agent preservation, explicit force installation, and subsequent
  managed unchanged detection.
- Fixed missing-field insertion into flow mappings and before explicit YAML document
  end markers. Trailing commas, comments, templates, and existing complete flow maps
  retain authored text. Modified frontmatter is reparsed before installation.
- `pnpm test`: 67 cases, 65 passed, 2 existing skips, 0 failures. Sync has 32 tests.
- `pnpm exec tsc --noEmit` and `git diff --check`: passed.
- This pass changes no CLI options, site components, native user installations, or
  remote stored data. The previous site build/live preview results remain recorded above.
- Kept force for identical unmanaged collisions: silent adoption would grant future
  prune authority. Kept documented narrow description repair/manual crash recovery;
  lazy-loading is deferred as optional startup tuning.

## Release-preparation validation — 2026-10-12

- Public registry inspection: `latest` was `1.3.2`; `1.4.0` was not published.
- Bumped root `package.json` to `1.4.0`. The lockfile contains no root version and
  dependencies did not change; the private documentation app version stays `0.1.0`.
- `pnpm build`, `node --test tests/validation.test.js` (13 passed), and
  `pnpm exec tsc --noEmit`: passed. Generated help metadata reports `1.4.0`.
- `pnpm --dir docs build --emptyOutDir`: passed; the site output contains the
  updated bilingual sync guide. The existing Browserslist freshness notice remains.
- `npm pack` and `npm publish --dry-run`: passed; 11 expected files included,
  including CLI/library bundles, generated/source skills, add-ons, and package metadata.
- Installed the tarball and registry runtime dependencies into a disposable `/tmp`
  directory with lifecycle scripts disabled. Package/CLI version, help contents,
  dependency resolution, library import, and add-on equality passed.
- Node `v22.12.0`, pnpm `10.13.1`, and npm `10.9.9` used for validation. Selected
  existing executables directly because the default Volta npm shim was broken;
  the release guide includes a working shell-session PATH selection.
- GitHub Pages configuration verified: `gh-pages` branch, `/` root, no custom domain.
- No npm publication, GitHub release/tag, Pages deployment, native-folder sync, or
  remote-store mutation was performed during release preparation.

## Phase 10: Published launcher repair — 2026-10-12

- [x] Inspect the registry tarball: `1.4.0` contains 29 files, including plain
  TypeScript output with no CLI shebang, versus 11 files in the validated bundle.
- [x] Reproduce bundle overwrite with bare `tsc`; explicit `--noEmit` and the
  docs build preserve the proper bundle. The exact user command causing overwrite
  is unknown; the published bytes establish the artifact mismatch.
- [x] Add the shebang to CLI source, remove the duplicate tsup banner, default
  TypeScript to no emit, and rebuild on npm `prepack`.
- [x] Add launcher-link regression coverage and update release docs to `1.4.1`.
- [x] Test Hardening: ensure `tsc` cannot overwrite the bundle and pack repairs
  deliberately corrupted artifacts without leaking extra files.
- [x] Integration Test: run the suite, then install/launch the exact tarball through
  `npx` outside the checkout and preview npm publication.
- Baseline: full CLI suite, type check, packed-file inspection, direct launcher,
  isolated npx version/help, site build, and diff review.
- Exit: launcher and packaged help work through npm's executable path; release
  commands reference the new patch version. Actual npm publication is a maintainer step.

### Launcher-repair validation

- `pnpm test`: 68 cases, 66 passed, 2 existing environment skips, 0 failures.
  The new regression launches version/help through a symlink without explicit Node.
- Bare `pnpm exec tsc`: passed, CLI/library bytes unchanged; direct CLI launch
  reports `1.4.1`. The docs build also leaves the bundle intact.
- Deliberately replaced generated CLI/help with invalid content and added a stale
  generated file. `npm pack` ran prepack, rebuilt correct executable/help, removed
  the stale file, and produced the expected 11-file package.
- Launched that tarball through `npx --package=... ctxbin --version` in a new npm
  cache outside the checkout: `1.4.1`. The same launcher printed help byte-for-byte
  equal to the generated skill. No explicit Node launcher was used for these checks.
- `npm publish --dry-run`: passed, prepack ran again, package is `ctxbin@1.4.1`.
  `pnpm --dir docs build --emptyOutDir` and `git diff --check`: passed.
- Public registry still reports `latest: 1.4.0`; `1.4.1` is unpublished. No remote
  publication, native-client sync, store mutation, or npm cache deletion was performed.

## Selective sync follow-up — 2026-10-12

### Phase 11: Requirements and design

- [x] Create `feat/selective-local-sync` from released `ctxbin@1.4.1`.
- [x] Expand scope with backup/recovery and rename to `feat/selective-sync-and-backup`.
- [x] Define repeatable exact-key selectors, excluded resources, and prune boundaries.
- [x] Resolve missing-name behavior and common agent authoring documentation.
- Exit: requirements/design/manual checks aligned, no open decisions.

### Phase 12: Implementation and documentation

- [x] Add CLI options and shared selector validation before configuration access.
- [x] Filter fetches/roots/content and preserve unselected manifest ownership.
- [x] Scope prune to selected names; permit absent cleanup with prune.
- [x] Update help, README, and related English/Korean site pages.
- Baseline: selector core tests, CLI round trip, generated help inspection.
- Exit: selection is available without changing default whole-store behavior.

### Phase 13: Test Hardening

- [x] Cover duplicates, invalid/missing selectors, excluded invalid content/paths.
- [x] Cover prune source boundaries, stale unselected ownership, no-write preview.
- [x] Cover apply failure/rollback and unchanged selected entries.
- Baseline: targeted sync tests and type check.
- Exit: selection cannot delete or adopt unselected installations.

### Phase 14: Integration Test and closeout

- [x] Run complete CLI suite and build the bilingual documentation site.
- [x] Verify npm package launcher/help through a disposable install.
- [x] Review diff and record results, limitations, and the follow-up PR scope.
- Baseline: full tests, type/site checks, package smoke check, diff review.
- Exit: reviewable implementation and aligned documentation; publication is separate.

### Selective sync and backup integration validation

- Prepared the additive release as `1.5.0`; dependencies and the lockfile are unchanged.
- `pnpm test`: 90 cases, 88 passed, 2 existing skips, 0 failures. Sync now has 41
  tests, including repeated/deduplicated selectors, excluded hashes/paths/content,
  missing names, scoped prune ownership, selected force collisions, rollback, and
  project-directory CLI installation with shared agent metadata.
- `pnpm exec tsc --noEmit` and `pnpm --dir docs build --emptyOutDir`: passed.
- `npm pack` and `npm publish --dry-run`: passed with 11 expected files. An actual
  isolated npx install of the final tarball printed `1.5.0` and byte-identical help.
- Common remote Markdown agent frontmatter versus native Claude Markdown/Codex TOML
  is documented in help, README, and both site languages. Save/load tests distinguish
  ctxbin's savedAt/by wrapper from the retained YAML name/description frontmatter.
- Backup/recovery validation is recorded in `docs/backup-restore/IMPLEMENT.md`.
  Selection defaults remain full sync; selected prune preserves all unselected items.
- No real store, native user installation, npm publication, release tag, or site
  deployment was changed. Live native-client/Windows/browser checks remain manual.
