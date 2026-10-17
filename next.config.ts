import type { NextConfig } from 'next';
const config: NextConfig = { serverExternalPackages: ['pdf-parse'], experimental: { serverActions: { bodySizeLimit: '12mb' } } };
export default config;
