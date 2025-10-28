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

interface AssignTutorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tutorId: string, rotationId: string | null) => Promise<void>;
  residentId: string;
  residentName?: string;
  existingTutorIds?: string[];
}

export default function AssignTutorDialog({
  isOpen,
  onClose,
  onConfirm,
  residentId: _residentId,
  residentName,
  existingTutorIds = [],
}: AssignTutorDialogProps) {
  const { t } = useTranslation();
  const [tutors, setTutors] = useState<UserProfile[]>([]);
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTutorId, setSelectedTutorId] = useState('');
  const [selectedRotationId, setSelectedRotationId] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null,
  );

  // Load tutors and rotations
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [tutorsRes, rotationsRes] = await Promise.all([
          listUsers({ role: 'tutor', status: 'active', limit: 100 }),
          listRotations({ limit: 100 }),
        ]);

        // Filter out already assigned tutors
        const availableTutors = tutorsRes.items.filter(
          (tutor) => !existingTutorIds.includes(tutor.uid),
        );

        setTutors(availableTutors);
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
  }, [isOpen, existingTutorIds, t]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedTutorId('');
      setSelectedRotationId('');
      setIsGlobal(false);
    }
  }, [isOpen]);

  const filteredTutors = tutors.filter(
    (tutor) =>
      tutor.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tutor.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSubmit = async () => {
    if (!selectedTutorId) {
      setToast({
        message: t('ui.pleaseSelectTutor', { defaultValue: 'Please select a tutor' }),
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
      await onConfirm(selectedTutorId, isGlobal ? null : selectedRotationId);
      onClose();
    } catch (error) {
      console.error('Failed to assign tutor:', error);
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
              {t('ui.assignTutor', { defaultValue: 'Assign Tutor' })}
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
              {t('ui.assigningTutorFor', {
                defaultValue: 'Assigning tutor for {{residentName}}',
                residentName: residentName || 'Unknown Resident',
              })}
            </div>

            {/* Tutor Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('ui.selectTutor', { defaultValue: 'Select Tutor' })}
              </label>
              <Input
                placeholder={t('ui.searchTutors', { defaultValue: 'Search tutors...' })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
              {loading ? (
                <div className="text-sm text-gray-500">Loading tutors...</div>
              ) : (
                <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                  {filteredTutors.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500 text-center">
                      {searchQuery ? 'No tutors found' : 'No available tutors'}
                    </div>
                  ) : (
                    filteredTutors.map((tutor) => (
                      <button
                        key={tutor.uid}
                        onClick={() => setSelectedTutorId(tutor.uid)}
                        className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                          selectedTutorId === tutor.uid ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                        }`}
                      >
                        <div className="font-medium text-sm">{tutor.fullName}</div>
                        <div className="text-xs text-gray-500">{tutor.email}</div>
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
              disabled={!selectedTutorId || (!isGlobal && !selectedRotationId)}
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
