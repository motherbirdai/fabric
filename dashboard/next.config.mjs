/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://api.fabriclayer.dev/:path*',
      },
    ];
  },
};

export default nextConfig;
