#!/usr/bin/env python3
"""
Train Style Classifier using sklearn

Uses logistic regression on CLIP embeddings with GPT-labeled training data.
Much faster and more reliable than custom JS implementation.

Usage:
    python scripts/styles/train-classifier.py

Requires: pip install scikit-learn numpy
"""

import json
import os
import sys
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_recall_fscore_support

# Styles to train
STYLES = [
    'traditional', 'neo-traditional', 'realism', 'black-and-gray', 'blackwork',
    'new-school', 'watercolor', 'ornamental', 'fine-line', 'tribal',
    'biomechanical', 'trash-polka', 'sketch', 'geometric', 'dotwork',
    'surrealism', 'lettering', 'anime', 'japanese'
]

def main():
    # Load exported training data
    data_path = Path(__file__).parent / 'training-data.json'

    if not data_path.exists():
        print(f"Training data not found at {data_path}")
        print("Run: npx tsx scripts/styles/export-training-data.ts")
        sys.exit(1)

    print("Loading training data...")
    with open(data_path) as f:
        data = json.load(f)

    embeddings = np.array(data['embeddings'])
    labels = data['labels']  # List of style arrays per example

    print(f"Loaded {len(embeddings)} examples with {embeddings.shape[1]}-dim embeddings")

    # Convert labels to multi-hot encoding
    label_matrix = np.zeros((len(labels), len(STYLES)), dtype=int)
    for i, example_labels in enumerate(labels):
        for style in example_labels:
            if style in STYLES:
                label_matrix[i, STYLES.index(style)] = 1

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        embeddings, label_matrix, test_size=0.2, random_state=42
    )

    print(f"Training set: {len(X_train)}")
    print(f"Test set: {len(X_test)}")
    print()

    # Train one classifier per style
    classifiers = {}
    results = []

    print("Training classifiers...")
    print()

    for i, style in enumerate(STYLES):
        y_train_style = y_train[:, i]
        y_test_style = y_test[:, i]

        positive_count = y_train_style.sum()

        if positive_count < 10:
            print(f"  {style}: Skipping (only {positive_count} positives)")
            classifiers[style] = None
            continue

        # Train with class weight balancing
        clf = LogisticRegression(
            max_iter=1000,
            class_weight='balanced',
            solver='lbfgs',
            random_state=42
        )
        clf.fit(X_train, y_train_style)

        # Evaluate
        y_pred = clf.predict(X_test)
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_test_style, y_pred, average='binary', zero_division=0
        )

        classifiers[style] = {
            'coef': clf.coef_[0].tolist(),
            'intercept': float(clf.intercept_[0])
        }

        results.append({
            'style': style,
            'f1': f1,
            'precision': precision,
            'recall': recall,
            'positives': int(positive_count)
        })

        print(f"  {style}: F1={f1:.3f} (P={precision:.3f}, R={recall:.3f}) [{positive_count} positives]")

    print()

    # Save classifier weights
    output = {
        'styles': STYLES,
        'classifiers': classifiers,
        'metadata': {
            'training_examples': len(X_train),
            'embedding_dim': embeddings.shape[1],
        }
    }

    output_path = Path(__file__).parent.parent.parent / 'models' / 'style-classifier.json'
    output_path.parent.mkdir(exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(output, f)

    print(f"Saved classifier to {output_path}")

    # Summary
    print()
    print("=== SUMMARY ===")
    valid_results = [r for r in results if r['f1'] > 0]
    if valid_results:
        avg_f1 = sum(r['f1'] for r in valid_results) / len(valid_results)
        print(f"Average F1: {avg_f1:.3f}")
        print(f"Styles trained: {len(valid_results)}/{len(STYLES)}")

        print()
        print("Best performing:")
        sorted_results = sorted(valid_results, key=lambda x: x['f1'], reverse=True)
        for r in sorted_results[:5]:
            print(f"  {r['style']}: F1={r['f1']:.3f}")

        print()
        print("Worst performing:")
        for r in sorted_results[-5:]:
            print(f"  {r['style']}: F1={r['f1']:.3f}")

if __name__ == '__main__':
    main()
