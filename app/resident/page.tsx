'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AuthGate from '../../components/auth/AuthGate';
import AppShell from '../../components/layout/AppShell';
import MiniCalendar from '../../components/on-call/MiniCalendar';
import NextShiftCard from '../../components/on-call/NextShiftCard';
import TeamForDate from '../../components/on-call/TeamForDate';
import TodayPanel from '../../components/on-call/TodayPanel';
import AnnouncementsCard from '../../components/resident/AnnouncementsCard';
import Approvals from '../../components/resident/Approvals';
import KPICardsResident from '../../components/resident/KPICardsResident';
import LeafDetails from '../../components/resident/LeafDetails';
import PendingTasksList from '../../components/resident/PendingTasksList';
import Progress from '../../components/resident/Progress';
import QuickActions from '../../components/resident/QuickActions';
import RecentLogs from '../../components/resident/RecentLogs';
import Resources from '../../components/resident/Resources';
import RotationBrowser from '../../components/resident/RotationBrowser';
import SettingsPanel from '../../components/settings/SettingsPanel';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { TabsTrigger } from '../../components/ui/Tabs';
import TextField from '../../components/ui/TextField';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import {
  useMorningMeetingsUpcoming,
  useMorningMeetingsMonth,
} from '../../lib/hooks/useMorningClasses';
import { useReflectionsForResident } from '../../lib/hooks/useReflections';
import { useResidentActiveRotation } from '../../lib/hooks/useResidentActiveRotation';
import { useRotationNodes } from '../../lib/hooks/useRotationNodes';
import { useRotations } from '../../lib/hooks/useRotations';
import type { RotationNode } from '../../types/rotations';

export default function ResidentDashboard() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as any) || 'dashboard';
  const [tab, setTab] = useState<
    | 'dashboard'
    | 'rotations'
    | 'reflections'
    | 'settings'
    | 'progress'
    | 'approvals'
    | 'resources'
    | 'morning'
    | 'oncall'
  >(initialTab);
  const { t } = useTranslation();
  const { rotations, loading: rotationsLoading, error: rotationsError } = useRotations();
  const { rotationId: activeRotationId } = useResidentActiveRotation();
  const [selectedLeaf, setSelectedLeaf] = useState<RotationNode | null>(null);
  const [selectedRotationId, setSelectedRotationId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchScope, setSearchScope] = useState<'current' | 'all'>('current');
  const { nodes: activeNodes } = useRotationNodes(activeRotationId || null);

  // Auto-select active rotation on load if none selected
  useEffect(() => {
    if (!selectedRotationId && activeRotationId) {
      setSelectedRotationId(activeRotationId);
    }
  }, [selectedRotationId, activeRotationId]);

  function rotationHue(id: string, name: string): number {
    // Spread hues more evenly using a golden-angle step based on hash
    const key = String(id || name || '');
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) | 0;
    }
    const base = Math.abs(hash % 360);
    // Apply golden angle multiplication to avoid clustering
    const hue = Math.floor((base * 137.508) % 360);
    return hue;
  }

  // Auto-open first matching rotation when none selected and search narrows the list
  const filteredRotations = useMemo(() => {
    const list = rotations
      .slice()
      .sort((a, b) => (a.name_en || a.name).localeCompare(b.name_en || b.name))
      .filter((r) => {
        if (!search.trim()) return true;
        const s = search.toLowerCase();
        return (
          ((r as any).name_en || '').toLowerCase().includes(s) ||
          ((r as any).name_he || '').toLowerCase().includes(s)
        );
      });
    return list;
  }, [rotations, search]);

  useEffect(() => {
    if (!selectedRotationId && filteredRotations.length > 0 && !activeRotationId && search.trim()) {
      setSelectedRotationId(filteredRotations[0]!.id);
    }
  }, [selectedRotationId, filteredRotations, activeRotationId, search]);

  return (
    <AuthGate requiredRole="resident">
      <AppShell>
        <div className="p-6">
          <div className="w-full">
            <h1 className="sr-only">
              {t('ui.residentDashboard', { defaultValue: 'Resident Dashboard' })}
            </h1>
            <div className="mb-4 relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent dark:from-gray-900 z-10" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent dark:from-gray-900 z-10" />
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-1 sm:gap-2 min-w-max pr-6">
                  <TabsTrigger active={tab === 'dashboard'} onClick={() => setTab('dashboard')}>
                    {t('ui.dashboard') || 'Dashboard'}
                  </TabsTrigger>
                  <TabsTrigger active={tab === 'rotations'} onClick={() => setTab('rotations')}>
                    {t('ui.rotations') || 'Rotations'}
                  </TabsTrigger>
                  <TabsTrigger active={tab === 'reflections'} onClick={() => setTab('reflections')}>
                    {t('ui.reflections') || 'Reflections'}
                  </TabsTrigger>
                  <TabsTrigger active={tab === 'progress'} onClick={() => setTab('progress')}>
                    {(t('resident.progress') as any) || 'Progress'}
                  </TabsTrigger>
                  <TabsTrigger active={tab === 'approvals'} onClick={() => setTab('approvals')}>
                    {(t('resident.approvals') as any) || 'Approvals'}
                  </TabsTrigger>
                  <TabsTrigger active={tab === 'resources'} onClick={() => setTab('resources')}>
                    {(t('resident.resources') as any) || 'Resources'}
                  </TabsTrigger>
                  <TabsTrigger active={tab === 'morning'} onClick={() => setTab('morning')}>
                    <span className="hidden sm:inline">
                      {t('ui.morningMeetings', { defaultValue: 'Morning Meetings' })}
                    </span>
                    <span className="sm:hidden">
                      {t('ui.morning', { defaultValue: 'Morning' })}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger active={tab === 'oncall'} onClick={() => setTab('oncall')}>
                    {t('ui.onCall', { defaultValue: 'On Call' })}
                  </TabsTrigger>
                  <TabsTrigger active={tab === 'settings'} onClick={() => setTab('settings')}>
                    {t('ui.settings') || 'Settings'}
                  </TabsTrigger>
                </div>
              </div>
            </div>
            {tab === 'dashboard' ? (
              <div className="space-y-3">
                <KPICardsResident />
                <QuickActions
                  onGoRotations={() => setTab('rotations')}
                  onFocusSearch={() => {
                    setTab('rotations');
                    const el = document.querySelector(
                      'input[placeholder="' + (t('ui.searchRotationsOrItems') as string) + '"]',
                    ) as HTMLInputElement | null;
                    el?.focus();
                  }}
                  favorites={getFavorites(activeNodes, (id) =>
                    setSelectedLeaf((activeNodes || []).find((n: any) => n.id === id) || null),
                  )}
                />
                <PendingTasksList
                  activeRotationId={activeRotationId || null}
                  nodesById={
                    Object.fromEntries((activeNodes || []).map((n: any) => [n.id, n])) as any
                  }
                />
                <RecentLogs
                  itemIdsToNames={
                    Object.fromEntries((activeNodes || []).map((n: any) => [n.id, n.name])) as any
                  }
                />
                <AnnouncementsCard />
              </div>
            ) : tab === 'morning' ? (
              <ResidentMorningMeetingsInline />
            ) : tab === 'oncall' ? (
              <ResidentOnCallInline />
            ) : tab === 'settings' ? (
              <div className="space-y-3">
                <SettingsPanel />
              </div>
            ) : tab === 'reflections' ? (
              <ResidentReflectionsInline />
            ) : tab === 'progress' ? (
              <Progress />
            ) : tab === 'approvals' ? (
              <Approvals
                onOpenRotation={(rid) => {
                  setSelectedRotationId(rid);
                  setTab('rotations');
                }}
              />
            ) : tab === 'resources' ? (
              <Resources
                onOpenRotation={(rid) => {
                  setSelectedRotationId(rid);
                  setTab('rotations');
                }}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-full relative">
                    <TextField
                      className="pr-14"
                      placeholder={t('ui.searchRotationsOrItems') as string}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label="Toggle search scope"
                      title={searchScope === 'current' ? 'Current' : 'All'}
                      onClick={() => setSearchScope((s) => (s === 'current' ? 'all' : 'current'))}
                      className="absolute top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-xs border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50"
                      style={{ insetInlineEnd: '0.375rem' as any }}
                    >
                      {searchScope === 'current' ? 'current' : 'all'}
                    </button>
                  </div>
                </div>
                {rotationsError ? (
                  <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                    {String(rotationsError)}
                  </div>
                ) : null}
                {rotationsLoading ? (
                  <div className="text-sm text-gray-500">{t('ui.loadingRotations')}</div>
                ) : null}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredRotations.map((r) => {
                    const hue = rotationHue(r.id, (r as any).name_en || r.name);
                    const isPACU =
                      r.id === 'pacu' ||
                      String((r as any).name_en || r.name)
                        .toLowerCase()
                        .includes('pacu');
                    const borderColor = `hsl(${hue}, ${isPACU ? 35 : 45}%, ${isPACU ? 88 : 82}%)`;
                    const ringColor = `hsl(${hue}, 60%, 46%)`;
                    // Special-case PACU for a more subtle color treatment
                    return (
                      <div
                        key={r.id}
                        role="button"
                        tabIndex={0}
                        className={`rounded-md border p-3 cursor-pointer card-levitate transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
                        onClick={() => setSelectedRotationId(r.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedRotationId(r.id);
                          }
                        }}
                        style={{
                          borderColor,
                          boxShadow:
                            selectedRotationId === r.id ? `0 0 0 2px ${ringColor}` : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{(r as any).name_en || r.name}</div>
                          {/** Status-coded pill colors */}
                          <Badge
                            variant="outline"
                            className={
                              r.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                : r.status === 'finished'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }
                          >
                            {r.status}
                          </Badge>
                        </div>
                        <div className="pt-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRotationId(r.id);
                            }}
                          >
                            Open
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Auto-select active rotation or first match when none selected */}
                {null}
                {selectedRotationId ? (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-1">
                      <RotationBrowser
                        selectedRotationId={selectedRotationId}
                        searchTerm={search}
                        searchScope={searchScope}
                        onSelectLeaf={setSelectedLeaf}
                        onAutoScopeAll={() => setSearchScope('all')}
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <LeafDetails
                        leaf={selectedLeaf}
                        canLog={Boolean(
                          selectedLeaf &&
                            activeRotationId &&
                            selectedLeaf.rotationId === activeRotationId,
                        )}
                      />
                    </div>
                  </div>
                ) : filteredRotations.length > 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-muted/30 bg-surface/30 p-8 text-center">
                    <h2 className="text-base font-semibold text-fg mb-1">
                      {t('ui.selectRotation', { defaultValue: 'Select a rotation' })}
                    </h2>
                    <p className="text-sm text-muted">
                      {t('ui.clickRotationAbove', {
                        defaultValue: 'Click on a rotation card above to view details.',
                      })}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-muted/30 bg-surface/30 p-8 text-center">
                    <h2 className="text-base font-semibold text-fg mb-1">
                      {t('ui.noRotations', { defaultValue: 'No rotations found' })}
                    </h2>
                    <p className="text-sm text-muted">
                      {search.trim()
                        ? t('ui.tryDifferentSearch', {
                            defaultValue: 'Try a different search term.',
                          })
                        : t('ui.contactAdmin', {
                            defaultValue: 'Contact your administrator to get started.',
                          })}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </AppShell>
    </AuthGate>
  );
}
function ResidentReflectionsInline() {
  const { data: me } = useCurrentUserProfile();
  const { list, loading } = useReflectionsForResident(me?.uid || null);
  return (
    <div className="space-y-3">
      <Card>
        <div className="font-semibold mb-2">{t('resident.myReflections')}</div>
        {loading ? <div className="text-sm opacity-70">{t('common.loading')}</div> : null}
        <div className="space-y-2">
          {(list || []).map((r) => (
            <div
              key={r.id}
              className="border rounded p-2 text-sm flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{r.taskType}</div>
                <div className="text-xs opacity-70">{r.taskOccurrenceId}</div>
              </div>
              <div className="text-xs opacity-70">
                {(r as any).submittedAt?.toDate?.()?.toLocaleString?.() || ''}
              </div>
            </div>
          ))}
          {!loading && !list?.length ? (
            <div className="rounded-lg border-2 border-dashed border-muted/30 bg-surface/30 p-6 text-center">
              <p className="text-sm text-muted">{t('resident.noReflectionsYet')}</p>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function ResidentMorningMeetingsInline() {
  const { t, i18n } = useTranslation();
  const { today, tomorrow, next7, loading: upcomingLoading } = useMorningMeetingsUpcoming();
  const now = new Date();
  const y = now.getFullYear();
  const m0 = now.getMonth();
  const { list: monthList, loading: monthLoading } = useMorningMeetingsMonth(y, m0);
  const daysInMonth = useMemo(() => new Date(y, m0 + 1, 0).getDate(), [y, m0]);
  const monthByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    (monthList || []).forEach((it: any) => {
      const d = new Date(it.date.toDate());
      const dd = d.getDate();
      map[dd] = map[dd] || [];
      map[dd].push(it);
    });
    return map;
  }, [monthList]);
  function renderList(items: any[] | null, loading: boolean) {
    if (loading) {
      return (
        <div className="space-y-2">
          <div className="h-12 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
          <div className="h-12 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
        </div>
      );
    }
    if (!items || !items.length)
      return (
        <div className="rounded-lg border-2 border-dashed border-muted/30 bg-surface/30 p-4 text-center">
          <p className="text-sm text-muted">{t('morningMeetings.noClasses')}</p>
        </div>
      );
    return (
      <ul className="divide-y rounded border">
        {(items || []).map((c) => {
          const start =
            c.date?.toDate?.()?.toLocaleTimeString?.(i18n.language === 'he' ? 'he-IL' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }) || '07:10';
          return (
            <li key={c.id || c.dateKey + c.title} className="p-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{c.title}</div>
                <div className="text-xs opacity-70">
                  {c.lecturer} — {start}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card>
          <div className="mb-2 font-semibold">{t('morningMeetings.today')}</div>
          {renderList(today, upcomingLoading)}
        </Card>
        <Card>
          <div className="mb-2 font-semibold">{t('morningMeetings.tomorrow')}</div>
          {renderList(tomorrow, upcomingLoading)}
        </Card>
        <Card>
          <div className="mb-2 font-semibold">{t('morningMeetings.next7')}</div>
          {renderList(next7, upcomingLoading)}
        </Card>
      </div>
      <Card>
        <div className="mb-2 font-semibold">{t('morningMeetings.month')}</div>
        {monthLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 text-sm">
            {Array.from({ length: 21 }).map((_, i) => (
              <div
                key={i}
                className="rounded border p-2 h-20 bg-gray-100 dark:bg-gray-900 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 text-sm">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
              <div key={d} className="rounded border p-2 min-h-[80px]">
                <div className="text-xs opacity-70 mb-1">{d}</div>
                <div className="space-y-1">
                  {(monthByDay[d] || []).map((c) => (
                    <div key={c.id || c.title} className="truncate">
                      {c.title}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ResidentOnCallInline() {
  const { data: me } = useCurrentUserProfile();
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Card className="space-y-3">
            <div className="text-sm font-medium">{t('onCall.today')}</div>
            <TodayPanel highlightUserId={me?.uid} />
          </Card>
        </div>
        <div className="md:col-span-1">
          <Card>
            <NextShiftCard userId={me?.uid} />
          </Card>
        </div>
      </div>
      <Card className="space-y-3">
        <div className="text-sm font-medium">{t('onCall.teamOnDate', { date: '' })}</div>
        <TeamForDate />
      </Card>
      <Card className="space-y-3">
        <div className="text-sm font-medium">{t('ui.timeline')}</div>
        <MiniCalendar />
      </Card>
    </div>
  );
}

function getFavorites(
  nodes: any[],
  onSelectById: (id: string) => void,
): Array<{ id: string; name: string; onSelect: () => void }> {
  try {
    const raw = localStorage.getItem('resident.resources.favorites');
    const hrefs: string[] = raw ? JSON.parse(raw) : [];
    // Map hrefs back to node ids if possible by matching links/mcqUrl
    const byHref: Record<string, { id: string; name: string }> = {};
    (nodes || []).forEach((n: any) => {
      if (n.mcqUrl) byHref[n.mcqUrl] = { id: n.id, name: n.name };
      (n.links || []).forEach((l: any) => {
        if (l.href) byHref[l.href] = { id: n.id, name: l.label || n.name };
      });
    });
    const unique: Record<string, boolean> = {};
    const items = hrefs
      .map((h) => byHref[h])
      .filter(Boolean)
      .filter((x) => {
        if (unique[x!.id]) return false;
        unique[x!.id] = true;
        return true;
      }) as Array<{ id: string; name: string }>;
    return items.map((it) => ({ id: it.id, name: it.name, onSelect: () => onSelectById(it.id) }));
  } catch {
    return [];
  }
}
