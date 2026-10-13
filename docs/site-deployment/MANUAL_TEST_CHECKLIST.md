# Documentation deployment — manual checks

- [ ] Push a documentation page change to main. Pass: workflow runs, builds, commits
  current dist to gh-pages, and publishes the matching Pages artifact.
- [ ] Check English/Korean sync and backup/restore routes. Pass: updated text is
  visible and CSS/JS/image requests succeed under `/ctxbin/`.
- [ ] Compare gh-pages tree with dist plus `.nojekyll`. Pass: obsolete hashed assets
  are removed, no unrelated source files appear, and branch history remains.
- [ ] Change CLI-only files. Pass: the path filter does not trigger site deployment.
- [ ] Manually dispatch from main. Pass: succeeds; feature-branch dispatch cannot deploy.
- [ ] Cause a build failure in an isolated branch/PR. Pass: it never publishes files.
- [ ] Review concurrency/retry. Pass: deployment runs serialize; failures show in
  Actions and can be retried without storing any additional credentials.
