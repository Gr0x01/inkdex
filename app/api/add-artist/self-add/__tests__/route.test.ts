import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

describe('Self-Add OAuth Redirect', () => {
  it('redirects to Instagram OAuth with correct return path', async () => {
    const request = new NextRequest('http://localhost:3000/api/add-artist/self-add')

    const response = await GET(request)

    // Should be a redirect (307)
    expect(response.status).toBe(307)

    // Should redirect to Instagram OAuth endpoint
    const location = response.headers.get('location')
    expect(location).toBe('http://localhost:3000/api/auth/instagram?redirect=/add-artist/verify')
  })

  it('preserves the origin in redirect URL', async () => {
    const request = new NextRequest('https://inkdex.io/api/add-artist/self-add')

    const response = await GET(request)

    const location = response.headers.get('location')
    expect(location).toBe('https://inkdex.io/api/auth/instagram?redirect=/add-artist/verify')
  })
})
