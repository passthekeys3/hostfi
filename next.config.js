/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.plaid.com https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https: ; connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.stripe.com https://api.plaid.com https://accounts.google.com https://*.ownerrez.com https://*.guesty.com https://*.hostaway.com; frame-src https://js.stripe.com https://cdn.plaid.com https://accounts.google.com; object-src 'none'; base-uri 'self';" },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
