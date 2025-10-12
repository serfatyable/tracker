'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="glass-card max-w-lg w-full p-4">
            <h2 className="text-lg font-semibold mb-2">App crashed</h2>
            <p className="text-sm text-gray-700 break-words mb-4">
              {error?.message || 'Unexpected error'}
            </p>
            <div className="flex gap-2 justify-end">
              <button className="btn-levitate" onClick={() => reset()}>
                Reload
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
