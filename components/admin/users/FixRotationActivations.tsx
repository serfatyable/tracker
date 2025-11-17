'use client';

import { useState } from 'react';

import Button from '../../ui/Button';
import Toast from '../../ui/Toast';

type FixResult = {
  usersScanned?: number;
  usersFixed?: number;
  details?: Array<{ uid: string; fullName: string; rotationId: string }>;
  fixed?: boolean;
  message?: string;
};

export default function FixRotationActivations() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FixResult | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null,
  );

  const handleFixAll = async () => {
    if (
      !confirm(
        'This will scan all residents with approved rotations and create missing active assignments. Continue?',
      )
    ) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/fix-rotation-activations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to fix rotation activations');
      }

      const data: FixResult = await response.json();
      setResult(data);

      if (data.usersFixed && data.usersFixed > 0) {
        setToast({
          message: `Successfully fixed ${data.usersFixed} user(s)`,
          variant: 'success',
        });
      } else {
        setToast({
          message: 'No users needed fixing - all rotation activations are correct',
          variant: 'success',
        });
      }
    } catch (error) {
      console.error('Failed to fix rotation activations:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to fix rotation activations',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Toast
        message={toast?.message || null}
        variant={toast?.variant}
        onClear={() => setToast(null)}
      />

      <div className="card-levitate p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Fix Rotation Activations
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            If residents have approved rotations but cannot work on them, this tool will create the
            missing active assignments.
          </p>
        </div>

        <Button
          onClick={handleFixAll}
          loading={loading}
          className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {loading ? 'Scanning and fixing...' : 'Scan and Fix All Residents'}
        </Button>

        {result && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
            <div className="text-sm">
              <div className="font-medium text-gray-900 dark:text-gray-100">Scan Results:</div>
              {result.usersScanned !== undefined && (
                <div className="text-gray-600 dark:text-gray-400">
                  • Users scanned: {result.usersScanned}
                </div>
              )}
              {result.usersFixed !== undefined && (
                <div className="text-gray-600 dark:text-gray-400">
                  • Users fixed: {result.usersFixed}
                </div>
              )}
            </div>

            {result.details && result.details.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Fixed users:
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.details.map((user) => (
                    <div
                      key={user.uid}
                      className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded"
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {user.fullName}
                      </div>
                      <div className="text-xs">Rotation ID: {user.rotationId}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
