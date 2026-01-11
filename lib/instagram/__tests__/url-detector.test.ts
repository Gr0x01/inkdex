import { describe, it, expect } from 'vitest';
import {
  detectInstagramUrl,
  isValidUsername,
  isValidPostId,
  isInstagramDomain,
  extractPostId,
} from '../url-detector';

describe('url-detector', () => {
  describe('isValidUsername', () => {
    it('accepts valid usernames', () => {
      expect(isValidUsername('artist_name')).toBe(true);
      expect(isValidUsername('artist.name')).toBe(true);
      expect(isValidUsername('artistname123')).toBe(true);
      expect(isValidUsername('a')).toBe(true); // minimum 1 char
      expect(isValidUsername('ArtistName')).toBe(true); // uppercase allowed
    });

    it('rejects empty or missing usernames', () => {
      expect(isValidUsername('')).toBe(false);
      expect(isValidUsername(null as unknown as string)).toBe(false);
      expect(isValidUsername(undefined as unknown as string)).toBe(false);
    });

    it('rejects usernames over 30 characters', () => {
      expect(isValidUsername('a'.repeat(30))).toBe(true); // exactly 30
      expect(isValidUsername('a'.repeat(31))).toBe(false); // over 30
    });

    it('rejects usernames ending with a dot', () => {
      expect(isValidUsername('artist.')).toBe(false);
      expect(isValidUsername('artist.name.')).toBe(false);
    });

    it('rejects usernames with invalid characters', () => {
      expect(isValidUsername('artist name')).toBe(false); // space
      expect(isValidUsername('artist-name')).toBe(false); // hyphen
      expect(isValidUsername('artist@name')).toBe(false); // at sign
      expect(isValidUsername('artist!name')).toBe(false); // special char
    });
  });

  describe('isValidPostId', () => {
    it('accepts valid post IDs', () => {
      expect(isValidPostId('CxYz12345Ab')).toBe(true); // 11 chars typical
      expect(isValidPostId('abcdefgh')).toBe(true); // 8 chars min
      expect(isValidPostId('a'.repeat(15))).toBe(true); // 15 chars max
    });

    it('rejects empty or missing post IDs', () => {
      expect(isValidPostId('')).toBe(false);
      expect(isValidPostId(null as unknown as string)).toBe(false);
    });

    it('rejects post IDs that are too short or too long', () => {
      expect(isValidPostId('abcdefg')).toBe(false); // 7 chars (under 8)
      expect(isValidPostId('a'.repeat(16))).toBe(false); // 16 chars (over 15)
    });

    it('accepts hyphens and underscores', () => {
      expect(isValidPostId('abc_def-gh')).toBe(true);
    });
  });

  describe('isInstagramDomain', () => {
    it('accepts valid Instagram domains', () => {
      expect(isInstagramDomain('https://instagram.com/p/abc123')).toBe(true);
      expect(isInstagramDomain('https://www.instagram.com/username')).toBe(true);
      expect(isInstagramDomain('http://instagram.com/p/abc123')).toBe(true);
    });

    it('accepts Instagram subdomains', () => {
      expect(isInstagramDomain('https://scontent.instagram.com/image.jpg')).toBe(true);
    });

    it('rejects non-Instagram domains', () => {
      expect(isInstagramDomain('https://google.com')).toBe(false);
      expect(isInstagramDomain('https://fake-instagram.com/p/abc')).toBe(false);
      expect(isInstagramDomain('https://instagram.com.evil.com')).toBe(false);
    });

    it('rejects invalid URLs', () => {
      expect(isInstagramDomain('not-a-url')).toBe(false);
      expect(isInstagramDomain('')).toBe(false);
    });
  });

  describe('extractPostId', () => {
    it('extracts post ID from standard post URLs', () => {
      expect(extractPostId('https://instagram.com/p/CxYz12345Ab/')).toBe('CxYz12345Ab');
      expect(extractPostId('https://www.instagram.com/p/CxYz12345Ab')).toBe('CxYz12345Ab');
      expect(extractPostId('https://instagram.com/p/CxYz12345Ab/?utm_source=test')).toBe('CxYz12345Ab');
    });

    it('extracts post ID from reel URLs', () => {
      expect(extractPostId('https://instagram.com/reel/CxYz12345Ab/')).toBe('CxYz12345Ab');
      expect(extractPostId('https://www.instagram.com/reel/CxYz12345Ab')).toBe('CxYz12345Ab');
    });

    it('returns null for profile URLs', () => {
      expect(extractPostId('https://instagram.com/username')).toBe(null);
    });

    it('returns null for non-Instagram URLs', () => {
      expect(extractPostId('https://google.com/p/abc123')).toBe(null);
    });

    it('returns null for invalid URLs', () => {
      expect(extractPostId('not-a-url')).toBe(null);
      expect(extractPostId('')).toBe(null);
    });
  });

  describe('detectInstagramUrl', () => {
    it('detects @username format', () => {
      const result = detectInstagramUrl('@artist_name');
      expect(result).toEqual({
        type: 'profile',
        id: 'artist_name',
        originalUrl: 'https://instagram.com/artist_name',
      });
    });

    it('detects profile URLs', () => {
      const result = detectInstagramUrl('https://instagram.com/artist_name');
      expect(result?.type).toBe('profile');
      expect(result?.id).toBe('artist_name');
    });

    it('detects profile URLs with www', () => {
      const result = detectInstagramUrl('https://www.instagram.com/artist_name');
      expect(result?.type).toBe('profile');
      expect(result?.id).toBe('artist_name');
    });

    it('detects profile URLs without protocol', () => {
      const result = detectInstagramUrl('instagram.com/artist_name');
      expect(result?.type).toBe('profile');
      expect(result?.id).toBe('artist_name');
    });

    it('detects post URLs', () => {
      const result = detectInstagramUrl('https://instagram.com/p/CxYz12345Ab');
      expect(result?.type).toBe('post');
      expect(result?.id).toBe('CxYz12345Ab');
    });

    it('detects reel URLs', () => {
      const result = detectInstagramUrl('https://instagram.com/reel/CxYz12345Ab');
      expect(result?.type).toBe('post');
      expect(result?.id).toBe('CxYz12345Ab');
    });

    it('returns null for reserved Instagram paths', () => {
      expect(detectInstagramUrl('https://instagram.com/explore')).toBe(null);
      expect(detectInstagramUrl('https://instagram.com/stories')).toBe(null);
      expect(detectInstagramUrl('https://instagram.com/accounts')).toBe(null);
      expect(detectInstagramUrl('https://instagram.com/direct')).toBe(null);
      expect(detectInstagramUrl('https://instagram.com/tv')).toBe(null);
      expect(detectInstagramUrl('https://instagram.com/reels')).toBe(null);
      expect(detectInstagramUrl('https://instagram.com/tagged')).toBe(null);
    });

    it('handles profile URLs with trailing slash', () => {
      const result = detectInstagramUrl('https://instagram.com/artist_name/');
      expect(result?.type).toBe('profile');
      expect(result?.id).toBe('artist_name');
    });

    it('preserves case in usernames from URLs', () => {
      const result = detectInstagramUrl('https://instagram.com/ArtistName');
      expect(result?.type).toBe('profile');
      expect(result?.id).toBe('ArtistName');
    });

    it('rejects path traversal attempts', () => {
      expect(detectInstagramUrl('https://instagram.com/../etc/passwd')).toBe(null);
      expect(detectInstagramUrl('https://instagram.com/p/../../secrets')).toBe(null);
      expect(detectInstagramUrl('https://instagram.com/..%2f..%2fetc')).toBe(null);
    });

    it('returns null for non-Instagram content', () => {
      expect(detectInstagramUrl('hello world')).toBe(null);
      expect(detectInstagramUrl('https://google.com')).toBe(null);
      expect(detectInstagramUrl('')).toBe(null);
      expect(detectInstagramUrl(null as unknown as string)).toBe(null);
    });

    it('handles whitespace', () => {
      const result = detectInstagramUrl('  @artist_name  ');
      expect(result?.type).toBe('profile');
      expect(result?.id).toBe('artist_name');
    });

    it('handles query parameters in profile URLs', () => {
      const result = detectInstagramUrl('https://instagram.com/artist_name?igsh=abc123');
      expect(result?.type).toBe('profile');
      expect(result?.id).toBe('artist_name');
    });
  });
});
