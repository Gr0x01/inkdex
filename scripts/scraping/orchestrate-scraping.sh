#!/bin/bash
# Orchestration Script for Instagram Scraping Pipeline
# Runs Python scraper, Node.js processor, and validation in sequence

set -e  # Exit on error

echo "🤖 Instagram Scraping Pipeline"
echo "=============================="
echo ""

# Step 1: Run Python scraper (Apify)
echo "📥 Step 1: Downloading Instagram images via Apify..."
python3 scripts/scraping/apify-scraper.py

# Check if scraping was successful
if [ $? -ne 0 ]; then
    echo "❌ Scraping failed. Exiting..."
    exit 1
fi

echo ""
echo "✅ Scraping complete"
echo ""

# Step 2: Process and upload images
echo "🖼️  Step 2: Processing and uploading images..."
npx tsx scripts/scraping/process-and-upload.ts

# Check if processing was successful
if [ $? -ne 0 ]; then
    echo "❌ Processing failed. Exiting..."
    exit 1
fi

echo ""
echo "✅ Processing complete"
echo ""

# Step 3: Validate results
echo "🔍 Step 3: Validating results..."
npx tsx scripts/scraping/validate-scraped-images.ts

echo ""
echo "✅ Pipeline complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Review validation report above"
echo "   2. If needed, re-run: npm run scrape-instagram (auto-resumes)"
echo "   3. When ready, proceed to Phase 4: Generate embeddings"
