import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qr-eats-umber.vercel.app';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/order/', '/demo/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
