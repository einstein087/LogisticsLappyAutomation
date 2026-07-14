import { expect, test } from "@playwright/test";

const appUrl = process.env.APP_URL?.trim() || "http://127.0.0.1:4000";

test.setTimeout(60_000);

test("submits the intake form and renders the request preview", async ({ page }) => {
  if (appUrl.includes(".loca.lt")) {
    await page.setExtraHTTPHeaders({
      "bypass-tunnel-reminder": "1",
    });
  }

  await page.goto(appUrl, { waitUntil: "domcontentloaded" });

  await expect(page.locator("#stepUser")).toHaveClass(/active/);

  await page.fill("#employeeId", "3662");
  await page.fill("#fullName", "Yash U");
  await page.fill("#email", "yashupadrasta99@gmail.com");
  await page.fill("#phone", "9059727725");
  await page.fill("#department", "Data Analytics and AI");
  await page.selectOption("#requestType", "Laptop Request");

  await page.click("#nextStepBtn");
  await expect(page.locator("#stepLogistics")).toHaveClass(/active/);

  await page.fill("#requestTypeLogistics", "Asset Transfer / Laptop Relocation");
  await page.fill("#assetType", "Dell Laptop");
  await page.fill("#accessories", "Charger\nLaptop Bag");
  await page.fill("#assetTag", "ASG0123F3");

  await page.fill("#pickupLocation", "Mumbai");
  await page.fill("#pickupContacts", "Vikram Dabhi, Prakash Patil");
  await page.fill("#pickupPhone", "8008080080");
  await page.fill("#pickupAddress", "Mumbai");

  await page.fill("#dropLocation", "Bangalore");
  await page.fill("#dropRecipient", "D. Yaswanth Kumar");
  await page.fill("#dropPhone", "9090909090");
  await page.fill("#dropAddress", "Bangalore");

  await page.fill("#trackingRequestId", "REQ0000123");
  await page.fill("#courierPartner", "South India Travels");
  await page.fill("#trackingNumber", "TRQ000012");
  await page.fill("#pickupDate", "2026-07-14");
  await page.fill("#dispatchDate", "2026-07-16");
  await page.fill("#expectedDeliveryDate", "2026-07-16");
  await page.fill("#actualDeliveryDate", "2026-07-17");
  await page.fill("#currentStatus", "Dispatch Wait");
  await page.fill("#remarks", "Dispatch Wait");
  await page.fill("#logisticsNotes", "User waiting for laptop");

  await page.click('#stepLogistics button[type="submit"]');

  await expect(page.locator("#message")).toContainText(/captured successfully|completed successfully|request captured/i, {
    timeout: 20_000,
  });
  await expect(page.locator("#requestPreview")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#requestPreview")).toContainText("Yash U");
  await expect(page.locator("#requestPreview")).toContainText("REQ0000123");
  await expect(page.locator("#requestPreview")).toContainText("South India Travels");
  await expect(page.locator("#requestPreview")).toContainText("Dispatch Wait");
});