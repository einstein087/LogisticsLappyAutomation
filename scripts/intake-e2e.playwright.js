const http = require("http");
const { spawn } = require("child_process");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const START_TIMEOUT_MS = 60_000;
const WAIT_TIMEOUT_MS = 20_000;

const TEST_DATA = {
  employeeId: "3662",
  fullName: "Yash U",
  email: "yashupadrasta99@gmail.com",
  phone: "9059727725",
  department: "Data Analytics and AI",
  requestType: "Laptop Request",
  requestTypeLogistics: "Asset Transfer / Laptop Reallocation",
  assetType: "Dell",
  accessories: "Charger, Laptop Bag",
  assetTag: "ASG112BE23",
  pickupLocation: "Andheri, Mumbai",
  pickupContacts: "Prakash Patil, Vikram Dabhi",
  pickupPhone: "8108040602",
  pickupAddress: [
    "Unit No. 23",
    "Level 2",
    "Kalpataru Square",
    "Kondivita Lane",
    "Andheri East",
    "Mumbai - 400059",
    "Maharashtra",
  ].join("\n"),
  dropLocation: "Bangalore",
  dropRecipient: "D. Yaswanth Kumar",
  dropPhone: "7989378708",
  dropAddress: [
    "Bhive Workspace Solutions",
    "No. 82-6-114/5",
    "Old Madras Road",
    "North Halasuru",
    "Hoysala Nagar",
    "Ward No. 80",
    "Bangalore - 560008",
    "Karnataka",
  ].join("\n"),
  trackingRequestId: "REQ00110016",
  courierPartner: "South Hill Travels",
  trackingNumber: "TR0000123",
  pickupDate: "2026-07-14",
  dispatchDate: "2026-07-16",
  expectedDeliveryDate: "2026-07-16",
  actualDeliveryDate: "2026-07-16",
  currentStatus: "In-Progress",
  remarks: "Delivery needs to reach customer",
  logisticsNotes: "Delivery reaching customer - ASG112BE23 (Asset Number), Dell (Asset Type), Charger+Laptop Bag",
};

function startWebhookServer(port = 8799) {
  return new Promise((resolve, reject) => {
    const received = {
      email: [],
      sms: [],
    };

    const server = http.createServer((req, res) => {
      if (req.method !== "POST") {
        res.writeHead(405);
        res.end();
        return;
      }

      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        const bodyText = Buffer.concat(chunks).toString("utf8");
        let parsed;
        try {
          parsed = bodyText ? JSON.parse(bodyText) : {};
        } catch {
          parsed = { raw: bodyText };
        }

        if (req.url === "/email") {
          received.email.push(parsed);
        } else if (req.url === "/sms") {
          received.sms.push(parsed);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      });
    });

    server.on("error", reject);
    server.listen(port, () => {
      resolve({
        server,
        received,
        emailWebhookUrl: `http://127.0.0.1:${port}/email`,
        smsWebhookUrl: `http://127.0.0.1:${port}/sms`,
      });
    });
  });
}

function startDevServer(envOverrides) {
  return new Promise((resolve, reject) => {
    const child = spawn("npm run dev", {
      cwd: process.cwd(),
      shell: true,
      env: {
        ...process.env,
        ...envOverrides,
      },
    });

    let settled = false;
    let fullOutput = "";

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error(`Timed out waiting for dev server URL. Output:\n${fullOutput}`));
    }, START_TIMEOUT_MS);

    const onData = (chunk) => {
      const text = String(chunk);
      fullOutput += text;
      process.stdout.write(text);

      const match = text.match(/http:\/\/localhost:\d+/i) || fullOutput.match(/http:\/\/localhost:\d+/i);
      if (!settled && match) {
        settled = true;
        clearTimeout(timeout);
        resolve({
          child,
          url: match[0],
        });
      }
    };

    child.stdout.on("data", onData);
    child.stderr.on("data", onData);

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(err);
    });

    child.on("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error(`Dev server exited early with code ${code}. Output:\n${fullOutput}`));
    });
  });
}

async function waitFor(checkFn, timeoutMs, message) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (checkFn()) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(message);
}

async function runValidationCase(page) {
  await page.click("#nextStepBtn");
  const messageText = await page.textContent("#message");
  assert.ok(
    messageText && messageText.includes("Please enter full name and email"),
    "Validation case failed: Continue should be blocked when Full Name/Email are missing."
  );
}

async function runSuccessfulSubmissionCase(page, browser, webhookState) {
  await page.fill("#employeeId", TEST_DATA.employeeId);
  await page.fill("#fullName", TEST_DATA.fullName);
  await page.fill("#email", TEST_DATA.email);
  await page.fill("#phone", TEST_DATA.phone);
  await page.fill("#department", TEST_DATA.department);
  await page.selectOption("#requestType", TEST_DATA.requestType);

  await page.click("#nextStepBtn");
  await page.waitForSelector("#stepLogistics.active", { timeout: 10_000 });

  await page.fill("#requestTypeLogistics", TEST_DATA.requestTypeLogistics);
  await page.fill("#assetType", TEST_DATA.assetType);
  await page.fill("#accessories", TEST_DATA.accessories);
  await page.fill("#assetTag", TEST_DATA.assetTag);
  await page.fill("#pickupLocation", TEST_DATA.pickupLocation);
  await page.fill("#pickupContacts", TEST_DATA.pickupContacts);
  await page.fill("#pickupPhone", TEST_DATA.pickupPhone);
  await page.fill("#pickupAddress", TEST_DATA.pickupAddress);
  await page.fill("#dropLocation", TEST_DATA.dropLocation);
  await page.fill("#dropRecipient", TEST_DATA.dropRecipient);
  await page.fill("#dropPhone", TEST_DATA.dropPhone);
  await page.fill("#dropAddress", TEST_DATA.dropAddress);

  await page.fill("#trackingRequestId", TEST_DATA.trackingRequestId);
  await page.fill("#courierPartner", TEST_DATA.courierPartner);
  await page.fill("#trackingNumber", TEST_DATA.trackingNumber);
  await page.fill("#pickupDate", TEST_DATA.pickupDate);
  await page.fill("#dispatchDate", TEST_DATA.dispatchDate);
  await page.fill("#expectedDeliveryDate", TEST_DATA.expectedDeliveryDate);
  await page.fill("#actualDeliveryDate", TEST_DATA.actualDeliveryDate);
  await page.fill("#currentStatus", TEST_DATA.currentStatus);
  await page.fill("#remarks", TEST_DATA.remarks);
  await page.fill("#logisticsNotes", TEST_DATA.logisticsNotes);

  await page.click('#stepLogistics button[type="submit"]');
  await page.waitForSelector("#requestPreview", { state: "visible", timeout: 15_000 });

  const messageClass = await page.getAttribute("#message", "class");
  const messageText = await page.textContent("#message");
  const previewText = await page.textContent("#requestPreview");

  assert.ok(messageClass && messageClass.includes("success"), "Submission case failed: Success state not shown.");
  assert.ok(messageText && messageText.trim().length > 0, "Submission case failed: Success text is empty.");
  assert.ok(previewText && previewText.includes(TEST_DATA.fullName), "Preview case failed: Full name missing.");
  assert.ok(previewText && previewText.includes(TEST_DATA.trackingRequestId), "Preview case failed: Request ID missing.");
  assert.ok(previewText && previewText.includes(TEST_DATA.courierPartner), "Preview case failed: Courier partner missing.");
  assert.ok(previewText && previewText.includes(TEST_DATA.currentStatus), "Preview case failed: Current status missing.");

  await waitFor(
    () => webhookState.email.length >= 2 && webhookState.sms.length >= 1,
    WAIT_TIMEOUT_MS,
    "Notification case failed: Expected user email, manager approval email, and SMS webhook calls."
  );

  const userEmailPayload = webhookState.email.find((payload) => payload.template === "user_confirmation") || {};
  const managerEmailPayload = webhookState.email.find((payload) => payload.template === "manager_approval") || {};
  const smsPayload = webhookState.sms[0] || {};

  assert.equal(userEmailPayload.to, TEST_DATA.email, "Email notification case failed: recipient mismatch.");
  assert.ok(
    String(userEmailPayload.subject || "").includes("Andheri, Mumbai") && String(userEmailPayload.subject || "").includes("Bangalore"),
    "Email notification case failed: subject does not contain source/destination."
  );
  assert.ok(
    String(userEmailPayload.message || "").includes(TEST_DATA.trackingRequestId),
    "Email notification case failed: message does not include request id."
  );

  assert.equal(managerEmailPayload.to, TEST_DATA.email, "Manager approval email case failed: recipient mismatch.");
  assert.ok(String(managerEmailPayload.approveUrl || "").includes("/approve/"), "Manager approval email case failed: missing approveUrl.");
  assert.ok(String(managerEmailPayload.rejectUrl || "").includes("/reject/"), "Manager approval email case failed: missing rejectUrl.");

  const approvalPage = await browser.newPage();
  await approvalPage.goto(String(managerEmailPayload.approveUrl), { waitUntil: "domcontentloaded" });
  const approvalText = await approvalPage.textContent("body");
  assert.ok(approvalText && approvalText.includes("Request Approved"), "Approval route case failed: approve link did not render approved state.");
  await approvalPage.close();

  assert.equal(smsPayload.to, TEST_DATA.phone, "SMS notification case failed: recipient mismatch.");
  assert.ok(
    String(smsPayload.message || "").includes(TEST_DATA.trackingRequestId),
    "SMS notification case failed: message does not include request id."
  );
}

async function run() {
  const headed = process.env.HEADED === "1";
  const webhook = await startWebhookServer(8799);
  const { child, url } = await startDevServer({
    EMAIL_WEBHOOK_URL: webhook.emailWebhookUrl,
    SMS_WEBHOOK_URL: webhook.smsWebhookUrl,
  });

  let browser;
  try {
    browser = await chromium.launch({ headless: !headed });
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto(url, { waitUntil: "domcontentloaded" });

    console.log("Running case 1: Step 1 validation blocking...");
    await runValidationCase(page);

    console.log("Running case 2: Full request submission and preview assertions...");
    await runSuccessfulSubmissionCase(page, browser, webhook.received);

    console.log("Running case 3: Notification webhook assertions (email + SMS)...");
    if (pageErrors.length > 0) {
      throw new Error(`Browser page errors found:\n${pageErrors.join("\n")}`);
    }

    console.log("\nE2E PASS: Validation, full intake flow, preview content, and email/SMS notification triggers succeeded.");
  } finally {
    if (browser) {
      await browser.close();
    }
    child.kill();
    webhook.server.close();
  }
}

run().catch((err) => {
  console.error("\nE2E FAIL:", err.message);
  process.exit(1);
});
