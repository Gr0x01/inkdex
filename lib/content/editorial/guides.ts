/**
 * City Guide Editorial Content
 *
 * Long-form guides targeting informational search intent
 * e.g., "tattoo culture in Austin", "best neighborhoods for tattoos in LA"
 *
 * Each guide is ~1,500-2,000 words and covers:
 * - Introduction to the city's tattoo scene
 * - Neighborhood-by-neighborhood breakdown
 * - How local culture shapes tattoo styles
 * - Popular styles and why they thrive
 * - Practical booking and pricing advice
 */

import type { CityGuideContent } from './guides-types'

export const CITY_GUIDE_CONTENT: CityGuideContent[] = [
  // ============================================================
  // TEXAS
  // ============================================================
  {
    citySlug: 'austin',
    stateSlug: 'texas',
    title: 'Tattoo Culture in Austin: A Complete Guide',
    metaDescription:
      'Explore Austin\'s vibrant tattoo scene from South Congress to East Austin. Discover the best neighborhoods, popular styles, and what makes ATX ink culture unique.',
    publishedAt: '2026-01-05',
    updatedAt: '2026-01-05',

    introduction: {
      heading: "Austin's Tattoo Scene: Where Weird Meets Wonderful",
      paragraphs: [
        "Keep Austin Weird isn't just a slogan—it's the operating principle for the city's thriving tattoo community. As Texas's creative capital, Austin has cultivated a tattoo scene that's as eclectic as its famous music festivals. From the vintage shops along South Congress to the boundary-pushing studios in East Austin, the city offers something for every aesthetic sensibility.",
        "What sets Austin apart is the seamless blend of tradition and innovation. You'll find artists equally comfortable executing classic American traditional pieces as they are creating avant-garde blackwork or intricate fine-line designs. The city's transient creative population—musicians, tech workers, and artists—has created a melting pot of influences that keeps the scene fresh and evolving.",
      ],
    },

    neighborhoods: [
      {
        name: 'South Congress (SoCo)',
        slug: 'south-congress',
        description: [
          "South Congress represents Austin's more polished tattoo experience. The shops here cater to a mix of tourists and locals, with many artists specializing in approachable styles like neo-traditional and illustrative work. The vintage aesthetic of the neighborhood influences the artwork—expect to see a lot of classic Americana with modern twists.",
          "Walk-ins are more common here than in other parts of the city, making it ideal for spontaneous decisions or smaller pieces. The concentration of shops means you can easily consult with multiple artists in an afternoon.",
        ],
        characteristics: [
          'walk-in friendly',
          'neo-traditional focus',
          'vintage aesthetic',
          'tourist accessible',
        ],
      },
      {
        name: 'East Austin',
        slug: 'east-austin',
        description: [
          "East Austin is where the city's most experimental tattoo work happens. The neighborhood's artist-heavy population has attracted studios pushing the boundaries of what tattoo art can be. Blackwork, geometric, and abstract pieces thrive here, alongside some of the best fine-line artists in Texas.",
          "Studios in this area tend to be more selective about the work they take on. Many operate primarily by portfolio consultation, where you'll discuss your vision before the artist decides if it aligns with their style. Come prepared with reference images and an open mind.",
        ],
        characteristics: [
          'experimental styles',
          'blackwork specialists',
          'consultation-based',
          'artist-selective',
        ],
      },
      {
        name: 'Downtown / Sixth Street',
        slug: 'downtown',
        description: [
          "The downtown area, particularly around Sixth Street, offers late-night tattooing that caters to the city's famous nightlife crowd. While this might not be where you'd get your most considered piece, it's part of Austin's tattoo culture nonetheless.",
          "Some legitimate studios operate in this area, often with artists who can handle quick, clean traditional work. If you're looking for something spontaneous after a night out, this is your zone—just stick to established shops with visible portfolios.",
        ],
        characteristics: [
          'late-night hours',
          'walk-in focused',
          'traditional work',
          'nightlife adjacent',
        ],
      },
      {
        name: 'North Loop',
        slug: 'north-loop',
        description: [
          "The North Loop district has emerged as a quieter alternative to the busier South Congress scene. Shops here often have a neighborhood feel, with artists who've built loyal local clientele over years. You'll find excellent traditional and neo-traditional work alongside specialty styles like Japanese-influenced pieces.",
          "Booking tends to be easier here than in East Austin, though the best artists still require advance scheduling. The vibe is more relaxed, making it a good choice if you prefer a less frenetic tattoo experience.",
        ],
        characteristics: [
          'neighborhood vibe',
          'traditional excellence',
          'local clientele',
          'easier booking',
        ],
      },
    ],

    localCulture: {
      heading: 'How Austin\'s Culture Shapes Its Ink',
      paragraphs: [
        "Austin's identity as the Live Music Capital of the World directly influences its tattoo culture. Band logos, music iconography, and tribute pieces are ubiquitous. Many artists have backgrounds in the music scene or adjacent creative fields, bringing a rock-and-roll sensibility to their work that you won't find in more corporate cities.",
        "The tech boom has also left its mark. The influx of young professionals with disposable income has created demand for high-end custom work, pushing artists to elevate their craft. You'll notice a lot of minimalist and geometric work catering to this demographic—pieces that look professional in office settings while still making a statement.",
        "Perhaps most importantly, Austin's acceptance of alternative lifestyles means heavy modification and full coverage is more visible and accepted here than in much of Texas. This creates a supportive environment for both artists and collectors to push boundaries.",
      ],
    },

    styleGuide: {
      heading: 'Popular Styles in Austin',
      paragraphs: [
        "Traditional American work remains incredibly popular, with multiple shops specializing in clean, bold execution of classic designs. But Austin's version often comes with subtle updates—slightly more saturated colors, contemporary subject matter, or hybrid approaches that incorporate elements of neo-traditional.",
        "Blackwork and geometric have exploded in popularity, particularly among the under-35 crowd. The city has several artists who've gained national recognition for ornamental and sacred geometry work. Fine-line botanical and illustrative pieces are also in high demand, driven partly by the influence of social media aesthetics.",
        "For those seeking traditional Japanese work, Austin has a smaller but dedicated community of artists trained in tebori or conventional machine Japanese styles. These artists tend to book months in advance but deliver work on par with major coastal cities.",
      ],
    },

    practicalAdvice: {
      heading: 'Booking and Pricing Tips',
      paragraphs: [
        "Austin tattoo prices typically range from $150-200 per hour for established artists, with some in-demand names charging $250 or more. Minimum charges usually start around $80-100 for small walk-in pieces. Expect to pay a deposit of $50-100 to secure your appointment, which is applied to your final cost.",
        "Booking windows vary wildly. SoCo shops might accommodate same-day walk-ins, while the most sought-after East Austin artists book 3-6 months out. For the best experience, reach out via Instagram DM or email with clear reference images and placement ideas. Most Austin artists respond within a week.",
        "Tipping culture is strong here—15-20% is standard for good work, with many clients going higher for exceptional pieces. Cash tips are always appreciated, though most shops can add tips to card transactions. Remember that tattoo artists often rent their space, so your tip goes directly to them.",
      ],
    },

    keywords: [
      'austin tattoo artists',
      'tattoo culture austin',
      'south congress tattoo shops',
      'east austin tattoos',
      'best tattoo neighborhoods austin',
      'austin ink scene',
    ],
    relatedStyles: ['traditional', 'neo-traditional', 'blackwork', 'fine-line', 'geometric'],
  },

  // ============================================================
  // CALIFORNIA
  // ============================================================
  {
    citySlug: 'los-angeles',
    stateSlug: 'california',
    title: 'Tattoo Culture in Los Angeles: A Complete Guide',
    metaDescription:
      'Navigate LA\'s diverse tattoo scene from Silver Lake to Long Beach. Discover iconic shops, celebrity artists, and the styles that define Southern California ink culture.',
    publishedAt: '2026-01-05',
    updatedAt: '2026-01-05',

    introduction: {
      heading: "LA's Tattoo Scene: Where Icons Are Made",
      paragraphs: [
        "Los Angeles isn't just a city with a tattoo scene—it's the city that shaped modern American tattoo culture. From the legendary Sunset Strip shops that tattooed rock stars in the '80s to today's Instagram-famous artists with waitlists measured in years, LA has always been where tattoo trends start before spreading nationwide.",
        "The sheer scale of the city means you'll find everything here: masters of every traditional style, avant-garde experimenters, celebrity artists who've inked A-listers, and neighborhood shops where old-timers still hand-poke. This can be overwhelming for newcomers, but it also means your perfect artist is definitely somewhere in this sprawl—you just need to know where to look.",
      ],
    },

    neighborhoods: [
      {
        name: 'Silver Lake / Echo Park',
        slug: 'silver-lake',
        description: [
          "The eastside neighborhoods of Silver Lake and Echo Park have become the epicenter of LA's contemporary tattoo movement. These areas attract artists who view tattooing as fine art, with many maintaining gallery practices alongside their tattoo work. Expect clean, bright studios with curated aesthetics.",
          "Styles here skew toward the illustrative, botanical, and fine-line work popular on social media. Many artists have wait times of several months, but the quality and originality of work justifies the patience required. This is where you come for a piece you'll see in tattoo magazines.",
        ],
        characteristics: [
          'fine art approach',
          'illustrative specialists',
          'long waitlists',
          'curated studios',
        ],
      },
      {
        name: 'Hollywood / West Hollywood',
        slug: 'hollywood',
        description: [
          "The Hollywood corridor houses some of LA's most famous shops—names you've seen on reality TV or in celebrity tabloids. While this brings a certain amount of tourist traffic, it also means access to genuinely legendary artists who've been perfecting their craft for decades.",
          "Pricing here can be higher than other areas, reflecting both the prestige and overhead costs of these locations. But for traditional American, color realism, or portrait work, some of the best in the world work along these streets.",
        ],
        characteristics: [
          'celebrity artists',
          'legendary shops',
          'traditional excellence',
          'premium pricing',
        ],
      },
      {
        name: 'Long Beach',
        slug: 'long-beach',
        description: [
          "Long Beach has its own distinct tattoo identity, influenced by the port city's working-class roots and diverse population. The Chicano tattoo tradition runs deep here, with some shops tracing lineages back to the style's foundational figures. You'll also find strong traditional and neo-traditional scenes.",
          "Prices tend to be more accessible than LA proper, without sacrificing quality. The vibe is generally more laid-back, and you're more likely to find same-week availability even with talented artists.",
        ],
        characteristics: [
          'Chicano heritage',
          'traditional roots',
          'accessible pricing',
          'laid-back vibe',
        ],
      },
      {
        name: 'Venice / Santa Monica',
        slug: 'venice',
        description: [
          "The beach communities offer a different flavor of LA tattooing. Venice in particular has embraced the artistic revival of the area, with shops that feel more like galleries. The clientele skews toward creative professionals and the well-heeled westside crowd.",
          "Styles are diverse but tend toward the polished and portfolio-ready. These neighborhoods are good for finding artists who specialize in larger, cohesive pieces designed to work with body placement.",
        ],
        characteristics: [
          'gallery atmosphere',
          'creative clientele',
          'cohesive large pieces',
          'westside aesthetic',
        ],
      },
    ],

    localCulture: {
      heading: 'The Entertainment Industry\'s Influence',
      paragraphs: [
        "You can't discuss LA tattoo culture without acknowledging Hollywood's influence. The entertainment industry has made tattoos more visible and acceptable than perhaps anywhere else in America. When actors and musicians openly display their ink, it normalizes the art form and drives demand.",
        "This creates a unique dynamic where tattoo artists can become celebrities themselves. Some LA artists have larger Instagram followings than the people they tattoo. This celebrity culture pushes the visual quality of work—everything needs to be photo-ready for the constant documentation.",
        "The film and TV industry also provides steady work for artists who specialize in cover-ups and modifications for on-camera work, as well as those who create temporary tattoos for productions. It's a specialized niche that exists in LA more than anywhere else.",
      ],
    },

    styleGuide: {
      heading: 'LA\'s Signature Styles',
      paragraphs: [
        "Chicano style was literally born in Southern California and remains a point of pride for many LA shops. The fine-line black and gray work with religious imagery and cultural symbolism continues to evolve while honoring its roots. If this style interests you, LA is arguably the best place in the world to get it.",
        "Color realism and portrait work have also reached exceptional heights here, driven by the entertainment industry's demand for likeness work. Several LA artists are considered the world's best at capturing faces in skin.",
        "On the contemporary side, LA's fine-line and micro-realism scenes are unmatched. The Instagram aesthetic was arguably invented here, and while it's spread globally, LA still sets the trends. Botanical illustrations, delicate script, and minimalist designs thrive in this image-conscious city.",
      ],
    },

    practicalAdvice: {
      heading: 'Navigating LA\'s Tattoo Market',
      paragraphs: [
        "LA pricing varies enormously. You might find excellent work at $150/hour in Long Beach while paying $500/hour for a celebrity artist in Hollywood. The average for quality custom work from established artists runs $200-300/hour. Don't assume price always correlates with quality—do your research.",
        "Traffic and geography make shop selection more important here than in most cities. An artist in Long Beach might be two hours from Silver Lake in bad traffic. Be realistic about where you can actually get to, and factor in that LA tattoo sessions can run long.",
        "Booking practices are all over the map. Some shops use online booking systems; others only respond to Instagram DMs. Many of the most in-demand artists open their books only a few times per year. Follow artists you're interested in on social media to catch booking announcements.",
      ],
    },

    keywords: [
      'los angeles tattoo artists',
      'la tattoo culture',
      'hollywood tattoo shops',
      'silver lake tattoo',
      'chicano tattoo los angeles',
      'best tattoo neighborhoods la',
    ],
    relatedStyles: ['chicano', 'fine-line', 'realism', 'traditional', 'illustrative'],
  },
]

/**
 * Get guide content for a specific city
 */
export function getCityGuide(citySlug: string): CityGuideContent | undefined {
  return CITY_GUIDE_CONTENT.find((guide) => guide.citySlug === citySlug)
}

/**
 * Get all available city guides
 */
export function getAllCityGuides(): CityGuideContent[] {
  return CITY_GUIDE_CONTENT
}

/**
 * Check if a guide exists for a city
 */
export function hasGuide(citySlug: string): boolean {
  return CITY_GUIDE_CONTENT.some((guide) => guide.citySlug === citySlug)
}
