import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'bhavanicorporation.in' },
      { protocol: 'https', hostname: 'www.bhavanicorporation.in' },
      { protocol: 'https', hostname: 'www.sspackaging.co.in' },
    ],
  },
  experimental: {
    proxyClientMaxBodySize: '100mb',
  },
};

export default nextConfig;
