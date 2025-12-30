/**
 * Style seeds data from Tattoodo article
 * Source: https://www.tattoodo.com/articles/a-beginners-guide-popular-tattoo-styles-briefly-explained-6969
 */

export interface StyleSeedData {
  styleName: string; // Slug version: 'fine-line', 'traditional'
  displayName: string; // Display version: 'Fine Line', 'Traditional'
  description: string; // SEO description
  imageUrls: string[]; // Seed image URLs from Tattoodo
}

export const styleSeedsData: StyleSeedData[] = [
  {
    styleName: 'traditional',
    displayName: 'Traditional',
    description:
      'Bold lines, bright colors, and iconic designs like roses, anchors, and gorgeous lady heads. Classic American tattoo style.',
    imageUrls: [
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/165863.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/166951.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/141254.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/166875.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/35710.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/164687.jpg',
    ],
  },
  {
    styleName: 'realism',
    displayName: 'Realism',
    description:
      'Jaw-dropping color and black and grey portraits with realistic depictions of nature. Photo-realistic tattoo artistry.',
    imageUrls: [
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167115.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/165274.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/163701.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/161013.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/165275.jpg',
    ],
  },
  {
    styleName: 'watercolor',
    displayName: 'Watercolor',
    description:
      'Looks like it was rendered with a brush dabbled in watery pastels. Soft, flowing, artistic tattoo style.',
    imageUrls: [
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167351.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167355.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167357.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/2019/09/IBa0MzVJDS4Y9Cops7Ww5UB9XdZcvVmdqyXHVKHU.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/2019/09/TjEdYjszhd4mVlRkhsS4pkqem1bUj65zPNWWJQJs.jpg',
    ],
  },
  {
    styleName: 'tribal',
    displayName: 'Tribal',
    description:
      'Almost always done in black with elaborate patterns from aboriginal communities worldwide. Bold geometric tribal designs.',
    imageUrls: [
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167425.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/165280.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167441.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/162697.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/171393.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/171398.jpg',
    ],
  },
  {
    styleName: 'new-school',
    displayName: 'New School',
    description:
      'Cartoonish and wacky, featuring caricatures and exaggerated figures from late 1980s-90s aesthetic. Vibrant and playful.',
    imageUrls: [
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167492.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167493.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167508.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/2019/09/jOvPgtOFHRiYyoGBN0DNOaub146YcoqBbt6T4jFO.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167499.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/2019/09/Av1VA5BD1QAQDdAom0gj88hWLJNv5M2a9L4DS6a9.jpg',
    ],
  },
  {
    styleName: 'neo-traditional',
    displayName: 'Neo Traditional',
    description:
      'Evolution of traditional with pronounced linework and extremely vibrant colors plus illustrative qualities. Modern classic style.',
    imageUrls: [
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167362.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167370.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/87070.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167385.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167361.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/166370.jpg',
    ],
  },
  {
    styleName: 'japanese',
    displayName: 'Japanese',
    description:
      'Originated during Edo period featuring dragons, kirins, and phoenixes from Japanese folklore. Traditional Irezumi artistry.',
    imageUrls: [
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/166662.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/164546.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/165283.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/159901.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/2019/09/RZAqbLsKOLszz9G9Jj091fO9CH8EEbQJ7wSZslEG.jpg',
    ],
  },
  {
    styleName: 'blackwork',
    displayName: 'Blackwork',
    description:
      'Created using solely black ink ranging from sacred geometry to modern abstract ornamental designs. Bold black tattoo art.',
    imageUrls: [
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/161008.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/165768.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/158562.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/2019/09/HIeYDyStDmZbTQLYujLz9kS7BUC3gb2BdZGoKlX3.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/2019/09/7Mycdt6DrvH3Z2GMgi5nBqays2JF4KuGaHvYH1Kr.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/2019/09/mxrePJzszfwJOrRlgqrUIFrvGlWBF2ERpPCwWmoM.jpg',
    ],
  },
  {
    styleName: 'illustrative',
    displayName: 'Illustrative',
    description:
      'Highly versatile style inspired by etching, engraving, abstract expressionism, and fine line calligraphy. Artistic illustration style.',
    imageUrls: [
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167568.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167580.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167570.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/2019/09/chqFLR7QG9jQF2dcPojlUiOfU2ouDeltw1kIayzO.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/2019/09/iYWDY2HRtrfm9xTqhld04MK3YLi8htGDQWwFTMMk.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/2019/09/uDYhTNJXoLSp22bgBd9POVtsA3be6Z9ecAgkLrEn.jpg',
    ],
  },
  {
    styleName: 'chicano',
    displayName: 'Chicano',
    description:
      'Usually fine line, black and grey rooted in Mexican Revolution, Los Angeles low-riders and Pachuco culture. Classic LA style.',
    imageUrls: [
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167341.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167327.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167333.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/171598.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/163492.jpg',
      'https://d1kq2dqeox7x40.cloudfront.net/images/news_uploads/legacy/0/167980.jpg',
    ],
  },
];
