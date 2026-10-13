# Documentation deployment — implementation

## Phase 1: Requirements and design

- [x] Inspect current Pages source, environment rules, documentation build, and auth.
- [x] Resolve branch snapshots, token behavior, triggers, permissions, and concurrency.
- Baseline: clean main at `aca0afefe233f942ea12e72cc096b6710a1fd027`.

## Phase 2: Deployment and workflow

- [x] Build and publish the 1.5.0 site, replacing old gh-pages resources.
- [x] Add automatic workflow and update release instructions.
- [x] Configure native Pages workflow source and main environment allowance.
- Baseline: build and generated branch publication.

## Phase 3: Test Hardening

- [x] Validate YAML/actions and main-only triggers, frozen dependency install, and build.
- [x] Compare branch files with dist and verify obsolete assets are gone.
- Baseline: static validation plus local build/file snapshot checks.

## Phase 4: Integration Test

- [x] Commit/push, review/merge the automation PR, and confirm actual workflow success.
- [x] Verify live HTML/assets and record deployment/run/commit evidence.
- Baseline: GitHub Actions, Pages deployment, and live HTTP checks.

## Handoff

- Done: 1.5.0 annotated tag/English release, initial site publication, main auto
  deployment, exact branch/artifact comparison, and live asset verification.
- Next: ordinary main documentation changes deploy automatically. Manual UI traversal
  and negative-case/retry checks remain in the manual checklist.
- Blockers: none.
- Latest verified deployment source: `807f71ed4706f22582c7ade2e7020a43c28d79a6`.
- Automation PR #5 merged. The verification closeout commit is recorded on main.

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

## Integration validation — 2026-10-13

- [PR #5](https://github.com/superlucky84/ctxbin/pull/5) merged as
  `807f71ed4706f22582c7ade2e7020a43c28d79a6`.
- [Push-triggered run 38335310903](https://github.com/superlucky84/ctxbin/actions/runs/38335310903)
  completed successfully on Ubuntu: frozen install, docs build, generated-branch
  cleanup/publication, artifact upload, and official Pages deployment.
- Pages uses workflow source; main was added to the existing environment branch rules.
  No PAT or additional secret was created.
- Generated branch commit `96cd15eec343400f06f38e5826d34a634f6cd683` retains parent
  `17f6d00d378078fb9349131ddeaa6cfd1ad1ff4f`. Its six files exactly match the
  downloaded deployment artifact plus the branch-only `.nojekyll` marker by Git blob
  hashes. All obsolete files, including both legacy gitignore files, are absent.
- Live Pages returns HTTP 200 for index HTML, JS, CSS, and image; all four bodies
  match the deployed artifact byte-for-byte. Browser interactions remain manual.
- This docs-only closeout on main also exercises the ordinary documentation path
  trigger. Check its subsequent run in Actions; site source/assets are unchanged.
