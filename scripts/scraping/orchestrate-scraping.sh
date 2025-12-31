#!/bin/bash
# Orchestration Script for Instagram Scraping Pipeline (Incremental)
# Runs Python scraper with built-in batch processing, then rebuilds index

set -e  # Exit on error

echo "🤖 Instagram Scraping Pipeline (Incremental)"
echo "=============================================="
echo ""

# Step 1: Run incremental scraper (downloads + processes in batches)
echo "📥 Step 1: Downloading and processing (incremental)..."
echo "   - Downloads images via Apify"
echo "   - Processes and uploads every 10 artists"
echo "   - Generates embeddings every 50 artists"
echo ""
python3 scripts/scraping/apify-scraper.py

# Check if scraping was successful
if [ $? -ne 0 ]; then
    echo "❌ Scraping failed. Exiting..."
    exit 1
fi

echo ""
echo "✅ Incremental processing complete"
echo ""

# Step 2: Final index rebuild
echo "🔮 Step 2: Rebuilding vector index..."
npx tsx scripts/embeddings/create-vector-index.ts

# Check if indexing was successful
if [ $? -ne 0 ]; then
    echo "❌ Indexing failed. Exiting..."
    exit 1
fi

echo ""
echo "✅ Pipeline complete!"
echo ""
echo "📋 Summary:"
echo "   - Images downloaded, processed, and uploaded"
echo "   - Embeddings generated incrementally"
echo "   - Vector index rebuilt"
echo ""
echo "📊 Next steps:"
echo "   1. Validate results: npm run validate-scraped-images"
echo "   2. Build Next.js: npm run build"
