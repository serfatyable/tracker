import { getFirestore, collection, getDocs, query, orderBy, limit as qLimit, startAfter as qStartAfter, where, writeBatch, doc, addDoc, serverTimestamp, runTransaction, getDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, startAt as qStartAt, endAt as qEndAt, setDoc } from 'firebase/firestore';

import type { UserProfile, Role } from '../../types/auth';

import { getFirebaseApp } from './client';
import type { TaskDoc } from './db';
import type { Assignment } from '../../types/assignments';
import type { Rotation, RotationNode } from '../../types/rotations';
import type { RotationPetition } from '../../types/rotationPetitions';
import { normalizeParsedRows, parseRotationCsvText, type NormalizedLeaf } from '../rotations/import';

export type ListPage<T> = {
    items: T[];
    lastCursor?: unknown;
};

export async function listUsers(params?: { limit?: number; startAfter?: unknown; search?: string; role?: Role; status?: 'pending'|'active'|'disabled'; orderBy?: 'createdAt'|'role'|'status'|'fullName'; orderDir?: 'asc'|'desc' }): Promise<ListPage<UserProfile>> {
    const db = getFirestore(getFirebaseApp());
    const pageSize = params?.limit ?? 20;
    const search = (params?.search || '').trim();
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            let snap;
            if (search) {
                const isEmail = search.includes('@');
                const field = isEmail ? 'email' : 'fullName';
                // Range query on one field; avoid mixing equality filters here to reduce index requirements
                const parts: any[] = [orderBy(field), where(field, '>=', search), where(field, '<=', search + '\\uf8ff'), qLimit(pageSize)];
                let qRef: any = query(collection(db, 'users'), ...(parts as any));
                if (params?.startAfter) qRef = query(qRef, qStartAfter(params.startAfter as any));
                snap = await getDocs(qRef);
                const raw = snap.docs.map((d) => ({ ...(d.data() as UserProfile) }));
                const items = raw.filter((u) => (
                    (!params?.role || u.role === params.role) && (!params?.status || u.status === params.status)
                ));
                return { items, lastCursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : undefined };
            } else {
                const orderField = params?.orderBy || 'fullName';
                const orderDirection: any = params?.orderDir || 'asc';
                const parts: any[] = [];
                if (params?.role) parts.push(where('role', '==', params.role));
                if (params?.status) parts.push(where('status', '==', params.status));
                parts.push(orderBy(orderField as any, orderDirection));
                parts.push(qLimit(pageSize));
                let qRef: any = query(collection(db, 'users'), ...(parts as any));
                if (params?.startAfter) qRef = query(qRef, qStartAfter(params.startAfter as any));
                snap = await getDocs(qRef);
                const items = snap.docs.map((d) => ({ ...(d.data() as UserProfile) }));
                return { items, lastCursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : undefined };
            }
        } catch (err) {
            lastErr = err;
            await new Promise((r) => setTimeout(r, 150 * Math.pow(2, attempt)));
        }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Failed to list users');
}

// Assignments
export async function listActiveAssignments(): Promise<Assignment[]> {
    const db = getFirestore(getFirebaseApp());
    const snap = await getDocs(query(collection(db, 'assignments'), where('endedAt', '==', null)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as unknown as Assignment[];
}

export async function assignResidentToRotation(residentId: string, rotationId: string): Promise<{ id: string }> {
    const db = getFirestore(getFirebaseApp());
    const col = collection(db, 'assignments');
    let createdId = '';
    await runTransaction(db, async (tx) => {
        // Close existing active assignment for resident
        const existingSnap = await getDocs(query(col, where('residentId', '==', residentId), where('endedAt', '==', null)));
        for (const docSnap of existingSnap.docs) {
            tx.update(docSnap.ref, { endedAt: serverTimestamp() });
        }
        // Create new assignment
        const newRef = doc(col);
        tx.set(newRef, {
            residentId,
            rotationId,
            tutorIds: [],
            startedAt: serverTimestamp(),
            endedAt: null,
        } as any);
        createdId = newRef.id;
    });
    return { id: createdId };
}

export async function assignTutorToResident(residentId: string, tutorId: string): Promise<void> {
    const db = getFirestore(getFirebaseApp());
    const col = collection(db, 'assignments');
    await runTransaction(db, async (tx) => {
        const existingSnap = await getDocs(query(col, where('residentId', '==', residentId), where('endedAt', '==', null)));
        const docSnap = existingSnap.docs[0];
        if (!docSnap) throw new Error('No active assignment for resident');
        tx.update(docSnap.ref, { tutorIds: arrayUnion(tutorId) });
    });
}

export async function unassignTutorFromResident(residentId: string, tutorId: string): Promise<void> {
    const db = getFirestore(getFirebaseApp());
    const col = collection(db, 'assignments');
    await runTransaction(db, async (tx) => {
        const existingSnap = await getDocs(query(col, where('residentId', '==', residentId), where('endedAt', '==', null)));
        const docSnap = existingSnap.docs[0];
        if (!docSnap) return; // nothing to do
        tx.update(docSnap.ref, { tutorIds: arrayRemove(tutorId) });
    });
}

export async function updateUsersStatus(params: { userIds: string[]; status: 'active' | 'disabled' | 'pending' }) {
    const db = getFirestore(getFirebaseApp());
    const batch = writeBatch(db);
    for (const uid of params.userIds) batch.update(doc(db, 'users', uid), { status: params.status });
    await batch.commit();
}

export async function updateUsersRole(params: { userIds: string[]; role: Role }) {
    const db = getFirestore(getFirebaseApp());
    const batch = writeBatch(db);
    for (const uid of params.userIds) batch.update(doc(db, 'users', uid), { role: params.role });
    await batch.commit();
}

export async function listTasks(params?: { limit?: number; startAfter?: unknown; status?: 'pending' | 'approved' | 'rejected' }): Promise<ListPage<TaskDoc>> {
    const db = getFirestore(getFirebaseApp());
    const pageSize = params?.limit ?? 20;
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const parts: any[] = [];
            if (params?.status) parts.push(where('status', '==', params.status));
            parts.push(qLimit(pageSize));
            if (params?.startAfter) parts.push(qStartAfter(params.startAfter as any));
            const snap = await getDocs(query(collection(db, 'tasks'), ...(parts as any)));
            const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as TaskDoc[];
            return { items, lastCursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : undefined };
        } catch (err) {
            lastErr = err;
            await new Promise((r) => setTimeout(r, 150 * Math.pow(2, attempt)));
        }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Failed to list tasks');
}

export async function updateTasksStatus(params: { taskIds: string[]; status: 'approved' | 'rejected' }) {
    const db = getFirestore(getFirebaseApp());
    const batch = writeBatch(db);
    for (const id of params.taskIds) batch.update(doc(db, 'tasks', id), { status: params.status });
    await batch.commit();
}


// Rotations
export async function createRotation(data: { name: string; startDate: any; endDate: any; status: 'active'|'inactive'|'finished' }): Promise<{ id: string }> {
    const db = getFirestore(getFirebaseApp());
    const ref = await addDoc(collection(db, 'rotations'), {
        name: data.name,
        name_en: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
        createdAt: serverTimestamp(),
    });
    // seed categories
    const categories = ['Knowledge', 'Skills', 'Guidance'];
    const batch = writeBatch(db);
    const nodesCol = collection(db, 'rotationNodes');
    categories.forEach((cat, idx) => {
        const nodeRef = doc(nodesCol);
        batch.set(nodeRef, {
            rotationId: ref.id,
            parentId: null,
            type: 'category',
            name: cat,
            order: idx,
        });
    });
    await batch.commit();
    return { id: ref.id };
}

export async function listRotations(params?: { search?: string; status?: 'active'|'inactive'|'finished'; limit?: number; startAfter?: unknown }): Promise<ListPage<Rotation>> {
    const db = getFirestore(getFirebaseApp());
    const pageSize = params?.limit ?? 20;
    const parts: any[] = [];
    if (params?.status) parts.push(where('status', '==', params.status));
    parts.push(orderBy('name_en'));
    if (params?.search) {
        parts.push(qStartAt(params.search));
        parts.push(qEndAt(String(params.search) + '\uf8ff'));
    }
    parts.push(qLimit(pageSize));
    if (params?.startAfter) parts.push(qStartAfter(params.startAfter as any));
    const snap = await getDocs(query(collection(db, 'rotations'), ...(parts as any)));
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as unknown as Rotation[];
    return { items, lastCursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : undefined };
}

export async function updateRotation(id: string, data: Partial<Pick<Rotation, 'name' | 'startDate' | 'endDate' | 'status'>>): Promise<void> {
    const db = getFirestore(getFirebaseApp());
    await updateDoc(doc(db, 'rotations', id), data as any);
}

export async function deleteRotation(id: string): Promise<void> {
    const db = getFirestore(getFirebaseApp());
    await deleteDoc(doc(db, 'rotations', id));
}

export async function listRotationNodes(rotationId: string): Promise<RotationNode[]> {
    const db = getFirestore(getFirebaseApp());
    const snap = await getDocs(query(collection(db, 'rotationNodes'), where('rotationId', '==', rotationId)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as unknown as RotationNode[];
}

export async function createNode(input: Omit<RotationNode, 'id'>): Promise<{ id: string }> {
    const db = getFirestore(getFirebaseApp());
    const ref = await addDoc(collection(db, 'rotationNodes'), input as any);
    return { id: ref.id };
}

export async function updateNode(id: string, data: Partial<RotationNode>): Promise<void> {
    const db = getFirestore(getFirebaseApp());
    await updateDoc(doc(db, 'rotationNodes', id), data as any);
}

export async function deleteNode(id: string): Promise<void> {
    const db = getFirestore(getFirebaseApp());
    await deleteDoc(doc(db, 'rotationNodes', id));
}

export async function moveNode(id: string, newParentId: string | null): Promise<void> {
    const db = getFirestore(getFirebaseApp());
    await updateDoc(doc(db, 'rotationNodes', id), { parentId: newParentId } as any);
}

export async function reorderSiblings(parentId: string | null, orderedIds: string[]): Promise<void> {
    const db = getFirestore(getFirebaseApp());
    const col = collection(db, 'rotationNodes');
    await runTransaction(db, async (tx) => {
        for (let idx = 0; idx < orderedIds.length; idx++) {
            const id = orderedIds[idx];
            if (!id) continue;
            const ref = doc(col, id);
            const snap = await tx.get(ref);
            if (!snap.exists()) continue;
            tx.update(ref, { order: idx });
        }
    });
}

// Core rotations (idempotent seeding)
const CORE_ROTATIONS: Array<{ id: string; name_en: string; name_he: string }> = [
    { id: 'icu', name_en: 'ICU', name_he: 'טיפול נמרץ' },
    { id: 'or', name_en: 'OR (Operating Room)', name_he: 'חדר ניתוח' },
    { id: 'block-room', name_en: 'Block Room', name_he: 'חדר בלוקים' },
    { id: 'pacu', name_en: 'PACU (Post-Anesthesia Care Unit)', name_he: 'התאוששות' },
    { id: 'obstetrics', name_en: 'Obstetrics', name_he: 'מיילדות' },
    { id: 'cardiothoracic', name_en: 'Cardiothoracic', name_he: 'ניתוחי לב וחזה' },
    { id: 'neurosurgery', name_en: 'Neurosurgery', name_he: 'נוירוכירורגיה' },
    { id: 'pediatrics', name_en: 'Pediatrics', name_he: 'ילדים' },
    { id: 'pain-medicine', name_en: 'Pain Medicine', name_he: 'רפואת כאב' },
];

export async function ensureCoreRotationsSeeded(): Promise<void> {
    const db = getFirestore(getFirebaseApp());
    const rotCol = collection(db, 'rotations');
    for (const core of CORE_ROTATIONS) {
        const rRef = doc(rotCol, core.id);
        const rSnap = await getDoc(rRef);
        if (!rSnap.exists()) {
            await setDoc(rRef, {
                name: core.name_en,
                name_en: core.name_en,
                name_he: core.name_he,
                status: 'inactive',
                isCore: true,
                createdAt: serverTimestamp(),
            } as any);
        } else {
            const data = rSnap.data() as any;
            const updates: Record<string, any> = {};
            if (!data.name_en) updates.name_en = core.name_en;
            if (!data.name_he) updates.name_he = core.name_he;
            if (data.isCore !== true) updates.isCore = true;
            if (Object.keys(updates).length) await updateDoc(rRef, updates);
        }
        // Ensure three root categories exist (no duplicates by name)
        const existingNodes = await getDocs(query(collection(db, 'rotationNodes'), where('rotationId', '==', core.id), where('parentId', '==', null)));
        const have = new Set(existingNodes.docs.map((d) => (d.data() as any).name));
        const batch = writeBatch(db);
        ['Knowledge', 'Skills', 'Guidance'].forEach((cat, idx) => {
            if (!have.has(cat)) {
                const nRef = doc(collection(db, 'rotationNodes'));
                batch.set(nRef, { rotationId: core.id, parentId: null, type: 'category', name: cat, order: idx } as any);
            }
        });
        await batch.commit();
    }
}

export async function importRotationFromCsv(params: { mode: 'create'|'merge'; rotationId?: string; csvText: string; rotationMeta?: { name: string; startDate: any; endDate: any; status: 'active'|'inactive'|'finished' } }): Promise<{ rotationId: string; errors: string[] }> {
    const db = getFirestore(getFirebaseApp());
    const { rows } = parseRotationCsvText(params.csvText);
    const { leaves, errors } = normalizeParsedRows(rows);
    if (errors.length) return { rotationId: params.rotationId || '', errors };

    let rotationId = params.rotationId || '';
    if (params.mode === 'create') {
        if (!params.rotationMeta) return { rotationId: '', errors: ['Missing rotation meta for create mode'] };
        const created = await createRotation(params.rotationMeta);
        rotationId = created.id;
    }

    // build or fetch category nodes
    if (!rotationId) return { rotationId: '', errors: ['Missing rotationId'] };
    const allNodes = await listRotationNodes(rotationId);

    // ensure category roots
    const roots = ['Knowledge','Skills','Guidance'];
    for (let i = 0; i < roots.length; i++) {
        const name = roots[i];
        const existing = allNodes.find((n)=> n.parentId === null && n.type==='category' && n.name===name) as RotationNode | undefined;
        if (!existing) {
            const created = await createNode({ rotationId, parentId: null, type: 'category', name, order: i } as any);
            const createdId: string = created.id as string;
            allNodes.push({ id: createdId, rotationId, parentId: null as any, type: 'category', name, order: i } as any);
        }
    }

    function norm(s: string) { return String(s || '').trim().toLowerCase(); }
    async function ensureChild(parentId: string, type: RotationNode['type'], name: string): Promise<string> {
        const siblings = allNodes.filter((n)=> n.parentId === parentId && n.type === type);
        const targetName = norm(name);
        let existing = siblings.find((n)=> norm(n.name) === targetName);
        if (existing) return existing.id as string;
        const created = await createNode({ rotationId, parentId, type, name, order: siblings.length } as any);
        const newNode: any = { id: created.id, rotationId, parentId, type, name, order: siblings.length };
        allNodes.push(newNode);
        return created.id;
    }

    for (const leaf of leaves) {
        const catNode = allNodes.find((n)=> n.parentId === null && n.type==='category' && n.name === leaf.category);
        const catId: string = catNode ? catNode.id as string : '';
        const subjectId = await ensureChild(catId as string, 'subject', leaf.subject as string);
        const topicId = await ensureChild(subjectId as string, 'topic', leaf.topic as string);
        const subTopicId = leaf.subTopic ? await ensureChild(topicId as string, 'subTopic', leaf.subTopic as string) : topicId;
        const subSubTopicId = leaf.subSubTopic ? await ensureChild(subTopicId as string, 'subSubTopic', leaf.subSubTopic as string) : (subTopicId as string);
        // create leaf
        const siblings = allNodes.filter((n)=> n.parentId === subSubTopicId && n.type === 'leaf');
        const created = await createNode({ rotationId, parentId: subSubTopicId, type: 'leaf', name: leaf.itemTitle, order: siblings.length, requiredCount: leaf.requiredCount, mcqUrl: leaf.mcqUrl, links: leaf.links } as any);
        allNodes.push({ id: created.id, rotationId, parentId: subSubTopicId, type: 'leaf', name: leaf.itemTitle, order: siblings.length } as any);
    }

    return { rotationId, errors: [] };
}

// Rotation Petitions (Admin)
export async function listRotationPetitions(params?: { status?: 'pending'|'approved'|'denied'; type?: 'activate'|'finish'; rotationId?: string; residentQuery?: string; limit?: number; startAfter?: unknown }): Promise<ListPage<RotationPetition>> {
    const db = getFirestore(getFirebaseApp());
    const pageSize = params?.limit ?? 20;
    const parts: any[] = [];
    if (params?.status) parts.push(where('status', '==', params.status));
    if (params?.type) parts.push(where('type', '==', params.type));
    if (params?.rotationId) parts.push(where('rotationId', '==', params.rotationId));
    parts.push(orderBy('requestedAt', 'desc'));
    parts.push(qLimit(pageSize));
    if (params?.startAfter) parts.push(qStartAfter(params.startAfter as any));
    const snap = await getDocs(query(collection(db, 'rotationPetitions'), ...(parts as any)));
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as unknown as RotationPetition[];
    return { items, lastCursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : undefined };
}

export async function approveRotationPetition(petitionId: string, adminUid: string): Promise<void> {
    const db = getFirestore(getFirebaseApp());
    const pRef = doc(db, 'rotationPetitions', petitionId);
    const pSnap = await getDoc(pRef);
    if (!pSnap.exists()) throw new Error('Petition not found');
    const p = pSnap.data() as RotationPetition;
    if (p.status !== 'pending') return;
    if (p.type === 'activate') {
        const active = await getDocs(query(collection(db, 'assignments'), where('residentId', '==', p.residentId), where('endedAt', '==', null)));
        if (!active.empty) throw new Error('Resident already has an active rotation');
        // Approval recorded; assignment performed elsewhere
    } else if (p.type === 'finish') {
        const active = await getDocs(query(collection(db, 'assignments'), where('residentId', '==', p.residentId), where('endedAt', '==', null)));
        const docSnap = active.docs[0];
        if (docSnap) await updateDoc(docSnap.ref, { endedAt: serverTimestamp() });
    }
    await updateDoc(pRef, { status: 'approved', resolvedAt: serverTimestamp(), resolvedBy: adminUid } as any);
}

export async function denyRotationPetition(petitionId: string, adminUid: string): Promise<void> {
    const db = getFirestore(getFirebaseApp());
    const pRef = doc(db, 'rotationPetitions', petitionId);
    await updateDoc(pRef, { status: 'denied', resolvedAt: serverTimestamp(), resolvedBy: adminUid } as any);
}

