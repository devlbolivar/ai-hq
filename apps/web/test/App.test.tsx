import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { App } from '../src/App';

// Pixi needs WebGL, which jsdom lacks; the canvas is covered by e2e (research R10).
vi.mock('../src/render/OfficeCanvas', () => ({ OfficeCanvas: () => null }));

afterEach(cleanup);

describe('App', () => {
  it('renders the office heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'AI HQ — Marketing' })).toBeTruthy();
  });
});
