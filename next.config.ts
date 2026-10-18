import type { NextConfig } from 'next';
// pdf-parse stays a runtime dependency of the Node.js functions rather than being bundled.
const config: NextConfig = { serverExternalPackages: ['pdf-parse'] };
export default config;
