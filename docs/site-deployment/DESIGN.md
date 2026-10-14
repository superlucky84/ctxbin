# Documentation deployment — design

`Deploy documentation` runs on main pushes touching `docs/**` or its workflow file,
and on workflow_dispatch. A job-level main-ref guard rejects manual feature-branch
deployment. `concurrency: docs-pages`, with cancellation disabled, serializes runs.

The job checks out the triggering commit, installs Node 22/pnpm 10.13.1, installs
`docs/pnpm-lock.yaml` with frozen resolution, and builds `docs/dist --emptyOutDir`.
It adds `.nojekyll`, then uses `peaceiris/actions-gh-pages` with keep_files=false
and force_orphan=false: replace obsolete published files while retaining history.
Upload and deploy the same directory with the official Pages actions.

Pages source must be `build_type=workflow`. The `github-pages` environment allows
main deployments; retain the prior gh-pages rule during migration. Job permissions
are contents:write, pages:write, and id-token:write. The runner's built-in token is
sufficient; no PAT is stored in the repository. Native deployment handles the fact
that token-created gh-pages commits do not trigger the legacy branch build.

Build failure stops before branch publication. If deployment fails after publication,
the branch still records the new snapshot while the live site may retain its older
deployment; inspect the run and retry. Branch and live-site publication are not one
atomic transaction. No workflow triggers on gh-pages, so publication cannot recurse.

## Code block runtime

`CodeBlock.tsx` imports the highlight.js core and explicitly registers its grammars.
Markdown examples need the Markdown grammar and XML for embedded HTML. Check
`getLanguage` before highlighting; unsupported labels leave the rendered text intact.
Keep the Bash prompt treatment and existing code-block styling. Building TypeScript
alone does not detect missing runtime language registration; verify page loading,
navigation, console errors, and highlighted text in the production browser bundle.

## References

- [GitHub Pages source configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Official Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Generated-branch publisher](https://github.com/peaceiris/actions-gh-pages)
