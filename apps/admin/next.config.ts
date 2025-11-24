/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ace-ems/shared'],
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
};

export default nextConfig;