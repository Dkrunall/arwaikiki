import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.220', '192.168.1.220:3012', 'localhost:3012'],
};

export default nextConfig;
