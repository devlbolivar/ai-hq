import { shouldExposeTestHook, type TestHookEnv } from './testHook';

export interface SimOptions {
  /** Seed of the autonomy PRNG (FR-019). */
  readonly seed: number;
  /** Start paused (e2e only). */
  readonly paused: boolean;
}

/**
 * `?seed=N` fixes the seed in any build; otherwise it comes from the load time. `?paused=1` starts
 * paused only where the test hook is exposed (contracts/ui-contract.md).
 */
export function readSimOptions(
  location: { readonly search: string },
  env: TestHookEnv,
  now: () => number,
): SimOptions {
  const params = new URLSearchParams(location.search);
  const raw = params.get('seed') ?? '';
  const seed = /^-?\d+$/.test(raw) ? Number(raw) : Math.floor(now()) >>> 0;
  const paused = shouldExposeTestHook(env) && params.get('paused') === '1';
  return { seed, paused };
}
