import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { vi } from 'vitest';

import type { RotationNode } from '../../../types/rotations';
import QuickLogDialog from '../QuickLogDialog';

vi.mock('../../../lib/hooks/useReflectionTemplates', () => ({
  useLatestPublishedTemplate: () => ({ template: null, loading: false, error: null }),
}));

const leafNode: RotationNode = {
  id: 'leaf-1',
  rotationId: 'rot-1',
  parentId: 'topic-1',
  type: 'leaf',
  name: 'Airway assessment',
  order: 1,
  requiredCount: 10,
};

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  leaf: leafNode,
  onLog: vi.fn(),
  leafOptions: [
    {
      id: 'leaf-1',
      node: leafNode,
      title: 'Airway assessment',
      trail: 'Airway > Basics',
    },
  ],
  recentLeaves: [],
};

function setup(props: Partial<ComponentProps<typeof QuickLogDialog>> = {}) {
  const allProps = { ...defaultProps, ...props } as ComponentProps<typeof QuickLogDialog>;
  return render(<QuickLogDialog {...allProps} />);
}

describe('QuickLogDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lets residents jump between quick set and quick add counts', () => {
    setup();

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.value).toBe('1');

    fireEvent.click(screen.getByRole('button', { name: /^2$/ }));
    expect(input.value).toBe('2');

    fireEvent.click(screen.getByRole('button', { name: /\+5/ }));
    expect(input.value).toBe('7');

    fireEvent.click(screen.getByRole('button', { name: /decrease count/i }));
    expect(input.value).toBe('6');
  });

  it('submits via keyboard shortcut', async () => {
    const onLog = vi.fn().mockResolvedValue(undefined);
    setup({ onLog });

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Enter', ctrlKey: true });

    await waitFor(() => {
      expect(onLog).toHaveBeenCalledWith(leafNode, 1, undefined);
    });
  });

  it('keeps the dialog open when the toggle is enabled', async () => {
    const onLog = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    setup({ onLog, onClose });

    const stayToggle = screen.getByRole('switch', { name: /keep dialog open disabled/i });
    fireEvent.click(stayToggle);

    const submit = screen.getByRole('button', { name: /log/i });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(onLog).toHaveBeenCalledWith(leafNode, 1, undefined);
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('spinbutton')).toHaveValue(1);
  });
});
