'use client';

import { useEffect, useMemo, useState } from 'react';

import { getFirebaseStatus } from '../lib/firebase/client';

export default function DevDiagnosticsBar() {
  const [open, setOpen] = useState(false);
  const status = useMemo(() => getFirebaseStatus(), []);

  useEffect(() => {
    if (!status.ok) {
      console.warn('[DevDiagnostics] Missing env vars:', status.missing);
    }
  }, [status]);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-2 left-2 z-50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded bg-black/70 px-3 py-1 text-xs text-white shadow"
      >
        {open ? 'Hide' : 'Show'} Dev Diagnostics
      </button>
      {open ? (
        <div className="mt-2 w-[calc(100vw-2rem)] max-w-sm rounded bg-white p-3 text-xs shadow-lg ring-1 ring-gray-200">
          <div className="mb-2 font-semibold">Local Diagnostics</div>
          <div className="mb-1">
            Firebase configured:{' '}
            <span className={status.ok ? 'text-green-600' : 'text-red-600'}>
              {String(status.ok)}
            </span>
          </div>
          <div className="mb-1">Using emulators: {String(status.usingEmulators)}</div>
          {!status.ok ? (
            <div className="mb-2">
              <div className="font-medium">Missing env keys:</div>
              <ul className="list-disc pl-5">
                {status.missing.map((k) => (
                  <li key={k} className="break-all">
                    {k}
                    <button
                      onClick={() => navigator.clipboard.writeText(`${k}=`)}
                      className="ml-2 rounded border px-1 text-[10px]"
                    >
                      copy
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="text-gray-600 dark:text-gray-400">
            Route: {typeof window !== 'undefined' ? window.location.pathname : '/'}
          </div>
        </div>
      ) : null}
    </div>
  );
}
