'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import type { Assignment } from '../../../types/assignments';
import type { UserProfile } from '../../../types/auth';

type Props = {
  assignments: Assignment[];
  tutors: UserProfile[];
};

export default function TutorLoadChart({ assignments, tutors }: Props): React.ReactElement {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    // Calculate load per tutor
    const load = new Map<string, number>();
    const tutorNames = new Map<string, string>();

    // Initialize all tutors with 0
    for (const tutor of tutors) {
      load.set(tutor.uid, 0);
      tutorNames.set(tutor.uid, tutor.fullName || tutor.uid);
    }

    // Count assignments per tutor
    for (const assignment of assignments) {
      for (const tutorId of assignment.tutorIds || []) {
        load.set(tutorId, (load.get(tutorId) || 0) + 1);
      }
    }

    // Convert to chart data format
    return Array.from(load.entries())
      .map(([tutorId, count]) => ({
        name: tutorNames.get(tutorId) || tutorId,
        assignments: count,
        tutorId,
      }))
      .sort((a, b) => b.assignments - a.assignments); // Sort by load descending
  }, [assignments, tutors]);

  if (chartData.length === 0) {
    return (
      <div className="card-levitate p-6 text-center">
        <p className="text-sm text-foreground/60">
          {t('dashboard.noTutorData', { defaultValue: 'No tutor data available' })}
        </p>
      </div>
    );
  }

  return (
    <div className="card-levitate p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        {t('dashboard.tutorLoadDistribution', { defaultValue: 'Tutor Load Distribution' })}
      </h3>
      <p className="text-sm text-foreground/60 mb-4">
        {t('dashboard.tutorLoadDesc', {
          defaultValue: 'Number of active assignments per tutor',
        })}
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 12 }}
            interval={0}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgb(var(--surface))',
              border: '1px solid rgb(var(--muted) / 0.3)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: 'rgb(var(--fg))' }}
          />
          <Bar
            dataKey="assignments"
            fill="url(#colorGradient)"
            radius={[8, 8, 0, 0]}
            maxBarSize={60}
          />
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7} />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
