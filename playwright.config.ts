import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

// E2E runs against a production build. APP_ENV=development enables the local admin login and an
// isolated JSON content store — test-only values, never use them on a real deployment.
const env = {
  APP_ENV: "development",
  NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
  ADMIN_LOCAL_PASSWORD: "e2e-admin-password",
  ADMIN_SESSION_SECRET: "e2e-session-secret-0123456789abcdefghijkl",
  LOCAL_CONTENT_STORE: "enabled",
  LOCAL_CONTENT_PATH: ".data/e2e-content.json",
  CHAT_RATE_LIMIT_MAX: "200",
  // No NVIDIA, Supabase or Razorpay credentials: verifies the unconfigured, fallback behaviour.
  NVIDIA_API_KEY: "",
  SUPABASE_URL: "",
  RAZORPAY_KEY_ID: "",
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: false,
    env,
  },
});
