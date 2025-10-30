import { DocumentTextIcon, LinkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AddMaterialDialog from './AddMaterialDialog';

import Card from '@/components/ui/Card';
import { deleteStudyMaterial } from '@/lib/firebase/exams';
import { getLocalized } from '@/lib/i18n/getLocalized';
import { haptic } from '@/lib/utils/haptics';
import type { Exam } from '@/types/exam';

interface StudyMaterialsTabProps {
  exam: Exam;
  isAdmin: boolean;
  userId: string;
}

export default function StudyMaterialsTab({ exam, isAdmin, userId }: StudyMaterialsTabProps) {
  const { t, i18n } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (materialId: string) => {
    if (!confirm(t('exams.admin.confirmDeleteMaterial'))) return;

    try {
      setDeletingId(materialId);
      haptic('light');
      await deleteStudyMaterial(exam.id, materialId, userId);
      haptic('success');
    } catch (error) {
      console.error('Error deleting material:', error);
      haptic('error');
      alert(t('exams.admin.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleMaterialClick = (url: string) => {
    haptic('light');
    window.open(url, '_blank');
  };

  if (exam.studyMaterials.length === 0 && !isAdmin) {
    return (
      <Card className="text-center py-12">
        <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">{t('exams.noMaterials')}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              haptic('light');
              setShowAddDialog(true);
            }}
            className="inline-flex items-center gap-2 justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <PlusIcon className="h-5 w-5" />
            {t('exams.admin.uploadStudyMaterial')}
          </button>
        </div>
      )}

      {exam.studyMaterials.length === 0 ? (
        <Card className="text-center py-12">
          <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium mb-4">{t('exams.noMaterials')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exam.studyMaterials.map((material) => {
            const title = getLocalized({
              en: material.title,
              he: material.titleHe,
              lang: i18n.language as 'en' | 'he',
            });
            const description = getLocalized({
              en: material.description,
              he: material.descriptionHe,
              lang: i18n.language as 'en' | 'he',
            });

            return (
              <Card
                key={material.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleMaterialClick(material.url)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {material.type === 'pdf' ? (
                      <DocumentTextIcon className="h-6 w-6 text-red-500" />
                    ) : (
                      <LinkIcon className="h-6 w-6 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900">{title}</h3>
                    {description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{description}</p>
                    )}
                    {material.type === 'pdf' && material.fileName && (
                      <p className="text-xs text-gray-500 mt-1">{material.fileName}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {t('common.uploaded', { defaultValue: 'Uploaded' })}{' '}
                      {material.uploadedAt.toDate().toLocaleDateString()}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(material.id);
                      }}
                      disabled={deletingId === material.id}
                      className="flex-shrink-0 text-red-600 hover:text-red-700 p-1"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {isAdmin && showAddDialog && (
        <AddMaterialDialog
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          examId={exam.id}
          userId={userId}
        />
      )}
    </div>
  );
}
