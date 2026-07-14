export type IntakeSource = "ORACLE" | "SERVICENOW" | "OUTLOOK" | "WEB";

export interface LogisticsLocation {
  location?: string;
  name?: string;
  phone?: string;
  address?: string;
}

export interface AssetDetails {
  asset_type?: string;
  asset_tag?: string;
  accessories?: string;
}

export interface UnifiedRequest {
  request_id?: string;
  source_system: IntakeSource;
  ticket_number?: string;
  employee_id: string;
  employee_name?: string;
  employee_email?: string;
  manager_name?: string;
  manager_email?: string;
  project_name?: string;
  allocation_type?: string;
  priority?: string;
  business_justification: string;
  pickup_details?: LogisticsLocation;
  delivery_details?: LogisticsLocation;
  asset_details?: AssetDetails;
  status?: string;
  created_date?: string;
  updated_date?: string;
}

export interface AssetTracking {
  asset_tag: string;
  serial_number: string;
  laptop_model: string;
  courier_partner?: string;
  tracking_number?: string;
  dispatch_date?: string;
  delivery_date?: string;
  request_id: string;
}

export interface ApprovalRecord {
  request_id: string;
  approver_name: string;
  approval_status: string;
  approval_date?: string;
  comments?: string;
}

export type ApprovalStatus = "Pending Approval" | "Approved" | "Rejected";

export type ApprovalAction = "approve" | "reject";

export interface AuditHistory {
  request_id: string;
  old_status: string;
  new_status: string;
  changed_by: string;
  changed_date?: string;
  remarks?: string;
}
