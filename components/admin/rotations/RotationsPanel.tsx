'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Badge from '../../ui/Badge';
import { Dialog, DialogHeader, DialogFooter } from '../../ui/Dialog';
import type { Rotation, RotationStatus } from '../../../types/rotations';
import {
  createRotation,
  listRotations,
  updateRotation,
  listUsers,
} from '../../../lib/firebase/admin';
import TemplateImportDialog from './TemplateImportDialog';
import { useActiveAssignments } from '../../../lib/hooks/useActiveAssignments';
import RotationOwnersEditor from './RotationOwnersEditor';

type Props = {
  onOpenEditor: (rotationId: string) => void;
};

export default function RotationsPanel({ onOpenEditor }: Props) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<RotationStatus | ''>('');
  const [items, setItems] = useState<Rotation[]>([] as any);
  const [cursor, setCursor] = useState<any | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    startDate: string;
    endDate: string;
    status: RotationStatus;
  }>({ name: '', startDate: '', endDate: '', status: 'active' });
  const [openImport, setOpenImport] = useState(false);
  const [ownersDialog, setOwnersDialog] = useState<string | null>(null);
  const [tutors, setTutors] = useState<Array<{ uid: string; fullName?: string }>>([]);
  const { assignments } = useActiveAssignments();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await listRotations({
          search: search || undefined,
          status: status || undefined,
          limit: 25,
        });
        setItems(res.items as any);
        setCursor(res.lastCursor as any);
        setHasMore((res.items?.length || 0) >= 25);
        try {
          const u = await listUsers({ role: 'tutor', status: 'active', limit: 200 });
          setTutors((u.items || []).map((x: any) => ({ uid: x.uid, fullName: x.fullName })));
        } catch (_err) {
          /* noop */
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [search, status]);

  const tutorName = (uid: string) => tutors.find((t) => t.uid === uid)?.fullName || uid;
  const residentsCountByRotation = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments) map.set(a.rotationId, (map.get(a.rotationId) || 0) + 1);
    return map;
  }, [assignments]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Input
            placeholder={t('ui.searchRotations') as string}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value as RotationStatus | '')}>
            <option value="" disabled>
              {t('ui.status')}
            </option>
            <option value="active">{t('ui.active')}</option>
            <option value="inactive">{t('ui.inactive')}</option>
            <option value="finished">{t('ui.finished')}</option>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="btn-levitate border-[rgba(0,87,184,0.35)] hover:bg-[rgba(0,150,255,0.08)] text-[rgba(0,87,184,0.95)] dark:text-[rgba(0,150,255,0.95)]"
            variant="outline"
            onClick={() => setOpen(true)}
          >
            {t('ui.create')}
          </Button>
          <a
            href="/api/templates/rotation.csv"
            className="btn-levitate inline-flex items-center rounded border px-3 py-1 text-sm hover:bg-[rgba(0,150,255,0.08)] border-[rgba(0,87,184,0.35)] text-[rgba(0,87,184,0.95)] dark:text-[rgba(0,150,255,0.95)]"
            download
          >
            {t('ui.downloadTemplate') as string}
          </a>
          <Button
            className="btn-levitate border-[rgba(0,87,184,0.35)] hover:bg-[rgba(0,150,255,0.08)] text-[rgba(0,87,184,0.95)] dark:text-[rgba(0,150,255,0.95)]"
            variant="outline"
            onClick={() => setOpenImport(true)}
          >
            {t('ui.importFromCsv')}
          </Button>
        </div>
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
              className="glass-card card-levitate p-4"
              style={{
                borderColor: (r.color || '#93c5fd') + '66',
                boxShadow: r.color ? `0 1px 2px 0 ${r.color}22` : undefined,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{name}</div>
                <div className="text-sm opacity-70">{count} residents</div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {owners.length ? (
                  owners.map((uid) => (
                    <Badge key={uid} variant="outline">
                      {tutorName(uid)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs opacity-60">No owners</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  className="btn-levitate border-[rgba(0,87,184,0.35)] hover:bg-[rgba(0,150,255,0.08)] text-[rgba(0,87,184,0.95)] dark:text-[rgba(0,150,255,0.95)]"
                  variant="outline"
                  onClick={() => window.open(`/curriculum?rotation=${r.id}`, '_self')}
                >
                  Open curriculum
                </Button>
                <Button
                  className="btn-levitate border-[rgba(0,87,184,0.35)] hover:bg-[rgba(0,150,255,0.08)] text-[rgba(0,87,184,0.95)] dark:text-[rgba(0,150,255,0.95)]"
                  variant="outline"
                  onClick={() => setOwnersDialog(r.id)}
                >
                  Manage owners
                </Button>
                <Button
                  className="btn-levitate border-[rgba(0,87,184,0.35)] hover:bg-[rgba(0,150,255,0.08)] text-[rgba(0,87,184,0.95)] dark:text-[rgba(0,150,255,0.95)]"
                  variant="outline"
                  onClick={() => setOpenImport(true)}
                >
                  Import CSV
                </Button>
                <Button
                  className="btn-levitate border-[rgba(0,87,184,0.35)] hover:bg-[rgba(0,150,255,0.08)] text-[rgba(0,87,184,0.95)] dark:text-[rgba(0,150,255,0.95)]"
                  variant="outline"
                  onClick={() => window.open(`/admin?tab=overview`, '_self')}
                >
                  View residents
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
            <label className="block text-sm font-medium">{t('ui.name')}</label>
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
              const { Timestamp } = await import('firebase/firestore');
              // Dates irrelevant for admin; store placeholders
              const start = Timestamp.fromDate(new Date());
              const end = Timestamp.fromDate(new Date());
              await createRotation({
                name: form.name,
                startDate: start,
                endDate: end,
                status: 'inactive',
              });
              setOpen(false);
              setSearch(''); // trigger refresh
            }}
          >
            {t('ui.create')}
          </Button>
        </DialogFooter>
      </Dialog>
      <TemplateImportDialog
        open={openImport}
        onClose={() => setOpenImport(false)}
        onImported={(rid) => {
          setOpenImport(false);
          setSearch('');
        }}
      />

      <Dialog open={!!ownersDialog} onClose={() => setOwnersDialog(null)}>
        <DialogHeader>Manage owners</DialogHeader>
        <div className="p-2">
          {ownersDialog ? <RotationOwnersEditor rotationId={ownersDialog} /> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOwnersDialog(null)}>
            {t('ui.cancel')}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function formatDates(r: any) {
  try {
    const s = r.startDate?.toDate ? r.startDate.toDate() : new Date(r.startDate);
    const e = r.endDate?.toDate ? r.endDate.toDate() : new Date(r.endDate);
    return `${s.toLocaleDateString()} - ${e.toLocaleDateString()}`;
  } catch {
    return '';
  }
}
