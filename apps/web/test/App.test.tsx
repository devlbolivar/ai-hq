import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { App } from '../src/App';

afterEach(cleanup);

describe('App', () => {
  it('renders the office heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'AI HQ — Marketing' })).toBeTruthy();
  });
});
