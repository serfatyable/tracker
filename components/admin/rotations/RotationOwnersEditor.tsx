'use client';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getRotationOwners, setRotationOwners, listUsers } from '../../../lib/firebase/admin';
import type { UserProfile } from '../../../types/auth';
import Button from '../../ui/Button';
import Select from '../../ui/Select';

type Props = { rotationId: string };

export default function RotationOwnersEditor({ rotationId }: Props) {
  const { t } = useTranslation();
  const [owners, setOwners] = useState<string[]>([]);
  const [tutors, setTutors] = useState<UserProfile[]>([]);
  const [adding, setAdding] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [own, t] = await Promise.all([
        getRotationOwners(rotationId),
        listUsers({ role: 'tutor', status: 'active', limit: 200 }),
      ]);
      setOwners(own);
      setTutors(t.items || []);
    })();
  }, [rotationId]);

  const available = useMemo(() => tutors.filter((t) => !owners.includes(t.uid)), [tutors, owners]);

  async function addOwner() {
    if (!adding) return;
    const next = [...new Set([...owners, adding])];
    setOwners(next);
    setAdding('');
  }

  async function removeOwner(uid: string) {
    const next = owners.filter((o) => o !== uid);
    setOwners(next);
  }

  async function save() {
    setSaving(true);
    try {
      await setRotationOwners(rotationId, owners);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card-levitate p-3">
      <div className="font-semibold mb-2">{t('rotations.rotationOwners')}</div>
      <div className="flex items-center gap-2 mb-2">
        <Select value={adding} onChange={(e) => setAdding(e.target.value)}>
          <option value="">{t('rotations.selectTutor')}</option>
          {available.map((t) => (
            <option key={t.uid} value={t.uid}>
              {t.fullName || t.uid}
            </option>
          ))}
        </Select>
        <Button onClick={addOwner} disabled={!adding}>
          Add
        </Button>
        <Button onClick={save} disabled={saving} variant="secondary">
          Save
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {owners.map((uid) => {
          const t = tutors.find((x) => x.uid === uid);
          return (
            <span key={uid} className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700">
              {(t && t.fullName) || uid}
              <button className="ml-1 text-red-600" onClick={() => removeOwner(uid)}>
                ×
              </button>
            </span>
          );
        })}
        {!owners.length ? <span className="text-xs opacity-70">No owners</span> : null}
      </div>
    </div>
  );
}
