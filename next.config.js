/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

/**
 * Security headers globales.
 *
 * - X-Frame-Options: DENY → bloquea clickjacking (no embebemos en iframes).
 * - X-Content-Type-Options: nosniff → previene MIME sniffing.
 * - Referrer-Policy: strict-origin-when-cross-origin → no leakea path interno.
 * - Strict-Transport-Security: solo en prod (asume HTTPS terminated).
 *
 * No agregamos CSP estricto porque la app necesita tiles externos (OSM) y
 * routing (OSRM, Nominatim); un CSP útil requiere whitelist explícita de
 * dominios que cambian según el deploy.
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(self), microphone=(), camera=()' },
  ...(isProd
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
    : []),
];

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverComponentsExternalPackages: ['pg'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
