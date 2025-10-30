'use client';

import { getLocalized } from '@/lib/i18n/getLocalized';
import type { Rotation } from '@/types/rotations';

type Props = {
  rotations: Rotation[];
  completedRotationIds: string[];
  currentRotationId: string;
  onCompletedChange: (ids: string[]) => void;
  onCurrentChange: (id: string) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  language: 'en' | 'he';
  completedLabel: string;
  currentLabel: string;
};

export default function RotationSelection({
  rotations,
  completedRotationIds,
  currentRotationId,
  onCompletedChange,
  onCurrentChange,
  disabled,
  loading,
  error,
  language,
  completedLabel,
  currentLabel,
}: Props) {
  const errorId = 'rotation-selection-error';

  const handleCompletedToggle = (rotationId: string) => {
    if (completedRotationIds.includes(rotationId)) {
      onCompletedChange(completedRotationIds.filter((id) => id !== rotationId));
    } else {
      onCompletedChange([...completedRotationIds, rotationId]);
    }
  };

  const handleCurrentChange = (rotationId: string) => {
    onCurrentChange(rotationId);
    // Remove from completed list if it was selected there
    if (completedRotationIds.includes(rotationId)) {
      onCompletedChange(completedRotationIds.filter((id) => id !== rotationId));
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="block text-sm font-medium">
          <span suppressHydrationWarning>{currentLabel}</span>
          <span className="text-red-600 ms-1">*</span>
        </label>
        <select
          value={currentRotationId}
          onChange={(e) => handleCurrentChange(e.target.value)}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
          className="input-levitate"
        >
          <option value="">-- {currentLabel} --</option>
          {rotations.map((rotation) => (
            <option key={rotation.id} value={rotation.id}>
              {getLocalized({
                en: rotation.name_en || rotation.name,
                he: rotation.name_he || rotation.name,
                fallback: rotation.name,
                lang: language,
              })}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">
          <span suppressHydrationWarning>{completedLabel}</span>
        </label>
        <div className="max-h-48 overflow-y-auto rounded border border-gray-300 dark:border-gray-600 p-3 space-y-2">
          {loading ? (
            <p className="text-sm text-gray-500">Loading rotations...</p>
          ) : rotations.length === 0 ? (
            <p className="text-sm text-gray-500">No rotations available</p>
          ) : (
            rotations.map((rotation) => (
              <label
                key={rotation.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={completedRotationIds.includes(rotation.id)}
                  onChange={() => handleCompletedToggle(rotation.id)}
                  disabled={disabled || rotation.id === currentRotationId} // Prevent selecting same rotation as both current and completed
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">
                  {getLocalized({
                    en: rotation.name_en || rotation.name,
                    he: rotation.name_he || rotation.name,
                    fallback: rotation.name,
                    lang: language,
                  })}
                  {rotation.id === currentRotationId && (
                    <span className="ms-2 text-xs text-blue-600 dark:text-blue-400">(Current)</span>
                  )}
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      {error ? (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
