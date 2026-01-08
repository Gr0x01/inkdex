/**
 * Content for the /first-tattoo SEO landing page
 *
 * Comprehensive guide for first-time tattoo seekers
 * High search volume, high intent - optimized for AI/LLM discoverability
 */

import type { FAQ } from '@/lib/content/types'

export interface FirstTattooSection {
  id: string
  heading: string
  paragraphs: string[]
}

export interface FirstTattooContent {
  title: string
  metaDescription: string
  publishedAt: string
  updatedAt: string
  hero: {
    headline: string
    subheadline: string
  }
  definition: string
  sections: FirstTattooSection[]
  faqs: FAQ[]
}

export const firstTattooContent: FirstTattooContent = {
  title: 'First Tattoo Guide',
  metaDescription:
    'Getting your first tattoo? Learn how to find the right artist, what to expect during your session, and how to prepare. Complete guide for first-time tattoo seekers.',
  publishedAt: '2026-01-08',
  updatedAt: '2026-01-08',

  hero: {
    headline: 'Getting Your First\u00a0Tattoo',
    subheadline:
      'Everything you need to know: finding the right artist, preparing for your session, and what to expect.',
  },

  definition:
    '<strong>Getting your first tattoo is a significant decision</strong> that deserves careful thought and preparation. This guide covers the essential steps: understanding what you want, finding the right artist, preparing for your appointment, and caring for your new tattoo afterward.',

  sections: [
    {
      id: 'what-to-get',
      heading: 'Deciding What to Get',
      paragraphs: [
        "<strong>Don't rush this decision.</strong> A tattoo is permanent, so take time to consider what you want. Many people sit with an idea for months or years before committing. If you're still excited about a design after several weeks, that's a good sign.",
        '<strong>Collect reference images.</strong> Save tattoos you like on Pinterest, Instagram, or in a folder on your phone. Notice patterns—are you drawn to certain styles, subjects, or placements? This collection helps you communicate with artists and clarifies your own preferences.',
        "<strong>Consider placement carefully.</strong> Where you put your first tattoo matters. Visible areas (hands, neck, face) can affect employment. Some spots hurt more than others. Think about how the design will flow with your body and whether you might want to expand it later.",
        "Start with something meaningful but not too complex. <strong>Simple designs are easier to execute well</strong> and give you a sense of how your body heals before committing to larger work.",
      ],
    },
    {
      id: 'finding-artist',
      heading: 'Finding the Right Artist',
      paragraphs: [
        "<strong>The artist matters more than the shop.</strong> A great artist in a modest studio will produce better work than a mediocre artist in a fancy shop. Focus on finding someone whose portfolio matches what you want.",
        '<strong>Look for style specialists.</strong> Artists who focus on specific styles (traditional, realism, fine line) typically produce better work in that style than generalists. If you want a realistic portrait, find someone with a portfolio full of realistic portraits.',
        "<strong>Review their healed work.</strong> Fresh tattoos look different from healed ones. Many artists post healed photos—these show you what to actually expect. If an artist only posts fresh work, ask to see healed examples.",
        'Use visual search to find matches. <strong>On Inkdex, you can upload your reference images</strong> and find artists whose portfolios match that aesthetic—even if you don\'t know style terminology.',
      ],
    },
    {
      id: 'questions-to-ask',
      heading: 'Questions to Ask Your Artist',
      paragraphs: [
        "<strong>How long have you been tattooing?</strong> Experience matters, especially for complex work. However, years alone don't guarantee quality—always prioritize portfolio over tenure.",
        '<strong>Can I see healed examples of similar work?</strong> Any confident artist will happily show healed photos of work similar to what you want.',
        '<strong>What size/placement do you recommend?</strong> Good artists will advise if your idea needs adjustment for the best result. Listen to their guidance on sizing and placement.',
        '<strong>How many sessions will this take?</strong> Larger or detailed pieces often require multiple sessions. Understand the full commitment before starting.',
        "<strong>What's your deposit and cancellation policy?</strong> Most artists require deposits ($50–$200) that go toward your final cost. Know the policy for rescheduling.",
      ],
    },
    {
      id: 'preparing',
      heading: 'Preparing for Your Appointment',
      paragraphs: [
        '<strong>Get a good night\'s sleep.</strong> Being well-rested helps you tolerate discomfort better and supports your body\'s healing response.',
        "<strong>Eat a substantial meal beforehand.</strong> Don't show up hungry or running on caffeine alone. Low blood sugar can make you feel faint during the session.",
        '<strong>Stay hydrated.</strong> Drink plenty of water in the days before your appointment. Hydrated skin takes ink better.',
        '<strong>Avoid alcohol and blood thinners.</strong> No drinking 24 hours before your appointment. Alcohol thins blood and increases bleeding, making the tattoo harder to execute.',
        '<strong>Wear appropriate clothing.</strong> Choose something that gives easy access to the tattoo area and that you don\'t mind getting ink on.',
      ],
    },
    {
      id: 'what-to-expect',
      heading: 'What to Expect During the Session',
      paragraphs: [
        '<strong>The artist will apply a stencil first.</strong> They\'ll place a transfer of the design on your skin so you can approve positioning before any needles touch you. Don\'t be afraid to ask for adjustments.',
        '<strong>Yes, it hurts—but it\'s manageable.</strong> Pain varies by person and placement. Most describe it as a hot scratching sensation. It\'s uncomfortable but rarely unbearable. Your body releases endorphins that help.',
        '<strong>Sessions can be long.</strong> Small pieces take 30 minutes to an hour. Larger work can take 3–6 hours per session. Your artist will take breaks.',
        '<strong>Speak up if you need to.</strong> Need a break? Feeling faint? Something doesn\'t look right? Communicate with your artist. Good artists want you comfortable and happy with the result.',
      ],
    },
    {
      id: 'aftercare',
      heading: 'Aftercare Basics',
      paragraphs: [
        '<strong>Follow your artist\'s specific instructions.</strong> Aftercare advice varies slightly by artist and tattoo type. Whatever your artist tells you supersedes general advice.',
        '<strong>Keep it clean and moisturized.</strong> Wash gently with unscented soap, pat dry, and apply a thin layer of recommended ointment or lotion. Don\'t over-moisturize.',
        '<strong>Don\'t pick, scratch, or peel.</strong> Your tattoo will scab and peel as it heals. Leave it alone. Picking can pull out ink and cause scarring.',
        '<strong>Avoid sun, swimming, and soaking.</strong> Keep your new tattoo out of direct sunlight. No pools, hot tubs, or baths for 2–3 weeks. Showers are fine.',
        '<strong>Healing takes 2–4 weeks.</strong> The surface heals in about two weeks, but full healing of deeper layers takes up to a month. Be patient.',
      ],
    },
  ],

  faqs: [
    {
      question: 'How much does a first tattoo cost?',
      answer:
        'Small, simple tattoos typically cost $100–$300. Medium pieces run $300–$700. Larger work can cost $1,000+ depending on size, detail, and artist rates. Most shops have minimums ($80–$150). Quality costs money—avoid bargain hunting with permanent body art.',
    },
    {
      question: 'How do I find a tattoo artist for my first tattoo?',
      answer:
        'Look for artists whose portfolio matches the style you want. Check Instagram for local artists, ask for recommendations from tattooed friends, or use Inkdex to search by uploading reference images. Always prioritize portfolio quality over convenience or price.',
    },
    {
      question: 'Where is the least painful spot for a first tattoo?',
      answer:
        'Generally, areas with more muscle and fat hurt less: outer arm, thigh, calf, and upper back. Bony areas (ribs, spine, feet, hands) and sensitive spots (inner arm, armpit) tend to hurt more. That said, placement should be driven by what you want, not just pain avoidance.',
    },
    {
      question: 'How big should my first tattoo be?',
      answer:
        "There's no right answer—it depends on your design and confidence level. Many people start with something palm-sized or smaller to learn how their body heals. However, some designs look better at larger sizes. Your artist can advise on appropriate sizing.",
    },
    {
      question: 'Can I bring a friend to my tattoo appointment?',
      answer:
        "Policies vary by shop. Many allow one guest for moral support, but some have space limitations or no-guest policies. Ask when booking. If you bring someone, make sure they're not distracting you or the artist.",
    },
    {
      question: 'How do I know if a tattoo shop is safe and clean?',
      answer:
        'Look for: Licensed artists with certificates displayed, single-use needles opened in front of you, clean workstations with disposable covers, autoclaved reusable equipment, and an overall professional environment. Trust your instincts—if something feels off, leave.',
    },
    {
      question: 'What if I regret my first tattoo?',
      answer:
        'Laser removal exists but is expensive, painful, and time-consuming. Cover-up tattoos are another option. The best prevention is careful planning: sit with your idea, choose a skilled artist, and don\'t rush. Most people who take their time end up happy.',
    },
    {
      question: 'How long should I wait to get my second tattoo?',
      answer:
        'Let your first tattoo fully heal (4–6 weeks minimum) before getting another one on the same area. If the new tattoo is on a different body part, you can technically get it sooner, but many people wait to see how their first tattoo heals and ages before committing to more.',
    },
  ],
}
