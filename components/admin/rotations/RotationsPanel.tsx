'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  createRotation,
  duplicateRotation,
  listRotations,
  listUsers,
  updateRotation,
} from '../../../lib/firebase/admin';
import { useActiveAssignments } from '../../../lib/hooks/useActiveAssignments';
import { createSynonymMatcher } from '../../../lib/search/synonyms';
import { trackAdminEvent } from '../../../lib/telemetry';
import type { Rotation, RotationStatus, RotationSource } from '../../../types/rotations';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { Dialog, DialogHeader, DialogFooter } from '../../ui/Dialog';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Toast from '../../ui/Toast';

import MaintenanceDialog from './MaintenanceDialog';
import RotationOwnersEditor from './RotationOwnersEditor';
import { getRotationName, toDate, formatDateLabel } from './rotationUtils';
import TemplateImportDialog from './TemplateImportDialog';

type Props = {
  onOpenEditor: (rotationId: string) => void;
};

export default function RotationsPanel({ onOpenEditor }: Props) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { assignments } = useActiveAssignments();

  const rotationsGuideUrl =
    process.env.NEXT_PUBLIC_ROTATIONS_GUIDE_URL || '/docs/rotations-guide.html';

  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Rotation[]>([]);
  const [loading, setLoading] = useState(false);

  const [openCreate, setOpenCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createOwnerChoice, setCreateOwnerChoice] = useState('');
  const [createForm, setCreateForm] = useState<{
    name: string;
    description: string;
    color: string;
    status: RotationStatus;
    owners: string[];
    startingPoint: 'blank' | 'import';
  }>({
    name: '',
    description: '',
    color: '#60a5fa',
    status: 'active',
    owners: [],
    startingPoint: 'blank',
  });

  const [openImport, setOpenImport] = useState(false);
  const [importDialogRotationId, setImportDialogRotationId] = useState<string | null>(null);
  const [ownersDialog, setOwnersDialog] = useState<string | null>(null);
  const [maintenanceDialog, setMaintenanceDialog] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [tutors, setTutors] = useState<Array<{ uid: string; fullName?: string }>>([]);

  const [filters, setFilters] = useState<{
    status: 'all' | RotationStatus;
    owner: 'all' | string;
    residents: 'all' | 'none' | 'some';
    source: 'all' | RotationSource;
  }>({
    status: 'all',
    owner: 'all',
    residents: 'all',
    source: 'all',
  });

  const [actionsRotation, setActionsRotation] = useState<Rotation | null>(null);
  const [renameState, setRenameState] = useState<{ id: string; name: string } | null>(null);
  const [renaming, setRenaming] = useState(false);

  const [duplicateState, setDuplicateState] = useState<{
    rotation: Rotation | null;
    name: string;
    color: string;
    includeOwners: boolean;
    status: RotationStatus;
  }>({
    rotation: null,
    name: '',
    color: '#60a5fa',
    includeOwners: true,
    status: 'active',
  });
  const [duplicateLoading, setDuplicateLoading] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    variant?: 'success' | 'info' | 'warning' | 'error';
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  const residentsCountByRotation = useMemo(() => {
    const map = new Map<string, number>();
    for (const assignment of assignments) {
      map.set(assignment.rotationId, (map.get(assignment.rotationId) || 0) + 1);
    }
    return map;
  }, [assignments]);

  const statusLabels = useMemo(
    () => ({
      active: t('admin.rotations.status.active', { defaultValue: 'Active' }),
      inactive: t('admin.rotations.status.inactive', { defaultValue: 'Inactive' }),
      finished: t('admin.rotations.status.finished', { defaultValue: 'Finished' }),
    }),
    [t],
  );

  const sourceLabels = useMemo(
    () => ({
      manual: t('admin.rotations.source.manual', { defaultValue: 'Manual' }),
      import: t('admin.rotations.source.import', { defaultValue: 'Imported' }),
    }),
    [t],
  );

  const loadRotations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listRotations({ limit: 200 });
      setItems(res.items as any);
    } catch (error) {
      console.error('Failed to load rotations', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRotations();
  }, [loadRotations]);

  const refresh = useCallback(async () => {
    await loadRotations();
  }, [loadRotations]);

  const fetchTutors = useCallback(async () => {
    try {
      const response = await listUsers({ role: 'tutor', status: 'active', limit: 200 });
      setTutors((response.items || []).map((x: any) => ({ uid: x.uid, fullName: x.fullName })));
    } catch (error) {
      console.error('Failed to load tutors', error);
    }
  }, []);

  useEffect(() => {
    fetchTutors();
  }, [fetchTutors]);

  const tutorName = useCallback(
    (uid: string) => tutors.find((t) => t.uid === uid)?.fullName || uid,
    [tutors],
  );

  const availableTutorOptions = useMemo(
    () => tutors.filter((t) => !createForm.owners.includes(t.uid)),
    [tutors, createForm.owners],
  );

  const filteredItems = useMemo(() => {
    const matcher = createSynonymMatcher(search);
    const hasSearch = search.trim().length > 0;
    return items.filter((rotation) => {
      const status = (rotation.status as RotationStatus | undefined) || 'active';
      const source = (rotation.source as RotationSource | undefined) || 'manual';
      const owners = (rotation.ownerTutorIds || []) as string[];
      const residentCount = residentsCountByRotation.get(rotation.id) || 0;
      const statusMatch = filters.status === 'all' || status === filters.status;
      const ownerMatch = filters.owner === 'all' || owners.includes(filters.owner);
      const residentMatch =
        filters.residents === 'all' ||
        (filters.residents === 'none' ? residentCount === 0 : residentCount > 0);
      const sourceMatch = filters.source === 'all' || source === filters.source;
      const searchMatch =
        !hasSearch ||
        matcher(getRotationName(rotation, i18n.language)) ||
        matcher(rotation.name) ||
        matcher(rotation.name_en || '') ||
        matcher(rotation.name_he || '') ||
        matcher(rotation.description || '');

      return statusMatch && ownerMatch && residentMatch && sourceMatch && searchMatch;
    });
  }, [filters, items, residentsCountByRotation, search, i18n.language]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const aDate = toDate(a.updatedAt) || toDate(a.createdAt) || new Date(0);
      const bDate = toDate(b.updatedAt) || toDate(b.createdAt) || new Date(0);
      return bDate.getTime() - aDate.getTime();
    });
  }, [filteredItems]);

  const startRename = useCallback(
    (rotation: Rotation) => {
      setRenameState({
        id: rotation.id,
        name: getRotationName(rotation, i18n.language),
      });
      setActionsRotation(null);
    },
    [i18n.language],
  );

  const handleRenameSubmit = useCallback(async () => {
    if (!renameState) return;
    const next = renameState.name.trim();
    if (!next) return;

    const rotationId = renameState.id;
    const currentRotation = items.find((item) => item.id === rotationId) || null;
    const previousName = currentRotation ? getRotationName(currentRotation, i18n.language) : '';
    const previousNameEn = currentRotation?.name_en || previousName;
    const previousNameHe = (currentRotation as any)?.name_he || previousName;

    setRenaming(true);
    try {
      const payload: Record<string, any> = {
        name: next,
        name_en: next,
      };
      if (i18n.language === 'he') {
        payload.name_he = next;
      }
      await updateRotation(rotationId, payload as any);
      setItems((prev) =>
        prev.map((item) => (item.id === rotationId ? { ...item, ...payload } : item)),
      );
      setToast({
        message: t('admin.rotations.renameSuccess', { defaultValue: 'Rotation name updated' }),
        variant: 'success',
        actionLabel: t('ui.undo'),
        onAction: async () => {
          try {
            const revertPayload: Record<string, any> = {
              name: previousName,
              name_en: previousNameEn,
            };
            if (previousNameHe) revertPayload.name_he = previousNameHe;
            await updateRotation(rotationId, revertPayload as any);
            setItems((prev) =>
              prev.map((item) => (item.id === rotationId ? { ...item, ...revertPayload } : item)),
            );
            trackAdminEvent('rotation_rename_undo', {
              rotationId,
              restoredName: previousName,
            });
          } catch (error) {
            console.error('Failed to undo rename', error);
          }
        },
      });
      trackAdminEvent('rotation_renamed', { rotationId, newName: next });
      setRenameState(null);
    } catch (error) {
      console.error('Failed to rename rotation', error);
      alert(
        t('admin.rotations.renameFailed', { defaultValue: 'Unable to rename rotation right now.' }),
      );
    } finally {
      setRenaming(false);
    }
  }, [i18n.language, items, renameState, t]);

  const handleCreateRotation = useCallback(async () => {
    const name = createForm.name.trim();
    if (!name) {
      alert(t('admin.rotations.enterName', { defaultValue: 'Please enter a rotation name.' }));
      return;
    }
    setCreateLoading(true);
    try {
      const { Timestamp } = await import('firebase/firestore');
      const now = new Date();
      const start = Timestamp.fromDate(now);
      const end = Timestamp.fromDate(now);
      const created = await createRotation({
        name,
        startDate: start,
        endDate: end,
        color: createForm.color,
        description: createForm.description.trim() ? createForm.description.trim() : undefined,
        status: createForm.status,
        ownerTutorIds: createForm.owners,
        source: createForm.startingPoint === 'import' ? 'import' : 'manual',
      });
      setOpenCreate(false);
      setCreateForm({
        name: '',
        description: '',
        color: '#60a5fa',
        status: 'active',
        owners: [],
        startingPoint: 'blank',
      });
      setCreateOwnerChoice('');
      await refresh();
      setToast({
        message: t('admin.rotations.createSuccess', { defaultValue: 'Rotation created' }),
        variant: 'success',
      });
      trackAdminEvent('rotation_created', {
        rotationId: created.id,
        ownerCount: createForm.owners.length,
        startingPoint: createForm.startingPoint,
      });
      if (createForm.startingPoint === 'import') {
        setImportDialogRotationId(created.id);
        setOpenImport(true);
        trackAdminEvent('rotation_import_start', { rotationId: created.id });
      }
    } catch (error) {
      console.error('Failed to create rotation', error);
      alert(
        t('admin.rotations.createFailed', { defaultValue: 'Failed to create rotation' }) +
          ': ' +
          (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      setCreateLoading(false);
    }
  }, [createForm, refresh, t]);

  const openDuplicate = useCallback(
    (rotation: Rotation) => {
      setDuplicateState({
        rotation,
        name: `${getRotationName(rotation, i18n.language)} ${t('admin.rotations.copySuffix', { defaultValue: 'Copy' })}`,
        color: rotation.color || '#60a5fa',
        includeOwners: true,
        status: (rotation.status as RotationStatus | undefined) || 'active',
      });
      setActionsRotation(null);
    },
    [i18n.language, t],
  );

  const resetDuplicateState = useCallback(() => {
    if (duplicateLoading) return;
    setDuplicateState({
      rotation: null,
      name: '',
      color: '#60a5fa',
      includeOwners: true,
      status: 'active',
    });
  }, [duplicateLoading]);

  const handleDuplicateRotation = useCallback(async () => {
    const { rotation } = duplicateState;
    if (!rotation) return;
    const desiredName =
      duplicateState.name.trim() ||
      `${getRotationName(rotation, i18n.language)} ${t('admin.rotations.copySuffix', { defaultValue: 'Copy' })}`;
    setDuplicateLoading(true);
    try {
      const created = await duplicateRotation(rotation.id, {
        name: desiredName,
        color: duplicateState.color,
        status: duplicateState.status,
        ownerTutorIds: duplicateState.includeOwners ? rotation.ownerTutorIds || [] : [],
        startDate: rotation.startDate,
        endDate: rotation.endDate,
        description: rotation.description ?? '',
      });
      resetDuplicateState();
      await refresh();
      setToast({
        message: t('admin.rotations.duplicateSuccess', { defaultValue: 'Rotation duplicated' }),
        variant: 'success',
      });
      trackAdminEvent('rotation_duplicated', {
        sourceRotationId: rotation.id,
        rotationId: created.id,
        includeOwners: duplicateState.includeOwners,
      });
    } catch (error) {
      console.error('Failed to duplicate rotation', error);
      alert(
        t('admin.rotations.duplicateFailed', {
          defaultValue: 'Unable to duplicate rotation right now.',
        }),
      );
    } finally {
      setDuplicateLoading(false);
    }
  }, [duplicateState, i18n.language, refresh, resetDuplicateState, t]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setOpenCreate(true)}>
          {t('ui.create')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setImportDialogRotationId(null);
            setOpenImport(true);
          }}
        >
          {t('ui.import')}
        </Button>
        <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
          {t('ui.refresh', { defaultValue: 'Refresh' })}
        </Button>
      </div>

      <div className="rounded-lg border border-muted/30 bg-[rgb(var(--surface-elevated))] p-3 text-xs text-muted">
        {t('rotationTree.adminHelp', {
          defaultValue:
            'Need a walkthrough? Review the rotation management guide or contact the education team.',
        })}{' '}
        <button
          type="button"
          onClick={() => {
            window.open(rotationsGuideUrl, '_blank', 'noopener,noreferrer');
          }}
          className="font-medium text-[rgb(var(--primary))] underline"
        >
          {t('rotationTree.openGuide', { defaultValue: 'Open guide' })}
        </button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder={t('ui.searchRotations', { defaultValue: 'Search rotations' }) as string}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="md:max-w-sm"
        />
        {loading ? (
          <span className="text-sm text-muted md:ml-4">
            {t('ui.loading', { defaultValue: 'Loading…' })}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted">
            {t('admin.rotations.statusFilterLabel', { defaultValue: 'Status' })}
          </label>
          <Select
            value={filters.status}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                status: event.target.value as 'all' | RotationStatus,
              }))
            }
            aria-label={t('admin.rotations.filterStatus', { defaultValue: 'Filter by status' })}
          >
            <option value="all">
              {t('admin.rotations.filterStatusAll', { defaultValue: 'All statuses' })}
            </option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted">
            {t('admin.rotations.ownerFilterLabel', { defaultValue: 'Owner' })}
          </label>
          <Select
            value={filters.owner}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                owner: event.target.value,
              }))
            }
            aria-label={t('admin.rotations.filterOwner', { defaultValue: 'Filter by owner' })}
          >
            <option value="all">
              {t('admin.rotations.filterOwnerAll', { defaultValue: 'All owners' })}
            </option>
            {tutors.map((tutor) => (
              <option key={tutor.uid} value={tutor.uid}>
                {tutor.fullName || tutor.uid}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted">
            {t('admin.rotations.residentFilterLabel', { defaultValue: 'Resident count' })}
          </label>
          <Select
            value={filters.residents}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                residents: event.target.value as 'all' | 'none' | 'some',
              }))
            }
            aria-label={t('admin.rotations.filterResidents', {
              defaultValue: 'Filter by resident count',
            })}
          >
            <option value="all">
              {t('admin.rotations.filterResidentsAll', { defaultValue: 'All resident counts' })}
            </option>
            <option value="none">
              {t('admin.rotations.noResidents', { defaultValue: 'No residents' })}
            </option>
            <option value="some">
              {t('admin.rotations.hasResidents', { defaultValue: 'Has residents' })}
            </option>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted">
            {t('admin.rotations.sourceFilterLabel', { defaultValue: 'Source' })}
          </label>
          <Select
            value={filters.source}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                source: event.target.value as 'all' | RotationSource,
              }))
            }
            aria-label={t('admin.rotations.filterSource', {
              defaultValue: 'Filter by creation source',
            })}
          >
            <option value="all">
              {t('admin.rotations.filterSourceAll', { defaultValue: 'All sources' })}
            </option>
            <option value="manual">{sourceLabels.manual}</option>
            <option value="import">{sourceLabels.import}</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {sortedItems.length === 0 && !loading ? (
          <div className="col-span-full rounded-xl border border-dashed border-muted/30 p-6 text-center text-sm text-muted">
            {t('admin.rotations.emptyState', {
              defaultValue: 'No rotations match your filters yet.',
            })}
          </div>
        ) : (
          sortedItems.map((rotation) => {
            const owners = (rotation.ownerTutorIds || []) as string[];
            const residentCount = residentsCountByRotation.get(rotation.id) || 0;
            const status = (rotation.status as RotationStatus | undefined) || 'active';
            const source = (rotation.source as RotationSource | undefined) || 'manual';
            const displayName = getRotationName(rotation, i18n.language);
            const createdAt = toDate(rotation.createdAt);
            const updatedAt = toDate(rotation.updatedAt);
            const isRenaming = renameState?.id === rotation.id;
            const colorSwatch = rotation.color || '#93c5fd';

            return (
              <div
                key={rotation.id}
                className="relative overflow-hidden rounded-xl border border-muted/20 bg-[rgb(var(--surface))] p-4 shadow-sm transition hover:shadow-md"
                style={{ borderLeft: `4px solid ${colorSwatch}` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    {isRenaming && renameState ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          handleRenameSubmit();
                        }}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <Input
                          value={renameState.name}
                          onChange={(event) =>
                            setRenameState((prev) =>
                              prev ? { ...prev, name: event.target.value } : prev,
                            )
                          }
                          className="min-w-[160px] flex-1"
                          autoFocus
                        />
                        <Button size="sm" type="submit" loading={renaming}>
                          {t('ui.save')}
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          variant="ghost"
                          onClick={() => setRenameState(null)}
                        >
                          {t('ui.cancel')}
                        </Button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-[rgb(var(--fg))]">
                          {displayName}
                        </span>
                        <button
                          type="button"
                          className="text-xs font-medium text-[rgb(var(--primary))] hover:underline"
                          onClick={() => startRename(rotation)}
                        >
                          {t('ui.rename', { defaultValue: 'Rename' })}
                        </button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-muted">
                      <Badge variant="outline">{statusLabels[status]}</Badge>
                      <Badge variant="outline">{sourceLabels[source]}</Badge>
                      <Badge variant="outline">👥 {owners.length}</Badge>
                      <Badge variant="outline">🧑‍🎓 {residentCount}</Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-1 text-xs text-muted md:grid-cols-2">
                      {updatedAt ? (
                        <span>
                          {t('admin.rotations.updated', { defaultValue: 'Updated' })}:{' '}
                          {formatDateLabel(updatedAt, i18n.language)}
                        </span>
                      ) : null}
                      {createdAt ? (
                        <span>
                          {t('admin.rotations.created', { defaultValue: 'Created' })}:{' '}
                          {formatDateLabel(createdAt, i18n.language)}
                        </span>
                      ) : null}
                    </div>
                    {rotation.description ? (
                      <p className="text-sm text-muted/90">{rotation.description}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Button size="sm" onClick={() => onOpenEditor(rotation.id)}>
                      {t('ui.openCurriculum')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setActionsRotation(rotation)}
                      aria-label={t('ui.moreActions', { defaultValue: 'More actions' })}
                    >
                      ⋯
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {owners.length ? (
                    owners.slice(0, 5).map((uid) => (
                      <Badge key={uid} variant="secondary">
                        {tutorName(uid)}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted">{t('ui.noOwners')}</span>
                  )}
                  {owners.length > 5 ? (
                    <span className="text-xs text-muted">+{owners.length - 5}</span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={openCreate} onClose={() => (!createLoading ? setOpenCreate(false) : undefined)}>
        <DialogHeader>{t('ui.createRotation')}</DialogHeader>
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white">
              {t('ui.name')}
            </label>
            <Input
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white">
              {t('ui.description', { defaultValue: 'Description' })}
            </label>
            <textarea
              value={createForm.description}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={3}
              className="w-full rounded-md border border-muted/30 bg-transparent p-2 text-sm focus:border-[rgb(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                {t('admin.rotations.colorLabel', { defaultValue: 'Color' })}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={createForm.color}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, color: event.target.value }))
                  }
                  className="h-10 w-16 rounded border border-muted/40"
                />
                <span className="text-xs text-muted">{createForm.color}</span>
              </div>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                {t('admin.rotations.statusLabel', { defaultValue: 'Status' })}
              </label>
              <Select
                value={createForm.status}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    status: event.target.value as RotationStatus,
                  }))
                }
              >
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white">
              {t('rotations.rotationOwners', { defaultValue: 'Rotation owners' })}
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Select
                value={createOwnerChoice}
                onChange={(event) => setCreateOwnerChoice(event.target.value)}
                className="min-w-[180px]"
              >
                <option value="">
                  {t('rotations.selectTutor', { defaultValue: 'Select tutor' })}
                </option>
                {availableTutorOptions.map((tutor) => (
                  <option key={tutor.uid} value={tutor.uid}>
                    {tutor.fullName || tutor.uid}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                type="button"
                onClick={() => {
                  if (!createOwnerChoice) return;
                  setCreateForm((prev) => ({
                    ...prev,
                    owners: Array.from(new Set([...prev.owners, createOwnerChoice])),
                  }));
                  setCreateOwnerChoice('');
                }}
              >
                {t('ui.add')}
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {createForm.owners.map((uid) => (
                <span
                  key={uid}
                  className="flex items-center gap-1 rounded-full bg-muted/20 px-3 py-1 text-xs"
                >
                  {tutorName(uid)}
                  <button
                    type="button"
                    className="text-muted hover:text-red-500"
                    onClick={() =>
                      setCreateForm((prev) => ({
                        ...prev,
                        owners: prev.owners.filter((o) => o !== uid),
                      }))
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
              {!createForm.owners.length ? (
                <span className="text-xs text-muted">
                  {t('ui.noOwners', { defaultValue: 'No owners yet' })}
                </span>
              ) : null}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white">
              {t('admin.rotations.startingPoint', { defaultValue: 'Starting point' })}
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={createForm.startingPoint === 'blank' ? 'default' : 'outline'}
                onClick={() =>
                  setCreateForm((prev) => ({
                    ...prev,
                    startingPoint: 'blank',
                  }))
                }
              >
                {t('admin.rotations.startBlank', { defaultValue: 'Start blank' })}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={createForm.startingPoint === 'import' ? 'default' : 'outline'}
                onClick={() =>
                  setCreateForm((prev) => ({
                    ...prev,
                    startingPoint: 'import',
                  }))
                }
              >
                {t('admin.rotations.startFromTemplate', { defaultValue: 'Import template' })}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted">
              {createForm.startingPoint === 'import'
                ? t('admin.rotations.startImportHint', {
                    defaultValue:
                      'Once created, we will open the import dialog to bring in curriculum data.',
                  })
                : t('admin.rotations.startBlankHint', {
                    defaultValue: 'Create an empty rotation and add curriculum later.',
                  })}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpenCreate(false)} disabled={createLoading}>
            {t('ui.cancel')}
          </Button>
          <Button onClick={handleCreateRotation} loading={createLoading}>
            {t('ui.create')}
          </Button>
        </DialogFooter>
      </Dialog>

      <TemplateImportDialog
        open={openImport}
        onClose={() => {
          setOpenImport(false);
          setImportDialogRotationId(null);
        }}
        onImported={async (importedRotationId) => {
          await refresh();
          setOpenImport(false);
          setImportDialogRotationId(null);
          setToast({
            message: t('import.successfullyMerged', { defaultValue: 'Import complete' }),
            variant: 'success',
          });
          trackAdminEvent('rotation_import_completed', {
            rotationId: importedRotationId,
            context: importDialogRotationId ? 'merge' : 'create',
          });
        }}
        rotationId={importDialogRotationId || undefined}
      />

      <Dialog open={!!ownersDialog} onClose={() => setOwnersDialog(null)}>
        <DialogHeader>{t('admin.rotations.manageOwners')}</DialogHeader>
        <div className="p-3">
          {ownersDialog ? <RotationOwnersEditor rotationId={ownersDialog} /> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOwnersDialog(null)}>
            {t('ui.close')}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={!!actionsRotation} onClose={() => setActionsRotation(null)}>
        <DialogHeader>
          {t('admin.rotations.actionsTitle', { defaultValue: 'Rotation actions' })}
        </DialogHeader>
        <div className="space-y-2 p-4">
          <Button
            variant="outline"
            onClick={() => {
              if (!actionsRotation) return;
              onOpenEditor(actionsRotation.id);
              setActionsRotation(null);
            }}
          >
            {t('ui.openCurriculum')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (!actionsRotation) return;
              setOwnersDialog(actionsRotation.id);
              setActionsRotation(null);
            }}
          >
            {t('ui.manageOwners')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (!actionsRotation) return;
              setImportDialogRotationId(actionsRotation.id);
              setOpenImport(true);
              setActionsRotation(null);
            }}
          >
            {t('ui.import')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (!actionsRotation) return;
              router.push(`/admin/users?rotation=${actionsRotation.id}`);
              setActionsRotation(null);
            }}
          >
            {t('ui.viewResidents')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (!actionsRotation) return;
              setMaintenanceDialog({
                id: actionsRotation.id,
                name: getRotationName(actionsRotation, i18n.language),
              });
              setActionsRotation(null);
            }}
          >
            {t('ui.maintenance')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (!actionsRotation) return;
              openDuplicate(actionsRotation);
            }}
          >
            {t('admin.rotations.duplicate', { defaultValue: 'Duplicate rotation' })}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (!actionsRotation) return;
              startRename(actionsRotation);
            }}
          >
            {t('ui.rename', { defaultValue: 'Rename' })}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setActionsRotation(null)}>
            {t('ui.close')}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={!!duplicateState.rotation} onClose={resetDuplicateState}>
        <DialogHeader>
          {t('admin.rotations.duplicateTitle', { defaultValue: 'Duplicate rotation' })}
        </DialogHeader>
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white">
              {t('ui.name')}
            </label>
            <Input
              value={duplicateState.name}
              onChange={(event) =>
                setDuplicateState((prev) => ({ ...prev, name: event.target.value }))
              }
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                {t('admin.rotations.colorLabel', { defaultValue: 'Color' })}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={duplicateState.color}
                  onChange={(event) =>
                    setDuplicateState((prev) => ({ ...prev, color: event.target.value }))
                  }
                  className="h-10 w-16 rounded border border-muted/40"
                />
                <span className="text-xs text-muted">{duplicateState.color}</span>
              </div>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                {t('admin.rotations.statusLabel', { defaultValue: 'Status' })}
              </label>
              <Select
                value={duplicateState.status}
                onChange={(event) =>
                  setDuplicateState((prev) => ({
                    ...prev,
                    status: event.target.value as RotationStatus,
                  }))
                }
              >
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
            <input
              type="checkbox"
              checked={duplicateState.includeOwners}
              onChange={(event) =>
                setDuplicateState((prev) => ({
                  ...prev,
                  includeOwners: event.target.checked,
                }))
              }
            />
            {t('admin.rotations.keepOwners', { defaultValue: 'Keep the same owners' })}
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={resetDuplicateState} disabled={duplicateLoading}>
            {t('ui.cancel')}
          </Button>
          <Button onClick={handleDuplicateRotation} loading={duplicateLoading}>
            {t('admin.rotations.duplicate', { defaultValue: 'Duplicate rotation' })}
          </Button>
        </DialogFooter>
      </Dialog>

      {maintenanceDialog && (
        <MaintenanceDialog
          open={true}
          onClose={() => setMaintenanceDialog(null)}
          rotationId={maintenanceDialog.id}
          rotationName={maintenanceDialog.name}
        />
      )}

      <Toast
        message={toast?.message ?? null}
        variant={toast?.variant}
        actionLabel={toast?.actionLabel}
        onAction={toast?.onAction}
        onClear={() => setToast(null)}
      />
    </div>
  );
}
