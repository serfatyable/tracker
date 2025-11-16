'use client';
import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { haptic } from '../../lib/utils/haptics';
import type { Audience, ReflectionTemplate } from '../../types/reflections';
import Button from '../ui/Button';

type Props = {
  audience: Audience;
  template: ReflectionTemplate;
  initialAnswers?: Record<string, string> | null;
  disabled?: boolean;
  onSubmit: (answers: Record<string, string>) => Promise<void>;
};

export default function ReflectionForm({
  audience,
  template,
  initialAnswers,
  disabled,
  onSubmit,
}: Props) {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'he' ? 'he' : 'en';

  const promptIds = useMemo(() => {
    const ids: string[] = [];
    for (const s of template.sections) {
      for (const p of s.prompts) ids.push(p.id);
    }
    return ids;
  }, [template]);

  const storageKey = useMemo(() => `reflection:${template.id}`, [template.id]);

  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const id of promptIds) init[id] = initialAnswers?.[id] ?? '';
    // Restore autosave if present
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, string>;
        return { ...init, ...saved };
      }
    } catch {
      /* noop */
    }
    return init;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autosave on change (debounced)
  useEffect(() => {
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(answers));
      } catch {
        /* noop */
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [answers, storageKey]);

  const onChange = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const validate = (): string | null => {
    for (const section of template.sections.sort((a, b) => a.order - b.order)) {
      for (const prompt of section.prompts.sort((a, b) => a.order - b.order)) {
        if (prompt.required && !answers[prompt.id]?.trim()) {
          return `Missing: ${prompt.label[lang]}`;
        }
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const v = validate();
    if (v) {
      setError(v);
      haptic('warning');
      return;
    }
    setBusy(true);
    setError(null);
    haptic('light');
    try {
      await onSubmit(answers);
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* noop */
      }
      haptic('success');
    } catch (e: any) {
      setError(e?.message || 'Submit failed');
      haptic('error');
    } finally {
      setBusy(false);
    }
  };

  const totalChars = useMemo(
    () => Object.values(answers).reduce((sum, s) => sum + (s?.length || 0), 0),
    [answers],
  );

  const getSectionCharCount = (section: typeof template.sections[0]) => {
    return section.prompts.reduce((sum, prompt) => sum + (answers[prompt.id]?.length || 0), 0);
  };

  return (
    <div className="space-y-4 pb-24 md:pb-0">
      {template.sections
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((section) => {
          const sectionChars = getSectionCharCount(section);
          return (
            <div key={section.id} className="rounded border p-3 border-gray-300 dark:border-gray-600">
              <div className="flex items-start justify-between mb-1">
                <div className="font-semibold">
                  {section.name[lang]} <span className="opacity-60 text-xs">({audience})</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {sectionChars} {sectionChars === 1 ? 'char' : 'chars'}
                </div>
              </div>
              <div className="text-xs opacity-70 mb-2">{section.purpose[lang]}</div>
              <div className="space-y-2">
                {section.prompts
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((prompt) => {
                    const charCount = answers[prompt.id]?.length || 0;
                    return (
                      <div key={prompt.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-sm font-medium text-gray-900 dark:text-white">
                            {prompt.label[lang]}
                            {prompt.required ? <span className="text-red-500"> *</span> : null}
                          </label>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{charCount}</span>
                        </div>
                        <textarea
                          disabled={disabled || busy}
                          className="w-full rounded border px-3 py-2 min-h-[120px] bg-transparent border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                          value={answers[prompt.id] || ''}
                          onChange={(e) => onChange(prompt.id, e.target.value)}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {/* Sticky submit bar on mobile */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 dark:supports-[backdrop-filter]:bg-gray-900/85 border-t border-gray-200 dark:border-gray-700 safe-area-inset-bottom shadow-lg">
        <div className="app-container p-3 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <div className="text-xs font-medium text-gray-900 dark:text-white">Total characters</div>
            <div className="text-sm font-semibold text-primary">{totalChars.toLocaleString()}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Top
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={disabled || busy}
              className="active:scale-95 transition-transform"
            >
              {busy ? 'Submitting…' : 'Submit'}
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop submit */}
      <div className="hidden md:flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex flex-col">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Total characters</div>
          <div className="text-lg font-semibold text-primary">{totalChars.toLocaleString()}</div>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={disabled || busy}
          className="active:scale-95 transition-transform"
        >
          {busy ? 'Submitting…' : 'Submit reflection'}
        </Button>
      </div>
    </div>
  );
}
