import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import RotationSelection from '../RotationSelection';

describe('RotationSelection', () => {
  it('renders current rotation dropdown and completed rotations list', () => {
    const mockRotations = [
      { id: '1', name: 'ICU', createdAt: {} as any, startDate: {} as any, endDate: {} as any },
      {
        id: '2',
        name: 'Operating Room',
        createdAt: {} as any,
        startDate: {} as any,
        endDate: {} as any,
      },
    ];

    const mockOnCompletedChange = vi.fn();
    const mockOnCurrentChange = vi.fn();

    render(
      <RotationSelection
        rotations={mockRotations}
        completedRotationIds={[]}
        currentRotationId=""
        onCompletedChange={mockOnCompletedChange}
        onCurrentChange={mockOnCurrentChange}
        loading={false}
        language="en"
        completedLabel="Completed Rotations"
        currentLabel="Current Rotation"
      />,
    );

    expect(screen.getByText('Current Rotation')).toBeInTheDocument();
    expect(screen.getByText('Completed Rotations')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
