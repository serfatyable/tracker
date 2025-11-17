'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { MorningMeeting } from '../../../types/morningMeetings';

import Button from '../../ui/Button';
import Input from '../../ui/Input';

interface EditMeetingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meeting: Partial<MorningMeeting> & { id?: string }) => Promise<void>;
  meeting?: MorningMeeting | null; // null = creating new meeting
  suggestions?: {
    lecturers: string[];
    moderators: string[];
    organizers: string[];
    users: Array<{ uid: string; fullName: string; email: string }>;
  };
}

export default function EditMeetingPanel({
  isOpen,
  onClose,
  onSave,
  meeting,
  suggestions,
}: EditMeetingPanelProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('07:10');
  const [duration, setDuration] = useState(40);
  const [lecturer, setLecturer] = useState('');
  const [moderator, setModerator] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');

  // Autocomplete state
  const [lecturerFocused, setLecturerFocused] = useState(false);
  const [moderatorFocused, setModeratorFocused] = useState(false);
  const [organizerFocused, setOrganizerFocused] = useState(false);

  // Initialize form with meeting data
  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title || '');

      const meetingDate = meeting.date?.toDate();
      if (meetingDate) {
        // Format date as YYYY-MM-DD
        const year = meetingDate.getFullYear();
        const month = String(meetingDate.getMonth() + 1).padStart(2, '0');
        const day = String(meetingDate.getDate()).padStart(2, '0');
        setDate(`${year}-${month}-${day}`);

        // Format time as HH:MM
        const hours = String(meetingDate.getHours()).padStart(2, '0');
        const minutes = String(meetingDate.getMinutes()).padStart(2, '0');
        setTime(`${hours}:${minutes}`);
      }

      // Calculate duration from endDate
      if (meeting.endDate && meeting.date) {
        const durationMs = meeting.endDate.toMillis() - meeting.date.toMillis();
        setDuration(Math.round(durationMs / (60 * 1000)));
      }

      setLecturer(meeting.lecturer || '');
      setModerator(meeting.moderator || '');
      setOrganizer(meeting.organizer || '');
      setLink(meeting.link || '');
      setNotes(meeting.notes || '');
    } else {
      // Reset form for new meeting
      setTitle('');
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      setDate(`${year}-${month}-${day}`);
      setTime('07:10');
      setDuration(40);
      setLecturer('');
      setModerator('');
      setOrganizer('');
      setLink('');
      setNotes('');
    }
    setError(null);
  }, [meeting, isOpen]);

  // Close panel on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Merge all suggestions for autocomplete
  const allLecturerSuggestions = useMemo(() => {
    const names = new Set<string>();
    suggestions?.lecturers.forEach((l) => names.add(l));
    suggestions?.users.forEach((u) => names.add(u.fullName));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [suggestions]);

  const allModeratorSuggestions = useMemo(() => {
    const names = new Set<string>();
    suggestions?.moderators.forEach((m) => names.add(m));
    suggestions?.users.forEach((u) => names.add(u.fullName));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [suggestions]);

  const allOrganizerSuggestions = useMemo(() => {
    const names = new Set<string>();
    suggestions?.organizers.forEach((o) => names.add(o));
    suggestions?.users.forEach((u) => names.add(u.fullName));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [suggestions]);

  // Filter suggestions based on input
  const filteredLecturers = useMemo(
    () =>
      allLecturerSuggestions.filter((s) => s.toLowerCase().includes(lecturer.toLowerCase())),
    [allLecturerSuggestions, lecturer],
  );

  const filteredModerators = useMemo(
    () =>
      allModeratorSuggestions.filter((s) => s.toLowerCase().includes(moderator.toLowerCase())),
    [allModeratorSuggestions, moderator],
  );

  const filteredOrganizers = useMemo(
    () =>
      allOrganizerSuggestions.filter((s) => s.toLowerCase().includes(organizer.toLowerCase())),
    [allOrganizerSuggestions, organizer],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!title.trim()) {
      setError(t('morningMeetings.edit.errorTitleRequired', { defaultValue: 'Title is required' }));
      return;
    }
    if (!date) {
      setError(t('morningMeetings.edit.errorDateRequired', { defaultValue: 'Date is required' }));
      return;
    }

    setSaving(true);

    try {
      // Parse date and time
      const [hours, minutes] = time.split(':').map(Number);
      const meetingDate = new Date(date);
      meetingDate.setHours(hours!, minutes!, 0, 0);

      // Calculate end date
      const endDate = new Date(meetingDate.getTime() + duration * 60 * 1000);

      const updatedMeeting: Partial<MorningMeeting> & { id?: string } = {
        title: title.trim(),
        date: meetingDate as any, // Will be converted to Timestamp in API
        endDate: endDate as any,
        lecturer: lecturer.trim() || undefined,
        moderator: moderator.trim() || undefined,
        organizer: organizer.trim() || undefined,
        link: link.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (meeting?.id) {
        updatedMeeting.id = meeting.id;
      }

      await onSave(updatedMeeting);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('morningMeetings.edit.errorSaveFailed', { defaultValue: 'Failed to save meeting' }),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 h-full w-full sm:w-[600px] bg-white dark:bg-[rgb(var(--surface))] shadow-2xl z-50 overflow-y-auto transform transition-transform"
        style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div className="sticky top-0 z-10 bg-white dark:bg-[rgb(var(--surface))] border-b border-gray-200 dark:border-[rgb(var(--border))] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {meeting
                ? t('morningMeetings.edit.titleEdit', { defaultValue: 'Edit Meeting' })
                : t('morningMeetings.edit.titleNew', { defaultValue: 'New Meeting' })}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Title (Required) */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('morningMeetings.edit.labelTitle', { defaultValue: 'Title' })}{' '}
              <span className="text-red-500">*</span>
            </label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('morningMeetings.edit.placeholderTitle', {
                defaultValue: 'Meeting topic',
              })}
              required
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('morningMeetings.edit.labelDate', { defaultValue: 'Date' })}{' '}
                <span className="text-red-500">*</span>
              </label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('morningMeetings.edit.labelTime', { defaultValue: 'Time' })}
              </label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('morningMeetings.edit.labelDuration', { defaultValue: 'Duration (minutes)' })}
            </label>
            <Input
              id="duration"
              type="number"
              min={1}
              max={480}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>

          {/* Lecturer with Autocomplete */}
          <div className="relative">
            <label htmlFor="lecturer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('morningMeetings.lecturer', { defaultValue: 'Lecturer' })}
            </label>
            <Input
              id="lecturer"
              type="text"
              value={lecturer}
              onChange={(e) => setLecturer(e.target.value)}
              onFocus={() => setLecturerFocused(true)}
              onBlur={() => setTimeout(() => setLecturerFocused(false), 200)}
              placeholder={t('morningMeetings.edit.placeholderLecturer', {
                defaultValue: 'Type to search or enter new name',
              })}
            />
            {lecturerFocused && filteredLecturers.length > 0 && lecturer && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[rgb(var(--surface-elevated))] border border-gray-200 dark:border-[rgb(var(--border))] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredLecturers.slice(0, 10).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setLecturer(suggestion);
                      setLecturerFocused(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-[rgb(var(--surface-hover))] text-sm text-gray-900 dark:text-gray-100"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Moderator with Autocomplete */}
          <div className="relative">
            <label htmlFor="moderator" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('morningMeetings.moderator', { defaultValue: 'Moderator' })}
            </label>
            <Input
              id="moderator"
              type="text"
              value={moderator}
              onChange={(e) => setModerator(e.target.value)}
              onFocus={() => setModeratorFocused(true)}
              onBlur={() => setTimeout(() => setModeratorFocused(false), 200)}
              placeholder={t('morningMeetings.edit.placeholderModerator', {
                defaultValue: 'Type to search or enter new name',
              })}
            />
            {moderatorFocused && filteredModerators.length > 0 && moderator && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[rgb(var(--surface-elevated))] border border-gray-200 dark:border-[rgb(var(--border))] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredModerators.slice(0, 10).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setModerator(suggestion);
                      setModeratorFocused(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-[rgb(var(--surface-hover))] text-sm text-gray-900 dark:text-gray-100"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Organizer with Autocomplete */}
          <div className="relative">
            <label htmlFor="organizer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('morningMeetings.organizer', { defaultValue: 'Organizer' })}
            </label>
            <Input
              id="organizer"
              type="text"
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              onFocus={() => setOrganizerFocused(true)}
              onBlur={() => setTimeout(() => setOrganizerFocused(false), 200)}
              placeholder={t('morningMeetings.edit.placeholderOrganizer', {
                defaultValue: 'Type to search or enter new name',
              })}
            />
            {organizerFocused && filteredOrganizers.length > 0 && organizer && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[rgb(var(--surface-elevated))] border border-gray-200 dark:border-[rgb(var(--border))] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredOrganizers.slice(0, 10).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setOrganizer(suggestion);
                      setOrganizerFocused(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-[rgb(var(--surface-hover))] text-sm text-gray-900 dark:text-gray-100"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Link */}
          <div>
            <label htmlFor="link" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('morningMeetings.edit.labelLink', { defaultValue: 'Meeting Link' })}
            </label>
            <Input
              id="link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('morningMeetings.edit.labelNotes', { defaultValue: 'Notes' })}
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[rgb(var(--border))] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-[rgb(var(--surface-elevated))] dark:text-gray-100"
              placeholder={t('morningMeetings.edit.placeholderNotes', {
                defaultValue: 'Additional information',
              })}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-[rgb(var(--border))]">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="flex-1">
              {t('ui.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving
                ? t('common.saving', { defaultValue: 'Saving...' })
                : meeting
                  ? t('ui.save', { defaultValue: 'Save' })
                  : t('ui.create', { defaultValue: 'Create' })}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
