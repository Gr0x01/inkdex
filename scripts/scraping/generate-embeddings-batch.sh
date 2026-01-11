#!/bin/bash
# Generate embeddings for recently uploaded images (incremental)
# Uses dual-GPU setup: RTX 4080 (60%) + A2000 (40%)
#
# Usage:
#   ./scripts/scraping/generate-embeddings-batch.sh       # Process all pending
#   ./scripts/scraping/generate-embeddings-batch.sh 10    # Limit to 10 batches

set -e

echo "🔮 Generating embeddings (dual-GPU: 4080 + A2000)..."
echo ""

python3 scripts/embeddings/dual_gpu_embeddings.py

echo ""
echo "✅ Embedding generation complete"
