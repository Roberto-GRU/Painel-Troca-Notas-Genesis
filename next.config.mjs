/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';

// Em dev: unsafe-eval e unsafe-inline são necessários para o hot reload do Next.js.
// Em produção: removidos para eliminar vetores de XSS.
const scriptSrc = isProd
  ? "script-src 'self'"
  : "script-src 'self' 'unsafe-eval' 'unsafe-inline'";

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',  value: 'on' },
  { key: 'X-Frame-Options',         value: 'DENY' },
  { key: 'X-Content-Type-Options',  value: 'nosniff' },
  { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
  // HSTS: força HTTPS por 1 ano — só ativo em produção para não quebrar dev HTTP
  ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
