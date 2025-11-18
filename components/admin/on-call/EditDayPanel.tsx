'use client';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useSaveOnCallDay } from '@/lib/hooks/useSaveOnCallDay';
import { getStationColors } from '@/lib/on-call/stationColors';
import type { StationAssignment, StationKey, StationsMap } from '@/types/onCall';
import Button from '@/components/ui/Button';

import StationAutocomplete from './StationAutocomplete';

interface EditDayPanelProps {
  isOpen: boolean;
  onClose: () => void;
  dateKey: string;
  initialStations: StationsMap;
  onNavigate: (direction: 'prev' | 'next') => void;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  allScheduleData?: Array<{ dateKey: string; stations: StationsMap }>;
}

// All 22 station types grouped by category
const STATION_GROUPS = [
  {
    title: 'Critical Care & ICU',
    stations: ['icu' as StationKey],
  },
  {
    title: 'Operating Rooms',
    stations: [
      'or_main' as StationKey,
      'or_gyne' as StationKey,
      'senior_or' as StationKey,
      'senior_or_half' as StationKey,
    ],
  },
  {
    title: 'Obstetrics & Labor',
    stations: ['labor_delivery' as StationKey],
  },
  {
    title: 'Recovery & PACU',
    stations: ['pacu' as StationKey],
  },
  {
    title: 'Management',
    stations: ['on_call_manager' as StationKey],
  },
  {
    title: 'Orthopedics',
    stations: [
      'ortho_shatzi' as StationKey,
      'ortho_trauma' as StationKey,
      'ortho_joint' as StationKey,
    ],
  },
  {
    title: 'Specialty Services',
    stations: [
      'surgery' as StationKey,
      'urology' as StationKey,
      'vascular_thoracic' as StationKey,
    ],
  },
  {
    title: 'Spine & Pain',
    stations: [
      'spine' as StationKey,
      'spine_injections' as StationKey,
      'pain_service' as StationKey,
    ],
  },
  {
    title: 'Other',
    stations: ['weekly_day_off' as StationKey],
  },
];

const STATION_LABELS: Record<StationKey, string> = {
  or_main: 'OR Main',
  labor_delivery: 'Labor & Delivery',
  icu: 'ICU',
  or_gyne: 'OR Gynecology',
  pacu: 'PACU',
  on_call_manager: 'On-Call Manager',
  senior_or: 'Senior OR',
  senior_or_half: 'Senior OR (Half)',
  ortho_shatzi: 'Ortho Shatzi',
  ortho_trauma: 'Ortho Trauma',
  ortho_joint: 'Ortho Joint',
  surgery: 'Surgery',
  urology: 'Urology',
  spine: 'Spine',
  vascular_thoracic: 'Vascular/Thoracic',
  pain_service: 'Pain Service',
  spine_injections: 'Spine Injections',
  weekly_day_off: 'Weekly Day Off',
};

export default function EditDayPanel({
  isOpen,
  onClose,
  dateKey,
  initialStations,
  onNavigate,
  canNavigatePrev,
  canNavigateNext,
  allScheduleData = [],
}: EditDayPanelProps) {
  const { t, i18n } = useTranslation();
  const [stations, setStations] = useState<StationsMap>(initialStations);
  const [copyFromDate, setCopyFromDate] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const saveOnCallDay = useSaveOnCallDay();

  // Update local state when initialStations change
  useEffect(() => {
    setStations(initialStations);
    setHasChanges(false);
  }, [initialStations, dateKey]);

  // Format date for display
  const formattedDate = useMemo(() => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year!, month! - 1, day!);
    return date.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [dateKey, i18n.language]);

  // Get available dates for "Copy from" dropdown
  const availableDates = useMemo(() => {
    return allScheduleData
      .filter((d) => d.dateKey !== dateKey)
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [allScheduleData, dateKey]);

  const handleStationChange = (stationKey: StationKey, assignment: StationAssignment | null) => {
    setStations((prev) => {
      const updated = { ...prev };
      if (assignment) {
        updated[stationKey] = assignment;
      } else {
        delete updated[stationKey];
      }
      return updated;
    });
    setHasChanges(true);
  };

  const handleCopyFrom = () => {
    if (!copyFromDate) return;

    const sourceDay = allScheduleData.find((d) => d.dateKey === copyFromDate);
    if (sourceDay) {
      setStations(sourceDay.stations);
      setHasChanges(true);
      setCopyFromDate('');
    }
  };

  const handleClearAll = () => {
    if (window.confirm(t('onCall.confirmClearAll', { defaultValue: 'Clear all assignments for this day?' }))) {
      setStations({});
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    try {
      await saveOnCallDay.mutateAsync({
        dateKey,
        stations,
      });
      setHasChanges(false);
      alert(t('onCall.savedSuccessfully', { defaultValue: 'Saved successfully!' }));
    } catch (error: any) {
      alert(t('onCall.saveFailed', { defaultValue: 'Failed to save: ' }) + error.message);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (
        window.confirm(
          t('onCall.confirmClose', {
            defaultValue: 'You have unsaved changes. Are you sure you want to close?',
          }),
        )
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (!isOpen) return;

      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges) {
          handleSave();
        }
      }

      // Ctrl+Left or Cmd+Left for previous day
      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft' && canNavigatePrev) {
        e.preventDefault();
        onNavigate('prev');
      }

      // Ctrl+Right or Cmd+Right for next day
      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight' && canNavigateNext) {
        e.preventDefault();
        onNavigate('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasChanges, canNavigatePrev, canNavigateNext, onNavigate]);

  // Count assigned stations
  const assignedCount = Object.keys(stations).length;
  const totalCount = STATION_GROUPS.reduce((acc, group) => acc + group.stations.length, 0);

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-2xl">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white dark:bg-gray-900 shadow-xl">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Dialog.Title className="text-xl font-semibold text-white">
                            {t('onCall.editDay', { defaultValue: 'Edit On-Call Day' })}
                          </Dialog.Title>
                          <p className="mt-1 text-sm text-blue-100">{formattedDate}</p>
                          <p className="mt-1 text-xs text-blue-200">
                            {assignedCount} / {totalCount} {t('onCall.stationsAssigned', { defaultValue: 'stations assigned' })}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="rounded-md text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                          onClick={handleClose}
                        >
                          <span className="sr-only">Close panel</span>
                          <span className="text-2xl">✕</span>
                        </button>
                      </div>

                      {/* Navigation buttons */}
                      <div className="mt-4 flex gap-2">
                        <Button
                          onClick={() => onNavigate('prev')}
                          disabled={!canNavigatePrev}
                          variant="outline"
                          className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ← {t('ui.previous', { defaultValue: 'Previous' })}
                        </Button>
                        <Button
                          onClick={() => onNavigate('next')}
                          disabled={!canNavigateNext}
                          variant="outline"
                          className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {t('ui.next', { defaultValue: 'Next' })} →
                        </Button>
                      </div>
                    </div>

                    {/* Actions bar */}
                    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-4">
                      <div className="space-y-3">
                        {/* Copy from date */}
                        <div className="flex gap-2">
                          <select
                            value={copyFromDate}
                            onChange={(e) => setCopyFromDate(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                          >
                            <option value="">
                              {t('onCall.copyFromDate', { defaultValue: 'Copy from date...' })}
                            </option>
                            {availableDates.map((d) => (
                              <option key={d.dateKey} value={d.dateKey}>
                                {d.dateKey}
                              </option>
                            ))}
                          </select>
                          <Button
                            onClick={handleCopyFrom}
                            disabled={!copyFromDate}
                            variant="outline"
                            className="whitespace-nowrap"
                          >
                            📋 {t('ui.copy', { defaultValue: 'Copy' })}
                          </Button>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <Button
                            onClick={handleClearAll}
                            variant="outline"
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                          >
                            🗑️ {t('ui.clearAll', { defaultValue: 'Clear All' })}
                          </Button>
                        </div>

                        {/* Keyboard shortcuts hint */}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t('onCall.shortcuts', {
                            defaultValue: 'Shortcuts: Ctrl+S (save), Ctrl+← (prev), Ctrl+→ (next)',
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Station assignments */}
                    <div className="flex-1 overflow-y-auto px-6 py-6">
                      <div className="space-y-6">
                        {STATION_GROUPS.map((group) => (
                          <div key={group.title}>
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                              {group.title}
                            </h3>
                            <div className="space-y-3">
                              {group.stations.map((stationKey) => {
                                const colors = getStationColors(stationKey);
                                return (
                                  <div
                                    key={stationKey}
                                    className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}
                                  >
                                    <label className={`block text-sm font-medium mb-2 ${colors.text}`}>
                                      {STATION_LABELS[stationKey]}
                                    </label>
                                    <StationAutocomplete
                                      value={stations[stationKey] || null}
                                      onChange={(assignment) =>
                                        handleStationChange(stationKey, assignment)
                                      }
                                      placeholder={t('onCall.selectResident', {
                                        defaultValue: 'Select resident...',
                                      })}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-4">
                      <div className="flex gap-3">
                        <Button
                          onClick={handleClose}
                          variant="outline"
                          className="flex-1"
                          disabled={saveOnCallDay.isPending}
                        >
                          {t('ui.cancel', { defaultValue: 'Cancel' })}
                        </Button>
                        <Button
                          onClick={handleSave}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          disabled={!hasChanges || saveOnCallDay.isPending}
                        >
                          {saveOnCallDay.isPending
                            ? t('ui.saving', { defaultValue: 'Saving...' })
                            : t('ui.save', { defaultValue: 'Save' })}
                        </Button>
                      </div>
                      {hasChanges && (
                        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 text-center">
                          {t('onCall.unsavedChanges', { defaultValue: 'You have unsaved changes' })}
                        </p>
                      )}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
