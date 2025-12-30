#!/usr/bin/env python3
"""
Generate CLIP embeddings for style seed images using Modal.com GPU

This script:
1. Reads seed images from tmp/seed-embeddings/
2. Generates CLIP embeddings using OpenCLIP ViT-L-14
3. Saves embeddings to JSON for database insertion

Usage:
    python3 -m modal run scripts/style-seeds/generate-seed-embeddings.py
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Any

import modal

# Modal app configuration
app = modal.App("style-seed-embeddings")

# GPU image with OpenCLIP
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.1.2",
        "torchvision==0.16.2",
        "open_clip_torch==2.24.0",
        "Pillow==10.2.0",
        "numpy<2",  # Compatibility with torch 2.1.2
    )
)


@app.function(
    image=image,
    gpu="A10G",
    timeout=600,  # 10 minutes should be plenty for 58 images
    volumes={"/data": modal.Volume.from_name("style-seeds-temp", create_if_missing=True)}
)
def generate_embeddings_for_seeds(metadata: List[Dict[str, Any]], images_b64: Dict[str, str]) -> Dict[str, Any]:
    """
    Generate CLIP embeddings for all seed images

    Args:
        image_dir: Directory containing seed images
        metadata_path: Path to seeds-metadata.json

    Returns:
        Dictionary with embeddings and metadata
    """
    import torch
    import open_clip
    from PIL import Image
    import numpy as np

    print(f"🚀 Starting embedding generation")
    print(f"📁 Image directory: {image_dir}")
    print(f"📝 Metadata path: {metadata_path}")

    # Load CLIP model
    print("🔧 Loading CLIP model...")
    model, _, preprocess = open_clip.create_model_and_transforms(
        "ViT-L-14",
        pretrained="laion2b_s32b_b82k"
    )
    model.eval()

    # Check GPU
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"💻 Using device: {device}")
    model = model.to(device)

    # Load metadata
    with open(metadata_path, 'r') as f:
        seeds_metadata = json.load(f)

    print(f"📊 Processing {len(seeds_metadata)} seed images\n")

    results = []
    successful = 0
    failed = 0

    for i, seed_meta in enumerate(seeds_metadata):
        style_name = seed_meta['styleName']
        seed_number = seed_meta['seedNumber']
        filename = f"{style_name}-{seed_number}.jpg"
        image_path = os.path.join(image_dir, filename)

        print(f"[{i+1}/{len(seeds_metadata)}] Processing: {filename}")

        try:
            # Load and preprocess image
            image = Image.open(image_path).convert("RGB")
            image_input = preprocess(image).unsqueeze(0).to(device)

            # Generate embedding
            with torch.no_grad():
                image_features = model.encode_image(image_input)
                # L2 normalize for cosine similarity
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)

            # Convert to list
            embedding = image_features.cpu().numpy()[0].tolist()

            # Verify embedding
            embedding_norm = np.linalg.norm(embedding)
            print(f"   ✅ Embedding generated (dim: {len(embedding)}, norm: {embedding_norm:.4f})")

            # Add embedding to metadata
            result = {
                **seed_meta,
                'embedding': embedding,
                'embedding_dim': len(embedding),
                'embedding_norm': float(embedding_norm)
            }
            results.append(result)
            successful += 1

        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            failed += 1
            # Still add to results but without embedding
            results.append({
                **seed_meta,
                'embedding': None,
                'error': str(e)
            })

    print("\n" + "="*50)
    print(f"📊 Summary:")
    print(f"   Successful: {successful}")
    print(f"   Failed: {failed}")
    print(f"   Total: {len(seeds_metadata)}")

    return {
        'results': results,
        'summary': {
            'total': len(seeds_metadata),
            'successful': successful,
            'failed': failed,
            'model': 'ViT-L-14',
            'pretrained': 'laion2b_s32b_b82k',
            'embedding_dim': 768
        }
    }


@app.local_entrypoint()
def main():
    """
    Local entrypoint to run the embedding generation
    """
    # Paths
    project_root = Path.cwd()
    temp_dir = project_root / "tmp" / "seed-embeddings"
    metadata_path = temp_dir / "seeds-metadata.json"
    output_path = project_root / "scripts" / "style-seeds" / "seeds-with-embeddings.json"

    # Verify paths exist
    if not temp_dir.exists():
        print(f"❌ Directory not found: {temp_dir}")
        print("   Run: npx tsx scripts/style-seeds/generate-seed-embeddings.ts first")
        return

    if not metadata_path.exists():
        print(f"❌ Metadata not found: {metadata_path}")
        print("   Run: npx tsx scripts/style-seeds/generate-seed-embeddings.ts first")
        return

    print("🎨 Style Seed Embeddings - Modal.com GPU Processing")
    print("="*50)

    # Run embedding generation on Modal
    result = generate_embeddings_for_seeds.remote(
        str(temp_dir),
        str(metadata_path)
    )

    # Save results
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(result, f, indent=2)

    print(f"\n✅ Results saved to: {output_path}")
    print(f"\n📋 Next step:")
    print(f"   npx tsx scripts/style-seeds/populate-style-seeds.ts")
