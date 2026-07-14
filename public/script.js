      const form = document.getElementById('intakeForm');
      const message = document.getElementById('message');
      const stepUser = document.getElementById('stepUser');
      const stepLogistics = document.getElementById('stepLogistics');
      const nextStepBtn = document.getElementById('nextStepBtn');
      const requestPreview = document.getElementById('requestPreview');
      const notificationStatus = document.getElementById('notificationStatus');
      const appStatus = document.getElementById('appStatus');
      const debugLinks = document.getElementById('debugLinks');

      const displayOrPending = (value, fallback = 'Pending') => value && value.trim() ? value.trim() : fallback;

      const escapeHtml = (value = '') => value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

      const renderRequestPreview = (payload, data) => {
        const subject = `Laptop Pickup & Delivery Request - ${displayOrPending(payload.pickupLocation, 'Source')}`
          + ` to ${displayOrPending(payload.dropLocation, 'Destination')}`;
        const accessories = payload.accessories
          ? payload.accessories
            .split('\\n')
            .map((item) => item.replace('\\r', '').trim())
            .filter(Boolean)
          : [];
        const requestId = data.request_id || data.requestId || 'Auto Generated';

        requestPreview.innerHTML = `
          <h2>Laptop Pickup & Delivery Request</h2>

          <h3>User Details</h3>
          <p><strong>Employee ID:</strong> ${escapeHtml(displayOrPending(payload.employeeId, 'Not provided'))}</p>
          <p><strong>Full Name:</strong> ${escapeHtml(displayOrPending(payload.fullName, 'Not provided'))}</p>
          <p><strong>Email:</strong> ${escapeHtml(displayOrPending(payload.email, 'Not provided'))}</p>
          <p><strong>Phone:</strong> ${escapeHtml(displayOrPending(payload.phone, 'Not provided'))}</p>
          <p><strong>Department:</strong> ${escapeHtml(displayOrPending(payload.department, 'Not provided'))}</p>

          <h3>Request Information</h3>
          <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <p><strong>Request Type:</strong> ${escapeHtml(displayOrPending(payload.requestTypeLogistics || payload.requestType, 'Asset Transfer / Laptop Relocation'))}</p>
          <p><strong>Asset Type:</strong> ${escapeHtml(displayOrPending(payload.assetType, 'Not provided'))}</p>
          <p><strong>Accessories Included:</strong> ${accessories.length ? '' : 'Pending'}</p>
          ${accessories.length ? '<ul>' + accessories.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>' : ''}
          <p><strong>Asset Tag / Serial Number:</strong> ${escapeHtml(displayOrPending(payload.assetTag, 'To be updated by Logistics Team'))}</p>

          <h3>Pickup Details</h3>
          <p><strong>Office Location:</strong> ${escapeHtml(displayOrPending(payload.pickupLocation))}</p>
          <p><strong>Contact Person(s):</strong> ${escapeHtml(displayOrPending(payload.pickupContacts))}</p>
          <p><strong>Phone Number:</strong> ${escapeHtml(displayOrPending(payload.pickupPhone))}</p>
          <p><strong>Address:</strong></p>
          <pre>${escapeHtml(displayOrPending(payload.pickupAddress))}</pre>

          <h3>Delivery Details</h3>
          <p><strong>Location:</strong> ${escapeHtml(displayOrPending(payload.dropLocation))}</p>
          <p><strong>Recipient:</strong> ${escapeHtml(displayOrPending(payload.dropRecipient))}</p>
          <p><strong>Phone Number:</strong> ${escapeHtml(displayOrPending(payload.dropPhone))}</p>
          <p><strong>Address:</strong></p>
          <pre>${escapeHtml(displayOrPending(payload.dropAddress))}</pre>

          <h3>Logistics Tracking Information</h3>
          <table>
            <thead>
              <tr><th>Field</th><th>Value</th></tr>
            </thead>
            <tbody>
              <tr><td>Request ID</td><td>${escapeHtml(String(requestId))}</td></tr>
              <tr><td>Courier Partner</td><td>${escapeHtml(displayOrPending(payload.courierPartner))}</td></tr>
              <tr><td>Tracking Number</td><td>${escapeHtml(displayOrPending(payload.trackingNumber))}</td></tr>
              <tr><td>Pickup Date</td><td>${escapeHtml(displayOrPending(payload.pickupDate))}</td></tr>
              <tr><td>Dispatch Date</td><td>${escapeHtml(displayOrPending(payload.dispatchDate))}</td></tr>
              <tr><td>Expected Delivery Date</td><td>${escapeHtml(displayOrPending(payload.expectedDeliveryDate))}</td></tr>
              <tr><td>Actual Delivery Date</td><td>${escapeHtml(displayOrPending(payload.actualDeliveryDate))}</td></tr>
              <tr><td>Current Status</td><td>${escapeHtml(displayOrPending(payload.currentStatus, 'Pending Pickup'))}</td></tr>
              <tr><td>Remarks</td><td>${escapeHtml(displayOrPending(payload.remarks))}</td></tr>
            </tbody>
          </table>
          <p><strong>Special Instructions / Remarks:</strong> ${escapeHtml(displayOrPending(payload.logisticsNotes))}</p>
        `;

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

      const renderAppStatus = (notificationHealth) => {
        appStatus.className = 'status-banner ready';
        appStatus.textContent = 'App is running. Use the form below to submit requests.';
        const links = [
          { label: 'Health', path: '/health' },
          { label: 'Request list', path: '/api/requests' },
          { label: 'Debug', path: '/api/debug' },
        ];
        debugLinks.innerHTML = links.map(link => '<a href="' + link.path + '" target="_blank">' + link.label + '</a>').join(' | ');
      };

      const loadNotificationHealth = async () => {
        try {
          const response = await fetch('/api/notifications/health');
          const data = await response.json();
          renderNotificationStatus(data);
          renderAppStatus(data);
        } catch (healthError) {
          notificationStatus.className = 'status-banner warning';
          notificationStatus.textContent = 'Unable to verify notification configuration right now.';
          appStatus.className = 'status-banner warning';
          appStatus.textContent = 'App is running, but notification health could not be checked.';
          debugLinks.textContent = 'Check /health or /api/requests manually.';
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

          let data;
          const contentType = response.headers.get('content-type') || '';

          if (contentType.includes('application/json')) {
            data = await response.json();
          } else {
            const text = await response.text();
            data = { error: text.trim() ? text : 'Unable to submit request.' };
          }

          if (!response.ok) {
            const errorMessage = data?.error || data?.message || (response.status + ' ' + response.statusText);
            throw new Error(errorMessage);
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
          message.textContent = error?.message || 'Submission failed.';
        }
      });

      loadNotificationHealth();