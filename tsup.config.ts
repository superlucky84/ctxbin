import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts", "src/index.ts"],
  outDir: "dist",
  format: ["cjs"],
  platform: "node",
  target: "es2022",
  bundle: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  clean: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
