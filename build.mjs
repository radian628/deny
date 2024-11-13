import * as esbuild from "esbuild";

const ctx = await esbuild.context({
  entryPoints: ["src/index.tsx"],
  outdir: "build",
  bundle: true,
});

await ctx.watch();
