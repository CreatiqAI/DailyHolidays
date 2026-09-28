import type { NextConfig } from "next";

const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" },
      // legacy site CDN, used until every image is copied into Supabase Storage
      { protocol: "https", hostname: "cdn1.npcdn.net" },
    ],
  },
};

export default nextConfig;
