import { describe, it, expect } from 'vitest'
import { parseDbEmbeddings } from '../parse-embeddings'

describe('parseDbEmbeddings', () => {
  it('parses string embeddings from pgvector format', () => {
    const images = [
      { embedding: '[0.1, 0.2, 0.3]' },
      { embedding: '[0.4, 0.5, 0.6]' },
    ]

    const result = parseDbEmbeddings(images)

    expect(result).toEqual([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ])
  })

  it('passes through array embeddings unchanged', () => {
    const images = [
      { embedding: [0.1, 0.2, 0.3] },
      { embedding: [0.4, 0.5, 0.6] },
    ]

    const result = parseDbEmbeddings(images)

    expect(result).toEqual([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ])
  })

  it('handles mixed string and array embeddings', () => {
    const images = [
      { embedding: '[0.1, 0.2]' },
      { embedding: [0.3, 0.4] },
    ]

    const result = parseDbEmbeddings(images)

    expect(result).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ])
  })

  it('returns empty array for empty input', () => {
    expect(parseDbEmbeddings([])).toEqual([])
  })

  it('handles 768-dim embeddings', () => {
    const embedding768 = new Array(768).fill(0.001)
    const images = [{ embedding: JSON.stringify(embedding768) }]

    const result = parseDbEmbeddings(images)

    expect(result.length).toBe(1)
    expect(result[0].length).toBe(768)
    expect(result[0][0]).toBe(0.001)
  })

  it('throws on malformed JSON string', () => {
    const images = [{ embedding: 'not-valid-json' }]
    expect(() => parseDbEmbeddings(images)).toThrow('Failed to parse embedding at index 0')
  })

  it('throws with correct index on malformed JSON', () => {
    const images = [
      { embedding: [0.1, 0.2] },
      { embedding: 'invalid' },
    ]
    expect(() => parseDbEmbeddings(images)).toThrow('index 1')
  })
})
