import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The standalone staff directory was merged into the Team hub.
      // Exact-path redirect only: /staff/new and /staff/[id] keep working.
      { source: "/staff", destination: "/team", permanent: false },
    ];
  },
};

export default nextConfig;
