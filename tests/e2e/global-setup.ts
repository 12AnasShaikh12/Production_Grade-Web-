import { rm } from "node:fs/promises";

/** Start every E2E run from the validated seed content. */
export default async function globalSetup() {
  await rm(".data/e2e-content.json", { force: true });
}
