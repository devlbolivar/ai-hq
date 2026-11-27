import { describe, expect, it } from 'vitest';
import { readSimOptions } from '../src/seed';

const dev = { MODE: 'development' };
const prod = { MODE: 'production' };
const now = () => 1_700_000_123_456.7;

describe('readSimOptions (contracts/ui-contract.md "Hook de pruebas")', () => {
  it('reads an integer ?seed=N', () => {
    expect(readSimOptions({ search: '?seed=42' }, prod, now).seed).toBe(42);
    expect(readSimOptions({ search: '?x=1&seed=7' }, dev, now).seed).toBe(7);
  });

  it.each(['', '?seed=', '?seed=abc', '?seed=1.5'])(
    'falls back to the clock for "%s"',
    (search) => {
      expect(readSimOptions({ search }, dev, now).seed).toBe(Math.floor(now()) >>> 0);
    },
  );

  it('honours ?paused=1 only when the test hook is exposed', () => {
    expect(readSimOptions({ search: '?paused=1' }, dev, now).paused).toBe(true);
    expect(
      readSimOptions({ search: '?paused=1' }, { MODE: 'production', VITE_E2E: '1' }, now).paused,
    ).toBe(true);
    expect(readSimOptions({ search: '?paused=1' }, prod, now).paused).toBe(false);
    expect(readSimOptions({ search: '' }, dev, now).paused).toBe(false);
  });
});
