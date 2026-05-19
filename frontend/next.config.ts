import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // /api/* → backend FastAPI (resolvido dentro do container, não pelo browser)
  async rewrites() {
    const apiUrl = process.env.API_URL ?? "http://backend:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
