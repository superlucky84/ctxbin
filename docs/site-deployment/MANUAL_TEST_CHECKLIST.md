# Documentation deployment — manual checks

- [x] Push documentation changes to main. Pass: workflow runs, builds, commits
  current dist to gh-pages, and publishes the matching Pages artifact.
- [ ] Check English/Korean sync and backup/restore routes. Pass: updated text is
  visible and CSS/JS/image requests succeed under `/ctxbin/`.
- [x] Compare gh-pages tree with the deployment artifact plus `.nojekyll`. Pass: obsolete hashed assets
  are removed, no unrelated source files appear, and branch history remains.
- [ ] Change CLI-only files. Pass: the path filter does not trigger site deployment.
- [ ] Manually dispatch from main. Pass: succeeds; feature-branch dispatch cannot deploy.
- [ ] Cause a build failure in an isolated branch/PR. Pass: it never publishes files.
- [ ] Review concurrency/retry. Pass: deployment runs serialize; failures show in
  Actions and can be retried without storing any additional credentials.

## Automated execution record

Run [38335310903](https://github.com/superlucky84/ctxbin/actions/runs/38335310903)
passed all deployment steps. Exact generated-branch/artifact hashes and live HTML,
JS, CSS, and image bytes matched. English/Korean browser interactions and deliberate
negative/retry cases remain unchecked. See IMPLEMENT.md for commits and configuration.
