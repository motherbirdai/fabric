/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.FABRIC_API_URL || 'http://localhost:3100'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
