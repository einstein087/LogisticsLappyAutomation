import express from "express";
import path from "path";
import "./config/env";
import { initDb } from "./db";
import approvalRoutes from "./routes/approvalRoutes";
import requestRoutes from "./routes/requestRoutes";
import { debug, error, getEnvSummary, warn } from "./utils/logger";

const app = express();
app.set("trust proxy", true);
const preferredPort = Number(process.env.PORT ?? 4000);

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));
app.use((req, res, next) => {
  debug("Incoming request", { method: req.method, path: req.path, body: req.body });
  next();
});
app.use(approvalRoutes);
app.use("/api", requestRoutes);

app.get("/", (req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lappy Intake</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; background: linear-gradient(135deg, #f8fbff, #eef4ff); color: #1f2937; }
      .card { max-width: 900px; margin: 32px auto; background: white; padding: 28px; border-radius: 18px; box-shadow: 0 14px 40px rgba(37, 99, 235, 0.12); }
      h1 { margin-top: 0; color: #1e3a8a; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
      label { display: block; font-weight: 600; margin-bottom: 6px; color: #374151; }
      input, select, textarea { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 10px; box-sizing: border-box; font-size: 0.95rem; }
      textarea { min-height: 96px; resize: vertical; }
      .full { grid-column: 1 / -1; }
      button { margin-top: 16px; padding: 10px 16px; border: none; border-radius: 10px; background: linear-gradient(90deg, #2563eb, #4f46e5); color: white; cursor: pointer; font-weight: 700; }
      button:hover { opacity: 0.95; }
      .message { margin-top: 16px; padding: 12px; border-radius: 10px; display: none; }
      .success { background: #dcfce7; color: #166534; display: block; }
      .error { background: #fee2e2; color: #991b1b; display: block; }
      .note { margin-top: 12px; color: #4b5563; font-size: 0.95rem; }
      .step { display: none; }
      .step.active { display: block; }
      .stepper { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
      .stepper span { padding: 8px 12px; border-radius: 999px; background: #eef2ff; color: #4338ca; font-size: 0.9rem; font-weight: 600; }
      .stepper span.active { background: #2563eb; color: white; }
      .subtle { color: #6b7280; font-size: 0.95rem; margin-bottom: 18px; }
      .section { margin-top: 18px; padding-top: 14px; border-top: 1px solid #e5e7eb; }
      .section h2 { margin: 0 0 10px; font-size: 1.08rem; color: #111827; }
      .section h3 { margin: 4px 0 12px; font-size: 0.96rem; color: #374151; }
      .tracking-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      .tracking-table th, .tracking-table td { border: 1px solid #e6e6e6; padding: 8px; text-align: left; }
      .tracking-table th { background: #f5f5f5; }
      .preview { margin-top: 20px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #fcfdff; display: none; }
      .preview h2 { margin: 0 0 12px; font-size: 1.15rem; color: #111827; }
      .preview h3 { margin: 16px 0 8px; font-size: 1rem; color: #1f2937; }
      .preview p { margin: 6px 0; }
      .preview pre { margin: 8px 0; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; white-space: pre-wrap; }
      .preview table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      .preview a { text-decoration: none; color: #464feb; }
      .preview tr th, .preview tr td { border: 1px solid #e6e6e6; padding: 8px; text-align: left; }
      .preview tr th { background-color: #f5f5f5; }
      .status-banner { margin: 12px 0 0; padding: 12px; border-radius: 10px; display: none; }
      .status-banner.ready { display: block; background: #ecfeff; color: #155e75; }
      .status-banner.warning { display: block; background: #fff7ed; color: #9a3412; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Request Intake</h1>
      <div class="stepper">
        <span class="active">Step 1: User Information</span>
        <span>Step 2: Pickup & Drop</span>
      </div>
      <p class="subtle">First capture the user details, then continue to the logistics step.</p>

      <form id="intakeForm">
        <div id="stepUser" class="step active">
          <div class="grid">
            <div>
              <label for="employeeId">Employee ID</label>
              <input id="employeeId" name="employeeId" />
            </div>
            <div>
              <label for="fullName">Full Name</label>
              <input id="fullName" name="fullName" required />
            </div>
            <div>
              <label for="email">Email</label>
              <input id="email" name="email" type="email" required />
            </div>
            <div>
              <label for="phone">Phone Number</label>
              <input id="phone" name="phone" />
            </div>
            <div>
              <label for="department">Department</label>
              <input id="department" name="department" />
            </div>
            <div>
              <label for="requestType">Request Type</label>
              <select id="requestType" name="requestType">
                <option value="Laptop Request">Laptop Request</option>
                <option value="Equipment Request">Equipment Request</option>
                <option value="Access Request">Access Request</option>
              </select>
            </div>
            <div class="full">
              <label for="notes">Notes</label>
              <textarea id="notes" name="notes"></textarea>
            </div>
          </div>
          <button type="button" id="nextStepBtn">Continue to Logistics</button>
        </div>

        <div id="stepLogistics" class="step">
          <div class="section">
            <h2>Request Information</h2>
            <div class="grid">
              <div class="full">
                <label for="requestTypeLogistics">Request Type</label>
                <input id="requestTypeLogistics" name="requestTypeLogistics" placeholder="Asset Transfer / Laptop Relocation" />
              </div>
              <div>
                <label for="assetType">Asset Type</label>
                <input id="assetType" name="assetType" placeholder="Dell Laptop" />
              </div>
              <div>
                <label for="assetTag">Asset Tag / Serial Number</label>
                <input id="assetTag" name="assetTag" placeholder="To be updated by Logistics Team" />
              </div>
              <div class="full">
                <label for="accessories">Accessories Included</label>
                <textarea id="accessories" name="accessories" placeholder="Charger&#10;Laptop Bag"></textarea>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Pickup Details</h2>
            <h3>Source Location</h3>
            <div class="grid">
              <div class="full">
                <label for="pickupLocation">Office Location</label>
                <input id="pickupLocation" name="pickupLocation" required />
              </div>
              <div class="full">
                <label for="pickupContacts">Contact Person(s)</label>
                <textarea id="pickupContacts" name="pickupContacts"></textarea>
              </div>
              <div class="full">
                <label for="pickupPhone">Phone Number</label>
                <input id="pickupPhone" name="pickupPhone" />
              </div>
              <div class="full">
                <label for="pickupAddress">Address</label>
                <textarea id="pickupAddress" name="pickupAddress"></textarea>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Delivery Details</h2>
            <h3>Destination Location</h3>
            <div class="grid">
              <div class="full">
                <label for="dropLocation">Location</label>
                <input id="dropLocation" name="dropLocation" required />
              </div>
              <div class="full">
                <label for="dropRecipient">Recipient</label>
                <input id="dropRecipient" name="dropRecipient" />
              </div>
              <div class="full">
                <label for="dropPhone">Phone Number</label>
                <input id="dropPhone" name="dropPhone" />
              </div>
              <div class="full">
                <label for="dropAddress">Address</label>
                <textarea id="dropAddress" name="dropAddress"></textarea>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Logistics Tracking Information</h2>
            <p class="subtle">To be updated by the Logistics Team.</p>
            <table class="tracking-table">
              <thead>
                <tr><th>Field</th><th>Value</th></tr>
              </thead>
              <tbody>
                <tr><td>Request ID</td><td><input id="trackingRequestId" name="trackingRequestId" placeholder="Auto Generated" /></td></tr>
                <tr><td>Courier Partner</td><td><input id="courierPartner" name="courierPartner" placeholder="Pending" /></td></tr>
                <tr><td>Tracking Number</td><td><input id="trackingNumber" name="trackingNumber" placeholder="Pending" /></td></tr>
                <tr><td>Pickup Date</td><td><input id="pickupDate" name="pickupDate" type="date" /></td></tr>
                <tr><td>Dispatch Date</td><td><input id="dispatchDate" name="dispatchDate" type="date" /></td></tr>
                <tr><td>Expected Delivery Date</td><td><input id="expectedDeliveryDate" name="expectedDeliveryDate" type="date" /></td></tr>
                <tr><td>Actual Delivery Date</td><td><input id="actualDeliveryDate" name="actualDeliveryDate" type="date" /></td></tr>
                <tr><td>Current Status</td><td><input id="currentStatus" name="currentStatus" placeholder="Pending Pickup" /></td></tr>
                <tr><td>Remarks</td><td><input id="remarks" name="remarks" placeholder="Pending" /></td></tr>
              </tbody>
            </table>
            <div class="grid" style="margin-top: 12px;">
              <div class="full">
                <label for="logisticsNotes">Special Instructions / Remarks</label>
                <textarea id="logisticsNotes" name="logisticsNotes"></textarea>
              </div>
            </div>
          </div>

          <button type="submit">Submit Request</button>
        </div>
      </form>

      <div id="message" class="message"></div>
      <div id="appStatus" class="status-banner"></div>
      <div id="notificationStatus" class="status-banner"></div>
      <p class="note">Step 1 collects the user information. Step 2 captures pickup and drop details.</p>
      <div class="note" id="debugLinks" style="margin-bottom: 16px;"></div>
      <div id="requestPreview" class="preview"></div>
    </div>
    <script src="/script.js"></script>
  </body>
</html>`);
});

app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/debug", (req, res) => {
  res.json({
    status: "debug",
    env: getEnvSummary(),
    now: new Date().toISOString(),
  });
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found." });
  }
  next();
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  error("Unhandled request error", { path: req.path, error: err.message, stack: err.stack });
  if (req.path.startsWith("/api")) {
    return res.status(500).json({ error: err.message || "Internal server error." });
  }
  res.status(500).send("Internal server error.");
});

process.on("unhandledRejection", (reason) => {
  error("Unhandled rejection", { reason });
});

process.on("uncaughtException", (err) => {
  error("Uncaught exception", { message: err?.message, stack: err?.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  error("Unhandled rejection", { reason });
});

const attemptPort = (port: number, maxPort: number): number => {
  if (port > maxPort) {
    throw new Error(`No available ports found between ${preferredPort} and ${maxPort}.`);
  }
  return port;
};

const startServer = (port: number, maxPort = port + 10) => {
  const server = app.listen(port, () => {
    const address = server.address();
    const actualPort = typeof address === "object" && address ? address.port : port;
    console.log(`Lappy Logistics Automation running on http://localhost:${actualPort}`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      error("Port is already in use", { port });
      const nextPort = port + 1;
      if (nextPort > maxPort) {
        console.error(`Port ${port} is already in use. Free this port or change PORT in your .env before restarting.`);
        process.exit(1);
      }
      warn(`Port ${port} busy; attempting next port ${nextPort}`);
      startServer(nextPort, maxPort);
      return;
    }

    error("Server startup failed", { message: err.message, code: err.code });
    process.exit(1);
  });
};

const bootstrap = async () => {
  try {
    await initDb();
  } catch (err) {
    warn("Database initialization failed", { error: String(err) });
  }

  startServer(preferredPort);
};

bootstrap().catch((err) => {
  error("Bootstrap failed", { error: String(err) });
  process.exit(1);
});
