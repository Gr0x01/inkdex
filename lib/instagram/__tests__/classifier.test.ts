import { describe, it, expect } from 'vitest'
import {
  isTattooArtistByBio,
  getMatchingBioKeywords,
  BIO_KEYWORDS,
  EXTENDED_BIO_KEYWORDS,
} from '../classifier'

describe('Tattoo Artist Classifier - Bio Detection', () => {
  describe('isTattooArtistByBio', () => {
    describe('basic keyword matching', () => {
      it('returns true for bio containing "tattoo"', () => {
        expect(isTattooArtistByBio('Tattoo artist in LA')).toBe(true)
      })

      it('returns true for bio containing "tattooist"', () => {
        expect(isTattooArtistByBio('Professional tattooist')).toBe(true)
      })

      it('returns true for bio containing "ink"', () => {
        expect(isTattooArtistByBio('Custom ink work')).toBe(true)
      })

      it('returns true for bio containing "body art"', () => {
        expect(isTattooArtistByBio('Specializing in body art')).toBe(true)
      })

      it('returns false for unrelated bio', () => {
        expect(isTattooArtistByBio('Dog lover. Coffee enthusiast.')).toBe(false)
      })

      it('returns false for undefined bio', () => {
        expect(isTattooArtistByBio(undefined)).toBe(false)
      })

      it('returns false for empty bio', () => {
        expect(isTattooArtistByBio('')).toBe(false)
      })
    })

    describe('case insensitivity', () => {
      it('matches uppercase keywords', () => {
        expect(isTattooArtistByBio('TATTOO ARTIST')).toBe(true)
      })

      it('matches mixed case keywords', () => {
        expect(isTattooArtistByBio('TaTtOo WoRk')).toBe(true)
      })
    })

    describe('extended keywords', () => {
      it('matches booking-related keywords with extended=true', () => {
        expect(isTattooArtistByBio('DM for appointments', true)).toBe(true)
        expect(isTattooArtistByBio('Books open', true)).toBe(true)
        expect(isTattooArtistByBio('Booking now', true)).toBe(true)
      })

      it('matches style keywords with extended=true', () => {
        expect(isTattooArtistByBio('Blackwork specialist', true)).toBe(true)
        expect(isTattooArtistByBio('Fine line artist', true)).toBe(true)
        expect(isTattooArtistByBio('Traditional Japanese', true)).toBe(true)
        expect(isTattooArtistByBio('Neo-traditional designs', true)).toBe(true)
      })

      it('does not match extended keywords with extended=false', () => {
        expect(isTattooArtistByBio('Blackwork specialist', false)).toBe(false)
        expect(isTattooArtistByBio('Booking now', false)).toBe(false)
      })

      it('uses extended keywords by default', () => {
        expect(isTattooArtistByBio('Blackwork specialist')).toBe(true)
      })
    })

    describe('real-world bios', () => {
      it('matches typical tattoo artist bio', () => {
        expect(isTattooArtistByBio('Tattoo artist @shopname | DM for bookings | Los Angeles')).toBe(true)
      })

      it('matches minimalist artist bio', () => {
        expect(isTattooArtistByBio('ink. NYC.')).toBe(true)
      })

      it('matches professional bio with studio', () => {
        expect(isTattooArtistByBio('Resident artist at Sacred Ink Tattoo Studio. Custom pieces only.')).toBe(true)
      })

      it('matches bio containing "tattoos" even without artist context', () => {
        // Note: The classifier is keyword-based, not semantic
        // "I have tattoos" matches because it contains "tattoo"
        // This is by design - false positives are filtered by image classification
        expect(isTattooArtistByBio('Lifestyle blogger. I have tattoos.', false)).toBe(true)
      })

      it('rejects bio without any tattoo-related keywords', () => {
        expect(isTattooArtistByBio('Lifestyle blogger. Coffee lover. LA based.', false)).toBe(false)
      })
    })
  })

  describe('getMatchingBioKeywords', () => {
    it('returns empty array for undefined bio', () => {
      expect(getMatchingBioKeywords(undefined)).toEqual([])
    })

    it('returns empty array for bio with no keywords', () => {
      expect(getMatchingBioKeywords('Dog lover')).toEqual([])
    })

    it('returns matching keywords', () => {
      const matches = getMatchingBioKeywords('Tattoo artist specializing in blackwork')
      expect(matches).toContain('tattoo')
      expect(matches).toContain('blackwork')
    })

    it('matches multiple style keywords', () => {
      const matches = getMatchingBioKeywords('Traditional and neo-traditional tattoos')
      expect(matches).toContain('tattoo')
      expect(matches).toContain('traditional')
      expect(matches).toContain('neo-traditional')
    })

    it('is case insensitive', () => {
      const matches = getMatchingBioKeywords('TATTOO ARTIST')
      expect(matches).toContain('tattoo')
    })
  })

  describe('keyword lists', () => {
    it('BIO_KEYWORDS contains core tattoo terms', () => {
      expect(BIO_KEYWORDS).toContain('tattoo')
      expect(BIO_KEYWORDS).toContain('tattooist')
      expect(BIO_KEYWORDS).toContain('ink')
      expect(BIO_KEYWORDS).toContain('body art')
    })

    it('EXTENDED_BIO_KEYWORDS includes all basic keywords', () => {
      for (const keyword of BIO_KEYWORDS) {
        expect(EXTENDED_BIO_KEYWORDS).toContain(keyword)
      }
    })

    it('EXTENDED_BIO_KEYWORDS includes style keywords', () => {
      expect(EXTENDED_BIO_KEYWORDS).toContain('blackwork')
      expect(EXTENDED_BIO_KEYWORDS).toContain('realism')
      expect(EXTENDED_BIO_KEYWORDS).toContain('geometric')
      expect(EXTENDED_BIO_KEYWORDS).toContain('watercolor')
    })

    it('EXTENDED_BIO_KEYWORDS includes booking keywords', () => {
      expect(EXTENDED_BIO_KEYWORDS).toContain('booking')
      expect(EXTENDED_BIO_KEYWORDS).toContain('appointments')
      expect(EXTENDED_BIO_KEYWORDS).toContain('books open')
    })
  })
})
