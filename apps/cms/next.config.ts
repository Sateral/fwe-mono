import dotenv from "dotenv";
import type { NextConfig } from "next";

dotenv.config({ path: "../../.env" });

const nextConfig: NextConfig = {
  // Allow UploadThing images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.ufs.sh",
      },
      {
        protocol: "https",
        hostname: "utfs.io",
      },
    ],
  },
  // CORS is handled dynamically in middleware.ts to support multiple trusted origins
};

export default nextConfig;
