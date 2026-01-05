import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://inkdex.io'

  return {
    rules: [
      // Allow legitimate search engines (explicit allow for clarity)
      {
        userAgent: ['Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot', 'Baiduspider', 'YandexBot'],
        allow: '/',
        disallow: ['/api/', '/admin/', '/dev/', '/dashboard/'],
      },
      // Block AI training crawlers
      {
        userAgent: [
          'GPTBot',           // OpenAI
          'ChatGPT-User',     // OpenAI browsing
          'Google-Extended',  // Google AI training (not search)
          'CCBot',            // Common Crawl (used for AI training)
          'anthropic-ai',     // Anthropic
          'Claude-Web',       // Anthropic browsing
          'Bytespider',       // ByteDance/TikTok
          'Perplexity-Bot',   // Perplexity AI (added by Meta)
          'PerplexityBot',    // Perplexity AI alternate
          'Applebot-Extended', // Apple AI training (not search)
          'Omgilibot',        // AI data aggregator
          'Omgili',           // AI data aggregator alternate
          'FacebookBot',      // Meta AI training
          'meta-externalagent', // Meta AI
          'cohere-ai',        // Cohere
          'ClaudeBot',        // Anthropic
        ],
        disallow: '/',
      },
      // Block known scrapers and aggressive bots
      {
        userAgent: [
          'AhrefsBot',        // SEO scraper
          'SemrushBot',       // SEO scraper
          'MJ12bot',          // Majestic SEO
          'DotBot',           // Moz
          'PetalBot',         // Huawei (aggressive)
          'MegaIndex',        // Russian scraper
          'BLEXBot',          // WebMeUp
          'DataForSeoBot',    // DataForSEO
          'serpstatbot',      // Serpstat
          'Seekport',         // German crawler
        ],
        disallow: '/',
      },
      // Default rule for all other bots - allow with restrictions
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/dev/', '/dashboard/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
