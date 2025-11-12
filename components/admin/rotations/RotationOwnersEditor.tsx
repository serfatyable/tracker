'use client';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getRotationOwners, setRotationOwners, listUsers } from '../../../lib/firebase/admin';
import { createSynonymMatcher } from '../../../lib/search/synonyms';
import { trackAdminEvent } from '../../../lib/telemetry';
import type { UserProfile } from '../../../types/auth';
import Avatar from '../../ui/Avatar';
import Button from '../../ui/Button';
import Input from '../../ui/Input';

type Props = { rotationId: string };

export default function RotationOwnersEditor({ rotationId }: Props) {
  const { t } = useTranslation();
  const [owners, setOwners] = useState<string[]>([]);
  const [tutors, setTutors] = useState<UserProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

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
  const filteredAvailable = useMemo(() => {
    const matcher = createSynonymMatcher(search);
    return available.filter(
      (tutor) => matcher(tutor.fullName || '') || matcher(tutor.uid) || matcher(tutor.email || ''),
    );
  }, [available, search]);

  async function removeOwner(uid: string) {
    const next = owners.filter((o) => o !== uid);
    setOwners(next);
    trackAdminEvent('rotation_owner_removed', { rotationId, ownerId: uid });
  }

  function makePrimary(uid: string) {
    setOwners((prev) => [uid, ...prev.filter((id) => id !== uid)]);
    trackAdminEvent('rotation_owner_primary_set', { rotationId, ownerId: uid });
  }

  async function save() {
    setSaving(true);
    try {
      await setRotationOwners(rotationId, owners);
      trackAdminEvent('rotation_owners_saved', {
        rotationId,
        ownerCount: owners.length,
        primaryOwner: owners[0] || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card-levitate p-3">
      <div className="font-semibold mb-2">{t('rotations.rotationOwners')}</div>
      <div className="space-y-3">
        <div className="space-y-2">
          {owners.length ? (
            owners.map((uid, index) => {
              const tutor = tutors.find((x) => x.uid === uid);
              const isPrimary = index === 0;
              return (
                <div
                  key={uid}
                  className="flex items-center gap-3 rounded-lg border border-muted/30 bg-[rgb(var(--surface))] px-3 py-2"
                >
                  <Avatar
                    name={tutor?.fullName || uid}
                    email={tutor && tutor.email != null ? tutor.email : undefined}
                    size={32}
                  />
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-medium text-[rgb(var(--fg))]">
                      {tutor?.fullName || uid}
                    </span>
                    {isPrimary ? (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                        {t('rotationTree.primaryOwner', { defaultValue: 'Primary owner' })}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isPrimary ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => makePrimary(uid)}
                        title={t('rotationTree.setPrimary', {
                          defaultValue: 'Set as primary owner',
                        })}
                      >
                        {t('rotationTree.makePrimary', { defaultValue: 'Primary' })}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeOwner(uid)}
                      title={t('ui.remove')}
                    >
                      {t('ui.remove')}
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <span className="text-xs text-muted">
              {t('rotations.noOwners', { defaultValue: 'No owners assigned yet.' })}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('rotationTree.searchTutors', { defaultValue: 'Search tutors' })}
          </label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('rotationTree.searchTutorsPlaceholder', {
              defaultValue: 'Search by name or email…',
            })}
          />
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-muted/30 bg-[rgb(var(--surface-elevated))] p-2">
            {filteredAvailable.length ? (
              filteredAvailable.map((tutor) => (
                <button
                  type="button"
                  key={tutor.uid}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-1 text-left hover:bg-[rgb(var(--surface))]"
                  onClick={() => {
                    setSearch('');
                    setOwners((prev) => [...prev, tutor.uid]);
                    trackAdminEvent('rotation_owner_added', {
                      rotationId,
                      ownerId: tutor.uid,
                    });
                  }}
                >
                  <Avatar
                    name={tutor.fullName || tutor.uid}
                    email={tutor.email != null ? tutor.email : undefined}
                    size={28}
                  />
                  <div className="flex-1">
                    <div className="text-sm text-[rgb(var(--fg))]">
                      {tutor.fullName || tutor.uid}
                    </div>
                    <div className="text-xs text-muted">{tutor.email}</div>
                  </div>
                  <span className="text-xs font-medium text-[rgb(var(--primary))]">
                    {t('ui.add')}
                  </span>
                </button>
              ))
            ) : (
              <div className="py-3 text-center text-xs text-muted">
                {t('rotationTree.noTutorsFound', { defaultValue: 'No matching tutors found.' })}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} variant="secondary">
            {t('ui.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
