import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

/**
 * Block major AI/LLM training & browsing crawlers.
 * Leave general search engines (Googlebot, Bingbot, etc.) able to index via User-agent: *.
 */
const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'Google-Extended',
  'CCBot',
  'Omgilibot',
  'Omgili',
  'FacebookBot',
  'Bytespider',
] as const;

export default function robots(): MetadataRoute.Robots {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    'https://gentle-moss-08e107900.7.azurestaticapps.net';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        disallow: ['/'] as string[],
      })),
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
