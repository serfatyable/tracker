import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ProgramTypeSelect from '../ProgramTypeSelect';

describe('ProgramTypeSelect', () => {
  it('renders dropdown with label and options', () => {
    const mockOnChange = vi.fn();

    render(
      <ProgramTypeSelect
        id="test-program-type"
        value=""
        onChange={mockOnChange}
        label="Medical School Program"
        option4Year="4-year program"
        option6Year="6-year program"
      />,
    );

    expect(screen.getByText('Medical School Program')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
