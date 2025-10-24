/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tirhnanxmjsasvhfphbq.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Webpack configuration disabled - was causing "Cannot find module vendor-chunks" error
  // webpack: (config, { dev, isServer }) => {
  //   if (dev && !isServer) {
  //     config.optimization.splitChunks = {
  //       cacheGroups: {
  //         default: false,
  //         vendors: false,
  //       },
  //     };
  //   }
  //   return config;
  // },
};

module.exports = nextConfig;
