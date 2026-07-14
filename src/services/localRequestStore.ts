export interface LocalRequestRecord {
  requestId: string;
  employeeId: string;
  fullName?: string;
  email?: string;
  phone?: string;
  pickupLocation?: string;
  dropLocation?: string;
  managerEmail?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const store = new Map<string, LocalRequestRecord>();

export const saveLocalRequest = (record: LocalRequestRecord) => {
  store.set(record.requestId, record);
};

export const getLocalRequest = (requestId: string) => store.get(requestId);

export const updateLocalRequestStatus = (requestId: string, status: string) => {
  const existing = store.get(requestId);
  if (!existing) {
    return undefined;
  }

  const updated: LocalRequestRecord = {
    ...existing,
    status,
    updatedAt: new Date().toISOString(),
  };
  store.set(requestId, updated);
  return updated;
};