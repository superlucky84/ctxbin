# Releasing ctxbin

The current feature release is `1.5.0`: selective local installation and remote
skill/agent backup/restore. It retains the CLI launcher protections shipped in
`1.4.1`. The version is already set in the feature PR; do not run `npm version`
again after merging. The private documentation app keeps its independent version.

The npm package and GitHub Pages site are published separately. Merging into
`main` does not publish npm. Documentation changes under `docs/**` automatically
build/deploy the site through `.github/workflows/deploy-docs.yml`; changes to that
workflow also trigger deployment. Run release commands from the repository root,
and continue to the next step only when the previous one succeeds.

## 1. Update main and validate

Use Node.js 18 or newer, pnpm, npm, Git, and GitHub CLI. After merging the PR:

```sh
git switch main
git pull --ff-only origin main
git status --short
pnpm install --frozen-lockfile
pnpm test
pnpm exec tsc --noEmit
node dist/cli.js --version
```

The working tree should be clean, tests should pass, and the CLI should print
`1.5.0`. `pnpm test` builds the CLI and generated help before running tests.
Root `tsc` checks types without emitting files. The CLI source contains its Node
shebang, and `prepack` rebuilds the CLI/help before both `npm pack` and
`npm publish`. `dist/` is ignored by Git.

Build the documentation and clear any previous generated files:

```sh
pnpm --dir docs install --frozen-lockfile
pnpm --dir docs build --emptyOutDir
```

Review the remaining native-client, browser, and platform checks in
[the sync checklist](local-sync/MANUAL_TEST_CHECKLIST.md). Automated sync tests use
disposable destinations; they do not confirm discovery by the installed clients.

## 2. Authenticate and preview the npm package

```sh
npm whoami --registry=https://registry.npmjs.org/
```

If authentication is missing or expired, log in with an account that can publish
`ctxbin`, then repeat `npm whoami`:

```sh
npm login --registry=https://registry.npmjs.org/
```

Preview the package without uploading it:

```sh
npm publish --dry-run --access public --tag latest --registry=https://registry.npmjs.org/
```

Check that the preview identifies `ctxbin@1.5.0` and includes `dist/cli.js`,
`dist/index.js`, `dist/skills/ctxbin/SKILL.md`, `dist/agent-addon.md`, the source
skill/add-on, README, LICENSE, and package.json. The generated skill metadata
must also say `version: 1.5.0`.

Verify the installed launcher before publishing, using the exact local tarball.
`node dist/cli.js` alone cannot detect a missing shebang:

```sh
CTXBIN_RELEASE_CHECK_DIR=$(mktemp -d)
npm pack --pack-destination "$CTXBIN_RELEASE_CHECK_DIR"
npx --yes --registry=https://registry.npmjs.org/ --package="$CTXBIN_RELEASE_CHECK_DIR/ctxbin-1.5.0.tgz" ctxbin --version
npx --yes --registry=https://registry.npmjs.org/ --package="$CTXBIN_RELEASE_CHECK_DIR/ctxbin-1.5.0.tgz" ctxbin help
```

The version should print `1.5.0`, and help should print without shell errors.
This installs only a temporary package for verification. Do not use
`--ignore-scripts` with pack/publish: it skips the required rebuild.

## 3. Publish and verify npm

```sh
npm publish --access public --tag latest --registry=https://registry.npmjs.org/
npm view ctxbin@1.5.0 version --registry=https://registry.npmjs.org/
npm view ctxbin dist-tags --json --registry=https://registry.npmjs.org/
npx --yes --registry=https://registry.npmjs.org/ ctxbin@1.5.0 --version
npx --yes --registry=https://registry.npmjs.org/ ctxbin@1.5.0 help
```

Follow any authentication prompts from npm. Both version checks should report
`1.5.0`, and `latest` should point to `1.5.0`. A published name/version cannot be
reused; if a problem is found after publishing, fix it in a new patch release.

## 4. Record the release in GitHub

After npm publication succeeds, tag the same `main` commit that was built:

```sh
git tag -a 'ctxbin@1.5.0' -m "Release ctxbin v1.5.0"
git push origin 'ctxbin@1.5.0'
gh release create 'ctxbin@1.5.0' --verify-tag --title 'ctxbin@1.5.0' --generate-notes
```

This records the release; creating a GitHub release does not publish to npm.

## 5. Verify automatic documentation deployment

On main, changes to `docs/**` or `.github/workflows/deploy-docs.yml` run
`Deploy documentation`. The workflow installs frozen docs dependencies, builds
with Node 22/pnpm 10.13.1 and `--emptyOutDir`, replaces generated `gh-pages` files
while retaining branch history, and deploys that same dist as a Pages artifact.
Vite keeps `/ctxbin/` as its base path. Deployments serialize; feature branches
and pull requests do not deploy.

```sh
gh run list --workflow deploy-docs.yml --branch main --limit 5
gh api repos/superlucky84/ctxbin/pages --jq '{status, html_url, build_type, source}'
```

For a manual rebuild/retry of the current main site:

```sh
gh workflow run deploy-docs.yml --ref main
gh run list --workflow deploy-docs.yml --branch main --limit 5
gh run watch <RUN_ID> --exit-status
```

Pages is configured with `build_type: workflow`, and the `github-pages`
environment allows main. No extra PAT is required. `gh-pages` remains the generated
snapshot branch, but an Actions-token push alone does not trigger a legacy Pages
build; the official deploy action handles live publication. After this migration,
manually pushing files to `gh-pages` alone does not update the live site.

The one-time 1.5.0 migration initially published built files using:

```sh
pnpm dlx gh-pages@6.3.0 --dist docs/dist --branch gh-pages --nojekyll --message "docs: publish ctxbin v1.5.0"
```

Workflow failures appear in Actions. A deployment failure after branch publication
can leave a newer snapshot than the live site; retry the workflow and verify its
deployment result. See [deployment design](site-deployment/DESIGN.md) and
[manual checks](site-deployment/MANUAL_TEST_CHECKLIST.md).

After deployment, check the English and Korean sync guides in the browser:

- https://superlucky84.github.io/ctxbin/#/commands/sync
- https://superlucky84.github.io/ctxbin/#/ko/commands/sync
- https://superlucky84.github.io/ctxbin/#/commands/backup-restore
- https://superlucky84.github.io/ctxbin/#/ko/commands/backup-restore

## Local Volta troubleshooting

On the release-preparation machine, the default Volta npm shim failed because
its Node 22.12.0 installation had a missing npm executable. Node 22.23.3 and
pnpm 10.13.1 were already installed and worked. If the same error occurs in
your shell, select those existing executables for that shell session:

```sh
export PATH="$HOME/.volta/tools/image/node/22.23.3/bin:$HOME/.volta/tools/image/packages/pnpm/bin:$PATH"
node --version
npm --version
pnpm --version
```

## References

- [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/)
- [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [gh-pages publisher](https://github.com/tschaub/gh-pages)
