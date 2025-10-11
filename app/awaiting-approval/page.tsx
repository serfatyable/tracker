"use client";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { getCurrentUserWithProfile } from '../../lib/firebase/auth';


export default function AwaitingApprovalPage() {
	const router = useRouter();
	const { t } = useTranslation();

	useEffect(() => {
		let cancelled = false;
		async function check() {
			const { firebaseUser, profile } = await getCurrentUserWithProfile();
			if (!firebaseUser) {
				router.replace('/auth');
				return;
			}
			if (profile && profile.status !== 'pending') {
				if (profile.role === 'resident') router.replace('/resident');
				else if (profile.role === 'tutor') router.replace('/tutor');
				else router.replace('/admin');
			}
		}
		check();
		const id = setInterval(() => { if (!cancelled) check(); }, 10000);
		return () => { cancelled = true; clearInterval(id); };
	}, [router]);

	return (
		<div className="mx-auto max-w-md p-6 text-center">
			<p className="text-lg">{t('auth.awaitingApproval')}</p>
		</div>
	);
}
