import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import ErrorBoundary from '../../app/error';

describe('Error boundary', () => {
  it('renders message and retry button', () => {
    const { getByText } = render(<ErrorBoundary error={new Error('boom')} reset={() => {}} />);
    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();
  });
});
