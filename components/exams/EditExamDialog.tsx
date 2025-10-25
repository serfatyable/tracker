import { Dialog } from '@headlessui/react';
import { XMarkIcon, PlusIcon, MinusCircleIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { updateExam } from '@/lib/firebase/exams';
import { haptic } from '@/lib/utils/haptics';
import type { Exam, ExamFormData, SubjectFormData } from '@/types/exam';

interface EditExamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam;
  userId: string;
}

const emptySubject: SubjectFormData = {
  titleEn: '',
  titleHe: '',
  descriptionEn: '',
  descriptionHe: '',
  topics: [],
  bookChapters: [],
  examLink: '',
};

export default function EditExamDialog({ isOpen, onClose, exam, userId }: EditExamDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert exam subjects to form data
  const initialSubjects: SubjectFormData[] = exam.subjects.map((subject) => ({
    titleEn: subject.titleEn,
    titleHe: subject.titleHe,
    descriptionEn: subject.descriptionEn || '',
    descriptionHe: subject.descriptionHe || '',
    topics: subject.topics,
    bookChapters: subject.bookChapters,
    examLink: subject.examLink || '',
  }));

  const [formData, setFormData] = useState<Partial<ExamFormData>>({
    examDate: exam.examDate.toDate(),
    examLink: exam.examLink || '',
    subjects: initialSubjects,
    isActive: exam.isActive,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate that at least one subject has titles
    const hasValidSubject = formData.subjects?.some((s) => s.titleEn.trim() && s.titleHe.trim());

    if (!hasValidSubject) {
      setError(t('exams.admin.required'));
      return;
    }

    // Filter out empty subjects
    const validSubjects = formData.subjects?.filter((s) => s.titleEn.trim() && s.titleHe.trim());

    try {
      setLoading(true);
      haptic('light');
      await updateExam(exam.id, { ...formData, subjects: validSubjects }, userId);
      haptic('success');
      onClose();
    } catch (err) {
      console.error('Error updating exam:', err);
      setError(t('exams.admin.updateError'));
      haptic('error');
    } finally {
      setLoading(false);
    }
  };

  const addSubject = () => {
    if ((formData.subjects?.length || 0) < 2) {
      setFormData({
        ...formData,
        subjects: [...(formData.subjects || []), { ...emptySubject }],
      });
      haptic('light');
    }
  };

  const removeSubject = (index: number) => {
    if ((formData.subjects?.length || 0) > 1) {
      const newSubjects = formData.subjects?.filter((_, i) => i !== index);
      setFormData({ ...formData, subjects: newSubjects });
      haptic('light');
    }
  };

  const updateSubject = (index: number, updates: Partial<SubjectFormData>) => {
    const newSubjects = formData.subjects?.map((subject, i) =>
      i === index ? { ...subject, ...updates } : subject,
    );
    setFormData({ ...formData, subjects: newSubjects });
  };

  const handleSubjectTopicsChange = (index: number, value: string) => {
    const topics = value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    updateSubject(index, { topics });
  };

  const handleSubjectChaptersChange = (index: number, value: string) => {
    const chapters = value
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    updateSubject(index, { bookChapters: chapters });
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">
              {t('exams.admin.editExam')}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Exam Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('exams.admin.examDateLabel')} *
              </label>
              <input
                type="date"
                value={formData.examDate?.toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, examDate: new Date(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loading}
              />
            </div>

            {/* Exam Link (Optional - applies to all subjects if no subject-specific link) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('exams.admin.examLink')}
              </label>
              <input
                type="url"
                value={formData.examLink || ''}
                onChange={(e) => setFormData({ ...formData, examLink: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('exams.admin.examLinkPlaceholder')}
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">{t('exams.admin.examLinkHelp')}</p>
            </div>

            {/* Subjects Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  {t('exams.admin.subjects')} *
                </label>
                {(formData.subjects?.length || 0) < 2 && (
                  <button
                    type="button"
                    onClick={addSubject}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                    disabled={loading}
                  >
                    <PlusIcon className="h-4 w-4" />
                    {t('exams.admin.addSubject')}
                  </button>
                )}
              </div>

              {formData.subjects?.map((subject, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-700">
                      {t('exams.admin.subject')} {index + 1}
                    </h4>
                    {(formData.subjects?.length || 0) > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSubject(index)}
                        className="text-red-600 hover:text-red-700"
                        disabled={loading}
                      >
                        <MinusCircleIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* Subject Title (English) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('exams.admin.subjectTitleEn')} *
                    </label>
                    <input
                      type="text"
                      value={subject.titleEn}
                      onChange={(e) => updateSubject(index, { titleEn: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      required
                      disabled={loading}
                      placeholder="e.g., Pharmacology"
                    />
                  </div>

                  {/* Subject Title (Hebrew) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('exams.admin.subjectTitleHe')} *
                    </label>
                    <input
                      type="text"
                      value={subject.titleHe}
                      onChange={(e) => updateSubject(index, { titleHe: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      dir="rtl"
                      required
                      disabled={loading}
                      placeholder="לדוגמה, פרמקולוגיה"
                    />
                  </div>

                  {/* Subject Description (English) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('exams.admin.subjectDescriptionEn')}
                    </label>
                    <textarea
                      value={subject.descriptionEn || ''}
                      onChange={(e) => updateSubject(index, { descriptionEn: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      rows={2}
                      disabled={loading}
                    />
                  </div>

                  {/* Subject Description (Hebrew) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('exams.admin.subjectDescriptionHe')}
                    </label>
                    <textarea
                      value={subject.descriptionHe || ''}
                      onChange={(e) => updateSubject(index, { descriptionHe: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      dir="rtl"
                      rows={2}
                      disabled={loading}
                    />
                  </div>

                  {/* Subject Topics */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('exams.admin.topicsLabel')}
                    </label>
                    <input
                      type="text"
                      value={subject.topics.join(', ')}
                      onChange={(e) => handleSubjectTopicsChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="Topic 1, Topic 2"
                      disabled={loading}
                    />
                  </div>

                  {/* Subject Book Chapters */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('exams.admin.bookChaptersLabel')}
                    </label>
                    <input
                      type="text"
                      value={subject.bookChapters.join(', ')}
                      onChange={(e) => handleSubjectChaptersChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="Chapter 1, Chapter 2"
                      disabled={loading}
                    />
                  </div>

                  {/* Subject-specific Exam Link */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('exams.admin.subjectLink')}
                    </label>
                    <input
                      type="url"
                      value={subject.examLink || ''}
                      onChange={(e) => updateSubject(index, { examLink: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder={t('exams.admin.subjectLinkPlaceholder')}
                      disabled={loading}
                    />
                    <p className="mt-1 text-xs text-gray-500">{t('exams.admin.subjectLinkHelp')}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={loading}
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                {t('exams.admin.isActive')}
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                {t('exams.admin.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? t('exams.admin.saving') : t('exams.admin.save')}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
