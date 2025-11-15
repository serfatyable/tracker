'use client';
import { useTranslation } from 'react-i18next';

import type { Reflection, ReflectionTemplate } from '@/types/reflections';

type Props = {
  reflection: Reflection;
  template: ReflectionTemplate;
};

export default function ReflectionDisplay({ reflection, template }: Props) {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'he' ? 'he' : 'en';

  return (
    <div className="space-y-4">
      {template.sections
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((section) => (
          <div
            key={section.id}
            className="rounded-lg border p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          >
            <div className="font-semibold mb-1 text-gray-900 dark:text-white">
              {section.name[lang]}
              <span className="opacity-60 text-xs ml-2">({reflection.authorRole})</span>
            </div>
            <div className="text-xs opacity-70 mb-3 text-gray-600 dark:text-gray-400">
              {section.purpose[lang]}
            </div>
            <div className="space-y-3">
              {section.prompts
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((prompt) => {
                  const answer = reflection.answers[prompt.id];
                  if (!answer && !prompt.required) return null;

                  return (
                    <div key={prompt.id} className="space-y-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {prompt.label[lang]}
                        {prompt.required ? <span className="text-red-500 ml-1">*</span> : null}
                      </div>
                      <div className="text-sm p-3 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 whitespace-pre-wrap">
                        {answer || <span className="text-gray-400 italic">No response</span>}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
    </div>
  );
}
