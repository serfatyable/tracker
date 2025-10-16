'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useResidentActiveRotation } from '../../lib/hooks/useResidentActiveRotation';
import { useRotationNodes } from '../../lib/hooks/useRotationNodes';
import Button from '../ui/Button';
import EmptyState, { DocumentIcon } from '../ui/EmptyState';
import Input from '../ui/Input';

type ResourceItem = { type: 'mcq' | 'link'; href: string; label: string; nodeId: string };

export default function Resources({
  onOpenRotation,
}: {
  onOpenRotation?: (rotationId: string, itemId?: string) => void;
}) {
  const { t } = useTranslation();
  const { rotationId } = useResidentActiveRotation();
  const { nodes } = useRotationNodes(rotationId || null);
  const [scope, setScope] = useState<'' | 'current' | 'all'>('');
  const [search, setSearch] = useState('');
  const [allNodes, setAllNodes] = useState<any[]>([]);

  useEffect(() => {
    // Lazy-load all nodes using same pattern as RotationBrowser when needed
    (async () => {
      if (scope !== 'all') return;
      if (allNodes.length > 0) return;
      try {
        const { getFirestore, getDocs, collection } = await import('firebase/firestore');
        const { getFirebaseApp } = await import('../../lib/firebase/client');
        const db = getFirestore(getFirebaseApp());
        const snap = await getDocs(collection(db, 'rotationNodes'));
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setAllNodes(list);
      } catch {
        /* noop */
      }
    })();
  }, [scope, allNodes.length]);

  const items = useMemo(() => {
    const source = scope === 'all' ? allNodes : nodes;
    const collect = (n: any): ResourceItem[] => [
      ...(n.mcqUrl ? [{ type: 'mcq', href: n.mcqUrl, label: n.name, nodeId: n.id }] : []),
      ...(n.links || [])
        .filter((l: any) => l.href)
        .map((l: any) => ({ type: 'link', href: l.href, label: l.label || n.name, nodeId: n.id })),
    ];
    const list = source.flatMap(collect);
    const q = search.trim().toLowerCase();
    return q ? list.filter((i) => (i.label + ' ' + i.href).toLowerCase().includes(q)) : list;
  }, [nodes, allNodes, scope, search]);

  const favoritesKey = 'resident.resources.favorites';
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(favoritesKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(favoritesKey, JSON.stringify(favorites));
    } catch {
      /* noop */
    }
  }, [favorites]);

  function toggleFavorite(href: string) {
    setFavorites((list) =>
      list.includes(href) ? list.filter((h) => h !== href) : [...list, href],
    );
  }

  const [favOpen, setFavOpen] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-full">
          <Input
            placeholder={t('ui.searchRotationsOrItems') as string}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-levitate text-sm"
          value={scope}
          onChange={(e) => setScope(e.target.value as 'current' | 'all')}
        >
          {scope === 'current' || scope === 'all' ? null : (
            <option value="" disabled>
              {t('ui.allActiveRotations', { defaultValue: 'All/Active rotations' })}
            </option>
          )}
          <option value="all">{t('ui.all', { defaultValue: 'All rotations' })}</option>
          <option value="current">{t('ui.active', { defaultValue: 'Active rotations' })}</option>
        </select>
      </div>
      {favorites.length > 0 ? (
        <div>
          <div className="text-sm font-medium mb-1 flex items-center justify-between">
            <span>{t('dashboard.favorites')}</span>
            <button className="text-xs text-gray-500" onClick={() => setFavOpen((v) => !v)}>
              {favOpen ? 'Hide' : 'Show'}
            </button>
          </div>
          {favOpen ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-3">
              {items
                .filter((it) => favorites.includes(it.href))
                .map((it) => (
                  <div key={it.href} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm truncate" title={it.label}>
                        {it.label}
                      </div>
                      <button
                        className={`text-sm ${favorites.includes(it.href) ? 'text-amber-500' : 'text-gray-400'}`}
                        title={favorites.includes(it.href) ? 'Unfavorite' : 'Favorite'}
                        onClick={() => toggleFavorite(it.href)}
                      >
                        ★
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 truncate" title={it.href}>
                      {it.href}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <a
                        href={it.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline"
                      >
                        Open
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onOpenRotation && onOpenRotation(rotationId || '', it.nodeId)
                        }
                      >
                        {t('ui.open') || 'Open'}
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {items.length === 0 ? (
        <EmptyState
          icon={<DocumentIcon size={40} />}
          title={t('ui.noResources', { defaultValue: 'No resources' })}
          description={
            search.trim()
              ? t('ui.noResourcesMatch', {
                  defaultValue: 'No resources match your search.',
                })
              : t('ui.noResourcesAvailable', {
                  defaultValue: 'No resources are available for this rotation.',
                })
          }
          className="py-6"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items
            .filter((it) => !favorites.includes(it.href))
            .map((it) => (
              <div key={it.href} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm truncate" title={it.label}>
                    {it.label}
                  </div>
                  <button
                    className={`text-sm ${favorites.includes(it.href) ? 'text-amber-500' : 'text-gray-400'}`}
                    title={favorites.includes(it.href) ? 'Unfavorite' : 'Favorite'}
                    onClick={() => toggleFavorite(it.href)}
                  >
                    ★
                  </button>
                </div>
                <div className="text-xs text-gray-500 truncate" title={it.href}>
                  {it.href}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <a href={it.href} target="_blank" rel="noreferrer" className="text-xs underline">
                    Open
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenRotation && onOpenRotation(rotationId || '', it.nodeId)}
                  >
                    {t('ui.open') || 'Open'}
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
