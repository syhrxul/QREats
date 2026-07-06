import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Izinkan akses dari HP di jaringan lokal saat development
  allowedDevOrigins: ["192.168.3.116"],
};

export default nextConfig;
