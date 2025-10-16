'use client';
import { useMemo, useState } from 'react';

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

  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const id of promptIds) init[id] = initialAnswers?.[id] ?? '';
    return init;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(answers);
    } catch (e: any) {
      setError(e?.message || 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
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
                      className="w-full rounded border px-3 py-2 min-h-[88px] bg-transparent"
                      value={answers[prompt.id] || ''}
                      onChange={(e) => onChange(prompt.id, e.target.value)}
                    />
                  </div>
                ))}
            </div>
          </div>
        ))}

      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={disabled || busy}>
          {busy ? 'Submitting…' : 'Submit reflection'}
        </Button>
      </div>
    </div>
  );
}
