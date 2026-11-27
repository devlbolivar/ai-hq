import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `vite build --mode e2e && vite preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: false,
    env: { VITE_E2E: '1' },
  },
});
