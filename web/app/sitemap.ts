import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const site =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
  'https://gentle-moss-08e107900.7.azurestaticapps.net';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${site}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${site}/sample-app/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];
}
