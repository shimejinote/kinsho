import type { NextConfig } from 'next';

/**
 * kinsho hosts many independent SPAs under one Static Web App.
 * Static HTML Export keeps hosting on SWA Free-tier compatible (no Node SSR).
 *
 * Each route segment under app/ becomes its own entry (e.g. /sample-app).
 * Apps must not share chrome; keep root layout minimal.
 */
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  poweredByHeader: false,
  generateEtags: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
