import type { MetadataRoute } from 'next';
import { GUIDES, SITE } from '../lib/marketing';

export default function sitemap(): MetadataRoute.Sitemap {
  const core = ['', '/pricing', '/guides', '/audit'].map((path) => ({
    url: `${SITE.url}${path}`,
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.8,
  }));
  const guides = GUIDES.map((g) => ({
    url: `${SITE.url}/guides/meta/${g.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));
  return [...core, ...guides];
}
