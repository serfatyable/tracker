'use client';

import { useTranslation } from 'react-i18next';

import Button from '../ui/Button';
import Input from '../ui/Input';

export type RoleFilterKey = 'lecturer' | 'moderator' | 'organizer';
export type PresetFilterKey = 'myMeetings' | 'upcomingWeek';

interface FiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  activeRoleFilters: RoleFilterKey[];
  onToggleRole: (role: RoleFilterKey) => void;
  activePresets: PresetFilterKey[];
  onTogglePreset: (preset: PresetFilterKey) => void;
  roleFiltersAvailable: boolean;
  userScopedPresetsAvailable: boolean;
}

export default function MorningMeetingFilters({
  searchTerm,
  onSearchChange,
  onClearSearch,
  activeRoleFilters,
  onToggleRole,
  activePresets,
  onTogglePreset,
  roleFiltersAvailable,
  userScopedPresetsAvailable,
}: FiltersProps) {
  const { t } = useTranslation();

  const roleOptions: Array<{ key: RoleFilterKey; label: string; icon: string }> = [
    {
      key: 'lecturer',
      label: t('morningMeetings.lecturer', { defaultValue: 'Lecturer' }),
      icon: '👨‍⚕️',
    },
    {
      key: 'moderator',
      label: t('morningMeetings.moderator', { defaultValue: 'Moderator' }),
      icon: '🎤',
    },
    {
      key: 'organizer',
      label: t('morningMeetings.organizer', { defaultValue: 'Organizer' }),
      icon: '📋',
    },
  ];

  const presetOptions: Array<{
    key: PresetFilterKey;
    label: string;
    description?: string;
    icon: string;
    disabled?: boolean;
  }> = [
    {
      key: 'myMeetings',
      label: t('morningMeetings.presets.myMeetings', { defaultValue: 'My meetings' }),
      description: t('morningMeetings.presets.myMeetingsDescription', {
        defaultValue: 'Only meetings where you are assigned',
      }),
      icon: '⭐',
      disabled: !userScopedPresetsAvailable,
    },
    {
      key: 'upcomingWeek',
      label: t('morningMeetings.presets.upcomingWeek', { defaultValue: 'Upcoming week' }),
      description: t('morningMeetings.presets.upcomingWeekDescription', {
        defaultValue: 'Meetings happening in the next 7 days',
      }),
      icon: '🗓️',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <label htmlFor="morning-meetings-search" className="sr-only">
          {t('ui.search', { defaultValue: 'Search' })}
        </label>
        <Input
          id="morning-meetings-search"
          type="text"
          placeholder={`${t('ui.search', { defaultValue: 'Search' })}...`}
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full"
        />
        {searchTerm ? (
          <Button
            variant="ghost"
            onClick={onClearSearch}
            className="px-2"
            aria-label={t('ui.clearSearch', { defaultValue: 'Clear search' }) as string}
          >
            ✕
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('morningMeetings.filters.roles', { defaultValue: 'Filter by role' })}
        </p>
        <div
          className="flex flex-wrap gap-2"
          aria-label={
            t('morningMeetings.filters.roleChips', {
              defaultValue: 'Toggle role filters',
            }) as string
          }
        >
          {roleOptions.map((option) => {
            const isActive = activeRoleFilters.includes(option.key);
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onToggleRole(option.key)}
                aria-pressed={isActive}
                disabled={!roleFiltersAvailable}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-muted text-foreground/80 border-transparent hover:bg-muted/80'
                } ${!roleFiltersAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={
                  !roleFiltersAvailable
                    ? (t('morningMeetings.filters.roleUnavailable', {
                        defaultValue: 'Role filters require your profile name',
                      }) as string)
                    : undefined
                }
              >
                <span aria-hidden="true">{option.icon}</span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('morningMeetings.filters.presets', { defaultValue: 'Quick filters' })}
        </p>
        <div
          className="flex flex-wrap gap-2"
          aria-label={
            t('morningMeetings.filters.presetToggles', {
              defaultValue: 'Toggle quick filters',
            }) as string
          }
        >
          {presetOptions.map((option) => {
            const isActive = activePresets.includes(option.key);
            const disabled = option.disabled ?? false;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onTogglePreset(option.key)}
                aria-pressed={isActive}
                disabled={disabled}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
                  isActive
                    ? 'bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-800'
                    : 'bg-white text-foreground border-muted hover:bg-muted/60 dark:bg-[rgb(var(--surface-elevated))] dark:text-[rgb(var(--fg))]'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={option.description}
              >
                <span aria-hidden="true">{option.icon}</span>
                <span className="flex flex-col text-left leading-tight">
                  <span>{option.label}</span>
                  {option.description ? (
                    <span className="text-[10px] font-normal text-muted-foreground/80">
                      {option.description}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
