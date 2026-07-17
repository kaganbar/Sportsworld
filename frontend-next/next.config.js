const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

/** @type {(phase: string) => import('next').NextConfig} */
module.exports = (phase) => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    // Static export — required for the Tauri desktop shell (src-tauri/),
    // which has no Node server to run against; it loads this output
    // directly from disk. There are no API routes or middleware in this
    // app (confirmed before adding this) that static export would
    // otherwise break.
    //
    // Only applied for `next build`, NOT `next dev`: contrary to this
    // file's previous comment, `output: "export"` is NOT a build-only
    // setting in this Next.js version — the dev server also enforces its
    // "every dynamic route needs generateStaticParams()" rule, which 500s
    // every /[id]/[competition] page (this app has no static params to
    // generate; they're all live API-backed). Gating on phase keeps `next
    // dev` fully dynamic while `next build` (used for the Tauri bundle)
    // still gets a real static export.
    ...(isDev ? {} : { output: "export" }),
    // Separate build output directory from `next dev`'s `.next` — this
    // Docker service's dev server (npm run dev) runs continuously in the
    // background for the whole session, and a `next build` (for the Tauri
    // desktop bundle) sharing the same `.next` directory concurrently
    // corrupts the build's page-analysis step: a real, reproduced bug hit
    // while verifying the static export still worked after this session's
    // page refactors — the build nondeterministically reported a different
    // dynamic route as "missing generateStaticParams()" on each run (one
    // that demonstrably already had it), traced to `next dev` actively
    // rewriting `.next` mid-build. Gated the same way as `output: "export"`
    // above (`next dev` keeps using the default `.next`, since this only
    // applies outside dev phase) — the fix is giving `next build` its own
    // directory, not a Next.js-hardcoded behavior.
    ...(isDev ? {} : { distDir: ".next-build" }),
    images: { unoptimized: true },
  };
};
