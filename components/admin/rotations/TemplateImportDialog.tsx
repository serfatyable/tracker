'use client';

import { useState } from 'react';
import { Dialog, DialogHeader, DialogFooter } from '../../ui/Dialog';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import { importRotationFromCsv } from '../../../lib/firebase/admin';
import { useTranslation } from 'react-i18next';

type Props = { open: boolean; onClose: () => void; onImported: (rotationId: string) => void };

export default function TemplateImportDialog({ open, onClose, onImported }: Props) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'create' | 'merge'>('create');
  const [errors, setErrors] = useState<string[]>([]);

  async function doImport() {
    if (!file) return;
    const csvText = await file.text();
    const res = await importRotationFromCsv({
      mode,
      csvText,
      rotationMeta:
        mode === 'create'
          ? {
              name: `Imported ${new Date().toISOString().slice(0, 10)}`,
              startDate: (await import('firebase/firestore')).Timestamp.fromDate(new Date()),
              endDate: (await import('firebase/firestore')).Timestamp.fromDate(new Date()),
              status: 'active',
            }
          : undefined,
    });
    if (res.errors.length) {
      setErrors(res.errors);
      return;
    }
    onImported(res.rotationId);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>{t('ui.importFromCsv')}</DialogHeader>
      <div className="space-y-3">
        <div>
          <a className="text-sm text-teal-700 underline" href="/api/templates/rotation.csv">
            {t('ui.downloadTemplate')}
          </a>
        </div>
        <div>
          <Input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <div>
          <label className="block text-sm font-medium">{t('ui.mode')}</label>
          <Select value={mode} onChange={(e) => setMode(e.target.value as 'create' | 'merge')}>
            <option value="create">{t('ui.createNewRotation')}</option>
            <option value="merge">{t('ui.mergeIntoExisting')}</option>
          </Select>
        </div>
        {errors.length ? (
          <div className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800">
            {errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        ) : null}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          {t('ui.cancel')}
        </Button>
        <Button onClick={doImport}>{t('ui.import')}</Button>
      </DialogFooter>
    </Dialog>
  );
}
