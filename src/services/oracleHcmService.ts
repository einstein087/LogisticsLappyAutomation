import axios from "axios";

const ORACLE_API_BASE = process.env.ORACLE_HCM_API_BASE ?? "https://example.com/oracle-hcm";
const ORACLE_API_KEY = process.env.ORACLE_HCM_API_KEY ?? "";

const defaultHeaders = {
  Authorization: `Bearer ${ORACLE_API_KEY}`,
  "Content-Type": "application/json",
};

export const fetchEmployeeDetails = async (employeeId: string) => {
  const response = await axios.get(`${ORACLE_API_BASE}/employees/${employeeId}`, {
    headers: defaultHeaders,
  });
  return response.data;
};

export const fetchAssignmentDetails = async (employeeId: string) => {
  const response = await axios.get(`${ORACLE_API_BASE}/assignments/${employeeId}`, {
    headers: defaultHeaders,
  });
  return response.data;
};

export const fetchManagerDetails = async (managerId: string) => {
  const response = await axios.get(`${ORACLE_API_BASE}/managers/${managerId}`, {
    headers: defaultHeaders,
  });
  return response.data;
};

export const fetchContactDetails = async (employeeId: string) => {
  const response = await axios.get(`${ORACLE_API_BASE}/contacts/${employeeId}`, {
    headers: defaultHeaders,
  });
  return response.data;
};
