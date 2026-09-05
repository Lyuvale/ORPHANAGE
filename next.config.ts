import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The standalone staff directory was merged into the Team hub.
      // Exact-path redirect only: /staff/new and /staff/[id] keep working.
      { source: "/staff", destination: "/team", permanent: false },
      // Referrals, admissions, placements and guardians live together on the
      // child profile — the standalone lists are removed. Detail pages keep
      // working; only exact list paths redirect to the children hub.
      { source: "/referrals", destination: "/children", permanent: false },
      { source: "/admissions", destination: "/children", permanent: false },
      { source: "/placements", destination: "/children", permanent: false },
      { source: "/guardians", destination: "/children", permanent: false },
    ];
  },
};

export default nextConfig;
