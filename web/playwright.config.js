import { defineConfig } from '@playwright/test';

// The app must run with no API keys, so the test server gets empty keys.
export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  workers: 1,
  use: { baseURL: 'http://localhost:5174', channel: 'chrome', headless: true, viewport: { width: 500, height: 900 } },
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:5174/api/health',
    reuseExistingServer: false,
    env: { PORT: '5174', ELEVENLABS_API_KEY: '', ELEVENLABS_AGENT_ID: '', ELEVENLABS_VOICE_ID: '', AGENT_SCRIPT: 'off', AGENT_TICK_MS: '300' },
  },
});
