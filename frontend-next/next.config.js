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
    images: { unoptimized: true },
  };
};
