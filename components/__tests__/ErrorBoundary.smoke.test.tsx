import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import ErrorBoundary from '../../app/error';

describe('Error boundary', () => {
  it('renders message and retry button', () => {
    const { getByText } = render(<ErrorBoundary error={new Error('boom')} reset={() => {}} />);
    // i18n mock humanizes keys to lowercase with spaces
    expect(getByText(/something went wrong/i)).toBeTruthy();
    expect(getByText(/try again/i)).toBeTruthy();
  });
});
