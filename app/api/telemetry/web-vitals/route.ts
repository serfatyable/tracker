import { NextResponse, type NextRequest } from 'next/server';

import { captureError } from '../../../../lib/sentry/context';
import {
  recordWebVital,
  snapshotWebVitalAggregates,
  type WebVitalPayload,
} from '../../../../lib/telemetry/webVitals.server';

export const runtime = 'edge';

function isValidPayload(payload: Partial<WebVitalPayload>): payload is WebVitalPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof payload.id === 'string' &&
    typeof payload.name === 'string' &&
    typeof payload.value === 'number' &&
    typeof payload.delta === 'number' &&
    typeof payload.sampleRate === 'number' &&
    typeof payload.page === 'string' &&
    typeof payload.url === 'string' &&
    typeof payload.unit === 'string'
  );
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Partial<WebVitalPayload>;

    if (!isValidPayload(payload)) {
      return NextResponse.json({ ok: false, error: 'invalid-payload' }, { status: 422 });
    }

    recordWebVital(payload, request);

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    captureError(error as Error, { feature: 'web-vitals', stage: 'ingest' });
    return NextResponse.json({ ok: false, error: 'unhandled-error' }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({
    ok: true,
    data: snapshotWebVitalAggregates(),
  });
}
