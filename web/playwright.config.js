import { defineConfig } from '@playwright/test';

// The app must run with no API keys, so the test server gets empty keys.
export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  workers: 1,
  // Port 5176: 5173/5174 are often in use by a running demo.
  use: { baseURL: 'http://localhost:5176', channel: 'chrome', headless: true, viewport: { width: 500, height: 900 } },
  webServer: [
    {
      command: 'node server.js',
      url: 'http://localhost:5176/api/health',
      reuseExistingServer: false,
      env: { PORT: '5176', ELEVENLABS_API_KEY: '', ELEVENLABS_AGENT_ID: '', ELEVENLABS_VOICE_ID: '', AGENT_OS_PASSCODE: '' },
    },
    {
      // Same app with a passcode, like the deployed site.
      command: 'node server.js',
      url: 'http://localhost:5177/api/health',
      reuseExistingServer: false,
      env: { PORT: '5177', ELEVENLABS_API_KEY: '', ELEVENLABS_AGENT_ID: '', ELEVENLABS_VOICE_ID: '', AGENT_OS_PASSCODE: 'u-topia-2026' },
    },
  ],
});
