import Link from 'next/link';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { renderHighlightedText, startOfDay } from './utils';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import type { MorningMeeting } from '@/types/morningMeetings';


export interface MeetingCardProps {
  meeting: MorningMeeting;
  language: string;
  highlightTerms: string[];
  onAddToCalendar: (meeting: MorningMeeting) => void;
  onCopyLink: (meeting: MorningMeeting) => void | Promise<void>;
  onToggleReminder: (meeting: MorningMeeting) => void;
  reminderActive: boolean;
  reminderGlobalEnabled: boolean;
  isMine: boolean;
}

export default function MeetingCard({
  meeting,
  language,
  highlightTerms,
  onAddToCalendar,
  onCopyLink,
  onToggleReminder,
  reminderActive,
  reminderGlobalEnabled,
  isMine,
}: MeetingCardProps): ReactElement {
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
