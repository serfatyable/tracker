"use client";

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import { Table, THead, TBody, TR, TH, TD } from '../../ui/Table';
import { Dialog, DialogHeader, DialogFooter } from '../../ui/Dialog';
import type { Rotation, RotationStatus } from '../../../types/rotations';
import { createRotation, listRotations, updateRotation } from '../../../lib/firebase/admin';
import TemplateImportDialog from './TemplateImportDialog';

type Props = {
    onOpenEditor: (rotationId: string) => void;
};

export default function RotationsPanel({ onOpenEditor }: Props) {
    const { t, i18n } = useTranslation();
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<RotationStatus | ''>('');
    const [items, setItems] = useState<Rotation[]>([] as any);
    const [cursor, setCursor] = useState<any | undefined>(undefined);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<{ name: string; startDate: string; endDate: string; status: RotationStatus }>(
        { name: '', startDate: '', endDate: '', status: 'active' }
    );
    const [openImport, setOpenImport] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await listRotations({ search: search || undefined, status: status || undefined, limit: 25 });
                setItems(res.items as any);
                setCursor(res.lastCursor as any);
                setHasMore((res.items?.length || 0) >= 25);
            } finally {
                setLoading(false);
            }
        })();
    }, [search, status]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                    <Input placeholder={t('ui.searchRotations') as string} value={search} onChange={(e)=> setSearch(e.target.value)} />
                    <Select value={status} onChange={(e)=> setStatus(e.target.value as RotationStatus | '')}>
                        <option value="">{t('ui.all')}</option>
                        <option value="active">{t('ui.active')}</option>
                        <option value="inactive">{t('ui.inactive')}</option>
                        <option value="finished">{t('ui.finished')}</option>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={()=> setOpen(true)}>{t('ui.create')}</Button>
                    <Button variant="outline" onClick={()=> setOpenImport(true)}>{t('ui.importFromCsv')}</Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <THead>
                        <TR>
                            <TH>{t('ui.name')}</TH>
                            <TH></TH>
                        </TR>
                    </THead>
                    <TBody>
                        {items.map((r)=> (
                            <TR key={r.id}>
                                <TD>{String(i18n.language === 'he' ? ((r as any).name_he || (r as any).name_en || (r as any).name) : ((r as any).name_en || (r as any).name))}</TD>
                                <TD className="text-right">
                                    <Button variant="ghost" onClick={()=> onOpenEditor(r.id)}>{t('ui.open')}</Button>
                                </TD>
                            </TR>
                        ))}
                    </TBody>
                </Table>
            </div>

            <Dialog open={open} onClose={()=> setOpen(false)}>
                <DialogHeader>{t('ui.createRotation')}</DialogHeader>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium">{t('ui.name')}</label>
                        <Input value={form.name} onChange={(e)=> setForm((s)=> ({...s, name: e.target.value}))} />
                    </div>
                    {/* Dates and status hidden per spec for admin rotations */}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={()=> setOpen(false)}>{t('ui.cancel')}</Button>
                    <Button onClick={async ()=>{
                        const { Timestamp } = await import('firebase/firestore');
                        // Dates irrelevant for admin; store placeholders
                        const start = Timestamp.fromDate(new Date());
                        const end = Timestamp.fromDate(new Date());
                        await createRotation({ name: form.name, startDate: start, endDate: end, status: 'inactive' });
                        setOpen(false);
                        setSearch(''); // trigger refresh
                    }}>{t('ui.create')}</Button>
                </DialogFooter>
            </Dialog>
            <TemplateImportDialog open={openImport} onClose={()=> setOpenImport(false)} onImported={(rid)=> {
                setOpenImport(false);
                setSearch('');
            }} />
        </div>
    );
}

function formatDates(r: any) {
    try {
        const s = r.startDate?.toDate ? r.startDate.toDate() : new Date(r.startDate);
        const e = r.endDate?.toDate ? r.endDate.toDate() : new Date(r.endDate);
        return `${s.toLocaleDateString()} - ${e.toLocaleDateString()}`;
    } catch {
        return '';
    }
}


