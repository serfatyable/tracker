'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { createRotation, listRotations, listUsers } from '../../../lib/firebase/admin';
import { useActiveAssignments } from '../../../lib/hooks/useActiveAssignments';
import type { Rotation } from '../../../types/rotations';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { Dialog, DialogHeader, DialogFooter } from '../../ui/Dialog';
import Input from '../../ui/Input';

import MaintenanceDialog from './MaintenanceDialog';
import RotationOwnersEditor from './RotationOwnersEditor';
import TemplateImportDialog from './TemplateImportDialog';

type Props = {
  onOpenEditor: (rotationId: string) => void;
};

export default function RotationsPanel({ onOpenEditor: _onOpenEditor }: Props) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Rotation[]>([] as any);
  const [_cursor, setCursor] = useState<any | undefined>(undefined);
  const [_hasMore, setHasMore] = useState(false);
  const [_loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    startDate: string;
    endDate: string;
  }>({ name: '', startDate: '', endDate: '' });
  const [openImport, setOpenImport] = useState(false);
  const [importDialogRotationId, setImportDialogRotationId] = useState<string | null>(null);
  const [ownersDialog, setOwnersDialog] = useState<string | null>(null);
  const [maintenanceDialog, setMaintenanceDialog] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [tutors, setTutors] = useState<Array<{ uid: string; fullName?: string }>>([]);
  const { assignments } = useActiveAssignments();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await listRotations({
          search: search || undefined,
          limit: 25,
        });
        setItems(res.items as any);
        setCursor(res.lastCursor as any);
        setHasMore((res.items?.length || 0) >= 25);
        try {
          const u = await listUsers({ role: 'tutor', status: 'active', limit: 200 });
          setTutors((u.items || []).map((x: any) => ({ uid: x.uid, fullName: x.fullName })));
        } catch {
          /* noop */
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [search]);

  const tutorName = (uid: string) => tutors.find((t) => t.uid === uid)?.fullName || uid;
  const residentsCountByRotation = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments) map.set(a.rotationId, (map.get(a.rotationId) || 0) + 1);
    return map;
  }, [assignments]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          className="btn-levitate border-[rgba(0,87,184,0.35)] hover:bg-[rgba(0,150,255,0.08)] text-[rgba(0,87,184,0.95)] dark:text-[rgba(0,150,255,0.95)]"
          variant="outline"
          onClick={() => setOpen(true)}
        >
          {t('ui.create')}
        </Button>
        <Button
          className="btn-levitate border-[rgba(0,87,184,0.35)] hover:bg-[rgba(0,150,255,0.08)] text-[rgba(0,87,184,0.95)] dark:text-[rgba(0,150,255,0.95)]"
          variant="outline"
          onClick={() => setOpenImport(true)}
        >
          {t('ui.import')}
        </Button>
      </div>
      <div>
        <Input
          placeholder={t('ui.searchRotations') as string}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((r) => {
          const name = String(
            i18n.language === 'he'
              ? (r as any).name_he || (r as any).name_en || (r as any).name
              : (r as any).name_en || (r as any).name,
          );
          const owners = (r.ownerTutorIds || []) as string[];
          const count = residentsCountByRotation.get(r.id) || 0;
          return (
            <div
              key={r.id}
              className="card-levitate p-4"
              style={{
                borderColor: (r.color || '#93c5fd') + '66',
                boxShadow: r.color ? `0 1px 2px 0 ${r.color}22` : undefined,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{name}</div>
                <div className="text-sm opacity-70">
                  {count} {t('ui.residents_plural')}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {owners.length ? (
                  owners.map((uid) => (
                    <Badge key={uid} variant="outline">
                      {tutorName(uid)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs opacity-60">{t('ui.noOwners')}</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  className="btn-levitate border-[rgba(0,87,184,0.35)] hover:bg-[rgba(0,150,255,0.08)] text-[rgba(0,87,184,0.95)] dark:text-[rgba(0,150,255,0.95)]"
                  variant="outline"
                  onClick={() => _onOpenEditor(r.id)}
                >
                  {t('ui.openCurriculum')}
                </Button>
                <Button
                  className="btn-levitate border-[rgba(0,87,184,0.35)] hover:bg-[rgba(0,150,255,0.08)] text-[rgba(0,87,184,0.95)] dark:text-[rgba(0,150,255,0.95)]"
                  variant="outline"
                  onClick={() => setOwnersDialog(r.id)}
                >
                  {t('ui.manageOwners')}
                </Button>
                <Button
                  className="btn-levitate border-[rgba(0,87,184,0.35)] hover:bg-[rgba(0,150,255,0.08)] text-[rgba(0,87,184,0.95)] dark:text-[rgba(0,150,255,0.95)]"
                  variant="outline"
                  onClick={() => {
                    setImportDialogRotationId(r.id);
                    setOpenImport(true);
                  }}
                >
                  {t('ui.import')}
                </Button>
                <Button
                  className="btn-levitate border-[rgba(0,87,184,0.35)] hover:bg-[rgba(0,150,255,0.08)] text-[rgba(0,87,184,0.95)] dark:text-[rgba(0,150,255,0.95)]"
                  variant="outline"
                  onClick={() => window.open(`/admin?tab=overview`, '_self')}
                >
                  {t('ui.viewResidents')}
                </Button>
                <Button
                  className="btn-levitate border-amber-500 hover:bg-amber-50 text-amber-700 dark:border-amber-500 dark:text-amber-300 dark:hover:bg-amber-900/30"
                  variant="outline"
                  onClick={() => setMaintenanceDialog({ id: r.id, name })}
                  title={t('ui.fixData')}
                >
                  🔧 {t('ui.maintenance')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogHeader>{t('ui.createRotation')}</DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white">{t('ui.name')}</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            />
          </div>
          {/* Dates and status hidden per spec for admin rotations */}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t('ui.cancel')}
          </Button>
          <Button
            onClick={async () => {
              // Validate: name must not be empty
              if (!form.name.trim()) {
                alert(t('admin.rotations.enterName'));
                return;
              }

              try {
                const { Timestamp } = await import('firebase/firestore');
                // Dates irrelevant for admin; store placeholders
                const start = Timestamp.fromDate(new Date());
                const end = Timestamp.fromDate(new Date());
                await createRotation({
                  name: form.name,
                  startDate: start,
                  endDate: end,
                });
                setOpen(false);
                setSearch(''); // trigger refresh
              } catch (error) {
                alert(
                  t('admin.rotations.createFailed') +
                    ': ' +
                    (error instanceof Error ? error.message : String(error)),
                );
              }
            }}
          >
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
        onImported={() => {
          setOpenImport(false);
          setImportDialogRotationId(null);
          setSearch('');
        }}
        rotationId={importDialogRotationId || undefined}
      />

      <Dialog open={!!ownersDialog} onClose={() => setOwnersDialog(null)}>
        <DialogHeader>{t('admin.rotations.manageOwners')}</DialogHeader>
        <div className="p-2">
          {ownersDialog ? <RotationOwnersEditor rotationId={ownersDialog} /> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOwnersDialog(null)}>
            {t('ui.cancel')}
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
    </div>
  );
}

function _formatDates(r: any) {
  try {
    const s = r.startDate?.toDate ? r.startDate.toDate() : new Date(r.startDate);
    const e = r.endDate?.toDate ? r.endDate.toDate() : new Date(r.endDate);
    return `${s.toLocaleDateString()} - ${e.toLocaleDateString()}`;
  } catch {
    return '';
  }
}
