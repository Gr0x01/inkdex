#!/bin/bash
# Generate embeddings for recently uploaded images (incremental)
# Called by apify-scraper.py during incremental pipeline
#
# Usage:
#   ./scripts/scraping/generate-embeddings-batch.sh       # Process 5 batches (default)
#   ./scripts/scraping/generate-embeddings-batch.sh 10    # Process 10 batches

set -e

MAX_BATCHES=${1:-5}  # Default to 5 batches (500 images)

echo "🔮 Generating embeddings for recently uploaded images..."
echo "   Max batches: ${MAX_BATCHES} (100 images per batch)"
echo ""

python3 scripts/embeddings/local_batch_embeddings.py \
  --parallel 4 \
  --batch-size 100 \
  --max-batches ${MAX_BATCHES}

echo ""
echo "✅ Embedding generation complete"
