'use client';
import { useMemo, useState, useEffect } from 'react';

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
          return `Missing: ${prompt.label.en}`;
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

  return (
    <div className="space-y-4 pb-24 md:pb-0">
      {template.sections
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((section) => (
          <div key={section.id} className="rounded border p-3">
            <div className="font-semibold mb-1">
              {section.name.en} <span className="opacity-60 text-xs">({audience})</span>
            </div>
            <div className="text-xs opacity-70 mb-2">{section.purpose.en}</div>
            <div className="space-y-2">
              {section.prompts
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((prompt) => (
                  <div key={prompt.id} className="space-y-1">
                    <label className="block text-sm font-medium">
                      {prompt.label.en}
                      {prompt.required ? <span className="text-red-500"> *</span> : null}
                    </label>
                    <textarea
                      disabled={disabled || busy}
                      className="w-full rounded border px-3 py-2 min-h-[120px] bg-transparent"
                      value={answers[prompt.id] || ''}
                      onChange={(e) => onChange(prompt.id, e.target.value)}
                    />
                  </div>
                ))}
            </div>
          </div>
        ))}

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {/* Sticky submit bar on mobile */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/85 border-t border-muted/30 safe-area-inset-bottom">
        <div className="app-container p-3 flex items-center justify-between gap-3">
          <div className="text-xs opacity-70">{totalChars} chars</div>
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
      <div className="hidden md:flex gap-2">
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
