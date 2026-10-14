# Documentation deployment — manual checks

- [x] Push documentation changes to main. Pass: workflow runs, builds, commits
  current dist to gh-pages, and publishes the matching Pages artifact.
- [x] Check English/Korean sync and backup/restore routes. Pass: updated text is
  visible and CSS/JS/image requests succeed under `/ctxbin/`.
- [x] Load and navigate English/Korean agent and sync pages in a real browser.
  Pass: Markdown examples highlight, no console errors/page exceptions occur, and
  unsupported code languages preserve escaped original text without crashing.
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
JS, CSS, and image bytes matched. This initial run left browser interactions for the
subsequent rendering regression checks below. Deliberate operational negative/retry
cases remain unchecked. See IMPLEMENT.md for commits and configuration.

2026-10-14: the Markdown crash was reproduced on the published site. Fixed production
browser checks passed all 32 routes, agent/sync hash navigation, unknown-language
escaping, Markdown/XML highlighting, and Bash prompt preservation. After deployment
[38506764083](https://github.com/superlucky84/ctxbin/actions/runs/38506764083), all 32
published routes were directly loaded in Chrome and agent/sync hash navigation passed
with no console errors or page exceptions. The fix's integration gate is complete.
