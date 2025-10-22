'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppShell from '../../components/layout/AppShell';
import LargeTitleHeader from '../../components/layout/LargeTitleHeader';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function SearchPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [mine, setMine] = useState<boolean>(false);
  const [status, setStatus] = useState<'pending' | 'approved' | ''>('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: implement global search (rotations, items, meetings, on-call)
  }

  return (
    <AppShell>
      <LargeTitleHeader title={t('ui.search', { defaultValue: 'Search' }) as string} />
      <div className="app-container p-4 space-y-4">
        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('bottomNav.searchInCurriculum') as string}
            className="w-full"
          />
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <label className="pill text-xs inline-flex items-center gap-2">
              <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
              <span>{t('ui.mine', { defaultValue: 'Mine' })}</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="pill text-xs"
            >
              <option value="">{t('ui.status')}</option>
              <option value="pending">{t('ui.pending')}</option>
              <option value="approved">{t('ui.approved')}</option>
            </select>
            <Button type="submit" className="pill text-xs">
              {t('ui.search')}
            </Button>
          </div>
        </form>
        <div className="text-sm opacity-70">
          {t('ui.comingSoon', { defaultValue: 'Coming soon' })}
        </div>
      </div>
    </AppShell>
  );
}
