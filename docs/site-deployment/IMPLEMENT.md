# Documentation deployment — implementation

## Phase 1: Requirements and design

- [x] Inspect current Pages source, environment rules, documentation build, and auth.
- [x] Resolve branch snapshots, token behavior, triggers, permissions, and concurrency.
- Baseline: clean main at `aca0afefe233f942ea12e72cc096b6710a1fd027`.

## Phase 2: Deployment and workflow

- [x] Build and publish the 1.5.0 site, replacing old gh-pages resources.
- [x] Add automatic workflow and update release instructions.
- [ ] Configure native Pages workflow source and main environment allowance.
- Baseline: build and generated branch publication.

## Phase 3: Test Hardening

- [x] Validate YAML/actions and main-only triggers, frozen dependency install, and build.
- [ ] Compare branch files with dist and verify obsolete assets are gone.
- Baseline: static validation plus local build/file snapshot checks.

## Phase 4: Integration Test

- [ ] Commit/push, review/merge the automation PR, and confirm actual workflow success.
- [ ] Verify live HTML/assets and record deployment/run/commit evidence.
- Baseline: GitHub Actions, Pages deployment, and live HTTP checks.

## Handoff

- Done: 1.5.0 annotated tag/English release and initial site branch publication.
- Next: finish workflow, configuration, validation, and live deployment.
- Blockers: none.
- Latest source commit: `aca0afefe233f942ea12e72cc096b6710a1fd027`.
- Working branch: `ci/auto-deploy-docs`; final commit is recorded in branch history.

## Initial validation

- Main documentation build passed (49 modules). `actionlint v1.7.12` and YAML
  duplicate-key/syntax validation passed for the deployment workflow.
- Manual gh-pages commit `17f6d00d378078fb9349131ddeaa6cfd1ad1ff4f` deployed
  successfully with Pages status built and no error. It replaced obsolete assets.
- Exact tree comparison identified legacy `.gitignore` and `docs/.gitignore` files
  retained by the manual publisher. The workflow's keep_files=false cleanup must
  remove these too; exact final branch/dist comparison remains an integration gate.
- Existing Pages environment allows gh-pages only; main must be added before
  merging. Actions are enabled and permit the required actions.
