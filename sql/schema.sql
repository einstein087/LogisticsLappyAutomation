-- Request intake table
CREATE TABLE IF NOT EXISTS request_intake (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system TEXT NOT NULL,
  ticket_number TEXT,
  employee_id TEXT NOT NULL,
  employee_name TEXT,
  employee_email TEXT,
  manager_name TEXT,
  manager_email TEXT,
  project_name TEXT,
  allocation_type TEXT,
  priority TEXT,
  business_justification TEXT,
  pickup_location TEXT,
  pickup_name TEXT,
  pickup_phone TEXT,
  pickup_address TEXT,
  delivery_location TEXT,
  delivery_name TEXT,
  delivery_phone TEXT,
  delivery_address TEXT,
  asset_type TEXT,
  asset_tag TEXT,
  accessories TEXT,
  sender_email_encrypted TEXT,
  recipient_emails_encrypted TEXT,
  status TEXT NOT NULL,
  created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_intake_employee_id ON request_intake(employee_id);
CREATE INDEX IF NOT EXISTS idx_request_intake_status ON request_intake(status);

-- Asset tracking table
CREATE TABLE IF NOT EXISTS asset_tracking (
  asset_tag TEXT PRIMARY KEY,
  serial_number TEXT NOT NULL,
  laptop_model TEXT NOT NULL,
  courier_partner TEXT,
  tracking_number TEXT,
  dispatch_date TIMESTAMPTZ,
  delivery_date TIMESTAMPTZ,
  request_id UUID REFERENCES request_intake(request_id)
);

-- Approval table
CREATE TABLE IF NOT EXISTS approval_records (
  approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES request_intake(request_id) ON DELETE CASCADE,
  approver_name TEXT NOT NULL,
  approval_status TEXT NOT NULL,
  approval_date TIMESTAMPTZ DEFAULT now(),
  comments TEXT
);

-- Audit history table
CREATE TABLE IF NOT EXISTS audit_history (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES request_intake(request_id) ON DELETE CASCADE,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_date TIMESTAMPTZ DEFAULT now(),
  remarks TEXT
);
