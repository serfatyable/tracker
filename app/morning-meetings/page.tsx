'use client';
import Link from 'next/link';
import type { ReactElement, ReactNode } from 'react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import AppShell from '../../components/layout/AppShell';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Toast from '../../components/ui/Toast';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import {
  useMorningMeetingsMultiMonth,
  useMorningMeetingsUpcoming,
} from '../../lib/hooks/useMorningClasses';
import { buildIcsCalendar, simpleHash } from '../../lib/ics/buildMorningMeetingsIcs';
import { createSynonymMatcher } from '../../lib/search/synonyms';
import { trackMorningMeetingEvent } from '../../lib/telemetry';
import { updateMorningMeetingReminderOptIn } from '../../lib/users/updateMorningMeetingReminder';
import { haptic } from '../../lib/utils/haptics';
import { getLocalStorageItem, setLocalStorageItem } from '../../lib/utils/localStorage';
import type { UserProfile } from '../../types/auth';
import type { MorningMeeting } from '../../types/morningMeetings';
// Header composed inline for precise alignment

export default function MorningMeetingsPage(): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: currentUser, refetch: refetchProfile } = useCurrentUserProfile();
  const [searchTerm, setSearchTerm] = useState('');
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const { meetingsByMonth, loading } = useMorningMeetingsMultiMonth(6);
  const { today, tomorrow, next7, loading: upcomingLoading } = useMorningMeetingsUpcoming();
  const [toast, setToast] = useState<{
    message: string;
    variant?: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);
  const [completedMeetings, setCompletedMeetings] = useState<Record<string, number>>(() =>
    getLocalStorageItem('morningMeetings:completed', {} as Record<string, number>),
  );
  const [roleFilters, setRoleFilters] = useState<{
    lecturer: string | null;
    moderator: string | null;
    organizer: string | null;
  }>({ lecturer: null, moderator: null, organizer: null });
  const [viewPreset, setViewPreset] = useState<'all' | 'mine' | 'week'>('all');
  const [meetingReminders, setMeetingReminders] = useState<Record<string, number>>(() =>
    getLocalStorageItem('morningMeetings:reminders', {} as Record<string, number>),
  );
  const [reminderOptIn, setReminderOptIn] = useState<boolean>(
    currentUser?.settings?.morningMeetings?.reminderOptIn ?? false,
  );
  const [reminderSaving, setReminderSaving] = useState(false);
  const [adminExportMeta, setAdminExportMeta] = useState<{
    lastIcs?: number | null;
    lastCsv?: number | null;
  }>(() =>
    getLocalStorageItem('morningMeetings:adminExports', {
      lastIcs: null,
      lastCsv: null,
    } as { lastIcs?: number | null; lastCsv?: number | null }),
  );

  useEffect(() => {
    setLocalStorageItem('morningMeetings:completed', completedMeetings);
  }, [completedMeetings]);

  useEffect(() => {
    setLocalStorageItem('morningMeetings:reminders', meetingReminders);
  }, [meetingReminders]);

  useEffect(() => {
    setLocalStorageItem('morningMeetings:adminExports', adminExportMeta);
  }, [adminExportMeta]);

  useEffect(() => {
    setReminderOptIn(currentUser?.settings?.morningMeetings?.reminderOptIn ?? false);
  }, [currentUser?.settings?.morningMeetings?.reminderOptIn]);

  const upcomingMeetingEntry = useMemo(() => {
    if (today && today.length > 0) return { meeting: today[0]!, bucket: 'today' as const };
    if (tomorrow && tomorrow.length > 0)
      return { meeting: tomorrow[0]!, bucket: 'tomorrow' as const };
    if (next7 && next7.length > 0) return { meeting: next7[0]!, bucket: 'next7' as const };
    return null;
  }, [next7, today, tomorrow]);

  const upcomingMeeting = upcomingMeetingEntry?.meeting ?? null;
  const upcomingMeetingKey = upcomingMeeting
    ? (upcomingMeeting.id ?? upcomingMeeting.dateKey)
    : null;
  const upcomingCompleted = upcomingMeetingKey
    ? Boolean(completedMeetings[upcomingMeetingKey])
    : false;

  const isUpcomingMeetingLecturer = useMemo(
    () => isUserLecturerForMeeting(currentUser, upcomingMeeting),
    [currentUser, upcomingMeeting],
  );

  const heroCopy = useMemo(() => {
    if (currentUser?.role === 'admin') {
      return {
        heading:
          t('morningMeetings.hero.adminHeading', {
            defaultValue: 'Coordinate the morning briefing schedule',
          }) || 'Coordinate the morning briefing schedule',
        subtitle:
          t('morningMeetings.hero.adminSubtitle', {
            defaultValue: 'Review presenters, share the agenda, and export the calendar feed.',
          }) || 'Review presenters, share the agenda, and export the calendar feed.',
      } as const;
    }
    if (isUpcomingMeetingLecturer) {
      return {
        heading:
          t('morningMeetings.hero.lecturerHeading', {
            defaultValue: "You're presenting soon",
          }) || "You're presenting soon",
        subtitle:
          t('morningMeetings.hero.lecturerSubtitle', {
            defaultValue: 'Double-check your slides, timing, and meeting link before you go live.',
          }) || 'Double-check your slides, timing, and meeting link before you go live.',
      } as const;
    }
    if (currentUser?.role === 'tutor') {
      return {
        heading:
          t('morningMeetings.hero.tutorHeading', {
            defaultValue: 'Support the upcoming sessions',
          }) || 'Support the upcoming sessions',
        subtitle:
          t('morningMeetings.hero.tutorSubtitle', {
            defaultValue: 'Share updates with residents and ensure every lecturer is ready to go.',
          }) || 'Share updates with residents and ensure every lecturer is ready to go.',
      } as const;
    }
    return {
      heading:
        t('morningMeetings.hero.defaultHeading', {
          defaultValue: 'Stay current on the morning meetings schedule',
        }) || 'Stay current on the morning meetings schedule',
      subtitle:
        t('morningMeetings.hero.defaultSubtitle', {
          defaultValue: 'Track upcoming presenters and quickly access meeting details.',
        }) || 'Track upcoming presenters and quickly access meeting details.',
    } as const;
  }, [currentUser?.role, isUpcomingMeetingLecturer, t]);

  const upcomingLabel = useMemo(() => {
    if (!upcomingMeetingEntry) return null;
    const labelKey = {
      today: 'morningMeetings.hero.todayLabel',
      tomorrow: 'morningMeetings.hero.tomorrowLabel',
      next7: 'morningMeetings.hero.soonLabel',
    }[upcomingMeetingEntry.bucket];
    return (
      t(labelKey, {
        defaultValue:
          upcomingMeetingEntry.bucket === 'today'
            ? 'Today'
            : upcomingMeetingEntry.bucket === 'tomorrow'
              ? 'Tomorrow'
              : 'Coming up',
      }) ||
      (upcomingMeetingEntry.bucket === 'today'
        ? 'Today'
        : upcomingMeetingEntry.bucket === 'tomorrow'
          ? 'Tomorrow'
          : 'Coming up')
    );
  }, [t, upcomingMeetingEntry]);

  const scrollToDay = useCallback(
    (targetDate: Date) => {
      const element = document.getElementById(`day-${targetDate.getDate()}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        element.classList.add('ring-2', 'ring-blue-500/80', 'rounded-lg');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-blue-500/80', 'rounded-lg');
        }, 2000);
      } else {
        setToast({
          message:
            t('morningMeetings.hero.noTodayAnchor', {
              defaultValue: 'There is no session anchored for today yet.',
            }) || 'There is no session anchored for today yet.',
          variant: 'info',
        });
      }
    },
    [t],
  );

  const handleJumpToToday = useCallback(() => {
    haptic('light');
    scrollToDay(new Date());
    trackMorningMeetingEvent('hero_action', { action: 'jump_to_today' });
  }, [scrollToDay]);

  const handleCopyLink = useCallback(async () => {
    if (!upcomingMeeting?.link) {
      setToast({
        message:
          t('morningMeetings.hero.noLink', {
            defaultValue: 'No meeting link available yet.',
          }) || 'No meeting link available yet.',
        variant: 'warning',
      });
      haptic('error');
      return;
    }
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        throw new Error('Clipboard not available');
      }
      await navigator.clipboard.writeText(upcomingMeeting.link);
      trackMorningMeetingEvent('hero_action', {
        action: 'copy_link',
        status: 'success',
        meetingId: upcomingMeetingKey,
      });
      setToast({
        message:
          t('morningMeetings.hero.copySuccess', {
            defaultValue: 'Meeting link copied to clipboard.',
          }) || 'Meeting link copied to clipboard.',
        variant: 'success',
      });
      haptic('success');
    } catch (error) {
      console.error('Failed to copy meeting link', error);
      trackMorningMeetingEvent('hero_action', {
        action: 'copy_link',
        status: 'error',
        meetingId: upcomingMeetingKey,
      });
      setToast({
        message:
          t('morningMeetings.hero.copyError', {
            defaultValue: 'Unable to copy the meeting link. Try again or copy manually.',
          }) || 'Unable to copy the meeting link. Try again or copy manually.',
        variant: 'error',
      });
      haptic('error');
    }
  }, [t, upcomingMeeting, upcomingMeetingKey]);

  const handleMarkComplete = useCallback(() => {
    if (!upcomingMeetingKey || upcomingCompleted) return;
    haptic('success');
    setCompletedMeetings((prev) => ({ ...prev, [upcomingMeetingKey]: Date.now() }));
    trackMorningMeetingEvent('hero_action', {
      action: 'mark_complete',
      meetingId: upcomingMeetingKey,
      bucket: upcomingMeetingEntry?.bucket,
    });
    setToast({
      message:
        t('morningMeetings.hero.markedComplete', {
          defaultValue: 'Marked complete. Great job!',
        }) || 'Marked complete. Great job!',
      variant: 'success',
    });
  }, [t, upcomingCompleted, upcomingMeetingEntry?.bucket, upcomingMeetingKey]);

  const handleCalendarExportClick = useCallback(
    (type: 'personal' | 'all') => {
      trackMorningMeetingEvent('hero_calendar_export', { type });
      if (currentUser?.role === 'admin') {
        setAdminExportMeta((prev) => ({ ...prev, lastIcs: Date.now() }));
      }
      haptic('light');
    },
    [currentUser?.role],
  );

  const handleReminderOptInToggle = useCallback(
    async (enabled: boolean) => {
      if (!currentUser) {
        setToast({
          message:
            t('morningMeetings.hero.reminderAuth', {
              defaultValue: 'Sign in to manage reminders.',
            }) || 'Sign in to manage reminders.',
          variant: 'info',
        });
        return;
      }

      try {
        setReminderSaving(true);
        await updateMorningMeetingReminderOptIn(currentUser.uid, enabled);
        setReminderOptIn(enabled);
        trackMorningMeetingEvent('reminder_toggle', {
          location: 'hero',
          enabled,
        });
        if (enabled) {
          haptic('success');
        } else {
          haptic('light');
        }
        setToast({
          message: enabled
            ? t('morningMeetings.hero.reminderOn', {
                defaultValue: 'Reminder enabled. We will nudge you the day before you present.',
              }) || 'Reminder enabled. We will nudge you the day before you present.'
            : t('morningMeetings.hero.reminderOff', {
                defaultValue: 'Reminder disabled. You can enable it again anytime.',
              }) || 'Reminder disabled. You can enable it again anytime.',
          variant: 'success',
        });
        await refetchProfile();
      } catch (error) {
        console.error('Failed to update morning meeting reminder', error);
        haptic('error');
        setToast({
          message:
            t('morningMeetings.hero.reminderError', {
              defaultValue: 'Unable to update reminders right now. Try again in a moment.',
            }) || 'Unable to update reminders right now. Try again in a moment.',
          variant: 'error',
        });
      } finally {
        setReminderSaving(false);
      }
    },
    [currentUser, refetchProfile, t],
  );

  const handleToggleMeetingReminder = useCallback(
    (meeting: MorningMeeting) => {
      const key = getMeetingKey(meeting);
      const enabled = Boolean(meetingReminders[key]);
      setMeetingReminders((prev) => {
        const next = { ...prev };
        if (enabled) {
          delete next[key];
        } else {
          next[key] = Date.now();
        }
        return next;
      });
      trackMorningMeetingEvent('card_reminder_toggle', {
        meetingId: key,
        enabled: !enabled,
      });
      if (enabled) {
        haptic('light');
        setToast({
          message:
            t('morningMeetings.card.reminderCleared', {
              defaultValue: 'Reminder removed for this meeting.',
            }) || 'Reminder removed for this meeting.',
          variant: 'info',
        });
      } else {
        haptic('success');
        setToast({
          message:
            t('morningMeetings.card.reminderSet', {
              defaultValue: 'Reminder saved for this meeting.',
            }) || 'Reminder saved for this meeting.',
          variant: 'success',
        });
      }
    },
    [meetingReminders, t],
  );

  const handleAddMeetingToCalendar = useCallback(
    (meeting: MorningMeeting) => {
      try {
        const start = meeting.date.toDate();
        const end = meeting.endDate?.toDate() ?? new Date(start.getTime() + 40 * 60 * 1000);
        const descriptionParts = [meeting.notes].filter(Boolean);
        if (meeting.lecturer) {
          descriptionParts.push(`Lecturer: ${meeting.lecturer}`);
        }
        if (meeting.moderator) {
          descriptionParts.push(`Moderator: ${meeting.moderator}`);
        }
        if (meeting.organizer) {
          descriptionParts.push(`Organizer: ${meeting.organizer}`);
        }
        const ics = buildIcsCalendar(meeting.title, [
          {
            uid: `morning-meeting:${meeting.dateKey}:${simpleHash(meeting.title ?? meeting.dateKey)}`,
            title: meeting.title,
            description: descriptionParts.join(' \n'),
            url: meeting.link,
            start,
            end,
          },
        ]);
        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = `${buildMeetingSlug(meeting)}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
        haptic('success');
        setToast({
          message:
            t('morningMeetings.card.calendarSaved', {
              defaultValue: 'Calendar event downloaded.',
            }) || 'Calendar event downloaded.',
          variant: 'success',
        });
        trackMorningMeetingEvent('card_add_to_calendar', {
          meetingId: getMeetingKey(meeting),
        });
      } catch (error) {
        console.error('Failed to build ICS file', error);
        haptic('error');
        setToast({
          message:
            t('morningMeetings.card.calendarError', {
              defaultValue: 'Unable to download the calendar event right now.',
            }) || 'Unable to download the calendar event right now.',
          variant: 'error',
        });
      }
    },
    [t],
  );

  const handleCopyAgendaLink = useCallback(
    async (meeting: MorningMeeting) => {
      if (!meeting.link) {
        setToast({
          message:
            t('morningMeetings.card.noLink', {
              defaultValue: 'No agenda link has been added yet.',
            }) || 'No agenda link has been added yet.',
          variant: 'warning',
        });
        haptic('error');
        return;
      }
      try {
        if (typeof navigator === 'undefined' || !navigator.clipboard) {
          throw new Error('Clipboard unavailable');
        }
        await navigator.clipboard.writeText(meeting.link);
        haptic('success');
        setToast({
          message:
            t('morningMeetings.card.linkCopied', {
              defaultValue: 'Agenda link copied to clipboard.',
            }) || 'Agenda link copied to clipboard.',
          variant: 'success',
        });
        trackMorningMeetingEvent('card_copy_link', {
          meetingId: getMeetingKey(meeting),
        });
      } catch (error) {
        console.error('Failed to copy agenda link', error);
        haptic('error');
        setToast({
          message:
            t('morningMeetings.card.linkCopyError', {
              defaultValue: 'Unable to copy the agenda link. Try again later.',
            }) || 'Unable to copy the agenda link. Try again later.',
          variant: 'error',
        });
      }
    },
    [t],
  );

  const handleAdminCsvExport = useCallback(() => {
    if (!allMeetings.length) {
      setToast({
        message:
          t('morningMeetings.admin.noMeetings', {
            defaultValue: 'There are no meetings to export yet.',
          }) || 'There are no meetings to export yet.',
        variant: 'info',
      });
      return;
    }
    const header = ['Date', 'Start', 'End', 'Title', 'Lecturer', 'Moderator', 'Organizer', 'Notes'];
    const rows = allMeetings
      .slice()
      .sort((a, b) => a.date.toMillis() - b.date.toMillis())
      .map((meeting) => {
        const start = meeting.date.toDate();
        const end = meeting.endDate?.toDate() ?? new Date(start.getTime() + 40 * 60 * 1000);
        return [
          meeting.dateKey,
          start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
          end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
          sanitizeCsvValue(meeting.title),
          sanitizeCsvValue(meeting.lecturer),
          sanitizeCsvValue(meeting.moderator),
          sanitizeCsvValue(meeting.organizer),
          sanitizeCsvValue(meeting.notes),
        ];
      });
    const csvContent = [header, ...rows]
      .map((columns) => columns.map((value) => `"${value ?? ''}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'morning-meetings-export.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
    setAdminExportMeta((prev) => ({ ...prev, lastCsv: Date.now() }));
    haptic('success');
    setToast({
      message:
        t('morningMeetings.admin.csvSuccess', {
          defaultValue: 'CSV export downloaded.',
        }) || 'CSV export downloaded.',
      variant: 'success',
    });
    trackMorningMeetingEvent('admin_export', {
      format: 'csv',
      total: allMeetings.length,
    });
  }, [allMeetings, locale, t]);

  const handleViewPresetChange = useCallback((preset: 'all' | 'mine' | 'week') => {
    setViewPreset(preset);
    trackMorningMeetingEvent('filter_view_preset', { preset });
    haptic('light');
  }, []);

  const handleRoleFilterToggle = useCallback(
    (role: 'lecturer' | 'moderator' | 'organizer', value: string) => {
      setRoleFilters((prev) => {
        const nextValue = prev[role] === value ? null : value;
        const next = { ...prev, [role]: nextValue } as typeof prev;
        trackMorningMeetingEvent('filter_role_toggle', {
          role,
          value,
          enabled: Boolean(nextValue),
        });
        return next;
      });
      haptic('light');
    },
    [],
  );

  const handleClearFilters = useCallback(() => {
    setRoleFilters({ lecturer: null, moderator: null, organizer: null });
    setViewPreset('all');
    trackMorningMeetingEvent('filter_clear', {});
    haptic('light');
  }, []);

  const handleMonthSelectChange = useCallback((monthKey: string) => {
    setSelectedMonth(monthKey);
    trackMorningMeetingEvent('month_select', { monthKey });
    haptic('light');
  }, []);

  const locale = useMemo(() => (i18n.language === 'he' ? 'he-IL' : 'en-US'), [i18n.language]);

  const monthMeetings = useMemo(
    () => meetingsByMonth.get(selectedMonth) ?? [],
    [meetingsByMonth, selectedMonth],
  );

  const allMeetings = useMemo(() => Array.from(meetingsByMonth.values()).flat(), [meetingsByMonth]);

  const weekBounds = useMemo(() => {
    const start = startOfWeek(now);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }, [now]);

  const weeklyMeetings = useMemo(
    () =>
      allMeetings.filter((meeting) => {
        const date = meeting.date.toDate();
        return date >= weekBounds.start && date <= weekBounds.end;
      }),
    [allMeetings, weekBounds.end, weekBounds.start],
  );

  const weeklyCompletion = useMemo(() => {
    const total = weeklyMeetings.length;
    if (total === 0) {
      return { total: 0, completed: 0, done: false } as const;
    }
    const completed = weeklyMeetings.filter(
      (meeting) => completedMeetings[getMeetingKey(meeting)],
    ).length;
    return { total, completed, done: completed === total } as const;
  }, [completedMeetings, weeklyMeetings]);

  const roleOptions = useMemo(() => {
    const lecturerSet = new Set<string>();
    const moderatorSet = new Set<string>();
    const organizerSet = new Set<string>();
    monthMeetings.forEach((meeting) => {
      if (meeting.lecturer) lecturerSet.add(meeting.lecturer.trim());
      if (meeting.moderator) moderatorSet.add(meeting.moderator.trim());
      if (meeting.organizer) organizerSet.add(meeting.organizer.trim());
    });
    const sortByLocale = (values: string[]) =>
      values.sort((a, b) => a.localeCompare(b, locale, { sensitivity: 'base' }));
    return {
      lecturer: sortByLocale(Array.from(lecturerSet)),
      moderator: sortByLocale(Array.from(moderatorSet)),
      organizer: sortByLocale(Array.from(organizerSet)),
    } as const;
  }, [locale, monthMeetings]);

  useEffect(() => {
    setRoleFilters((prev) => {
      const next = {
        lecturer:
          prev.lecturer && roleOptions.lecturer.includes(prev.lecturer) ? prev.lecturer : null,
        moderator:
          prev.moderator && roleOptions.moderator.includes(prev.moderator) ? prev.moderator : null,
        organizer:
          prev.organizer && roleOptions.organizer.includes(prev.organizer) ? prev.organizer : null,
      } as typeof prev;
      if (
        next.lecturer === prev.lecturer &&
        next.moderator === prev.moderator &&
        next.organizer === prev.organizer
      ) {
        return prev;
      }
      return next;
    });
  }, [roleOptions]);

  const filteredMeetings = useMemo(() => {
    const matcher = createSynonymMatcher(searchTerm);
    const start = weekBounds.start;
    const end = weekBounds.end;
    return monthMeetings
      .filter((meeting) => {
        if (viewPreset === 'mine') {
          return isUserAssociatedWithMeeting(currentUser, meeting);
        }
        if (viewPreset === 'week') {
          const date = meeting.date.toDate();
          return date >= start && date <= end;
        }
        return true;
      })
      .filter(
        (meeting) =>
          matchRoleFilter(meeting.lecturer, roleFilters.lecturer) &&
          matchRoleFilter(meeting.moderator, roleFilters.moderator) &&
          matchRoleFilter(meeting.organizer, roleFilters.organizer),
      )
      .filter(
        (meeting) =>
          matcher(meeting.title) ||
          matcher(meeting.lecturer) ||
          matcher(meeting.moderator) ||
          matcher(meeting.organizer) ||
          matcher(meeting.notes),
      );
  }, [
    currentUser,
    monthMeetings,
    roleFilters,
    searchTerm,
    viewPreset,
    weekBounds.end,
    weekBounds.start,
  ]);

  const highlightTerms = useMemo(() => {
    const terms = new Set<string>();
    searchTerm
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean)
      .forEach((term) => terms.add(term.toLowerCase()));
    (['lecturer', 'moderator', 'organizer'] as const).forEach((key) => {
      const value = roleFilters[key];
      if (value) terms.add(value.toLowerCase());
    });
    if (viewPreset === 'mine' && currentUser?.fullName) {
      terms.add(currentUser.fullName.toLowerCase());
    }
    return Array.from(terms);
  }, [currentUser?.fullName, roleFilters, searchTerm, viewPreset]);

  const activeRoleFilters = useMemo(
    () =>
      (['lecturer', 'moderator', 'organizer'] as const)
        .map((role) => ({ role, value: roleFilters[role] }))
        .filter((entry) => Boolean(entry.value)),
    [roleFilters],
  );

  const hasActiveFilters = activeRoleFilters.length > 0 || viewPreset !== 'all';

  const adminLastIcsText = useMemo(
    () => formatRelativeTime(adminExportMeta.lastIcs, locale),
    [adminExportMeta.lastIcs, locale],
  );

  const adminLastCsvText = useMemo(
    () => formatRelativeTime(adminExportMeta.lastCsv, locale),
    [adminExportMeta.lastCsv, locale],
  );

  const meetingsByWeek = useMemo(() => groupByWeek(filteredMeetings), [filteredMeetings]);

  const formatMonthTab = (monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year!, month!);
    return date.toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
  };

  const monthOptions = useMemo(
    () =>
      Array.from(meetingsByMonth.keys()).map((monthKey) => {
        const [year, month] = monthKey.split('-').map(Number);
        const date = new Date(year!, month!);
        return {
          key: monthKey,
          label: date.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
        };
      }),
    [meetingsByMonth, locale],
  );

  // nextMeeting reserved for future enhancements

  return (
    <AppShell>
      <Toast
        message={toast?.message ?? null}
        variant={toast?.variant}
        onClear={() => setToast(null)}
      />
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 py-2 backdrop-blur-md bg-bg/85 supports-[backdrop-filter]:bg-bg/75 border-b border-muted/20">
        <div className="app-container px-0">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-bold text-2xl sm:text-3xl leading-tight truncate">
              {t('morningMeetings.title')}
            </h1>
            <div className="flex gap-2 min-w-0">
              {currentUser?.role === 'admin' && (
                <Link
                  href="/admin/morning-meetings"
                  className="inline-flex items-center justify-center rounded-md border border-blue-500 bg-blue-50 px-2 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 min-h-[32px]"
                  onClick={() => haptic('light')}
                >
                  📤 Upload
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="app-container p-4 space-y-6">
        <section className="card-levitate overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
          <div className="p-6 space-y-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3 max-w-3xl">
                <p className="text-sm uppercase tracking-wide text-white/80">
                  {t('morningMeetings.hero.quickGlance', { defaultValue: 'Upcoming focus' })}
                </p>
                <h2 className="text-2xl font-semibold sm:text-3xl">{heroCopy.heading}</h2>
                <p className="max-w-2xl text-sm text-white/85 sm:text-base">{heroCopy.subtitle}</p>
              </div>
              <div className="w-full max-w-sm space-y-4">
                <div className="rounded-lg border border-white/20 bg-white/10 p-4 text-white shadow-inner">
                  {upcomingLoading ? (
                    <div className="flex flex-col gap-2">
                      <div className="h-4 w-32 animate-pulse rounded bg-white/20" />
                      <div className="h-5 w-48 animate-pulse rounded bg-white/20" />
                      <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
                    </div>
                  ) : upcomingMeeting ? (
                    <div className="space-y-2">
                      {upcomingLabel ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                          <span>📅</span>
                          {upcomingLabel}
                        </span>
                      ) : null}
                      <h3 className="text-lg font-semibold leading-tight">
                        {upcomingMeeting.title}
                      </h3>
                      <div className="text-sm text-white/85 space-y-1">
                        <div>
                          {upcomingMeeting.date.toDate().toLocaleDateString(locale, {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div>
                          {upcomingMeeting.date.toDate().toLocaleTimeString(locale, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        {upcomingMeeting.lecturer ? (
                          <div>
                            {t('morningMeetings.lecturer', { defaultValue: 'Lecturer' })}:{' '}
                            <span className="font-medium">{upcomingMeeting.lecturer}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm text-white/85">
                      <h3 className="text-lg font-semibold">
                        {t('morningMeetings.hero.noUpcoming', {
                          defaultValue: 'No upcoming meetings to highlight',
                        })}
                      </h3>
                      <p>
                        {t('morningMeetings.hero.noUpcomingSubtitle', {
                          defaultValue: 'Meetings will appear here once they are scheduled.',
                        })}
                      </p>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border border-white/20 bg-white/10 p-4 text-white/90">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">
                        ⏰
                      </span>
                      <div>
                        <p className="text-sm font-semibold">
                          {t('morningMeetings.hero.reminderTitle', {
                            defaultValue: 'Lecturer reminder',
                          })}
                        </p>
                        <p className="text-xs text-white/70">
                          {t('morningMeetings.hero.reminderSubtitle', {
                            defaultValue: 'Receive a nudge the day before you present.',
                          })}
                        </p>
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={reminderOptIn}
                        onChange={(event) => handleReminderOptInToggle(event.target.checked)}
                        disabled={reminderSaving}
                        className="h-4 w-4 rounded border-white/40 bg-white/20"
                      />
                      <span className="text-xs uppercase tracking-wide">
                        {reminderSaving
                          ? t('common.saving', { defaultValue: 'Saving…' })
                          : reminderOptIn
                            ? t('common.on', { defaultValue: 'On' })
                            : t('common.off', { defaultValue: 'Off' })}
                      </span>
                    </label>
                  </div>
                  <div className="mt-3 space-y-2 text-xs text-white/75">
                    {weeklyCompletion.total > 0 ? (
                      weeklyCompletion.done ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 font-medium text-emerald-100">
                          <span>🎉</span>
                          {t('morningMeetings.hero.weekComplete', {
                            defaultValue: "You're caught up for this week!",
                          })}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
                          <span>📊</span>
                          {t('morningMeetings.hero.weekProgress', {
                            defaultValue: 'Reviewed {{completed}} of {{total}} meetings this week.',
                            completed: weeklyCompletion.completed,
                            total: weeklyCompletion.total,
                          })}
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
                        <span>✨</span>
                        {t('morningMeetings.hero.weekPreview', {
                          defaultValue: 'New meetings will appear here soon.',
                        })}
                      </span>
                    )}
                    <p>
                      {t('morningMeetings.hero.reminderHelp', {
                        defaultValue:
                          'Need a new token? Update it in settings and keep your calendar feed private.',
                      })}{' '}
                      <Link
                        href="/settings"
                        className="underline font-medium text-white"
                        onClick={() => {
                          haptic('light');
                          trackMorningMeetingEvent('hero_settings_link', {
                            destination: 'settings',
                          });
                        }}
                      >
                        {t('morningMeetings.hero.manageSettings', {
                          defaultValue: 'Manage settings',
                        })}
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleJumpToToday}
                className="bg-white/15 text-white hover:bg-white/25"
              >
                {t('morningMeetings.hero.jumpToToday', { defaultValue: 'Jump to today' })}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyLink}
                disabled={!upcomingMeeting?.link}
                className="bg-white/15 text-white hover:bg-white/25 disabled:bg-white/10 disabled:text-white/70"
              >
                {t('morningMeetings.hero.copyLink', { defaultValue: 'Copy meeting link' })}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleMarkComplete}
                disabled={upcomingCompleted || !upcomingMeetingKey}
                className="bg-white/15 text-white hover:bg-white/25 disabled:bg-white/10 disabled:text-white/70"
              >
                {upcomingCompleted
                  ? t('morningMeetings.hero.completed', { defaultValue: 'Completed' })
                  : t('morningMeetings.hero.markComplete', { defaultValue: 'Mark complete' })}
              </Button>
            </div>

            <div className="rounded-lg border border-white/15 bg-white/10 p-4 text-white/90">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-lg">
                    📥
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide">
                      {t('morningMeetings.hero.calendarExport', {
                        defaultValue: 'Calendar export',
                      })}
                    </h3>
                    <p className="text-xs text-white/75">
                      {t('morningMeetings.hero.calendarExportSubtitle', {
                        defaultValue:
                          'Use the authenticated feed to sync meetings to your calendar.',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <a
                    href="/api/ics/morning-meetings?personal=true"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleCalendarExportClick('personal')}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-white/40 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
                  >
                    <span>👤</span>
                    {t('morningMeetings.myIcs', { defaultValue: 'My Meetings (ICS)' })}
                  </a>
                  <a
                    href="/api/ics/morning-meetings"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleCalendarExportClick('all')}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    <span>🌐</span>
                    {t('morningMeetings.allIcs', { defaultValue: 'All Morning Meetings (ICS)' })}
                  </a>
                </div>
              </div>
              <p className="mt-3 text-xs text-white/70">
                {t('morningMeetings.exportHelp', {
                  defaultValue:
                    'Add the link as a subscription in Google Calendar, Apple Calendar, or Outlook to stay in sync.',
                })}
              </p>
            </div>
          </div>
        </section>
        {currentUser?.role === 'admin' ? (
          <section className="card-levitate border border-blue-200/40 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/30 space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  {t('morningMeetings.admin.panelTitle', {
                    defaultValue: 'Admin scheduling tools',
                  })}
                </h2>
                <p className="text-sm text-blue-900/80 dark:text-blue-200/80">
                  {t('morningMeetings.admin.panelSubtitle', {
                    defaultValue:
                      'Export the roster, sync shared calendars, and manage recurring sessions.',
                  })}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/api/ics/morning-meetings"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleCalendarExportClick('all')}
                className="inline-flex items-center gap-2 rounded-md border border-blue-400/40 bg-white/90 px-3 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-white"
              >
                <span>🌐</span>
                {t('morningMeetings.admin.teamIcs', { defaultValue: 'Download team ICS' })}
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAdminCsvExport}
                className="border-blue-400 text-blue-800 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-900/30"
              >
                <span role="img" aria-hidden="true" className="mr-1">
                  📄
                </span>
                {t('morningMeetings.admin.downloadCsv', { defaultValue: 'Download CSV' })}
              </Button>
              <Link
                href="/admin/morning-meetings"
                className="inline-flex items-center gap-2 rounded-md border border-blue-400/40 bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500"
                onClick={() => {
                  haptic('light');
                  trackMorningMeetingEvent('admin_panel_action', { action: 'manage_schedule' });
                }}
              >
                <span>🗂️</span>
                {t('morningMeetings.admin.manageSchedule', { defaultValue: 'Manage schedule' })}
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 rounded-md border border-blue-400/40 bg-white/80 px-3 py-2 text-sm font-medium text-blue-800 hover:bg-white"
                onClick={() => {
                  haptic('light');
                  trackMorningMeetingEvent('admin_panel_action', { action: 'manage_tokens' });
                }}
              >
                <span>🔐</span>
                {t('morningMeetings.admin.manageTokens', { defaultValue: 'Regenerate tokens' })}
              </Link>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-blue-900/80 dark:text-blue-200/70">
              <span>
                📆{' '}
                {t('morningMeetings.admin.lastIcs', {
                  defaultValue: 'Last ICS export: {{value}}',
                  value: adminLastIcsText,
                })}
              </span>
              <span>
                🧾{' '}
                {t('morningMeetings.admin.lastCsv', {
                  defaultValue: 'Last CSV export: {{value}}',
                  value: adminLastCsvText,
                })}
              </span>
              <span>
                📊{' '}
                {t('morningMeetings.admin.totalMeetings', {
                  defaultValue: '{{count}} meetings in range',
                  count: allMeetings.length,
                })}
              </span>
            </div>
          </section>
        ) : null}
        {/* Header search */}
        <div className="flex gap-2 items-center">
          <Input
            type="text"
            placeholder={t('ui.search', { defaultValue: 'Search' }) + '...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
          {searchTerm ? (
            <Button variant="ghost" onClick={() => setSearchTerm('')} className="px-2">
              ✕
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['all', 'mine', 'week'].map((presetKey) => {
            const preset = presetKey as 'all' | 'mine' | 'week';
            const labels: Record<typeof preset, string> = {
              all: t('morningMeetings.filters.all', { defaultValue: 'All meetings' }),
              mine: t('morningMeetings.filters.mine', { defaultValue: 'My sessions' }),
              week: t('morningMeetings.filters.week', { defaultValue: 'This week' }),
            } as const;
            const icons: Record<typeof preset, string> = {
              all: '📚',
              mine: '⭐',
              week: '🗓️',
            } as const;
            const isActive = viewPreset === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handleViewPresetChange(preset)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700 dark:border-white/10 dark:text-gray-300 dark:hover:border-blue-500'
                }`}
              >
                <span>{icons[preset]}</span>
                {labels[preset]}
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          {(['lecturer', 'moderator', 'organizer'] as const).map((roleKey) => {
            const options = roleOptions[roleKey];
            if (options.length === 0) return null;
            const labelMap: Record<typeof roleKey, string> = {
              lecturer: t('morningMeetings.lecturer', { defaultValue: 'Lecturer' }),
              moderator: t('morningMeetings.moderator', { defaultValue: 'Moderator' }),
              organizer: t('morningMeetings.organizer', { defaultValue: 'Organizer' }),
            } as const;
            return (
              <div key={roleKey} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {labelMap[roleKey]}
                </span>
                {options.map((option) => {
                  const isActive = roleFilters[roleKey] === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleRoleFilterToggle(roleKey, option)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        isActive
                          ? 'border-blue-500 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100'
                          : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700 dark:border-white/10 dark:text-gray-300 dark:hover:border-blue-400'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {hasActiveFilters ? (
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            <span>
              {t('morningMeetings.filters.activeSummary', {
                defaultValue: 'Filters applied: {{count}}',
                count: activeRoleFilters.length + (viewPreset === 'all' ? 0 : 1),
              })}
            </span>
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="px-2">
              {t('morningMeetings.filters.clear', { defaultValue: 'Clear filters' })}
            </Button>
          </div>
        ) : null}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              {t('common.loading', { defaultValue: 'Loading...' })}
            </p>
          </div>
        ) : meetingsByMonth.size === 0 ? (
          <div className="card-levitate p-12 text-center">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t('morningMeetings.noMeetings', { defaultValue: 'No meetings scheduled' })}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('morningMeetings.noMeetingsDescription', {
                defaultValue: 'Check back later for upcoming meetings',
              })}
            </p>
          </div>
        ) : (
          <>
            {/* Month tabs */}
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="border-b border-gray-200 dark:border-[rgb(var(--border))] overflow-x-auto">
                <div className="flex space-x-2 pb-2">
                  {Array.from(meetingsByMonth.keys()).map((monthKey) => {
                    const count = meetingsByMonth.get(monthKey)?.length || 0;
                    const isSelected = selectedMonth === monthKey;
                    const isCurrent = monthKey === currentMonthKey;

                    return (
                      <button
                        key={monthKey}
                        onClick={() => handleMonthSelectChange(monthKey)}
                        className={`
                        flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 transition-all whitespace-nowrap min-h-[44px]
                        ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium'
                            : 'border-transparent hover:bg-gray-50 dark:hover:bg-[rgb(var(--surface-elevated))] text-gray-600 dark:text-[rgb(var(--muted))]'
                        }
                      `}
                      >
                        {formatMonthTab(monthKey)}
                        {isCurrent && (
                          <Badge className="bg-green-600 text-white text-xs font-semibold">
                            {t('morningMeetings.current', { defaultValue: 'Current' })}
                          </Badge>
                        )}
                        <Badge className="bg-gray-200 dark:bg-[rgb(var(--surface-elevated))] text-gray-700 dark:text-[rgb(var(--fg))] text-xs">
                          {count}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="md:min-w-[220px]">
                <label htmlFor="month-select" className="sr-only">
                  {t('morningMeetings.filters.jumpMonth', { defaultValue: 'Jump to month' })}
                </label>
                <Select
                  id="month-select"
                  value={selectedMonth}
                  onChange={(event) => handleMonthSelectChange(event.target.value)}
                  className="w-full"
                >
                  {monthOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Meetings list for selected month */}
            {filteredMeetings.length === 0 ? (
              <div className="card-levitate p-12 text-center">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {t('ui.noResults', { defaultValue: 'No results found' })}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('ui.tryDifferentSearch', { defaultValue: 'Try adjusting your search terms' })}
                </p>
                {searchTerm && (
                  <Button onClick={() => setSearchTerm('')} className="mt-4" variant="outline">
                    {t('ui.clearSearch', { defaultValue: 'Clear search' })}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {meetingsByWeek.map((week, weekIdx) => (
                  <div key={weekIdx} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {formatWeekLabel(week[0]!.date.toDate(), i18n.language)}
                      </div>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-[rgb(var(--border))]" />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {week.map((meeting, idx) => {
                        const date = meeting.date.toDate();
                        const isFirstOfDay =
                          idx === 0 || date.getDate() !== week[idx - 1]!.date.toDate().getDate();
                        return (
                          <div
                            key={meeting.id}
                            id={isFirstOfDay ? `day-${date.getDate()}` : undefined}
                            className="scroll-mt-24"
                          >
                            <MeetingCard
                              meeting={meeting}
                              language={i18n.language}
                              highlightTerms={highlightTerms}
                              onAddToCalendar={handleAddMeetingToCalendar}
                              onCopyLink={handleCopyAgendaLink}
                              onToggleReminder={handleToggleMeetingReminder}
                              reminderActive={Boolean(meetingReminders[getMeetingKey(meeting)])}
                              reminderGlobalEnabled={reminderOptIn}
                              isMine={isUserAssociatedWithMeeting(currentUser, meeting)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

// Meeting card component
function MeetingCard({
  meeting,
  language,
  highlightTerms,
  onAddToCalendar,
  onCopyLink,
  onToggleReminder,
  reminderActive,
  reminderGlobalEnabled,
  isMine,
}: {
  meeting: MorningMeeting;
  language: string;
  highlightTerms: string[];
  onAddToCalendar: (meeting: MorningMeeting) => void;
  onCopyLink: (meeting: MorningMeeting) => void | Promise<void>;
  onToggleReminder: (meeting: MorningMeeting) => void;
  reminderActive: boolean;
  reminderGlobalEnabled: boolean;
  isMine: boolean;
}) {
  const { t } = useTranslation();
  const date = meeting.date.toDate();
  const endDate = meeting.endDate?.toDate() ?? new Date(date.getTime() + 40 * 60 * 1000);
  const displayLocale = language === 'he' ? 'he-IL' : 'en-US';
  const now = new Date();
  const dayDiff = Math.round(
    (startOfDay(date).getTime() - startOfDay(now).getTime()) / (24 * 60 * 60 * 1000),
  );

  const statusBadges: Array<{ icon: string; label: string; tone?: string }> = [];
  if (dayDiff === 0) {
    statusBadges.push({
      icon: '📍',
      label: t('morningMeetings.card.statusToday', { defaultValue: 'Today' }),
      tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    });
  } else if (dayDiff === 1) {
    statusBadges.push({
      icon: '⏳',
      label: t('morningMeetings.card.statusTomorrow', { defaultValue: 'Tomorrow' }),
    });
  } else if (dayDiff > 1 && dayDiff <= 7) {
    statusBadges.push({
      icon: '🚀',
      label: t('morningMeetings.card.statusSoon', { defaultValue: 'Coming up soon' }),
    });
  } else if (dayDiff < 0) {
    statusBadges.push({
      icon: '✅',
      label: t('morningMeetings.card.statusCompleted', { defaultValue: 'Completed' }),
      tone: 'bg-gray-200 text-gray-700 dark:bg-gray-700/40 dark:text-gray-200',
    });
  }

  if (isMine) {
    statusBadges.push({
      icon: '⭐',
      label: t('morningMeetings.card.statusMine', { defaultValue: 'Assigned to you' }),
      tone: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-100',
    });
  }

  if (reminderActive) {
    statusBadges.push({
      icon: '🔔',
      label: t('morningMeetings.card.statusReminder', { defaultValue: 'Reminder set' }),
      tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    });
  }

  return (
    <div className="card-levitate border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--surface-elevated))]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex-shrink-0">
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-center dark:border-blue-800 dark:bg-blue-950/40">
            <div className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-300">
              {meeting.dayOfWeek}
            </div>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-100">
              {date.getDate()}
            </div>
            <div className="text-xs text-blue-600/80 dark:text-blue-200/80">
              {date.toLocaleDateString(displayLocale, { month: 'short', weekday: 'short' })}
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4">
          {statusBadges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {statusBadges.map((status) => (
                <Badge
                  key={`${status.icon}-${status.label}`}
                  className={`inline-flex items-center gap-1 text-xs font-medium ${status.tone ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-200'}`}
                >
                  <span aria-hidden="true">{status.icon}</span>
                  <span>{status.label}</span>
                </Badge>
              ))}
            </div>
          ) : null}
          <h3 className="text-lg font-semibold leading-snug text-gray-900 dark:text-gray-100">
            {renderHighlightedText(meeting.title, highlightTerms)}
          </h3>
          <div className="grid gap-2 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <span>🕘</span>
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {t('common.time', { defaultValue: 'Time' })}:
              </span>
              <span>
                {date.toLocaleTimeString(displayLocale, { hour: '2-digit', minute: '2-digit' })} –{' '}
                {endDate.toLocaleTimeString(displayLocale, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {meeting.lecturer ? (
              <div className="flex items-center gap-2">
                <span>👨‍⚕️</span>
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {t('morningMeetings.lecturer', { defaultValue: 'Lecturer' })}:
                </span>
                <span>{renderHighlightedText(meeting.lecturer, highlightTerms)}</span>
              </div>
            ) : null}
            {meeting.moderator ? (
              <div className="flex items-center gap-2">
                <span>🎤</span>
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {t('morningMeetings.moderator', { defaultValue: 'Moderator' })}:
                </span>
                <span>{renderHighlightedText(meeting.moderator, highlightTerms)}</span>
              </div>
            ) : null}
            {meeting.organizer ? (
              <div className="flex items-center gap-2">
                <span>📋</span>
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {t('morningMeetings.organizer', { defaultValue: 'Organizer' })}:
                </span>
                <span>{renderHighlightedText(meeting.organizer, highlightTerms)}</span>
              </div>
            ) : null}
          </div>
          {meeting.notes ? (
            <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-700/60 dark:bg-gray-900/40 dark:text-gray-200">
              {renderHighlightedText(meeting.notes, highlightTerms)}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => onAddToCalendar(meeting)}>
          <span aria-hidden="true">📥</span>
          {t('morningMeetings.card.addToCalendar', { defaultValue: 'Add to calendar' })}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCopyLink(meeting)}
          disabled={!meeting.link}
        >
          <span aria-hidden="true">🔗</span>
          {meeting.link
            ? t('morningMeetings.card.copyAgenda', { defaultValue: 'Copy agenda link' })
            : t('morningMeetings.card.noAgendaAction', { defaultValue: 'Agenda coming soon' })}
        </Button>
        <Button
          variant={reminderActive ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => onToggleReminder(meeting)}
          disabled={!reminderGlobalEnabled && !reminderActive}
        >
          <span aria-hidden="true">{reminderActive ? '🔔' : '⏰'}</span>
          {reminderActive
            ? t('morningMeetings.card.reminderOn', { defaultValue: 'Reminder on' })
            : t('morningMeetings.card.reminderAction', { defaultValue: 'Set reminder' })}
        </Button>
        {meeting.link ? (
          <Link
            href={meeting.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            <span aria-hidden="true">🔍</span>
            {t('morningMeetings.viewLink', { defaultValue: 'Open meeting' })}
          </Link>
        ) : null}
      </div>
      {!reminderGlobalEnabled && !reminderActive ? (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
          {t('morningMeetings.card.enableGlobalReminder', {
            defaultValue: 'Enable lecturer reminders in the hero section to receive notifications.',
          })}
        </p>
      ) : null}
    </div>
  );
}
// Helper functions
function sanitizeCsvValue(value?: string | null): string {
  if (!value) return '';
  return String(value).replace(/"/g, '""');
}

function buildMeetingSlug(meeting: MorningMeeting): string {
  const base = `${meeting.dateKey}-${meeting.title ?? 'morning-meeting'}`;
  const normalized = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return normalized || `morning-meeting-${meeting.dateKey}`;
}

function getMeetingKey(meeting: MorningMeeting): string {
  return meeting.id ?? meeting.dateKey;
}

function matchRoleFilter(value?: string | null, expected?: string | null): boolean {
  if (!expected) return true;
  if (!value) return false;
  return value.trim().toLowerCase() === expected.trim().toLowerCase();
}

function renderHighlightedText(text: string | null | undefined, highlights: string[]): ReactNode {
  if (!text) return null;
  const uniqueHighlights = Array.from(
    new Set(highlights.map((term) => term.trim().toLowerCase()).filter((term) => term.length > 1)),
  );
  if (uniqueHighlights.length === 0) return text;
  const pattern = uniqueHighlights.map(escapeRegExp).join('|');
  if (!pattern) return text;
  const regex = new RegExp(`(${pattern})`, 'gi');
  const segments = text.split(regex);
  return segments.map((segment, index) => {
    if (!segment) return null;
    if (index % 2 === 1) {
      return (
        <mark
          key={`${segment}-${index}`}
          className="rounded bg-yellow-200 px-1 text-gray-900 dark:bg-yellow-400/40"
        >
          {segment}
        </mark>
      );
    }
    return <span key={`${segment}-${index}`}>{segment}</span>;
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatRelativeTime(timestamp?: number | null, locale: string = 'en-US'): string {
  if (!timestamp) return '—';
  const diff = timestamp - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const minutes = Math.round(diff / (60 * 1000));
  if (Math.abs(minutes) < 60) {
    return rtf.format(minutes, 'minute');
  }
  const hours = Math.round(diff / (60 * 60 * 1000));
  if (Math.abs(hours) < 24) {
    return rtf.format(hours, 'hour');
  }
  const days = Math.round(diff / (24 * 60 * 60 * 1000));
  return rtf.format(days, 'day');
}

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function startOfWeek(date: Date): Date {
  const start = startOfDay(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  return start;
}

function groupByWeek(meetings: MorningMeeting[]): MorningMeeting[][] {
  const weeks: MorningMeeting[][] = [];
  let currentWeek: MorningMeeting[] = [];
  let lastWeekNumber = -1;

  meetings
    .sort((a, b) => a.date.toMillis() - b.date.toMillis())
    .forEach((meeting) => {
      const date = meeting.date.toDate();
      const weekNumber = getWeekNumber(date);

      if (weekNumber !== lastWeekNumber && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentWeek.push(meeting);
      lastWeekNumber = weekNumber;
    });

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatWeekLabel(date: Date, language: string): string {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // End of week (Saturday)

  const formatter = (d: Date) =>
    d.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });

  return `${formatter(start)} - ${formatter(end)}`;
}

function isUserAssociatedWithMeeting(
  user: UserProfile | null,
  meeting: MorningMeeting | null,
): boolean {
  if (!user || !meeting) return false;
  if (isUserLecturerForMeeting(user, meeting)) return true;
  const normalizedUser = (user.fullName ?? '').trim().toLowerCase();
  if (!normalizedUser) return false;
  const matchable = [meeting.moderator, meeting.organizer];
  return matchable.some((value) => {
    if (!value) return false;
    return value.trim().toLowerCase().includes(normalizedUser);
  });
}

function isUserLecturerForMeeting(
  user: UserProfile | null,
  meeting: MorningMeeting | null,
): boolean {
  if (!user || !meeting) return false;

  if (meeting.lecturerUserId && meeting.lecturerUserId === user.uid) {
    return true;
  }

  if (user.email && meeting.lecturerEmailResolved && meeting.lecturerEmailResolved === user.email) {
    return true;
  }

  if (user.fullName && typeof meeting.lecturer === 'string') {
    const normalizedUser = user.fullName.trim().toLowerCase();
    const normalizedLecturer = meeting.lecturer.trim().toLowerCase();
    if (normalizedUser && normalizedLecturer) {
      if (
        normalizedUser === normalizedLecturer ||
        normalizedLecturer.includes(normalizedUser) ||
        normalizedUser.includes(normalizedLecturer)
      ) {
        return true;
      }
    }
  }

  return false;
}
