import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import TextInput from '../TextInput';

test('renders error and sets aria', () => {
	render(<TextInput id="email" label="Email" value="" onChange={() => {}} error="Required" />);
	const input = screen.getByLabelText('Email');
	expect(input).toHaveAttribute('aria-invalid', 'true');
	expect(screen.getByText('Required')).toBeInTheDocument();
});
