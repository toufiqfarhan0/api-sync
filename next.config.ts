import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/generate": ["./.latentcode/skills/api-documentation/SKILL.md"],
  },
};

export default nextConfig;
