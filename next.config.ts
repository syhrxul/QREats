import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  // Izinkan akses dari HP di jaringan lokal saat development
  allowedDevOrigins: ["192.168.3.116"],
};

export default withNextIntl(nextConfig);
