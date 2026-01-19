# IndieHackers Post Draft

## Version 2 - Shorter (~450 words)

**Title:** Built a tattoo search engine in 2 days, indexed 22k artists for $510

---

I've been a product designer for 12 years. I know how to build products, just not solo.

I kept building stuff but never shipping. So I decided: next thing, I'm getting it out fast.

Was on Instagram trying to find tattoo artists. They all live there but it's built for engagement, not search. Realized I could fix that. MVP in 2 days.

Upload an image or describe what you want. It finds artists whose portfolio matches. 22k artists, 175k images, 147 cities. https://inkdex.io

Some learnings:

Paid ads were a waste. $100 on Google/Reddit. Google had 93% click loss - bots or ad blockers. Reddit had decent clicks but zero conversions. A $30 BetaList listing outperformed both combined.

Style classification was way harder than expected. My first approach used CLIP seed embeddings, comparing user uploads against reference images for each style. Everything got tagged anime or blackwork incorrectly. Had to label 15k images, and train a real classifier.

Getting the data was harder than building the product. Went through three different approaches before landing on something stable.

An A2000 GPU I bought to tinker in my homelab ended up as the embedding server. Trained embeddings for visual similarity, pgvector for search. Total build cost around $500, monthly infra is $35.

No revenue yet. Trying to figure out if I should focus on artist onboarding or user growth.

Stuck on whether to chase artists or users first. If you've built a two-sided thing, how'd you pick?

---

*~450 words*

---

## Version 1 - Original (~780 words)

*(keeping below for reference)*

**Title:** I build a lot of stuff. This one stuck. (22k tattoo artists, 147 cities, $510 total cost)

I wanted a tattoo. I had a folder full of Pinterest screenshots and saved Instagram posts. But every single artist whose work I loved was in LA or New York. I live in Austin.

So I built something to fix it.

[... original longer version truncated ...]
