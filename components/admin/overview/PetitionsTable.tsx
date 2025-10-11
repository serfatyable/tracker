"use client";

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import { Table, THead, TBody, TR, TH, TD } from '../../ui/Table';
import type { RotationPetition } from '../../../types/rotationPetitions';
import { listRotationPetitions, approveRotationPetition, denyRotationPetition, listRotations } from '../../../lib/firebase/admin';

export default function PetitionsTable() {
    const { t, i18n } = useTranslation();
    const [items, setItems] = useState<RotationPetition[]>([]);
    const [sel, setSel] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState<'activate'|'finish'|''>('');
    const [status, setStatus] = useState<'pending'|'approved'|'denied'|''>('pending');
    const [rotationId, setRotationId] = useState('');
    const [residentQuery, setResidentQuery] = useState('');
    const [rotOptions, setRotOptions] = useState<Array<{ id: string; label: string }>>([]);

    useEffect(() => {
        (async () => {
            const r = await listRotations({ limit: 200 });
            setRotOptions(r.items.map((x: any) => ({ id: x.id, label: String(i18n.language==='he' ? (x.name_he || x.name_en || x.name) : (x.name_en || x.name)) })));
        })();
    }, [i18n.language]);

    async function refresh() {
        setLoading(true);
        const res = await listRotationPetitions({ status: status || undefined, type: type || undefined, rotationId: rotationId || undefined, residentQuery: residentQuery || undefined, limit: 50 });
        setItems(res.items);
        setSel({});
        setLoading(false);
    }

    useEffect(() => { refresh(); }, [type, status, rotationId]);

    function idsSelected() { return Object.keys(sel).filter((k) => sel[k]); }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Select value={rotationId} onChange={(e)=> setRotationId(e.target.value)}>
                        <option value="">{t('ui.rotations')}</option>
                        {rotOptions.map((o)=> (<option key={o.id} value={o.id}>{o.label}</option>))}
                    </Select>
                    <Select value={type} onChange={(e)=> setType((e.target.value || '') as any)}>
                        <option value="">{t('overview.type') || 'Type'}</option>
                        <option value="activate">{t('overview.type.activate') || 'Activate'}</option>
                        <option value="finish">{t('overview.type.finish') || 'Finish'}</option>
                    </Select>
                    <Select value={status} onChange={(e)=> setStatus((e.target.value || '') as any)}>
                        <option value="pending">{t('overview.status.pending') || 'Pending'}</option>
                        <option value="approved">{t('overview.status.approved') || 'Approved'}</option>
                        <option value="denied">{t('overview.status.denied') || 'Denied'}</option>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <Input placeholder={t('ui.users') as string} value={residentQuery} onChange={(e)=> setResidentQuery(e.target.value)} />
                    <Button onClick={refresh} disabled={loading}>{t('ui.refresh')}</Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <THead>
                        <TR>
                            <TH><input type="checkbox" checked={items.length>0 && items.every(x=>sel[x.id])} onChange={(e)=>{
                                const checked = e.target.checked; const next: Record<string, boolean> = {}; items.forEach(x=> next[x.id]=checked); setSel(next);
                            }} /></TH>
                            <TH>{t('ui.users')}</TH>
                            <TH>{t('ui.rotations')}</TH>
                            <TH>{t('overview.type') || 'Type'}</TH>
                            <TH>{t('ui.status')}</TH>
                            <TH>{t('ui.open')}</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {items.map((p)=> (
                            <TR key={p.id}>
                                <TD><input type="checkbox" checked={!!sel[p.id]} onChange={(e)=> setSel((s)=> ({...s, [p.id]: e.target.checked}))} /></TD>
                                <TD>{p.residentId}</TD>
                                <TD>{p.rotationId}</TD>
                                <TD>{p.type}</TD>
                                <TD>{p.status}</TD>
                                <TD className="text-right">
                                    <Button size="sm" onClick={async ()=>{ try { await approveRotationPetition(p.id, 'admin'); } finally { refresh(); } }}>{t('overview.actions.approve') || 'Approve'}</Button>
                                    <Button size="sm" variant="outline" onClick={async ()=>{ try { await denyRotationPetition(p.id, 'admin'); } finally { refresh(); } }}>{t('overview.actions.deny') || 'Deny'}</Button>
                                </TD>
                            </TR>
                        ))}
                    </TBody>
                </Table>
            </div>

            <div className="flex justify-end gap-2">
                <Button disabled={loading || idsSelected().length===0} onClick={async ()=>{ for (const id of idsSelected()) { try { await approveRotationPetition(id, 'admin'); } catch {} } await refresh(); }}>{t('overview.actions.approve') || 'Approve'}</Button>
                <Button disabled={loading || idsSelected().length===0} variant="outline" onClick={async ()=>{ for (const id of idsSelected()) { await denyRotationPetition(id, 'admin'); } await refresh(); }}>{t('overview.actions.deny') || 'Deny'}</Button>
            </div>
        </div>
    );
}


