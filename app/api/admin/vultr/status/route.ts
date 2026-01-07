import { NextResponse } from 'next/server';

const VULTR_STATUS_URL = 'http://66.42.100.208:8080/status';

export async function GET() {
  try {
    const res = await fetch(VULTR_STATUS_URL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Vultr server returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to reach Vultr server: ${message}` },
      { status: 502 }
    );
  }
}
