/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Fotos servidas desde Supabase Storage
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
};

export default nextConfig;
