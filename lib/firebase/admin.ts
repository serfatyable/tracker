import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  limit as qLimit,
  startAfter as qStartAfter,
  where,
  writeBatch,
  doc,
  addDoc,
  serverTimestamp,
  runTransaction,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  startAt as qStartAt,
  endAt as qEndAt,
  setDoc,
} from 'firebase/firestore';

import type { Assignment, AssignmentWithDetails } from '../../types/assignments';
import type { UserProfile, Role } from '../../types/auth';
import type { ReflectionTemplate, ReflectionSection } from '../../types/reflections';
import type { RotationPetition } from '../../types/rotationPetitions';
import type { Rotation, RotationNode } from '../../types/rotations';
import { normalizeParsedRows, parseRotationCsvText } from '../rotations/import';

import { getFirebaseApp } from './client';
import type { TaskDoc } from './db';

export type ListPage<T> = {
  items: T[];
  lastCursor?: unknown;
};

export async function listUsers(params?: {
  limit?: number;
  startAfter?: unknown;
  search?: string;
  role?: Role;
  status?: 'pending' | 'active' | 'disabled';
  orderBy?: 'createdAt' | 'role' | 'status' | 'fullName';
  orderDir?: 'asc' | 'desc';
}): Promise<ListPage<UserProfile>> {
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
        const parts: any[] = [
          orderBy(field),
          where(field, '>=', search),
          where(field, '<=', search + '\\uf8ff'),
          qLimit(pageSize),
        ];
        let qRef: any = query(collection(db, 'users'), ...(parts as any));
        if (params?.startAfter) qRef = query(qRef, qStartAfter(params.startAfter as any));
        snap = await getDocs(qRef);
        const raw = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
        const items = raw.filter(
          (u) =>
            (!params?.role || u.role === params.role) &&
            (!params?.status || u.status === params.status),
        );
        return {
          items,
          lastCursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : undefined,
        };
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
        const items = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
        return {
          items,
          lastCursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : undefined,
        };
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

export async function assignResidentToRotation(
  residentId: string,
  rotationId: string,
): Promise<{ id: string }> {
  const db = getFirestore(getFirebaseApp());
  const col = collection(db, 'assignments');
  let createdId = '';
  await runTransaction(db, async (tx) => {
    // Close existing active assignment for resident
    const existingSnap = await getDocs(
      query(col, where('residentId', '==', residentId), where('endedAt', '==', null)),
    );
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
    const existingSnap = await getDocs(
      query(col, where('residentId', '==', residentId), where('endedAt', '==', null)),
    );
    const docSnap = existingSnap.docs[0];
    if (!docSnap) throw new Error('No active assignment for resident');
    tx.update(docSnap.ref, { tutorIds: arrayUnion(tutorId) });
  });
}

export async function unassignTutorFromResident(
  residentId: string,
  tutorId: string,
): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  const col = collection(db, 'assignments');
  await runTransaction(db, async (tx) => {
    const existingSnap = await getDocs(
      query(col, where('residentId', '==', residentId), where('endedAt', '==', null)),
    );
    const docSnap = existingSnap.docs[0];
    if (!docSnap) return; // nothing to do
    tx.update(docSnap.ref, { tutorIds: arrayRemove(tutorId) });
  });
}

// New assignment functions for UI management
export async function listAssignmentsWithDetails(): Promise<AssignmentWithDetails[]> {
  const db = getFirestore(getFirebaseApp());
  const assignmentsSnap = await getDocs(query(collection(db, 'assignments'), where('endedAt', '==', null)));
  const assignments = assignmentsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Assignment[];
  
  // Get all unique user IDs
  const userIds = new Set<string>();
  assignments.forEach(a => {
    userIds.add(a.residentId);
    a.tutorIds.forEach(tid => userIds.add(tid));
  });
  
  // Get all unique rotation IDs
  const rotationIds = new Set<string>();
  assignments.forEach(a => {
    if (a.rotationId) rotationIds.add(a.rotationId);
  });
  
  // Fetch user details
  const userPromises = Array.from(userIds).map(async (uid) => {
    const userSnap = await getDoc(doc(db, 'users', uid));
    return userSnap.exists() ? { ...(userSnap.data() as UserProfile), uid } : null;
  });
  const users = (await Promise.all(userPromises)).filter(Boolean) as UserProfile[];
  const userMap = new Map(users.map(u => [u.uid, u]));
  
  // Fetch rotation details
  const rotationPromises = Array.from(rotationIds).map(async (rid) => {
    const rotationSnap = await getDoc(doc(db, 'rotations', rid));
    return rotationSnap.exists() ? { id: rid, ...(rotationSnap.data() as any) } : null;
  });
  const rotations = (await Promise.all(rotationPromises)).filter(Boolean) as (Rotation & { id: string })[];
  const rotationMap = new Map(rotations.map(r => [r.id, r]));
  
  // Combine data
  return assignments.map(assignment => ({
    ...assignment,
    residentName: userMap.get(assignment.residentId)?.fullName || 'Unknown',
    tutorNames: assignment.tutorIds.map(tid => userMap.get(tid)?.fullName || 'Unknown'),
    rotationName: assignment.isGlobal ? 'Global' : (rotationMap.get(assignment.rotationId)?.name || 'Unknown'),
  }));
}

export async function assignTutorToResidentGlobal(residentId: string, tutorId: string): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  const col = collection(db, 'assignments');
  await runTransaction(db, async (tx) => {
    // Check if global assignment already exists
    const existingSnap = await getDocs(
      query(col, where('residentId', '==', residentId), where('isGlobal', '==', true), where('endedAt', '==', null)),
    );
    
    if (existingSnap.docs.length > 0) {
      // Add tutor to existing global assignment
      const docSnap = existingSnap.docs[0];
      if (docSnap) {
        tx.update(docSnap.ref, { tutorIds: arrayUnion(tutorId) });
      }
    } else {
      // Create new global assignment
      const newRef = doc(col);
      tx.set(newRef, {
        residentId,
        rotationId: '', // Empty for global assignments
        tutorIds: [tutorId],
        startedAt: serverTimestamp(),
        endedAt: null,
        isGlobal: true,
      } as any);
    }
  });
}

export async function assignTutorToResidentForRotation(
  residentId: string, 
  tutorId: string, 
  rotationId: string
): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  const col = collection(db, 'assignments');
  await runTransaction(db, async (tx) => {
    // Check if rotation-specific assignment already exists
    const existingSnap = await getDocs(
      query(col, where('residentId', '==', residentId), where('rotationId', '==', rotationId), where('endedAt', '==', null)),
    );
    
    if (existingSnap.docs.length > 0) {
      // Add tutor to existing rotation assignment
      const docSnap = existingSnap.docs[0];
      if (docSnap) {
        tx.update(docSnap.ref, { tutorIds: arrayUnion(tutorId) });
      }
    } else {
      // Create new rotation-specific assignment
      const newRef = doc(col);
      tx.set(newRef, {
        residentId,
        rotationId,
        tutorIds: [tutorId],
        startedAt: serverTimestamp(),
        endedAt: null,
        isGlobal: false,
      } as any);
    }
  });
}

export async function listAssignmentsByTutor(tutorId: string): Promise<AssignmentWithDetails[]> {
  const allAssignments = await listAssignmentsWithDetails();
  return allAssignments.filter(a => a.tutorIds.includes(tutorId));
}

export async function listAssignmentsByResident(residentId: string): Promise<AssignmentWithDetails[]> {
  const allAssignments = await listAssignmentsWithDetails();
  return allAssignments.filter(a => a.residentId === residentId);
}

export async function updateUsersStatus(params: {
  userIds: string[];
  status: 'active' | 'disabled' | 'pending';
}) {
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

export async function listTasks(params?: {
  limit?: number;
  startAfter?: unknown;
  status?: 'pending' | 'approved' | 'rejected';
}): Promise<ListPage<TaskDoc>> {
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

export async function updateTasksStatus(params: {
  taskIds: string[];
  status: 'approved' | 'rejected';
}) {
  const db = getFirestore(getFirebaseApp());
  const batch = writeBatch(db);
  for (const id of params.taskIds) batch.update(doc(db, 'tasks', id), { status: params.status });
  await batch.commit();
}

// Rotations
function rootCategoryId(rotationId: string, cat: 'Knowledge' | 'Skills' | 'Guidance'): string {
  return `rot-${rotationId}-root-${cat.toLowerCase()}`;
}

async function ensureRootCategories(
  rotationId: string,
): Promise<Record<'Knowledge' | 'Skills' | 'Guidance', string>> {
  const db = getFirestore(getFirebaseApp());
  const nodesCol = collection(db, 'rotationNodes');
  const cats = ['Knowledge', 'Skills', 'Guidance'] as const;
  for (let i = 0; i < cats.length; i++) {
    const cat = cats[i]!;
    const id = rootCategoryId(rotationId, cat);
    await setDoc(
      doc(nodesCol, id),
      {
        rotationId,
        parentId: null,
        type: 'category',
        name: cat,
        order: i,
      } as any,
      { merge: true },
    );
  }
  return {
    Knowledge: rootCategoryId(rotationId, 'Knowledge'),
    Skills: rootCategoryId(rotationId, 'Skills'),
    Guidance: rootCategoryId(rotationId, 'Guidance'),
  };
}

async function dedupeRootCategories(rotationId: string): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  const snap = await getDocs(
    query(
      collection(db, 'rotationNodes'),
      where('rotationId', '==', rotationId),
      where('parentId', '==', null),
    ),
  );
  const roots = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((n) => n.type === 'category');
  const cats = ['Knowledge', 'Skills', 'Guidance'] as const;
  for (let i = 0; i < cats.length; i++) {
    const cat = cats[i]!;
    const byName = roots.filter((r) => r.name === cat);
    if (byName.length <= 1) {
      if (byName.length === 1 && byName[0].order !== i)
        await updateDoc(doc(db, 'rotationNodes', byName[0].id), { order: i } as any);
      continue;
    }
    const canonicalId = rootCategoryId(rotationId, cat);
    let canonical = byName.find((r) => r.id === canonicalId) || null;
    if (!canonical) {
      const promote = byName[0];
      await setDoc(
        doc(db, 'rotationNodes', canonicalId),
        {
          rotationId,
          parentId: null,
          type: 'category',
          name: cat,
          order: i,
        } as any,
        { merge: true },
      );
      canonical = { ...promote, id: canonicalId, order: i };
    } else if (canonical.order !== i) {
      await updateDoc(doc(db, 'rotationNodes', canonical.id), { order: i } as any);
    }
    for (const dup of byName) {
      if (dup.id === canonical.id) continue;
      const childrenSnap = await getDocs(
        query(
          collection(db, 'rotationNodes'),
          where('rotationId', '==', rotationId),
          where('parentId', '==', dup.id),
        ),
      );
      const batch = writeBatch(db);
      for (const ch of childrenSnap.docs) batch.update(ch.ref, { parentId: canonical.id } as any);
      batch.delete(doc(db, 'rotationNodes', dup.id));
      await batch.commit();
    }
  }
}
export async function createRotation(data: {
  name: string;
  startDate: any;
  endDate: any;
  status: 'active' | 'inactive' | 'finished';
}): Promise<{ id: string }> {
  const db = getFirestore(getFirebaseApp());
  const ref = await addDoc(collection(db, 'rotations'), {
    name: data.name,
    name_en: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    status: data.status,
    createdAt: serverTimestamp(),
  });
  await ensureRootCategories(ref.id);
  return { id: ref.id };
}

export async function listRotations(params?: {
  search?: string;
  status?: 'active' | 'inactive' | 'finished';
  limit?: number;
  startAfter?: unknown;
}): Promise<ListPage<Rotation>> {
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

export async function updateRotation(
  id: string,
  data: Partial<Pick<Rotation, 'name' | 'startDate' | 'endDate' | 'status'>>,
): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  await updateDoc(doc(db, 'rotations', id), data as any);
}

export async function deleteRotation(id: string): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  await deleteDoc(doc(db, 'rotations', id));
}

// Rotation owners (admin)
export async function getRotationOwners(rotationId: string): Promise<string[]> {
  const db = getFirestore(getFirebaseApp());
  const snap = await getDoc(doc(db, 'rotations', rotationId));
  if (!snap.exists()) return [];
  const data = snap.data() as any;
  return Array.isArray(data.ownerTutorIds) ? data.ownerTutorIds : [];
}

export async function setRotationOwners(
  rotationId: string,
  ownerTutorIds: string[],
): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  await updateDoc(doc(db, 'rotations', rotationId), { ownerTutorIds } as any);
}

export async function listRotationNodes(rotationId: string): Promise<RotationNode[]> {
  const db = getFirestore(getFirebaseApp());
  const snap = await getDocs(
    query(collection(db, 'rotationNodes'), where('rotationId', '==', rotationId)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as unknown as RotationNode[];
}

export async function createNode(input: Omit<RotationNode, 'id'>): Promise<{ id: string }> {
  const db = getFirestore(getFirebaseApp());

  // Validate and sanitize requiredCount to prevent negative or invalid values
  const sanitizedInput = { ...input };
  if ('requiredCount' in sanitizedInput && sanitizedInput.requiredCount !== undefined) {
    const parsed = parseInt(String(sanitizedInput.requiredCount), 10);
    sanitizedInput.requiredCount = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  const ref = await addDoc(collection(db, 'rotationNodes'), sanitizedInput as any);
  return { id: ref.id };
}

export async function updateNode(id: string, data: Partial<RotationNode>): Promise<void> {
  const db = getFirestore(getFirebaseApp());

  // Validate and sanitize requiredCount to prevent negative or invalid values
  const sanitizedData = { ...data };
  if ('requiredCount' in sanitizedData && sanitizedData.requiredCount !== undefined) {
    const parsed = parseInt(String(sanitizedData.requiredCount), 10);
    sanitizedData.requiredCount = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  await updateDoc(doc(db, 'rotationNodes', id), sanitizedData as any);
}

export async function deleteNode(id: string): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  await deleteDoc(doc(db, 'rotationNodes', id));
}

/**
 * Detects and removes duplicate rotation nodes within a rotation.
 * Duplicates are defined as nodes with the same parentId, type, and name (case-insensitive).
 * Keeps the node with the highest requiredCount (or most recent if tied).
 * Returns statistics about the cleanup operation.
 */
export async function cleanupDuplicateNodes(rotationId: string): Promise<{
  duplicatesFound: number;
  nodesDeleted: number;
  details: Array<{ name: string; kept: string; deleted: string[] }>;
}> {
  const db = getFirestore(getFirebaseApp());
  const nodes = await listRotationNodes(rotationId);

  // Group nodes by composite key: parentId + type + normalized name
  const groupKey = (n: RotationNode) =>
    `${n.parentId || 'root'}:${n.type}:${(n.name || '').trim().toLowerCase()}`;

  const groups = new Map<string, RotationNode[]>();
  for (const node of nodes) {
    const key = groupKey(node);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(node);
  }

  // Find duplicates (groups with more than 1 node)
  const duplicates = Array.from(groups.values()).filter((g) => g.length > 1);

  const details: Array<{ name: string; kept: string; deleted: string[] }> = [];
  let nodesDeleted = 0;

  for (const group of duplicates) {
    // Sort by: 1) requiredCount (highest first), 2) name (preserve original case)
    const sorted = group.sort((a, b) => {
      const reqA = a.requiredCount || 0;
      const reqB = b.requiredCount || 0;
      if (reqA !== reqB) return reqB - reqA; // Higher requiredCount first
      return a.name.localeCompare(b.name); // Then by name
    });

    const keeper = sorted[0]!;
    const toDelete = sorted.slice(1);

    // Delete duplicates
    const batch = writeBatch(db);
    for (const node of toDelete) {
      batch.delete(doc(db, 'rotationNodes', node.id));
      nodesDeleted++;
    }
    await batch.commit();

    details.push({
      name: keeper.name,
      kept: keeper.id,
      deleted: toDelete.map((n) => n.id),
    });
  }

  return {
    duplicatesFound: duplicates.length,
    nodesDeleted,
    details,
  };
}

/**
 * Fixes any nodes with invalid requiredCount values (negative or NaN).
 * Sets them to 0.
 */
export async function fixInvalidRequiredCounts(rotationId: string): Promise<{
  nodesFixed: number;
  details: Array<{ id: string; name: string; oldValue: any; newValue: number }>;
}> {
  const db = getFirestore(getFirebaseApp());
  const nodes = await listRotationNodes(rotationId);

  const details: Array<{ id: string; name: string; oldValue: any; newValue: number }> = [];
  const batch = writeBatch(db);
  let nodesFixed = 0;

  for (const node of nodes) {
    if (node.type === 'leaf' && node.requiredCount !== undefined) {
      const current = node.requiredCount;
      const parsed = parseInt(String(current), 10);

      // Check if invalid: negative, NaN, or not a finite number
      if (!Number.isFinite(parsed) || parsed < 0) {
        batch.update(doc(db, 'rotationNodes', node.id), { requiredCount: 0 });
        details.push({
          id: node.id,
          name: node.name,
          oldValue: current,
          newValue: 0,
        });
        nodesFixed++;
      }
    }
  }

  if (nodesFixed > 0) {
    await batch.commit();
  }

  return { nodesFixed, details };
}

export async function moveNode(id: string, newParentId: string | null): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  await updateDoc(doc(db, 'rotationNodes', id), { parentId: newParentId } as any);
}

export async function reorderSiblings(
  parentId: string | null,
  orderedIds: string[],
): Promise<void> {
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
const CORE_ROTATIONS: Array<{ id: string; name_en: string; name_he: string; color: string }> = [
  { id: 'icu', name_en: 'ICU', name_he: 'טיפול נמרץ', color: '#EF4444' }, // red-500
  { id: 'or', name_en: 'OR (Operating Room)', name_he: 'חדר ניתוח', color: '#3B82F6' }, // blue-500
  { id: 'block-room', name_en: 'Block Room', name_he: 'חדר בלוקים', color: '#06B6D4' }, // cyan-500
  {
    id: 'pacu',
    name_en: 'PACU (Post-Anesthesia Care Unit)',
    name_he: 'התאוששות',
    color: '#10B981',
  }, // emerald-500
  { id: 'obstetrics', name_en: 'Obstetrics', name_he: 'מיילדות', color: '#F59E0B' }, // amber-500
  { id: 'cardiothoracic', name_en: 'Cardiothoracic', name_he: 'ניתוחי לב וחזה', color: '#8B5CF6' }, // violet-500
  { id: 'neurosurgery', name_en: 'Neurosurgery', name_he: 'נוירוכירורגיה', color: '#D946EF' }, // fuchsia-500
  { id: 'pediatrics', name_en: 'Pediatrics', name_he: 'ילדים', color: '#22C55E' }, // green-500
  { id: 'pain-medicine', name_en: 'Pain Medicine', name_he: 'רפואת כאב', color: '#F97316' }, // orange-500
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
        color: core.color,
        createdAt: serverTimestamp(),
      } as any);
    } else {
      const data = rSnap.data() as any;
      const updates: Record<string, any> = {};
      if (!data.name_en) updates.name_en = core.name_en;
      if (!data.name_he) updates.name_he = core.name_he;
      if (data.isCore !== true) updates.isCore = true;
      if (!data.color) updates.color = core.color; // backfill color if missing
      if (Object.keys(updates).length) await updateDoc(rRef, updates);
    }
    await ensureRootCategories(core.id);
    await dedupeRootCategories(core.id);
  }
}

// Reflections: default templates seeding (idempotent)
function slugify(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF\s.-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/\.+/g, '.')
    .replace(/_+/g, '_');
}

function buildSectionsBase(): Array<{
  en: { name: string; purpose: string; prompts: string[] };
  he: { name: string; purpose: string; prompts: string[] };
}> {
  return [
    {
      en: {
        name: 'Description',
        purpose: 'Describe what happened objectively.',
        prompts: [
          'What was the situation and your role?',
          'Who was involved?',
          'What were the main events?',
        ],
      },
      he: {
        name: 'תיאור',
        purpose: 'לתאר את מה שקרה בצורה עובדתית וללא שיפוט.',
        prompts: ['מה הייתה הסיטואציה ומה היה תפקידך?', 'מי השתתף?', 'מהם האירועים המרכזיים?'],
      },
    },
    {
      en: {
        name: 'Feelings and Reactions',
        purpose: 'Identify emotional and mental responses.',
        prompts: [
          'What did you feel and think during or after the event?',
          'How did these feelings influence your actions or communication?',
        ],
      },
      he: {
        name: 'תחושות ותגובות',
        purpose: 'לזהות את המצב הרגשי והמחשבתי שלך.',
        prompts: [
          'מה הרגשת וחשבת בזמן האירוע או אחריו?',
          'כיצד השפיעו התחושות על הפעולות או התקשורת שלך?',
        ],
      },
    },
    {
      en: {
        name: 'Analysis',
        purpose: 'Explore causes, successes, and difficulties.',
        prompts: [
          'What went well, and why?',
          'What did not go as planned, and what factors contributed?',
          'How did communication, preparation, or stress affect the outcome?',
        ],
      },
      he: {
        name: 'ניתוח',
        purpose: 'לבחון את הסיבות, ההצלחות והכשלים.',
        prompts: [
          'מה עבד היטב, ולמה?',
          'מה לא התנהל כמתוכנן, ואילו גורמים השפיעו?',
          'כיצד תקשורת, היערכות או לחץ השפיעו על התוצאה?',
        ],
      },
    },
    {
      en: {
        name: 'Learning and Insight',
        purpose: 'Convert experience into understanding.',
        prompts: [
          'What did you learn about your practice or decision-making?',
          'Did this experience challenge or confirm your previous knowledge?',
          'What does it teach you about safety, teamwork, or preparation?',
        ],
      },
      he: {
        name: 'למידה ותובנות',
        purpose: 'להפוך את החוויה להבנה מעמיקה.',
        prompts: [
          'מה למדת על העשייה או קבלת ההחלטות שלך?',
          'האם החוויה הזו חיזקה או ערערה את הידע הקודם שלך?',
          'מה היא מלמדת על בטיחות, עבודת צוות או הכנה?',
        ],
      },
    },
    {
      en: {
        name: 'Action Plan',
        purpose: 'Turn reflection into specific improvement steps.',
        prompts: [
          'What will you do differently next time?',
          'What specific skill or knowledge area will you work on?',
          'What concrete next step will you take (reading, simulation, supervision)?',
        ],
      },
      he: {
        name: 'תוכנית פעולה',
        purpose: 'להפוך את המסקנות לצעדים מעשיים לשיפור.',
        prompts: [
          'מה תעשה אחרת בפעם הבאה?',
          'באילו תחומי ידע או מיומנות תתמקד לשיפור?',
          'מה הצעד הבא שלך (קריאה, סימולציה, תרגול, הדרכה)?',
        ],
      },
    },
  ];
}

function buildTutorOnlySection(): {
  en: { name: string; purpose: string; prompts: string[] };
  he: { name: string; purpose: string; prompts: string[] };
} {
  return {
    en: {
      name: 'Tutor-Specific Reflection',
      purpose: 'Guide tutors in reflecting on their teaching approach.',
      prompts: [
        'Did I create a safe learning environment?',
        'Was my supervision appropriate for the resident’s level?',
        'Was my feedback specific, timely, and behavior-focused?',
        'How did my emotions or stress influence my teaching?',
        'What will I change in my supervision or feedback next time?',
      ],
    },
    he: {
      name: 'רפלקציה למדריך',
      purpose: 'להנחות את המדריך בהתבוננות על אופן ההוראה שלו.',
      prompts: [
        'האם יצרתי סביבה לימודית בטוחה?',
        'האם רמת הפיקוח שלי התאימה לרמת המתמחה?',
        'האם המשוב שנתתי היה ספציפי, בזמן ומתמקד בהתנהגות?',
        'כיצד הרגשות או הלחץ שלי השפיעו על ההוראה?',
        'מה אשנה באופן ההדרכה או מתן המשוב בפעם הבאה?',
      ],
    },
  };
}

function buildSharedDebrief(): {
  en: { name: string; purpose: string; prompts: string[] };
  he: { name: string; purpose: string; prompts: string[] };
} {
  return {
    en: {
      name: 'Shared Debrief',
      purpose: 'Encourage dialogue between resident and tutor.',
      prompts: [
        'What did each of us learn from this case?',
        'What is one thing we both can improve for next time?',
      ],
    },
    he: {
      name: 'שיח משותף',
      purpose: 'לעודד שיח רפלקטיבי בין המתמחה למדריך.',
      prompts: ['מה למד כל אחד מאיתנו מהאירוע?', 'מה דבר אחד ששנינו יכולים לשפר בפעם הבאה?'],
    },
  };
}

function toSectionsLocalized(
  base: Array<{
    en: { name: string; purpose: string; prompts: string[] };
    he: { name: string; purpose: string; prompts: string[] };
  }>,
  includeTutorSection: boolean,
  includeShared: boolean,
): ReflectionSection[] {
  const all: ReflectionSection[] = [];
  let order = 1;
  for (const sec of base) {
    const sectionId = slugify(sec.en.name);
    const prompts = sec.en.prompts.map((pEn, idx) => ({
      id: `${sectionId}.${slugify(pEn)}`,
      order: idx + 1,
      label: { en: pEn, he: sec.he.prompts[idx] || pEn },
      required: !(sectionId === 'action_plan' && (idx === 1 || idx === 2)),
    }));
    all.push({
      id: sectionId,
      order: order++,
      name: { en: sec.en.name, he: sec.he.name },
      purpose: { en: sec.en.purpose, he: sec.he.purpose },
      prompts,
    });
  }
  if (includeTutorSection) {
    const t = buildTutorOnlySection();
    const sectionId = slugify(t.en.name);
    const prompts = t.en.prompts.map((pEn, idx) => ({
      id: `${sectionId}.${slugify(pEn)}`,
      order: idx + 1,
      label: { en: pEn, he: t.he.prompts[idx] || pEn },
      required: true,
    }));
    all.push({
      id: sectionId,
      order: order++,
      name: { en: t.en.name, he: t.he.name },
      purpose: { en: t.en.purpose, he: t.he.purpose },
      prompts,
    });
  }
  if (includeShared) {
    const s = buildSharedDebrief();
    const sectionId = slugify(s.en.name);
    const prompts = s.en.prompts.map((pEn, idx) => ({
      id: `${sectionId}.${slugify(pEn)}`,
      order: idx + 1,
      label: { en: pEn, he: s.he.prompts[idx] || pEn },
      required: true,
    }));
    all.push({
      id: sectionId,
      order: order++,
      name: { en: s.en.name, he: s.he.name },
      purpose: { en: s.en.purpose, he: s.he.purpose },
      prompts,
    });
  }
  return all;
}

export async function ensureDefaultReflectionTemplatesSeeded(): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  const col = collection(db, 'reflectionTemplates');
  // Check if a published default exists for resident and tutor
  const residentSnap = await getDocs(query(col, where('audience', '==', 'resident')));
  const tutorSnap = await getDocs(query(col, where('audience', '==', 'tutor')));

  const base = buildSectionsBase();
  const now = serverTimestamp();

  if (!residentSnap.docs.some((d) => (d.data() as any).status === 'published')) {
    const template: ReflectionTemplate = {
      templateKey: 'default_resident',
      version: 1,
      status: 'published',
      audience: 'resident',
      taskTypes: ['*'],
      sections: toSectionsLocalized(base, false, true),
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      publishedBy: 'system',
    } as any;
    await addDoc(col, template as any);
  }

  if (!tutorSnap.docs.some((d) => (d.data() as any).status === 'published')) {
    const template: ReflectionTemplate = {
      templateKey: 'default_tutor',
      version: 1,
      status: 'published',
      audience: 'tutor',
      taskTypes: ['*'],
      sections: toSectionsLocalized(base, true, true),
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      publishedBy: 'system',
    } as any;
    await addDoc(col, template as any);
  }
}

export async function importRotationFromCsv(params: {
  mode: 'create' | 'merge';
  rotationId?: string;
  csvText: string;
  rotationMeta?: {
    name: string;
    startDate: any;
    endDate: any;
    status: 'active' | 'inactive' | 'finished';
  };
}): Promise<{ rotationId: string; errors: string[] }> {
  const { rows } = parseRotationCsvText(params.csvText);
  const { leaves, errors } = normalizeParsedRows(rows);
  if (errors.length) return { rotationId: params.rotationId || '', errors };

  let rotationId = params.rotationId || '';
  if (params.mode === 'create') {
    if (!params.rotationMeta)
      return { rotationId: '', errors: ['Missing rotation meta for create mode'] };
    const created = await createRotation(params.rotationMeta);
    rotationId = created.id;
  }

  // build or fetch category nodes
  if (!rotationId) return { rotationId: '', errors: ['Missing rotationId'] };
  const allNodes = await listRotationNodes(rotationId);
  const rootIds = await ensureRootCategories(rotationId);
  const roots = ['Knowledge', 'Skills', 'Guidance'] as const;
  for (let i = 0; i < roots.length; i++) {
    const name = roots[i]!;
    const id = rootIds[name];
    const exists = allNodes.find((n) => n.id === id);
    if (!exists)
      allNodes.push({
        id,
        rotationId,
        parentId: null as any,
        type: 'category',
        name,
        order: i,
      } as any);
  }

  function norm(s: string) {
    return String(s || '')
      .trim()
      .toLowerCase();
  }
  async function ensureChild(
    parentId: string,
    type: RotationNode['type'],
    name: string,
  ): Promise<string> {
    const siblings = allNodes.filter((n) => n.parentId === parentId && n.type === type);
    const targetName = norm(name);
    let existing = siblings.find((n) => norm(n.name) === targetName);
    if (existing) return existing.id as string;
    const created = await createNode({
      rotationId,
      parentId,
      type,
      name,
      order: siblings.length,
    } as any);
    const newNode: any = {
      id: created.id,
      rotationId,
      parentId,
      type,
      name,
      order: siblings.length,
    };
    allNodes.push(newNode);
    return created.id;
  }

  for (const leaf of leaves) {
    const catNode = allNodes.find(
      (n) => n.parentId === null && n.type === 'category' && n.name === leaf.category,
    );
    const catId: string = catNode ? (catNode.id as string) : '';
    const subjectId = await ensureChild(catId as string, 'subject', leaf.subject as string);
    const topicId = await ensureChild(subjectId as string, 'topic', leaf.topic as string);
    // SubTopic is now optional - if not provided, leaf becomes direct child of topic
    const parentId = leaf.subTopic
      ? await ensureChild(topicId as string, 'subTopic', leaf.subTopic as string)
      : topicId;

    // Check if leaf already exists to prevent duplicates
    const siblings = allNodes.filter((n) => n.parentId === parentId && n.type === 'leaf');
    const targetName = norm(leaf.itemTitle);
    const existing = siblings.find((n) => norm(n.name) === targetName);

    if (existing) {
      // Update existing leaf with new data if any changes
      const updateData: any = {};
      if (leaf.requiredCount !== undefined) updateData.requiredCount = leaf.requiredCount;
      if (leaf.mcqUrl) updateData.mcqUrl = leaf.mcqUrl;
      if (leaf.resources) updateData.resources = leaf.resources;
      if (leaf.notes_en) updateData.notes_en = leaf.notes_en;
      if (leaf.notes_he) updateData.notes_he = leaf.notes_he;
      if (leaf.links && leaf.links.length > 0) updateData.links = leaf.links;

      if (Object.keys(updateData).length > 0) {
        await updateNode(existing.id, updateData);
      }
    } else {
      // Create new leaf
      // Build leaf data, omitting undefined fields (Firebase doesn't accept undefined)
      const leafData: any = {
        rotationId,
        parentId,
        type: 'leaf',
        name: leaf.itemTitle,
        order: siblings.length,
        requiredCount: leaf.requiredCount,
        links: leaf.links,
      };

      // Only add optional fields if they have values
      if (leaf.mcqUrl) leafData.mcqUrl = leaf.mcqUrl;
      if (leaf.resources) leafData.resources = leaf.resources;
      if (leaf.notes_en) leafData.notes_en = leaf.notes_en;
      if (leaf.notes_he) leafData.notes_he = leaf.notes_he;

      const created = await createNode(leafData);
      allNodes.push({
        id: created.id,
        rotationId,
        parentId,
        type: 'leaf',
        name: leaf.itemTitle,
        order: siblings.length,
      } as any);
    }
  }

  return { rotationId, errors: [] };
}

// Rotation Petitions (Admin)
export async function listRotationPetitions(params?: {
  status?: 'pending' | 'approved' | 'denied';
  type?: 'activate' | 'finish';
  rotationId?: string;
  residentQuery?: string;
  limit?: number;
  startAfter?: unknown;
}): Promise<ListPage<RotationPetition>> {
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
  const items = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  })) as unknown as RotationPetition[];
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
    // Update rotation status from 'inactive' to 'active'
    const rotRef = doc(db, 'rotations', p.rotationId);
    const rotSnap = await getDoc(rotRef);
    if (rotSnap.exists()) {
      await updateDoc(rotRef, { status: 'active' } as any);
    }
  } else if (p.type === 'finish') {
    // Update rotation status to 'finished' and assignment endedAt
    const rotRef = doc(db, 'rotations', p.rotationId);
    const rotSnap = await getDoc(rotRef);
    if (rotSnap.exists()) {
      await updateDoc(rotRef, { status: 'finished' } as any);
    }
    
    const active = await getDocs(
      query(
        collection(db, 'assignments'),
        where('residentId', '==', p.residentId),
        where('endedAt', '==', null),
      ),
    );
    const assignmentDoc = active.docs[0];
    if (assignmentDoc) {
      await updateDoc(assignmentDoc.ref, { endedAt: serverTimestamp() } as any);
    }
  }
  
  await updateDoc(pRef, {
    status: 'approved',
    resolvedAt: serverTimestamp(),
    resolvedBy: adminUid,
  } as any);

  // Send email notification (async, don't await)
  import('../notifications/petitionNotifications').then(async ({ sendPetitionApprovedEmail }) => {
    try {
      // Fetch resident email from user document
      const userSnap = await getDoc(doc(db, 'users', p.residentId));
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const residentEmail = userData.email;
        const rotationSnap = await getDoc(doc(db, 'rotations', p.rotationId));
        const rotationName = rotationSnap.exists() ? rotationSnap.data().name : p.rotationId;
        await sendPetitionApprovedEmail(p, residentEmail, rotationName);
      }
    } catch (error) {
      console.error('Error sending petition approved email:', error);
    }
  }).catch(console.error);
}

export async function denyRotationPetition(petitionId: string, adminUid: string): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  const pRef = doc(db, 'rotationPetitions', petitionId);
  const pSnap = await getDoc(pRef);
  if (!pSnap.exists()) throw new Error('Petition not found');
  const p = pSnap.data() as RotationPetition;
  
  await updateDoc(pRef, {
    status: 'denied',
    resolvedAt: serverTimestamp(),
    resolvedBy: adminUid,
  } as any);

  // Send email notification (async, don't await)
  import('../notifications/petitionNotifications').then(async ({ sendPetitionDeniedEmail }) => {
    try {
      // Fetch resident email from user document
      const userSnap = await getDoc(doc(db, 'users', p.residentId));
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const residentEmail = userData.email;
        const rotationSnap = await getDoc(doc(db, 'rotations', p.rotationId));
        const rotationName = rotationSnap.exists() ? rotationSnap.data().name : p.rotationId;
        await sendPetitionDeniedEmail(p, residentEmail, rotationName);
      }
    } catch (error) {
      console.error('Error sending petition denied email:', error);
    }
  }).catch(console.error);
}
