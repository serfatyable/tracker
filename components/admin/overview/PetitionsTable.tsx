'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  listRotationPetitions,
  approveRotationPetition,
  denyRotationPetition,
  listRotations,
} from '../../../lib/firebase/admin';
import type { RotationPetition } from '../../../types/rotationPetitions';
import { TableSkeleton } from '../../dashboard/Skeleton';
import Button from '../../ui/Button';
import EmptyState, { ChecklistIcon } from '../../ui/EmptyState';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import { Table, THead, TBody, TR, TH, TD } from '../../ui/Table';
import Toast from '../../ui/Toast';

export default function PetitionsTable() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<RotationPetition[]>([]);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null,
  );
  const [type, setType] = useState<'activate' | 'finish' | ''>('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'denied' | ''>('');
  const [rotationId, setRotationId] = useState('');
  const [residentQuery, setResidentQuery] = useState('');
  const [rotOptions, setRotOptions] = useState<Array<{ id: string; label: string }>>([]);

  useEffect(() => {
    (async () => {
      const r = await listRotations({ limit: 200 });
      setRotOptions(
        r.items.map((x: any) => ({
          id: x.id,
          label: String(
            i18n.language === 'he' ? x.name_he || x.name_en || x.name : x.name_en || x.name,
          ),
        })),
      );
    })();
  }, [i18n.language]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listRotationPetitions({
        status: status || undefined,
        type: type || undefined,
        rotationId: rotationId || undefined,
        residentQuery: residentQuery || undefined,
        limit: 50,
      });
      setItems(res.items);
      setSel({});
    } catch (error) {
      console.error('Failed to load petitions:', error);
    } finally {
      setLoading(false);
    }
  }, [type, status, rotationId, residentQuery]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function idsSelected() {
    return Object.keys(sel).filter((k) => sel[k]);
  }

  return (
    <>
      <Toast
        message={toast?.message || null}
        variant={toast?.variant}
        onClear={() => setToast(null)}
      />
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Select value={rotationId} onChange={(e) => setRotationId(e.target.value)}>
              <option value="" disabled>
                Rotations
              </option>
              {rotOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select value={type} onChange={(e) => setType((e.target.value || '') as any)}>
              <option value="" disabled>
                Progress
              </option>
              <option value="activate">{t('overview.type.activate') || 'Activate'}</option>
              <option value="finish">{t('overview.type.finish') || 'Finish'}</option>
            </Select>
            <Select value={status} onChange={(e) => setStatus((e.target.value || '') as any)}>
              <option value="" disabled>
                Status
              </option>
              <option value="pending">{t('overview.status.pending') || 'Pending'}</option>
              <option value="approved">{t('overview.status.approved') || 'Approved'}</option>
              <option value="denied">{t('overview.status.denied') || 'Denied'}</option>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder={t('ui.users') as string}
              value={residentQuery}
              onChange={(e) => setResidentQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={3} columns={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ChecklistIcon />}
            title={t('overview.noPetitions', { defaultValue: 'No petitions found' })}
            description={
              status || type || rotationId || residentQuery
                ? t('overview.tryDifferentFilters', {
                    defaultValue: 'Try adjusting your filters or search.',
                  })
                : t('overview.petitionsAppearHere', {
                    defaultValue: 'Rotation activation and completion requests will appear here.',
                  })
            }
          />
        ) : (
          <div className="overflow-x-container">
            <div className="inline-block min-w-[56rem] align-top">
              <Table className="w-full">
                <THead>
                  <TR>
                    <TH>
                      <input
                        type="checkbox"
                        checked={items.length > 0 && items.every((x) => sel[x.id])}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const next: Record<string, boolean> = {};
                          items.forEach((x) => (next[x.id] = checked));
                          setSel(next);
                        }}
                      />
                    </TH>
                    <TH>{t('ui.users')}</TH>
                    <TH>{t('ui.rotations')}</TH>
                    <TH>{t('overview.type') || 'Type'}</TH>
                    <TH>{t('ui.status')}</TH>
                    <TH>{t('ui.open')}</TH>
                  </TR>
                </THead>
                <TBody>
                  {items.map((p) => (
                    <TR key={p.id}>
                      <TD>
                        <input
                          type="checkbox"
                          checked={!!sel[p.id]}
                          onChange={(e) => setSel((s) => ({ ...s, [p.id]: e.target.checked }))}
                        />
                      </TD>
                      <TD className="break-anywhere">{p.residentId}</TD>
                      <TD className="break-anywhere">{p.rotationId}</TD>
                      <TD>
                        <span
                          className={
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ' +
                            (p.type === 'activate'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200')
                          }
                        >
                          {p.type}
                        </span>
                      </TD>
                      <TD>
                        <span
                          className={
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ' +
                            (p.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                              : p.status === 'approved'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200')
                          }
                        >
                          {p.status}
                        </span>
                      </TD>
                      <TD className="text-right">
                        <Button
                          size="sm"
                          className="btn-levitate border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30"
                          variant="outline"
                          loading={actionLoading[`approve-${p.id}`]}
                          onClick={async () => {
                            setActionLoading((prev) => ({ ...prev, [`approve-${p.id}`]: true }));
                            try {
                              await approveRotationPetition(p.id, 'admin');
                              setToast({
                                message: t('overview.petitionApproved', {
                                  defaultValue: 'Petition approved successfully',
                                }),
                                variant: 'success',
                              });
                            } catch {
                              setToast({
                                message: t('overview.petitionApproveFailed', {
                                  defaultValue: 'Failed to approve petition. Please try again.',
                                }),
                                variant: 'error',
                              });
                            } finally {
                              setActionLoading((prev) => ({ ...prev, [`approve-${p.id}`]: false }));
                              refresh();
                            }
                          }}
                        >
                          {t('overview.actions.approve') || 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          className="btn-levitate border-red-500 text-red-700 hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-900/30"
                          variant="outline"
                          loading={actionLoading[`deny-${p.id}`]}
                          onClick={async () => {
                            setActionLoading((prev) => ({ ...prev, [`deny-${p.id}`]: true }));
                            try {
                              await denyRotationPetition(p.id, 'admin');
                              setToast({
                                message: t('overview.petitionDenied', {
                                  defaultValue: 'Petition denied',
                                }),
                                variant: 'success',
                              });
                            } catch {
                              setToast({
                                message: t('overview.petitionDenyFailed', {
                                  defaultValue: 'Failed to deny petition. Please try again.',
                                }),
                                variant: 'error',
                              });
                            } finally {
                              setActionLoading((prev) => ({ ...prev, [`deny-${p.id}`]: false }));
                              refresh();
                            }
                          }}
                        >
                          {t('overview.actions.deny') || 'Deny'}
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            className="btn-levitate border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30"
            disabled={loading || idsSelected().length === 0}
            loading={bulkActionLoading}
            variant="outline"
            onClick={async () => {
              setBulkActionLoading(true);
              const selectedCount = idsSelected().length;
              try {
                for (const id of idsSelected()) {
                  try {
                    await approveRotationPetition(id, 'admin');
                  } catch {
                    /* noop */
                  }
                }
                await refresh();
                setToast({
                  message: t('overview.bulkApproveSuccess', {
                    defaultValue: `Successfully approved ${selectedCount} petition(s)`,
                    count: selectedCount,
                  }),
                  variant: 'success',
                });
              } catch {
                setToast({
                  message: t('overview.bulkApproveFailed', {
                    defaultValue: 'Some petitions could not be approved. Please try again.',
                  }),
                  variant: 'error',
                });
              } finally {
                setBulkActionLoading(false);
                setSel({});
              }
            }}
          >
            {t('overview.actions.approve') || 'Approve'}
          </Button>
          <Button
            className="btn-levitate border-red-500 text-red-700 hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-900/30"
            disabled={loading || idsSelected().length === 0}
            loading={bulkActionLoading}
            variant="outline"
            onClick={async () => {
              setBulkActionLoading(true);
              const selectedCount = idsSelected().length;
              try {
                for (const id of idsSelected()) {
                  await denyRotationPetition(id, 'admin');
                }
                await refresh();
                setToast({
                  message: t('overview.bulkDenySuccess', {
                    defaultValue: `Successfully denied ${selectedCount} petition(s)`,
                    count: selectedCount,
                  }),
                  variant: 'success',
                });
              } catch {
                setToast({
                  message: t('overview.bulkDenyFailed', {
                    defaultValue: 'Some petitions could not be denied. Please try again.',
                  }),
                  variant: 'error',
                });
              } finally {
                setBulkActionLoading(false);
                setSel({});
              }
            }}
          >
            {t('overview.actions.deny') || 'Deny'}
          </Button>
        </div>
      </div>
    </>
  );
}
