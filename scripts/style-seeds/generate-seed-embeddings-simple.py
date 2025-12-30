#!/usr/bin/env python3
"""
Generate CLIP embeddings for style seed images using Modal.com GPU

Simpler version that passes images directly to Modal

Usage:
    python3 -m modal run scripts/style-seeds/generate-seed-embeddings-simple.py
"""

import json
import os
import base64
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
    timeout=600,  # 10 minutes should be plenty for 57 images
)
def generate_embeddings(images_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate CLIP embeddings for all seed images

    Args:
        images_data: List of dicts with 'metadata' and 'image_bytes' keys

    Returns:
        Dictionary with embeddings and metadata
    """
    import torch
    import open_clip
    from PIL import Image
    import numpy as np
    import io

    print(f"🚀 Starting embedding generation")
    print(f"📊 Processing {len(images_data)} seed images")

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

    results = []
    successful = 0
    failed = 0

    for i, item in enumerate(images_data):
        metadata = item['metadata']
        image_bytes = item['image_bytes']

        style_name = metadata['styleName']
        seed_number = metadata['seedNumber']

        print(f"[{i+1}/{len(images_data)}] Processing: {style_name}-{seed_number}")

        try:
            # Load image from bytes
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
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
                **metadata,
                'embedding': embedding,
                'embedding_dim': len(embedding),
                'embedding_norm': float(embedding_norm)
            }
            results.append(result)
            successful += 1

        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            failed += 1
            results.append({
                **metadata,
                'embedding': None,
                'error': str(e)
            })

    print("\n" + "="*50)
    print(f"📊 Summary:")
    print(f"   Successful: {successful}")
    print(f"   Failed: {failed}")
    print(f"   Total: {len(images_data)}")

    return {
        'results': results,
        'summary': {
            'total': len(images_data),
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

    # Load metadata
    with open(metadata_path, 'r') as f:
        seeds_metadata = json.load(f)

    # Prepare images data (read all images into memory)
    print(f"📥 Loading {len(seeds_metadata)} images into memory...")
    images_data = []

    for i, seed in enumerate(seeds_metadata):
        style_name = seed['styleName']
        seed_number = seed['seedNumber']
        filename = f"{style_name}-{seed_number}.jpg"
        image_path = temp_dir / filename

        if not image_path.exists():
            print(f"   ⚠️  [{i+1}/{len(seeds_metadata)}] Skipping missing: {filename}")
            continue

        with open(image_path, 'rb') as f:
            image_bytes = f.read()

        images_data.append({
            'metadata': seed,
            'image_bytes': image_bytes
        })

        if (i + 1) % 10 == 0:
            print(f"   Loaded {i+1}/{len(seeds_metadata)} images...")

    print(f"✅ Loaded {len(images_data)} images")

    # Run embedding generation on Modal
    print("\n🚀 Sending to Modal.com GPU...")
    result = generate_embeddings.remote(images_data)

    # Save results
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(result, f, indent=2)

    print(f"\n✅ Results saved to: {output_path}")
    print(f"\n📋 Next step:")
    print(f"   npx tsx scripts/style-seeds/populate-style-seeds.ts")
