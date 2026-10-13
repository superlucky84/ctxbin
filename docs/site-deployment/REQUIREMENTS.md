# Documentation deployment — requirements

Canonical plan: `docs/site-deployment/`. Implementation:
`.github/workflows/deploy-docs.yml`; operator guide: `docs/RELEASING.md`.
Branch: `ci/auto-deploy-docs`, based on `aca0afe` (`ctxbin@1.5.0`).

- P1: Publish current `docs/dist` by replacing obsolete files in `gh-pages` and
  committing the new generated files. Preserve branch history and source files.
- P2: Automatically build/deploy when `main` changes `docs/**` or this workflow.
  Support manual dispatch on main. Other branches and PRs must not deploy.
- P3: Install frozen documentation dependencies with pnpm `10.13.1`, use Node 22,
  and build with `--emptyOutDir`. Keep Vite's `/ctxbin/` base path.
- P4: Each run updates `gh-pages` and deploys the same generated directory through
  the official Pages artifact/deployment actions, using the built-in token only.
- P5: Serialize deployment runs. Failed builds cannot replace published files;
  deployment failures must remain visible in Actions.
- P6: Document manual retry, source configuration, permissions, and verification.
  npm publication and remote ctxbin data are outside this workflow.

## Decisions

- [x] PD1: Keep `gh-pages` as the generated snapshot branch; remove stale files on publish.
- [x] PD2: Use GitHub Actions as the Pages source and allow main in the Pages environment.
  Token-driven branch pushes alone do not trigger a Pages build.
- [x] PD3: Trigger on `docs/**` and workflow edits; manual runs also require main.
- [x] PD4: Use a serialized job with contents/pages/id-token write permissions for
  branch publication and official deployment, with no additional token secret.

Validation: local frozen install/build, YAML/workflow validation, remote file-list
comparison, actual main workflow run, and published HTML/asset checks.
