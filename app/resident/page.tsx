"use client";
import { useState } from 'react';

import AuthGate from '../../components/auth/AuthGate';
import SettingsPanel from '../../components/settings/SettingsPanel';
import TopBar from '../../components/TopBar';

export default function ResidentDashboard() {
    const [tab, setTab] = useState<'dashboard' | 'settings'>('dashboard');
    return (
        <AuthGate requiredRole="resident">
            <div>
                <TopBar />
                <div className="p-6">
                    <div className="glass-card p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex gap-2">
                                <button className={`tab-levitate ${tab==='dashboard' ? 'ring-1 ring-blue-500' : ''}`} onClick={()=> setTab('dashboard')}>Dashboard</button>
                                <button className={`tab-levitate ${tab==='settings' ? 'ring-1 ring-blue-500' : ''}`} onClick={()=> setTab('settings')}>Settings</button>
                            </div>
                        </div>
                        {tab === 'dashboard' ? (
                            <div className="card-levitate">Resident dashboard (placeholder)</div>
                        ) : (
                            <div className="space-y-3">
                                <SettingsPanel />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthGate>
    );
}
