const fs = require("node:fs/promises");
const path = require("node:path");

async function main() {
  const root = path.resolve(__dirname, "..");
  const src = path.join(root, "skills", "ctxbin", "SKILL.md");
  const pkgPath = path.join(root, "package.json");
  const addonSrc = path.join(root, "agent-addon.md");
  const distRoot = path.join(root, "dist");
  const destDir = path.join(root, "dist", "skills", "ctxbin");
  const dest = path.join(destDir, "SKILL.md");
  const addonDest = path.join(distRoot, "agent-addon.md");

  try {
    await fs.mkdir(distRoot, { recursive: true });
    await fs.mkdir(destDir, { recursive: true });
    const skillText = await fs.readFile(src, "utf8");
    const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));
    const frontmatter = [
      "---",
      "name: ctxbin",
      "description: Use when working with ctxbin to save and load ctx, agent, and skill context.",
      "metadata:",
      "  short-description: ctxbin workflow",
      `  version: ${pkg.version}`,
      "---",
      "",
      "",
    ].join("\n");
    await fs.writeFile(dest, frontmatter + skillText, "utf8");
    await fs.copyFile(addonSrc, addonDest);
  } catch (err) {
    if (err && err.code === "ENOENT") {
      return;
    }
    throw err;
  }
}

main().catch((err) => {
  process.stderr.write(String(err) + "\n");
  process.exit(1);
});
