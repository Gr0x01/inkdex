import { NextRequest, NextResponse } from 'next/server';

const VULTR_CONTROL_URL = 'http://66.42.100.208:8080/control';
const VULTR_AUTH_TOKEN = 'inkdex-vultr-2026-xK9mP2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be start, stop, or restart' },
        { status: 400 }
      );
    }

    const res = await fetch(VULTR_CONTROL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VULTR_AUTH_TOKEN}`,
      },
      body: JSON.stringify({ action }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return NextResponse.json(
        { error: data.error || 'Control action failed' },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to reach Vultr server: ${message}` },
      { status: 502 }
    );
  }
}
