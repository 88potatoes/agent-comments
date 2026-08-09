import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "dist/index.js",
  external: [
    "ink",
    "react",
    "@tanstack/react-query",
    "drizzle-orm",
    "@libsql/client",
  ],
  banner: { js: "#!/usr/bin/env node" },
  // Strip the #!/usr/bin/env tsx shebang from src/index.ts so it doesn't
  // end up as a literal string in the bundle (causes SyntaxError).
  define: {},
  logLevel: "info",
});

// Remove the leftover shebang from the bundled source code
import { readFileSync, writeFileSync } from "node:fs";
const out = readFileSync("dist/index.js", "utf8");
// The source shebang appears as a string literal after the banner shebang
writeFileSync("dist/index.js", out.replace(/#!\/usr\/bin\/env tsx\n/, ""));
