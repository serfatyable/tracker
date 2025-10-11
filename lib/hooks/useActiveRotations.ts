"use client";
import { useEffect, useState } from 'react';

import type { Rotation } from '../../types/rotations';
import { listRotations } from '../firebase/admin';

export function useActiveRotations() {
    const [rotations, setRotations] = useState<Rotation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const page = await listRotations({ status: 'active', limit: 200 });
                setRotations(page.items || []);
            } catch (e: any) {
                setError(e?.message || 'Failed to load rotations');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return { rotations, loading, error } as const;
}


