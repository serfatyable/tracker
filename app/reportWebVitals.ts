import type { NextWebVitalsMetric } from 'next/app';

import { reportWebVital } from '../lib/telemetry/webVitals';

export function reportWebVitals(metric: NextWebVitalsMetric) {
  reportWebVital(metric);
}
