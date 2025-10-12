import { describe, it, expect, vi } from 'vitest';

const cookieStore: any = {
  get: vi.fn(() => undefined),
  getAll: vi.fn(() => []),
  set: vi.fn(),
  delete: vi.fn(),
  has: vi.fn(() => false),
};

vi.mock('next/headers', () => ({ cookies: () => cookieStore }));

import RootLayout from '../layout';

describe('RootLayout SSR lang/dir', () => {
  it('renders en/ltr by default', () => {
    cookieStore.get.mockReturnValue(undefined);
    cookieStore.getAll.mockReturnValue([]);
    cookieStore.has.mockReturnValue(false);
    const node = RootLayout({ children: 'x' as any }) as any;
    expect(node.props.lang).toBe('en');
    expect(node.props.dir).toBe('ltr');
  });

  it('renders he/rtl when i18n_lang=he', () => {
    cookieStore.get.mockReturnValue({ name: 'i18n_lang', value: 'he' });
    cookieStore.getAll.mockReturnValue([{ name: 'i18n_lang', value: 'he' }]);
    cookieStore.has.mockImplementation((n: string) => n === 'i18n_lang');
    const node = RootLayout({ children: 'x' as any }) as any;
    expect(node.props.lang).toBe('he');
    expect(node.props.dir).toBe('rtl');
  });
});
