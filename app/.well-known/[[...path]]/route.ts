import { NextResponse } from 'next/server';

// Handle all .well-known requests (Chrome DevTools, security.txt, etc.)
// This prevents them from being caught by dynamic [state]/[city]/[style] routes
export async function GET() {
  return new NextResponse(null, { status: 404 });
}
