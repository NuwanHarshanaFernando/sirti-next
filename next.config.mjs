/** @type {import('next').NextConfig} */
const nextConfig = {
    devIndicators: false,
    // Ensure environment variables are available at build time
    env: {
        NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    },
};

export default nextConfig;
