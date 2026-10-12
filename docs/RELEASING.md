# Releasing ctxbin

The local skill/agent sync command is an additive feature release: `1.3.2` →
`1.4.0`. The version is already set in the feature PR; do not run `npm version`
again after merging. The private documentation app keeps its independent version.

The npm package and GitHub Pages site are published separately. Merging into
`main` does not publish either one automatically. Run the commands below from the
repository root, and continue to the next step only when the previous one succeeds.

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
`1.4.0`. `pnpm test` builds the CLI and generated help before running tests.
`dist/` is ignored by Git, so an up-to-date local build is required for publishing.

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

Check that the preview identifies `ctxbin@1.4.0` and includes `dist/cli.js`,
`dist/index.js`, `dist/skills/ctxbin/SKILL.md`, `dist/agent-addon.md`, the source
skill/add-on, README, LICENSE, and package.json. The generated skill metadata
must also say `version: 1.4.0`.

## 3. Publish and verify npm

```sh
npm publish --access public --tag latest --registry=https://registry.npmjs.org/
npm view ctxbin@1.4.0 version --registry=https://registry.npmjs.org/
npm view ctxbin dist-tags --json --registry=https://registry.npmjs.org/
npx --yes --registry=https://registry.npmjs.org/ ctxbin@1.4.0 --version
npx --yes --registry=https://registry.npmjs.org/ ctxbin@1.4.0 help
```

Follow any authentication prompts from npm. Both version checks should report
`1.4.0`, and `latest` should point to `1.4.0`. A published name/version cannot be
reused; if a problem is found after publishing, fix it in a new patch release.

## 4. Record the release in GitHub

After npm publication succeeds, tag the same `main` commit that was built:

```sh
git tag -a v1.4.0 -m "Release ctxbin v1.4.0"
git push origin v1.4.0
gh release create v1.4.0 --verify-tag --title "ctxbin v1.4.0" --generate-notes
```

This records the release; creating a GitHub release does not publish to npm.

## 5. Publish the documentation site

As verified on 2026-10-12, GitHub Pages publishes the root of the `gh-pages`
branch. Vite uses `/ctxbin/` as its base path. From the repository root, publish
the `docs/dist` generated in step 1:

```sh
pnpm dlx gh-pages@6.3.0 --dist docs/dist --branch gh-pages --nojekyll --message "docs: publish ctxbin v1.4.0"
gh api repos/superlucky84/ctxbin/pages --jq '{status, html_url, source}'
```

The publisher commits and pushes the generated site to `origin/gh-pages`,
replacing its previous published files. It keeps branch history and does not
switch the local working branch. The `.nojekyll` marker serves Vite's output
without Jekyll processing. GitHub Pages deployment can take a few minutes.

After deployment, check the English and Korean sync guides in the browser:

- https://superlucky84.github.io/ctxbin/#/commands/sync
- https://superlucky84.github.io/ctxbin/#/ko/commands/sync

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
