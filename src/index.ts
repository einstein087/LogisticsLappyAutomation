import express from "express";
import "./config/env";
import { initDb } from "./db";
import approvalRoutes from "./routes/approvalRoutes";
import requestRoutes from "./routes/requestRoutes";
import { debug, error, getEnvSummary, warn } from "./utils/logger";

const app = express();
const preferredPort = Number(process.env.PORT ?? 4000);

app.use(express.json());
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
      .preview { margin-top: 20px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #fcfdff; }
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
      <div id="notificationStatus" class="status-banner"></div>
      <p class="note">Step 1 collects the user information. Step 2 captures pickup and drop details.</p>
      <div id="requestPreview" class="preview" style="display: none;"></div>
    </div>

    <script>
      const form = document.getElementById('intakeForm');
      const message = document.getElementById('message');
      const stepUser = document.getElementById('stepUser');
      const stepLogistics = document.getElementById('stepLogistics');
      const nextStepBtn = document.getElementById('nextStepBtn');
      const requestPreview = document.getElementById('requestPreview');
      const notificationStatus = document.getElementById('notificationStatus');

      const displayOrPending = (value, fallback = 'Pending') => value && value.trim() ? value.trim() : fallback;

      const escapeHtml = (value = '') => value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

      const renderRequestPreview = (payload, data) => {
        const subject = \`Laptop Pickup & Delivery Request - \${displayOrPending(payload.pickupLocation, 'Source')}\`
          + \` to \${displayOrPending(payload.dropLocation, 'Destination')}\`;
        const accessories = payload.accessories
          ? payload.accessories
            .split('\\n')
            .map((item) => item.replace('\\r', '').trim())
            .filter(Boolean)
          : [];
        const requestId = data.request_id || data.requestId || 'Auto Generated';

        requestPreview.innerHTML = \`
          <h2>Laptop Pickup & Delivery Request</h2>

          <h3>User Details</h3>
          <p><strong>Employee ID:</strong> \${escapeHtml(displayOrPending(payload.employeeId, 'Not provided'))}</p>
          <p><strong>Full Name:</strong> \${escapeHtml(displayOrPending(payload.fullName, 'Not provided'))}</p>
          <p><strong>Email:</strong> \${escapeHtml(displayOrPending(payload.email, 'Not provided'))}</p>
          <p><strong>Phone:</strong> \${escapeHtml(displayOrPending(payload.phone, 'Not provided'))}</p>
          <p><strong>Department:</strong> \${escapeHtml(displayOrPending(payload.department, 'Not provided'))}</p>

          <h3>Request Information</h3>
          <p><strong>Subject:</strong> \${escapeHtml(subject)}</p>
          <p><strong>Request Type:</strong> \${escapeHtml(displayOrPending(payload.requestTypeLogistics || payload.requestType, 'Asset Transfer / Laptop Relocation'))}</p>
          <p><strong>Asset Type:</strong> \${escapeHtml(displayOrPending(payload.assetType, 'Not provided'))}</p>
          <p><strong>Accessories Included:</strong> \${accessories.length ? '' : 'Pending'}</p>
          \${accessories.length ? \`<ul>\${accessories.map((item) => \`<li>\${escapeHtml(item)}</li>\`).join('')}</ul>\` : ''}
          <p><strong>Asset Tag / Serial Number:</strong> \${escapeHtml(displayOrPending(payload.assetTag, 'To be updated by Logistics Team'))}</p>

          <h3>Pickup Details</h3>
          <p><strong>Office Location:</strong> \${escapeHtml(displayOrPending(payload.pickupLocation))}</p>
          <p><strong>Contact Person(s):</strong> \${escapeHtml(displayOrPending(payload.pickupContacts))}</p>
          <p><strong>Phone Number:</strong> \${escapeHtml(displayOrPending(payload.pickupPhone))}</p>
          <p><strong>Address:</strong></p>
          <pre>\${escapeHtml(displayOrPending(payload.pickupAddress))}</pre>

          <h3>Delivery Details</h3>
          <p><strong>Location:</strong> \${escapeHtml(displayOrPending(payload.dropLocation))}</p>
          <p><strong>Recipient:</strong> \${escapeHtml(displayOrPending(payload.dropRecipient))}</p>
          <p><strong>Phone Number:</strong> \${escapeHtml(displayOrPending(payload.dropPhone))}</p>
          <p><strong>Address:</strong></p>
          <pre>\${escapeHtml(displayOrPending(payload.dropAddress))}</pre>

          <h3>Logistics Tracking Information</h3>
          <table>
            <thead>
              <tr><th>Field</th><th>Value</th></tr>
            </thead>
            <tbody>
              <tr><td>Request ID</td><td>\${escapeHtml(String(requestId))}</td></tr>
              <tr><td>Courier Partner</td><td>\${escapeHtml(displayOrPending(payload.courierPartner))}</td></tr>
              <tr><td>Tracking Number</td><td>\${escapeHtml(displayOrPending(payload.trackingNumber))}</td></tr>
              <tr><td>Pickup Date</td><td>\${escapeHtml(displayOrPending(payload.pickupDate))}</td></tr>
              <tr><td>Dispatch Date</td><td>\${escapeHtml(displayOrPending(payload.dispatchDate))}</td></tr>
              <tr><td>Expected Delivery Date</td><td>\${escapeHtml(displayOrPending(payload.expectedDeliveryDate))}</td></tr>
              <tr><td>Actual Delivery Date</td><td>\${escapeHtml(displayOrPending(payload.actualDeliveryDate))}</td></tr>
              <tr><td>Current Status</td><td>\${escapeHtml(displayOrPending(payload.currentStatus, 'Pending Pickup'))}</td></tr>
              <tr><td>Remarks</td><td>\${escapeHtml(displayOrPending(payload.remarks))}</td></tr>
            </tbody>
          </table>
          <p><strong>Special Instructions / Remarks:</strong> \${escapeHtml(displayOrPending(payload.logisticsNotes))}</p>
        \`;

        requestPreview.style.display = 'block';
      };

      const buildNotificationSummary = (notifications) => {
        if (!notifications) {
          return '';
        }

        const emailText = notifications.email
          ? 'Email: ' + notifications.email.status + ' (' + notifications.email.detail + ')'
          : 'Email: unavailable';
        const smsText = notifications.sms
          ? 'SMS: ' + notifications.sms.status + ' (' + notifications.sms.detail + ')'
          : 'SMS: unavailable';

        return ' ' + emailText + ' ' + smsText;
      };

      const getNotificationSeverity = (notifications) => {
        if (!notifications || !notifications.email) {
          return 'success';
        }

        return notifications.email.status === 'sent' ? 'success' : 'error';
      };

      const renderNotificationStatus = (notificationHealth) => {
        if (!notificationHealth || !notificationHealth.notifications) {
          notificationStatus.className = 'status-banner warning';
          notificationStatus.textContent = 'Unable to verify notification configuration right now.';
          return;
        }

        const { email, sms } = notificationHealth.notifications;
        const emailText = email.configured
          ? 'Email ready via ' + email.mode + '.'
          : 'Email not configured. ' + email.detail;
        const smsText = sms.configured
          ? ' SMS ready via ' + sms.mode + '.'
          : ' SMS is optional and currently not configured. ' + sms.detail;

        notificationStatus.className = 'status-banner ' + (email.configured ? 'ready' : 'warning');
        notificationStatus.textContent = emailText + smsText;
      };

      const loadNotificationHealth = async () => {
        try {
          const response = await fetch('/api/notifications/health');
          const data = await response.json();
          renderNotificationStatus(data);
        } catch (healthError) {
          notificationStatus.className = 'status-banner warning';
          notificationStatus.textContent = 'Unable to verify notification configuration right now.';
        }
      };


      nextStepBtn.addEventListener('click', () => {
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        if (!fullName || !email) {
          message.className = 'message error';
          message.textContent = 'Please enter full name and email before continuing.';
          return;
        }

        message.className = 'message';
        message.textContent = '';
        stepUser.classList.remove('active');
        stepLogistics.classList.add('active');
        document.querySelector('.stepper span:nth-child(1)').classList.remove('active');
        document.querySelector('.stepper span:nth-child(2)').classList.add('active');
      });

      form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const payload = {
          employeeId: document.getElementById('employeeId').value.trim(),
          fullName: document.getElementById('fullName').value.trim(),
          email: document.getElementById('email').value.trim(),
          phone: document.getElementById('phone').value.trim(),
          department: document.getElementById('department').value.trim(),
          requestType: document.getElementById('requestType').value,
          notes: document.getElementById('notes').value.trim(),
          requestTypeLogistics: document.getElementById('requestTypeLogistics').value.trim(),
          assetType: document.getElementById('assetType').value.trim(),
          accessories: document.getElementById('accessories').value.trim(),
          assetTag: document.getElementById('assetTag').value.trim(),
          pickupLocation: document.getElementById('pickupLocation').value.trim(),
          pickupContacts: document.getElementById('pickupContacts').value.trim(),
          pickupPhone: document.getElementById('pickupPhone').value.trim(),
          pickupAddress: document.getElementById('pickupAddress').value.trim(),
          dropLocation: document.getElementById('dropLocation').value.trim(),
          dropRecipient: document.getElementById('dropRecipient').value.trim(),
          dropPhone: document.getElementById('dropPhone').value.trim(),
          dropAddress: document.getElementById('dropAddress').value.trim(),
          trackingRequestId: document.getElementById('trackingRequestId').value.trim(),
          courierPartner: document.getElementById('courierPartner').value.trim(),
          trackingNumber: document.getElementById('trackingNumber').value.trim(),
          pickupDate: document.getElementById('pickupDate').value.trim(),
          dispatchDate: document.getElementById('dispatchDate').value.trim(),
          expectedDeliveryDate: document.getElementById('expectedDeliveryDate').value.trim(),
          actualDeliveryDate: document.getElementById('actualDeliveryDate').value.trim(),
          currentStatus: document.getElementById('currentStatus').value.trim(),
          remarks: document.getElementById('remarks').value.trim(),
          logisticsNotes: document.getElementById('logisticsNotes').value.trim(),
        };

        message.className = 'message';
        message.textContent = 'Submitting...';

        try {
          const response = await fetch('/api/intake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Unable to submit request.');
          }

          const severity = getNotificationSeverity(data.notifications);
          message.className = 'message ' + severity;
          if (severity === 'error') {
            message.textContent = 'Request captured, but user email was not sent.' + buildNotificationSummary(data.notifications);
          } else {
            message.textContent = (data.message || 'Request completed successfully. Segregated summary is shown below.')
              + buildNotificationSummary(data.notifications);
          }
          renderRequestPreview(payload, data);
          form.reset();
          stepLogistics.classList.remove('active');
          stepUser.classList.add('active');
          document.querySelector('.stepper span:nth-child(1)').classList.add('active');
          document.querySelector('.stepper span:nth-child(2)').classList.remove('active');
        } catch (error) {
          message.className = 'message error';
          message.textContent = error.message || 'Submission failed.';
        }
      });

      loadNotificationHealth();
    </script>
  </body>
</html>`);
});

app.post("/api/intake", (req, res) => {
  const payload = req.body ?? {};
  const user = {
    employeeId: String(payload.employeeId ?? "").trim() || "Not provided",
    fullName: String(payload.fullName ?? "").trim() || "Not provided",
    email: String(payload.email ?? "").trim() || "Not provided",
    phone: String(payload.phone ?? "").trim() || "Not provided",
    department: String(payload.department ?? "").trim() || "Not provided",
    requestType: String(payload.requestType ?? "General request").trim() || "General request",
    notes: String(payload.notes ?? "").trim(),
    requestTypeLogistics: String(payload.requestTypeLogistics ?? "").trim() || "Not provided",
    assetType: String(payload.assetType ?? "").trim() || "Not provided",
    accessories: String(payload.accessories ?? "").trim() || "Not provided",
    assetTag: String(payload.assetTag ?? "").trim() || "Not provided",
    pickupLocation: String(payload.pickupLocation ?? "").trim() || "Not provided",
    pickupContacts: String(payload.pickupContacts ?? "").trim() || "Not provided",
    pickupPhone: String(payload.pickupPhone ?? "").trim() || "Not provided",
    pickupAddress: String(payload.pickupAddress ?? "").trim() || "Not provided",
    dropLocation: String(payload.dropLocation ?? "").trim() || "Not provided",
    dropRecipient: String(payload.dropRecipient ?? "").trim() || "Not provided",
    dropPhone: String(payload.dropPhone ?? "").trim() || "Not provided",
    dropAddress: String(payload.dropAddress ?? "").trim() || "Not provided",
    logisticsNotes: String(payload.logisticsNotes ?? "").trim(),
  };

  res.status(201).json({
    status: "received",
    message: "User information and logistics details captured successfully.",
    receivedAt: new Date().toISOString(),
    user,
  });
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

process.on("uncaughtException", (err) => {
  error("Uncaught exception", { message: err?.message, stack: err?.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  error("Unhandled rejection", { reason });
});

const startServer = (port: number) => {
  const server = app.listen(port, () => {
    const address = server.address();
    const actualPort = typeof address === "object" && address ? address.port : port;
    console.log(`Lappy Logistics Automation running on http://localhost:${actualPort}`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      error("Port is already in use", { port });
      console.error(`Port ${port} is already in use. Free this port or change PORT in your .env before restarting.`);
      process.exit(1);
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
