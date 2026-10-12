# Local sync — manual release checks

Use a dedicated test store and disposable destination directories first.
Automated tests do not install anything into the user's actual skill/agent folders.

- [ ] Select two skills and one agent using repeated `--skill`/`--agent` flags,
  preview, and install into project destination overrides. Pass: only selected names
  appear in both preview and installed files; no global installation roots change.
- [ ] Select only one resource while the other has malformed entries/unsafe paths.
  Pass: the excluded hash/root is unused and does not block selected installation.
- [ ] Remove selected and unselected tracked remote entries; selectively prune.
  Pass: only selected same-source tracking is removed, other entries/tracking survive.
  Repeat cleanup or supply a typo; pass: NOT_FOUND before writes once tracking is gone.
  Absent names tracked in one selected target are valid cleanup candidates.
- [ ] Save shared Markdown with YAML name/description, sync both providers, and load
  the remote agent again. Pass: frontmatter survives save/load; Claude receives Markdown,
  Codex receives TOML with the same description and rules in developer_instructions.
- [ ] After publication, run `npx --yes ctxbin@1.5.0 --version` and
  `npx --yes ctxbin@1.5.0 help` from a directory outside the checkout.
  Pass: version is `1.5.0` and help prints normally through the npm launcher.
  The `1.4.0` release had a shebang-less TypeScript output; invoking the file with
  `node` alone does not verify the installed launcher.
- [x] Run built `ctxbin help` and the bundled fallback; inspect discovery metadata,
  sync options/examples, credentials, paths, pruning, and recovery explanations.
  Pass: both expose the current generated guide and match the command implementation.
- [ ] Visit home/introduction/quick start and command/config/reference/add-on pages
  in English and Korean. Follow sync links and review pack/ref loading semantics.
  Pass: links reach the correct language and all related pages explain the workflow.

- [ ] Save a Markdown skill and a shared agent using existing save commands.
  Preview both providers. Pass: expected paths/actions; no installation changes.
- [ ] Install a skillpack containing SKILL.md, references, and an executable script.
  Pass: all files arrive and script permissions work on macOS/Linux.
- [ ] Modify the remote pack to remove a file and sync again.
  Pass: removed file disappears, sibling local-only skill remains.
- [ ] Save a public GitHub skillref and sync it.
  Pass: reference resolves and the downloaded skill's assets arrive.
- [ ] Delete a remote item, sync without prune, then preview/apply with prune.
  Pass: item survives normal sync and disappears only with prune; unrelated items survive.
- [ ] Repeat using a different test store URL.
  Pass: prune retains first-store-only items; shared names transfer ownership on install.
- [ ] Preview with an invalid remote item and simulate a network failure.
  Pass: nonzero exit, useful error, local installations unchanged.
- [ ] Use a custom Codex skills directory matching the installed client layout.
  Pass: path override works, no duplicate unwanted skill installation.
- [ ] Open Claude Code and Codex after installing into approved real user directories.
  Pass: skill metadata and agent roles are discovered, instructions match remote rules.
- [ ] Verify Unicode, multiline rules, quotes, and backslashes in each client.
  Pass: rendered YAML/TOML loads without parsing errors.
- [ ] Run the same disposable workflow on Windows.
  Pass: replacement, locks, cleanup, and best-effort permissions behave correctly.
- [ ] Simulate process interruption in disposable roots.
  Pass: leftover lock/transaction is reported; inspect backup contents before removing
  locks or recovery data and retrying. No crash-atomicity guarantee is claimed.

## Execution record

Review regression checks: preserve template-valued frontmatter without warnings;
quote a plain colon-space description locally; preserve existing native descriptions;
report all invalid items; distinguish unmanaged replacements and require force;
replace a skill link without changing its target; confirm repeat sync skips identical
managed entries; test quoted tilde paths, TOML DEL, and cleanup warnings.

Native-client, browser, and platform checks above remain pending. On 2026-10-12 the
complete automated suite passed (53 passed, 2 environment-specific skips); CLI/type
checks and the bilingual site build passed. The documentation follow-up also passed
all 13 existing validation tests and direct help/source/add-on comparisons, and rebuilt
all site pages successfully. See [IMPLEMENT.md](IMPLEMENT.md) for commands and coverage.
Tests used temporary folders and mock stores.
