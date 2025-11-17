import type { NextRequest } from 'next/server';

import { captureMessage } from '../sentry/context';

const METRIC_NAMES = ['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB'] as const;
const METRIC_NAME_SET = new Set<string>(METRIC_NAMES);

type MetricName = (typeof METRIC_NAMES)[number];

export type WebVitalPayload = {
  id: string;
  name: MetricName;
  value: number;
  delta: number;
  rating: string;
  unit: 'millisecond' | 'score';
  navigationType?: string;
  sampleRate: number;
  page: string;
  url: string;
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
    downlink?: number;
    rtt?: number;
  };
  eventTimestamp: number;
  visibilityState?: DocumentVisibilityState;
  isFromSoftNavigation?: boolean;
};

type Aggregate = {
  count: number;
  total: number;
  min: number;
  max: number;
  lastValue: number;
  lastUpdatedAt: number;
};

type Aggregates = Record<MetricName, Aggregate>;

declare global {
  var __TRACKER_WEB_VITALS__: Aggregates | undefined;
}

function getAggregates(): Aggregates {
  if (!globalThis.__TRACKER_WEB_VITALS__) {
    globalThis.__TRACKER_WEB_VITALS__ = Object.fromEntries(
      METRIC_NAMES.map((name) => [
        name,
        {
          count: 0,
          total: 0,
          min: Number.POSITIVE_INFINITY,
          max: 0,
          lastValue: 0,
          lastUpdatedAt: 0,
        },
      ]),
    ) as Aggregates;
  }

  return globalThis.__TRACKER_WEB_VITALS__;
}

function updateAggregate(metric: WebVitalPayload) {
  const aggregates = getAggregates();
  const record = aggregates[metric.name];

  record.count += 1;
  record.total += metric.value;
  record.min = Math.min(record.min, metric.value);
  record.max = Math.max(record.max, metric.value);
  record.lastValue = metric.value;
  record.lastUpdatedAt = Date.now();
}

export function recordWebVital(payload: WebVitalPayload, request: NextRequest) {
  if (!METRIC_NAME_SET.has(payload.name)) {
    return;
  }

  updateAggregate(payload);

  captureMessage(`web-vital:${payload.name.toLowerCase()}`, 'info', {
    id: payload.id,
    value: payload.value,
    delta: payload.delta,
    rating: payload.rating,
    unit: payload.unit,
    navigationType: payload.navigationType,
    sampleRate: payload.sampleRate,
    page: payload.page,
    url: payload.url,
    connection: payload.connection,
    visibilityState: payload.visibilityState,
    isFromSoftNavigation: payload.isFromSoftNavigation,
    userAgent: request.headers.get('user-agent'),
    forwardedFor: request.headers.get('x-forwarded-for'),
    host: request.headers.get('host'),
  });
}

export function snapshotWebVitalAggregates(): Aggregates {
  return structuredClone(getAggregates());
}
