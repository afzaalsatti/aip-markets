/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Browser calls the API directly (NEXT_PUBLIC_API_URL); no Next rewrite required.
  poweredByHeader: false,
};

export default nextConfig;
