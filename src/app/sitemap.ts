import type { MetadataRoute } from 'next'
import { createReadonlyClient } from '@/lib/supabase/readonly'
import { getComplexesForSitemap } from '@/lib/data/sitemap'

export const dynamic = 'force-dynamic'
export const revalidate = 86400

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://danjiondo.kr'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createReadonlyClient()
  const complexes = await getComplexesForSitemap(supabase)

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url:             `${SITE}/`,
      lastModified:    new Date(),
      changeFrequency: 'daily',
      priority:        1,
    },
    {
      url:             `${SITE}/map`,
      lastModified:    new Date(),
      changeFrequency: 'daily',
      priority:        0.9,
    },
  ]

  const complexRoutes: MetadataRoute.Sitemap = complexes.map(c => ({
    url:             `${SITE}/complexes/${c.id}`,
    lastModified:    new Date(c.updated_at),
    changeFrequency: 'weekly' as const,
    priority:        0.8,
  }))

  return [...staticRoutes, ...complexRoutes]
}
