import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * The perf smoke (SC-003) measures frames on the real GPU: the default headless shell renders WebGL
 * in software (SwiftShader), which caps this scene below 50 fps regardless of the app's own cost.
 */
const platform = (globalThis as { process?: { platform?: string } }).process?.platform;
const gpuArgs = [
  '--ignore-gpu-blocklist',
  '--enable-gpu',
  ...(platform === 'darwin' ? ['--use-angle=metal'] : []),
];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: 'perf.spec.ts' },
    {
      // Runs after every other e2e so that the frame rate is not shared with parallel workers.
      name: 'perf',
      dependencies: ['chromium'],
      testMatch: 'perf.spec.ts',
      use: { ...devices['Desktop Chrome'], channel: 'chromium', launchOptions: { args: gpuArgs } },
    },
  ],
  webServer: {
    command: `vite build --mode e2e && vite preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: false,
    env: { VITE_E2E: '1' },
  },
});
