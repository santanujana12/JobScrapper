/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/graphql',
        destination: 'http://localhost:5000/graphql',
      },
    ];
  },
};

export default nextConfig;
