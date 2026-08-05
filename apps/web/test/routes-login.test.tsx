import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { beforeAll } from 'vitest';
import { initI18n } from '../src/app/i18n';
import { LoginPage } from '../src/routes/LoginPage';

beforeAll(async () => {
  await initI18n();
});

describe('LoginPage (未登录可用)', () => {
  beforeEach(() => {
    render(<LoginPage />);
  });

  it('shows login is optional', () => {
    expect(screen.getByRole('heading', { name: /ログイン/ })).toBeInTheDocument();
  });
});