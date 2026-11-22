import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // No ESLint setup in this project; type errors still stop the build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
