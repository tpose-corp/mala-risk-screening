import type { NextConfig } from "next";

// Security headers on every response (OWASP A05). The CSP still allows inline scripts and
// styles because Next.js and React need them; it blocks everything else from other sites,
// plugins, being framed (clickjacking) and forms posting elsewhere. Dev also needs eval.
const dev = process.env.NODE_ENV !== "production";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  `connect-src 'self'${dev ? " ws:" : ""}`,
  "frame-src 'self'", // the PDF manual viewer
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false, // don't advertise the framework
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  devIndicators: false, // the dev-only "N" badge sat on top of the floating manuals button
  experimental: {
    // Manuals (PDF) are uploaded through a Server Action. Vercel caps a request at 4.5 MB,
    // so the app caps a manual at 4 MB (src/app/admin/manuals/actions.ts).
    serverActions: { bodySizeLimit: "4.5mb" },
  },
};

export default nextConfig;
