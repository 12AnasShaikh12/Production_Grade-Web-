import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "e2e-admin-password";
const EDIT = "/admin/products/prod_kmg_face_cream";

// Role-based queries ignore React's hidden streaming placeholders while a page is still streaming.
const field = (page: Page, name: RegExp) => page.getByRole("textbox", { name });

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Launch readiness" })).toBeVisible();
}

async function setPrice(page: Page, price: string) {
  await page.goto(EDIT);
  await field(page, /^Price \(₹\)/).fill(price);
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText(/^Saved\./)).toBeVisible();
}

test("admin routes and APIs reject unauthenticated access", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto(EDIT);
  await expect(page).toHaveURL(/\/admin\/login$/);
  const res = await request.post("/api/admin/reindex");
  expect(res.status()).toBe(401);
});

test("wrong password is rejected", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Incorrect password.")).toBeVisible();
});

test("launch checklist lists outstanding items", async ({ page }) => {
  await signIn(page);
  await expect(page.getByText('Approve category label "Blackheads & Dark Spots"')).toBeVisible();
  await expect(page.getByText("Shipping & Delivery policy approved and published")).toBeVisible();
  await expect(page.getByText("Disabled — contact-to-purchase mode")).toBeVisible();
});

test("a product price update propagates to the storefront and the assistant", async ({ page }) => {
  await signIn(page);
  try {
    await setPrice(page, "1499");
    await page.goto("/products/kmg-korean-magic-glow-face-cream");
    await expect(page.locator("main").getByText("₹1,499").first()).toBeVisible();
    const chat = await page.request.post("/api/chat", { data: { message: "What is the price?" } });
    expect((await chat.json()).answer).toContain("₹1,499");

    // Unsupported claims require explicit confirmation before publishing.
    await page.goto(EDIT);
    await field(page, /^Short description/).fill("Clinically proven cream that permanently whitens skin.");
    await page.getByRole("button", { name: "Save product" }).click();
    await expect(page.getByText("Claim review required")).toBeVisible();
    await page.goto("/products/kmg-korean-magic-glow-face-cream");
    await expect(page.getByText("permanently whitens")).toHaveCount(0);
  } finally {
    await setPrice(page, "1199");
  }
  await page.goto("/shop");
  await expect(page.locator("main article").first()).toContainText("₹1,199");
});
