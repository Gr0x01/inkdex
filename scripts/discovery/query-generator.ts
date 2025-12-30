/**
 * Query Generator for Artist Discovery
 *
 * Generates 40-50 diverse queries per city to maximize coverage.
 * Avoids repetition by varying:
 * - Styles (20+ styles)
 * - Locations (neighborhoods)
 * - Query formats
 * - Skill levels / descriptors
 */

export interface DiscoveryQuery {
  query: string;
  category: string; // For analytics
}

export function generateQueriesForCity(
  cityName: string,
  state: string
): DiscoveryQuery[] {
  const queries: DiscoveryQuery[] = [];

  // ========================================================================
  // 1. General Queries (5 variations)
  // ========================================================================
  const generalVariations = [
    'tattoo artist',
    'tattoo artists',
    'best tattoo artist',
    'top tattoo artist',
    'tattoo artist near me',
  ];

  generalVariations.forEach((variation) => {
    queries.push({
      query: `${variation} ${cityName} ${state} Instagram`,
      category: 'general',
    });
  });

  // ========================================================================
  // 2. Style-Specific Queries (25+ styles)
  // ========================================================================
  const styles = [
    // Original 10
    'fine line',
    'traditional',
    'geometric',
    'realism',
    'black and grey',
    'japanese',
    'watercolor',
    'minimalist',
    'blackwork',
    'dotwork',

    // Additional 15+
    'neo traditional',
    'new school',
    'illustrative',
    'sketch style',
    'anime',
    'micro realism',
    'ornamental',
    'tribal',
    'chicano',
    'american traditional',
    'portrait',
    'floral',
    'abstract',
    'surrealism',
    'biomechanical',
    'script lettering',
    'cover up specialist',
  ];

  styles.forEach((style) => {
    queries.push({
      query: `${style} tattoo artist ${cityName} ${state} Instagram`,
      category: `style_${style.replace(/\s+/g, '_')}`,
    });
  });

  // ========================================================================
  // 3. Location-Specific Queries (varies by city)
  // ========================================================================
  const neighborhoods = getCityNeighborhoods(cityName);

  neighborhoods.forEach((neighborhood) => {
    queries.push({
      query: `tattoo artist ${neighborhood} ${cityName} Instagram`,
      category: 'location',
    });
  });

  // ========================================================================
  // 4. Skill/Experience Queries (5 variations)
  // ========================================================================
  const experienceQueries = [
    `award winning tattoo artist ${cityName}`,
    `professional tattoo artist ${cityName}`,
    `custom tattoo artist ${cityName}`,
    `freelance tattoo artist ${cityName}`,
    `guest tattoo artist ${cityName}`,
  ];

  experienceQueries.forEach((q) => {
    queries.push({
      query: `${q} Instagram`,
      category: 'experience',
    });
  });

  // ========================================================================
  // 5. Gender-Specific Queries (2 variations)
  // ========================================================================
  queries.push({
    query: `female tattoo artist ${cityName} ${state} Instagram`,
    category: 'demographic',
  });

  queries.push({
    query: `women tattoo artists ${cityName} ${state} Instagram`,
    category: 'demographic',
  });

  // ========================================================================
  // 6. Additional Niche/Specialty Queries (Final Push)
  // ========================================================================
  const nicheSpecialties = [
    'color tattoo',
    'sleeve tattoo specialist',
    'small tattoo',
    'first tattoo friendly',
    'walk in tattoo',
    'custom design tattoo',
    'coverup tattoo specialist',
    'fine art tattoo',
    'unique tattoo',
    'contemporary tattoo',
    'handpoke tattoo',
    'stick and poke tattoo',
    'mandala tattoo',
    'nature tattoo',
    'wildlife tattoo',
    'botanical tattoo',
    'text tattoo',
    'quote tattoo',
    'symbol tattoo',
    'spiritual tattoo',
  ];

  nicheSpecialties.forEach((specialty) => {
    queries.push({
      query: `${specialty} artist ${cityName} Instagram`,
      category: 'niche_specialty',
    });
  });

  return queries;
}

/**
 * Get neighborhoods for location-specific queries
 */
function getCityNeighborhoods(cityName: string): string[] {
  const neighborhoods: Record<string, string[]> = {
    Austin: [
      'Downtown',
      'South Austin',
      'East Austin',
      'North Austin',
      'West Austin',
      'South Congress',
      'Sixth Street',
    ],
    'Los Angeles': [
      'Downtown LA',
      'Hollywood',
      'Silver Lake',
      'Echo Park',
      'West Hollywood',
      'Santa Monica',
      'Venice',
      'Long Beach',
      'Pasadena',
      'Burbank',
    ],
    Atlanta: [
      'Downtown Atlanta',
      'Midtown',
      'Buckhead',
      'Little Five Points',
      'East Atlanta',
      'Virginia Highland',
      'Old Fourth Ward',
      'Inman Park',
    ],
  };

  return neighborhoods[cityName] || [];
}

/**
 * Summary statistics for queries
 */
export function getQueryStats(queries: DiscoveryQuery[]) {
  const categories: Record<string, number> = {};

  queries.forEach((q) => {
    categories[q.category] = (categories[q.category] || 0) + 1;
  });

  return {
    total: queries.length,
    categories,
  };
}
