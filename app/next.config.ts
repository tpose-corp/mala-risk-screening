import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false, // the dev-only "N" badge sat on top of the floating manuals button
  experimental: {
    // Manuals (PDF) are uploaded through a Server Action. Vercel caps a request at 4.5 MB,
    // so the app caps a manual at 4 MB (src/app/admin/manuals/actions.ts).
    serverActions: { bodySizeLimit: "4.5mb" },
  },
};

export default nextConfig;
