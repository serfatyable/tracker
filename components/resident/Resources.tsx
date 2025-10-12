'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResidentActiveRotation } from '../../lib/hooks/useResidentActiveRotation';
import { useRotationNodes } from '../../lib/hooks/useRotationNodes';
import Input from '../ui/Input';
import Button from '../ui/Button';

type ResourceItem = { type: 'mcq' | 'link'; href: string; label: string; nodeId: string };

export default function Resources({
  onOpenRotation,
}: {
  onOpenRotation?: (rotationId: string, itemId?: string) => void;
}) {
  const { t } = useTranslation();
  const { rotationId } = useResidentActiveRotation();
  const { nodes } = useRotationNodes(rotationId || null);
  const [scope, setScope] = useState<'current' | 'all'>('current');
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
      } catch (_err) {
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
    } catch (_err) {
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
        <button
          type="button"
          aria-label="Toggle scope"
          title={scope === 'current' ? 'Current' : 'All'}
          onClick={() => setScope((s) => (s === 'current' ? 'all' : 'current'))}
          className="rounded-full px-2 py-0.5 text-xs border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50"
        >
          {scope === 'current' ? 'current' : 'all'}
        </button>
      </div>
      {favorites.length > 0 ? (
        <div>
          <div className="text-sm font-medium mb-1 flex items-center justify-between">
            <span>Favorites</span>
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
        <div className="text-sm text-gray-500">{t('ui.noItems') || 'No items'}</div>
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
