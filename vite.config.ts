import { execSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';

// Version shown in the app. A tag build in CI uses the pushed tag (e.g. "v1.2.3");
// otherwise fall back to the nearest git tag, then to "dev".
function appVersion(): string {
  if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME) {
    return process.env.GITHUB_REF_NAME;
  }
  try {
    return execSync('git describe --tags --always --dirty', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
});
