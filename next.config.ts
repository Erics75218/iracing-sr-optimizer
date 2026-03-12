import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev requests so any port (3000, 3001, 3002, …) works; avoids cross-origin/cookie issues
  allowedDevOrigins: [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3001",
    "http://localhost:3001",
    "http://127.0.0.1:3002",
    "http://localhost:3002",
  ],
};

export default nextConfig;
