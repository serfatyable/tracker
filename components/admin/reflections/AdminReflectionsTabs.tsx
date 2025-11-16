'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrentUserProfile } from '../../../lib/hooks/useCurrentUserProfile';
import { useReflectionSubmissions, type ReflectionFilters } from '../../../lib/hooks/useReflections';
import { useReflectionTemplates } from '../../../lib/hooks/useReflectionTemplates';
import type { Audience, Reflection, ReflectionTemplate } from '../../../types/reflections';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import Dialog from '../../ui/Dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/Tabs';

// ============================================================================
// TEMPLATES TAB
// ============================================================================

function TemplatesTab() {
  const { t, i18n } = useTranslation();
  const [audience, setAudience] = useState<Audience | ''>('');
  const [selected, setSelected] = useState<ReflectionTemplate | null>(null);
  const [confirmPublish, setConfirmPublish] = useState<ReflectionTemplate | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const {
    templates,
    loading,
    error,
    saveTemplate,
    publishTemplate,
    deleteTemplate,
    duplicateTemplate,
  } = useReflectionTemplates(audience);

  const latestPublished = templates
    .filter((t) => t.status === 'published')
    .sort((a, b) => (b.version || 0) - (a.version || 0))[0] || null;

  const handleCreateDraft = () => {
    if (!audience) return;
    setSelected(
      latestPublished
        ? {
            ...latestPublished,
            id: undefined,
            status: 'draft',
            version: (latestPublished.version || 0) + 1,
          }
        : {
            templateKey: audience === 'resident' ? 'default_resident' : 'default_tutor',
            version: 1,
            status: 'draft',
            audience,
            taskTypes: ['*'],
            sections: [],
          },
    );
  };

  const handlePublish = async () => {
    if (!confirmPublish?.id) return;
    try {
      await publishTemplate(confirmPublish.id);
      setConfirmPublish(null);
    } catch (e) {
      console.error('Failed to publish template:', e);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteTemplate(confirmDelete);
      setConfirmDelete(null);
    } catch (e) {
      console.error('Failed to delete template:', e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="audience-select" className="sr-only">
          {t('reflections.audience')}
        </label>
        <select
          id="audience-select"
          className="border rounded px-3 py-2 text-gray-900 dark:text-gray-50 bg-white dark:bg-[rgb(var(--surface-depressed))] border-gray-300 dark:border-[rgb(var(--border))]"
          value={audience}
          onChange={(e) => setAudience((e.target.value || '') as Audience | '')}
        >
          <option value="" disabled>
            {t('reflections.selectAudience')}
          </option>
          <option value="resident">{t('ui.resident')}</option>
          <option value="tutor">{t('ui.tutor')}</option>
        </select>
        <Button
          className="btn-levitate border-blue-300 hover:shadow-[0_0_0_3px_rgba(147,197,253,0.35)]"
          variant="outline"
          onClick={handleCreateDraft}
          disabled={!audience}
        >
          {t('reflections.createDraft')}
        </Button>
      </div>

      {loading && (
        <div className="space-y-2" role="status" aria-live="polite">
          <p className="sr-only">{t('reflections.loading')}</p>
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card tone="rose" variant="tinted">
          <div className="text-center py-8">
            <h3 className="font-semibold mb-2">{t('reflections.loadError')}</h3>
            <p className="text-sm opacity-70">{error}</p>
          </div>
        </Card>
      )}

      {!loading && !error && audience && templates.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[rgb(var(--surface-depressed))] border-b border-gray-200 dark:border-[rgb(var(--border))]">
                <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                  {t('reflections.name')}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                  {t('reflections.version')}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                  {t('reflections.status')}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                  {t('reflections.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {templates
                .slice()
                .sort((a, b) => (b.version || 0) - (a.version || 0))
                .map((template) => {
                  const templateName =
                    template.audience === 'tutor'
                      ? t('reflections.defaultTutorTemplate')
                      : t('reflections.defaultResidentTemplate');
                  return (
                    <tr
                      key={template.id}
                      className="border-b border-gray-200 dark:border-[rgb(var(--border))] hover:bg-gray-50 dark:hover:bg-[rgb(var(--surface-depressed))]"
                    >
                      <td className="px-4 py-3 text-sm">{templateName}</td>
                      <td className="px-4 py-3 text-sm">v{template.version}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            template.status === 'published'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                          }`}
                        >
                          {t(`reflections.${template.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="btn-levitate"
                            variant="outline"
                            onClick={() => setSelected(template)}
                          >
                            {t('reflections.edit')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => duplicateTemplate(template)}
                          >
                            {t('reflections.duplicate')}
                          </Button>
                          {template.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmDelete(template.id || null)}
                            >
                              {t('reflections.delete')}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && audience && templates.length === 0 && (
        <Card tone="slate" variant="tinted">
          <div className="text-center py-8">
            <h3 className="font-semibold mb-2">{t('reflections.noTemplatesYet')}</h3>
            <p className="text-sm opacity-70 mb-4">{t('reflections.createFirstTemplate')}</p>
            <Button onClick={handleCreateDraft}>{t('reflections.createDraft')}</Button>
          </div>
        </Card>
      )}

      {!loading && !error && !audience && (
        <div className="text-sm opacity-70 text-gray-700 dark:text-gray-50">
          {t('reflections.selectAudienceToView')}
        </div>
      )}

      {selected && (
        <TemplateEditor
          template={selected}
          onClose={() => setSelected(null)}
          onSave={saveTemplate}
          onPublish={(tmpl) => setConfirmPublish(tmpl)}
        />
      )}

      {confirmPublish && (
        <Dialog open={!!confirmPublish} onClose={() => setConfirmPublish(null)}>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-2">{t('reflections.confirmPublish')}</h2>
            <p className="text-sm opacity-70 mb-4">{t('reflections.confirmPublishMessage')}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmPublish(null)}>
                {t('reflections.cancel')}
              </Button>
              <Button onClick={handlePublish}>{t('reflections.publish')}</Button>
            </div>
          </div>
        </Dialog>
      )}

      {confirmDelete && (
        <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-2">{t('reflections.confirmDelete')}</h2>
            <p className="text-sm opacity-70 mb-4">{t('reflections.confirmDeleteMessage')}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                {t('reflections.cancel')}
              </Button>
              <Button onClick={handleDelete}>{t('reflections.delete')}</Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

// ============================================================================
// TEMPLATE EDITOR
// ============================================================================

function TemplateEditor({
  template,
  onClose,
  onSave,
  onPublish,
}: {
  template: ReflectionTemplate;
  onClose: () => void;
  onSave: (template: ReflectionTemplate) => Promise<void>;
  onPublish: (template: ReflectionTemplate) => void;
}) {
  const { t, i18n } = useTranslation();
  const [working, setWorking] = useState<ReflectionTemplate>(template);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddSection = () => {
    const idx = (working.sections?.length || 0) + 1;
    const id = `section_${idx}`;
    setWorking({
      ...working,
      sections: [
        ...(working.sections || []),
        {
          id,
          order: idx,
          name: { en: '', he: '' },
          purpose: { en: '', he: '' },
          prompts: [],
        },
      ],
    });
  };

  const handleAddPrompt = (sectionId: string) => {
    setWorking((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              prompts: [
                ...section.prompts,
                {
                  id: `${sectionId}.prompt_${section.prompts.length + 1}`,
                  order: section.prompts.length + 1,
                  label: { en: '', he: '' },
                  required: true,
                },
              ],
            }
          : section,
      ),
    }));
  };

  const handleDeleteSection = (sectionId: string) => {
    setWorking((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));
  };

  const handleDeletePrompt = (sectionId: string, promptId: string) => {
    setWorking((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              prompts: section.prompts.filter((p) => p.id !== promptId),
            }
          : section,
      ),
    }));
  };

  const handleSaveDraft = async () => {
    if (!working.sections.length) {
      setError(t('reflections.noSectionsError'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(working);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('reflections.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = () => {
    if (!working.sections.length) {
      setError(t('reflections.noSectionsError'));
      return;
    }
    onPublish(working);
  };

  return (
    <Card tone="indigo" variant="tinted">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">
              {t('reflections.editingTemplate', { version: working.version, status: working.status })}
            </h3>
            <div className="text-xs opacity-70 mt-1">{working.audience}</div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('reflections.close')}
          </Button>
        </div>

        {error && (
          <div
            className="p-3 rounded bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="space-y-3">
          {working.sections?.map((section, sIdx) => (
            <Card key={section.id} className="bg-white dark:bg-[rgb(var(--surface-depressed))]">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor={`section-name-en-${section.id}`}
                        className="block text-xs font-medium mb-1"
                      >
                        {t('reflections.sectionName')} (EN)
                      </label>
                      <input
                        id={`section-name-en-${section.id}`}
                        type="text"
                        className="w-full border rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-50 bg-white dark:bg-[rgb(var(--surface-depressed))] border-gray-300 dark:border-[rgb(var(--border))]"
                        value={section.name.en}
                        onChange={(e) => {
                          setWorking((prev) => ({
                            ...prev,
                            sections: prev.sections.map((s) =>
                              s.id === section.id ? { ...s, name: { ...s.name, en: e.target.value } } : s,
                            ),
                          }));
                        }}
                        required
                      />
                    </div>
                    <div dir="rtl">
                      <label
                        htmlFor={`section-name-he-${section.id}`}
                        className="block text-xs font-medium mb-1"
                      >
                        {t('reflections.sectionNameHe')}
                      </label>
                      <input
                        id={`section-name-he-${section.id}`}
                        type="text"
                        className="w-full border rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-50 bg-white dark:bg-[rgb(var(--surface-depressed))] border-gray-300 dark:border-[rgb(var(--border))]"
                        value={section.name.he}
                        onChange={(e) => {
                          setWorking((prev) => ({
                            ...prev,
                            sections: prev.sections.map((s) =>
                              s.id === section.id ? { ...s, name: { ...s.name, he: e.target.value } } : s,
                            ),
                          }));
                        }}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddPrompt(section.id)}
                      aria-label={t('reflections.addPrompt')}
                    >
                      {t('reflections.addPrompt')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteSection(section.id)}
                      aria-label={t('reflections.deleteSection')}
                    >
                      {t('reflections.delete')}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {section.prompts.map((prompt, pIdx) => (
                    <div
                      key={prompt.id}
                      className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start p-2 rounded bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div>
                        <label
                          htmlFor={`prompt-label-en-${prompt.id}`}
                          className="block text-xs font-medium mb-1"
                        >
                          {t('reflections.promptLabel')} (EN)
                        </label>
                        <input
                          id={`prompt-label-en-${prompt.id}`}
                          type="text"
                          className="w-full border rounded px-2 py-1 text-sm text-gray-900 dark:text-gray-50 bg-white dark:bg-[rgb(var(--surface-depressed))] border-gray-300 dark:border-[rgb(var(--border))]"
                          value={prompt.label.en}
                          onChange={(e) => {
                            setWorking((prev) => ({
                              ...prev,
                              sections: prev.sections.map((s) =>
                                s.id === section.id
                                  ? {
                                      ...s,
                                      prompts: s.prompts.map((p) =>
                                        p.id === prompt.id ? { ...p, label: { ...p.label, en: e.target.value } } : p,
                                      ),
                                    }
                                  : s,
                              ),
                            }));
                          }}
                          required
                        />
                      </div>
                      <div dir="rtl">
                        <label
                          htmlFor={`prompt-label-he-${prompt.id}`}
                          className="block text-xs font-medium mb-1"
                        >
                          {t('reflections.promptLabelHe')}
                        </label>
                        <input
                          id={`prompt-label-he-${prompt.id}`}
                          type="text"
                          className="w-full border rounded px-2 py-1 text-sm text-gray-900 dark:text-gray-50 bg-white dark:bg-[rgb(var(--surface-depressed))] border-gray-300 dark:border-[rgb(var(--border))]"
                          value={prompt.label.he}
                          onChange={(e) => {
                            setWorking((prev) => ({
                              ...prev,
                              sections: prev.sections.map((s) =>
                                s.id === section.id
                                  ? {
                                      ...s,
                                      prompts: s.prompts.map((p) =>
                                        p.id === prompt.id ? { ...p, label: { ...p.label, he: e.target.value } } : p,
                                      ),
                                    }
                                  : s,
                              ),
                            }));
                          }}
                          required
                        />
                      </div>
                      <div className="col-span-full flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={!!prompt.required}
                            onChange={(e) => {
                              setWorking((prev) => ({
                                ...prev,
                                sections: prev.sections.map((s) =>
                                  s.id === section.id
                                    ? {
                                        ...s,
                                        prompts: s.prompts.map((p) =>
                                          p.id === prompt.id ? { ...p, required: e.target.checked } : p,
                                        ),
                                      }
                                    : s,
                                ),
                              }));
                            }}
                            className="rounded"
                          />
                          {t('reflections.required')}
                        </label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeletePrompt(section.id, prompt.id)}
                        >
                          {t('reflections.deletePrompt')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}

          <Button variant="outline" onClick={handleAddSection}>
            {t('reflections.addSection')}
          </Button>
        </div>

        <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-[rgb(var(--border))]">
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
            {saving ? t('reflections.saving') : t('reflections.saveDraft')}
          </Button>
          <Button onClick={handlePublish} disabled={saving || !working.id}>
            {t('reflections.publish')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t('reflections.cancel')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// SUBMISSIONS TAB
// ============================================================================

function SubmissionsTab() {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState<ReflectionFilters>({
    role: 'all',
    taskType: 'all',
    searchQuery: '',
  });
  const [selected, setSelected] = useState<Reflection | null>(null);
  const [comment, setComment] = useState('');
  const { data: currentUser } = useCurrentUserProfile();

  const { reflections, loading, error, addAdminComment } = useReflectionSubmissions(filters);

  const handleSaveComment = async () => {
    if (!selected?.id || !currentUser) return;
    try {
      await addAdminComment(selected.id, comment, currentUser.uid);
      setSelected(null);
      setComment('');
    } catch (e) {
      console.error('Failed to save comment:', e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3">
          <div>
            <label htmlFor="role-filter" className="block text-xs font-medium mb-1">
              {t('reflections.filterByRole')}
            </label>
            <select
              id="role-filter"
              className="border rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-50 bg-white dark:bg-[rgb(var(--surface-depressed))] border-gray-300 dark:border-[rgb(var(--border))]"
              value={filters.role || 'all'}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, role: e.target.value as typeof filters.role }))
              }
            >
              <option value="all">{t('reflections.allRoles')}</option>
              <option value="resident">{t('ui.resident')}</option>
              <option value="tutor">{t('ui.tutor')}</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label htmlFor="search-filter" className="block text-xs font-medium mb-1">
              {t('reflections.searchSubmissions')}
            </label>
            <input
              id="search-filter"
              type="search"
              placeholder={t('reflections.searchSubmissions')}
              className="w-full border rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-50 bg-white dark:bg-[rgb(var(--surface-depressed))] border-gray-300 dark:border-[rgb(var(--border))]"
              value={filters.searchQuery || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            />
          </div>
        </div>
      </Card>

      {/* Loading state */}
      {loading && (
        <div className="space-y-2" role="status" aria-live="polite">
          <p className="sr-only">{t('reflections.loading')}</p>
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
            </Card>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card tone="rose" variant="tinted">
          <div className="text-center py-8">
            <h3 className="font-semibold mb-2">{t('reflections.loadError')}</h3>
            <p className="text-sm opacity-70">{error}</p>
          </div>
        </Card>
      )}

      {/* Results */}
      {!loading && !error && reflections.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('reflections.showingResults', { count: reflections.length })}
          </div>
          {reflections.map((reflection) => (
            <Card key={reflection.id}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="font-medium">
                    {reflection.taskType} — {reflection.authorRole}
                  </div>
                  <div className="text-xs opacity-70 mt-1">{reflection.taskOccurrenceId}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs opacity-70">
                    {reflection.submittedAt?.toDate?.()?.toLocaleDateString(i18n.language, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelected(reflection)}>
                    {t('reflections.open')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && reflections.length === 0 && (
        <Card tone="slate" variant="tinted">
          <div className="text-center py-8">
            <h3 className="font-semibold mb-2">{t('reflections.noSubmissionsYet')}</h3>
            {filters.searchQuery && (
              <p className="text-sm opacity-70">{t('reflections.noMatchingSubmissions')}</p>
            )}
          </div>
        </Card>
      )}

      {/* Reflection detail dialog */}
      {selected && (
        <Dialog open={!!selected} onClose={() => setSelected(null)}>
          <div className="p-6 max-w-3xl">
            <h2 className="text-lg font-semibold mb-4">{t('reflections.reflectionDetail')}</h2>

            <div className="space-y-4 mb-6">
              {Object.entries(selected.answers).map(([promptId, answer]) => (
                <div key={promptId} className="border-b pb-3 last:border-0">
                  <div className="text-sm font-medium mb-1 opacity-70">{promptId}</div>
                  <div className="text-sm whitespace-pre-wrap">{answer}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <label htmlFor="admin-comment" className="block text-sm font-medium">
                {t('reflections.adminComment')}
              </label>
              <input
                id="admin-comment"
                type="text"
                className="w-full border rounded px-3 py-2 text-gray-900 dark:text-gray-50 bg-white dark:bg-[rgb(var(--surface-depressed))] border-gray-300 dark:border-[rgb(var(--border))]"
                placeholder={t('reflections.adminComment')}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveComment} disabled={!comment}>
                  {t('reflections.save')}
                </Button>
                <Button variant="outline" onClick={() => setSelected(null)}>
                  {t('reflections.close')}
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminReflectionsTabs() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'templates' | 'submissions'>('templates');

  return (
    <Tabs>
      <TabsList>
        <TabsTrigger active={tab === 'templates'} onClick={() => setTab('templates')}>
          {t('ui.templates')}
        </TabsTrigger>
        <TabsTrigger active={tab === 'submissions'} onClick={() => setTab('submissions')}>
          {t('ui.submissions')}
        </TabsTrigger>
      </TabsList>

      <TabsContent hidden={tab !== 'templates'}>
        <TemplatesTab />
      </TabsContent>

      <TabsContent hidden={tab !== 'submissions'}>
        <SubmissionsTab />
      </TabsContent>
    </Tabs>
  );
}
