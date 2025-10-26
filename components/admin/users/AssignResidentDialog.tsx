'use client';

import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { listUsers, listRotations } from '../../../lib/firebase/admin';
import type { UserProfile } from '../../../types/auth';
import type { Rotation } from '../../../types/rotations';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Toast from '../../ui/Toast';

interface AssignResidentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (residentId: string, rotationId: string | null) => Promise<void>;
  tutorId: string;
  tutorName?: string;
  existingResidentIds?: string[];
}

export default function AssignResidentDialog({
  isOpen,
  onClose,
  onConfirm,
  tutorId: _tutorId,
  tutorName,
  existingResidentIds = [],
}: AssignResidentDialogProps) {
  const { t } = useTranslation();
  const [residents, setResidents] = useState<UserProfile[]>([]);
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [selectedRotationId, setSelectedRotationId] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null,
  );

  // Load residents and rotations
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [residentsRes, rotationsRes] = await Promise.all([
          listUsers({ role: 'resident', status: 'active', limit: 100 }),
          listRotations({ status: 'active', limit: 100 }),
        ]);

        // Filter out already assigned residents (simplified - in real app would check actual assignments)
        const availableResidents = residentsRes.items.filter(
          (resident) => !existingResidentIds.includes(resident.uid),
        );

        setResidents(availableResidents);
        setRotations(rotationsRes.items);
      } catch (error) {
        console.error('Failed to load data:', error);
        setToast({
          message: t('ui.operationFailed'),
          variant: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, existingResidentIds, t]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedResidentId('');
      setSelectedRotationId('');
      setIsGlobal(false);
    }
  }, [isOpen]);

  const filteredResidents = residents.filter(
    (resident) =>
      resident.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resident.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSubmit = async () => {
    if (!selectedResidentId) {
      setToast({
        message: t('ui.pleaseSelectResident', { defaultValue: 'Please select a resident' }),
        variant: 'error',
      });
      return;
    }

    if (!isGlobal && !selectedRotationId) {
      setToast({
        message: t('ui.pleaseSelectRotation', { defaultValue: 'Please select a rotation' }),
        variant: 'error',
      });
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm(selectedResidentId, isGlobal ? null : selectedRotationId);
      onClose();
    } catch (error) {
      console.error('Failed to assign resident:', error);
      setToast({
        message: t('ui.operationFailed'),
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Toast
        message={toast?.message || null}
        variant={toast?.variant}
        onClear={() => setToast(null)}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('ui.assignResident', { defaultValue: 'Assign Resident' })}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('ui.assigningResidentFor', {
                defaultValue: 'Assigning resident for {{tutorName}}',
                tutorName: tutorName || 'Unknown Tutor',
              })}
            </div>

            {/* Resident Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('ui.selectResident', { defaultValue: 'Select Resident' })}
              </label>
              <Input
                placeholder={t('ui.searchResidents', { defaultValue: 'Search residents...' })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
              {loading ? (
                <div className="text-sm text-gray-500">Loading residents...</div>
              ) : (
                <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                  {filteredResidents.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500 text-center">
                      {searchQuery ? 'No residents found' : 'No available residents'}
                    </div>
                  ) : (
                    filteredResidents.map((resident) => (
                      <button
                        key={resident.uid}
                        onClick={() => setSelectedResidentId(resident.uid)}
                        className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                          selectedResidentId === resident.uid
                            ? 'bg-blue-50 dark:bg-blue-900/30'
                            : ''
                        }`}
                      >
                        <div className="font-medium text-sm">{resident.fullName}</div>
                        <div className="text-xs text-gray-500">{resident.email}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Assignment Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('ui.assignmentType', { defaultValue: 'Assignment Type' })}
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={isGlobal}
                    onChange={() => setIsGlobal(true)}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    {t('ui.globalAssignment', { defaultValue: 'Global Assignment' })}
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!isGlobal}
                    onChange={() => setIsGlobal(false)}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    {t('ui.rotationSpecific', { defaultValue: 'Rotation Specific' })}
                  </span>
                </label>
              </div>
            </div>

            {/* Rotation Selection (if not global) */}
            {!isGlobal && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('ui.selectRotation', { defaultValue: 'Select Rotation' })}
                </label>
                <Select
                  value={selectedRotationId}
                  onChange={(e) => setSelectedRotationId(e.target.value)}
                  className="w-full"
                >
                  <option value="" disabled>
                    {t('ui.selectRotation', { defaultValue: 'Select Rotation' })}
                  </option>
                  {rotations.map((rotation) => (
                    <option key={rotation.id} value={rotation.id}>
                      {rotation.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              {t('ui.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              loading={submitting}
              disabled={!selectedResidentId || (!isGlobal && !selectedRotationId)}
              className="btn-levitate border-blue-500 text-blue-700 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-300 dark:hover:bg-blue-900/30"
            >
              <CheckIcon className="w-4 h-4 mr-2" />
              {t('ui.assign', { defaultValue: 'Assign' })}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
