"use client";
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { updateUserLanguage } from '../../lib/firebase/auth';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import { applyLanguageToDocument } from '../../lib/i18n/applyLanguage';

export default function SettingsPanel() {
    const { t, i18n } = useTranslation();
    const { status, firebaseUser, data: profile } = useCurrentUserProfile();
    const [language, setLanguage] = useState<'en' | 'he'>('en');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (status !== 'ready') return;
        if (!firebaseUser || !profile) return;
        setLanguage((profile.settings?.language as 'en' | 'he') || 'en');
    }, [status, firebaseUser, profile]);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        try {
            setLoading(true);
            await updateUserLanguage(language);
            applyLanguageToDocument(language);
            i18n.changeLanguage(language);
        } finally {
            setLoading(false);
        }
    }

    if (status !== 'ready') {
        return <div className="text-sm text-gray-600">Loading…</div>;
    }

    return (
        <form onSubmit={handleSave} className="space-y-4">
            <div>
                <label className="block text-sm font-medium">{t('auth.language')}</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'he')} className="mt-1 input-levitate">
                    <option value="en">English</option>
                    <option value="he">עברית</option>
                </select>
            </div>
            <button type="submit" disabled={loading} className="btn-levitate">Save</button>
        </form>
    );
}


