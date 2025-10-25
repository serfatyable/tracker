import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { addStudyMaterial } from '@/lib/firebase/exams';
import { haptic } from '@/lib/utils/haptics';
import type { MaterialFormData } from '@/types/exam';

interface AddMaterialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string;
  userId: string;
}

export default function AddMaterialDialog({
  isOpen,
  onClose,
  examId,
  userId,
}: AddMaterialDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<MaterialFormData>({
    type: 'pdf',
    title: '',
    titleHe: '',
    url: '',
    file: undefined,
    description: '',
    descriptionHe: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim() || !formData.titleHe.trim()) {
      setError(t('exams.admin.required'));
      return;
    }

    if (formData.type === 'pdf' && !formData.file) {
      setError(t('exams.admin.selectFile'));
      return;
    }

    if (formData.type === 'link' && !formData.url?.trim()) {
      setError(t('exams.admin.linkUrl'));
      return;
    }

    try {
      setLoading(true);
      haptic('light');
      await addStudyMaterial(examId, formData, userId);
      haptic('success');
      onClose();
      // Reset form
      setFormData({
        type: 'pdf',
        title: '',
        titleHe: '',
        url: '',
        file: undefined,
        description: '',
        descriptionHe: '',
      });
    } catch (err) {
      console.error('Error adding material:', err);
      setError(t('exams.admin.uploadError'));
      haptic('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">
              {t('exams.admin.uploadStudyMaterial')}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Material Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('exams.admin.materialType')} *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="pdf"
                    checked={formData.type === 'pdf'}
                    onChange={(_e) =>
                      setFormData({ ...formData, type: 'pdf', url: '', file: undefined })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    disabled={loading}
                  />
                  <span className="ml-2 text-sm text-gray-700">{t('exams.admin.uploadPdf')}</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="link"
                    checked={formData.type === 'link'}
                    onChange={(_e) => setFormData({ ...formData, type: 'link', file: undefined })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    disabled={loading}
                  />
                  <span className="ml-2 text-sm text-gray-700">{t('exams.admin.addLink')}</span>
                </label>
              </div>
            </div>

            {/* Title (English) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('exams.admin.materialTitle')} *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loading}
                placeholder="e.g., Pharmacology Chapter 5 Notes"
              />
            </div>

            {/* Title (Hebrew) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('exams.admin.materialTitleHe')} *
              </label>
              <input
                type="text"
                value={formData.titleHe}
                onChange={(e) => setFormData({ ...formData, titleHe: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                dir="rtl"
                required
                disabled={loading}
              />
            </div>

            {/* File upload for PDF */}
            {formData.type === 'pdf' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('exams.admin.selectFile')} *
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loading}
                />
              </div>
            )}

            {/* URL for link */}
            {formData.type === 'link' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('exams.admin.linkUrl')} *
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loading}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            )}

            {/* Description (English) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('exams.admin.materialDescription')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                disabled={loading}
              />
            </div>

            {/* Description (Hebrew) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('exams.admin.materialDescriptionHe')}
              </label>
              <textarea
                value={formData.descriptionHe}
                onChange={(e) => setFormData({ ...formData, descriptionHe: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                dir="rtl"
                rows={3}
                disabled={loading}
              />
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
                {loading ? t('exams.admin.uploading') : t('exams.admin.upload')}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
