"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { updateUserLanguage } from '../../lib/firebase/auth';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import { applyLanguageToDocument } from '../../lib/i18n/applyLanguage';

export default function SettingsPage() {
	const router = useRouter();
	const { t, i18n } = useTranslation();
	const [language, setLanguage] = useState<'en' | 'he'>('en');
	const [loading, setLoading] = useState(false);
    const { status, firebaseUser, data: profile } = useCurrentUserProfile();

    useEffect(() => {
        if (status !== 'ready') return; // wait until auth state is known
        if (!firebaseUser) {
            router.replace('/auth');
            return;
        }
        if (!profile || profile.status === 'pending') {
            router.replace('/awaiting-approval');
            return;
        }
        setLanguage((profile.settings?.language as 'en' | 'he') || 'en');
    }, [status, firebaseUser, profile, router]);

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		try {
			setLoading(true);
			await updateUserLanguage(language);
			applyLanguageToDocument(language);
			i18n.changeLanguage(language);
		} catch {
			// no-op
		} finally {
			setLoading(false);
		}
	}

	return (
        <div className="mx-auto max-w-md p-6">
            {status !== 'ready' ? (
                <div className="text-sm text-gray-600">Loading…</div>
            ) : null}
			<h1 className="mb-4 text-xl font-semibold">Settings</h1>
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
		</div>
	);
}
