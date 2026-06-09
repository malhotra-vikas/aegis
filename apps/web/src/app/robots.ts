import type { MetadataRoute } from 'next';
import { SITE } from '../lib/marketing';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/app', '/demo', '/callback'] },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
