'use client';

import type { NextWebVitalsMetric } from 'next/app';

const ACCEPTED_METRICS = ['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB'] as const;
type AcceptedMetricName = (typeof ACCEPTED_METRICS)[number];
const ACCEPTED_METRIC_SET = new Set<AcceptedMetricName>(ACCEPTED_METRICS);

const METRIC_UNITS: Record<string, 'millisecond' | 'score'> = {
  CLS: 'score',
  FCP: 'millisecond',
  FID: 'millisecond',
  INP: 'millisecond',
  LCP: 'millisecond',
  TTFB: 'millisecond',
};

const DEFAULT_SAMPLE_RATE = (() => {
  const configured = process.env.NEXT_PUBLIC_WEB_VITAL_SAMPLE_RATE;
  if (configured) {
    const parsed = Number.parseFloat(configured);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) {
      return parsed;
    }
  }
  return process.env.NODE_ENV === 'production' ? 0.3 : 1;
})();

type ConnectionInformation = {
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
  rtt?: number;
};

function getConnection(): ConnectionInformation {
  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
    };
  };

  const connection = nav.connection;
  if (!connection) return {};

  return {
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData,
  };
}

type SupportedWebVitalMetric = NextWebVitalsMetric & {
  label: 'web-vital';
  name: AcceptedMetricName;
  delta: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  navigationType?: string;
};

function isSupportedMetric(metric: NextWebVitalsMetric): metric is SupportedWebVitalMetric {
  return metric.label === 'web-vital' && ACCEPTED_METRIC_SET.has(metric.name as AcceptedMetricName);
}

export function reportWebVital(metric: NextWebVitalsMetric) {
  if (!isSupportedMetric(metric)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[tracker][web-vitals] Ignoring unsupported metric', metric);
    }
    return;
  }

  const sampleRate = DEFAULT_SAMPLE_RATE;
  if (sampleRate <= 0 || Math.random() > sampleRate) {
    return;
  }

  const payload = {
    id: metric.id,
    name: metric.name,
    value: metric.value,
    delta: metric.delta,
    rating: (metric.rating ?? 'unknown').toLowerCase(),
    unit: METRIC_UNITS[metric.name] ?? 'millisecond',
    navigationType: metric.navigationType,
    sampleRate,
    page: window.location.pathname,
    url: window.location.href,
    connection: getConnection(),
    eventTimestamp: Date.now(),
    visibilityState: document.visibilityState,
    isFromSoftNavigation: Boolean((metric as any).isFinal === false && metric.name === 'CLS'),
  };

  const endpoint = '/api/telemetry/web-vitals';
  const body = JSON.stringify(payload);
  const blob = new Blob([body], { type: 'application/json' });

  const sent = navigator.sendBeacon?.(endpoint, blob);
  if (!sent) {
    void fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body,
      keepalive: true,
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[tracker][web-vitals]', payload);
  }
}
