import axios from "axios";

const SERVICENOW_API_BASE = process.env.SERVICENOW_API_BASE ?? "https://example.service-now.com/api";
const SERVICENOW_USER = process.env.SERVICENOW_USER ?? "";
const SERVICENOW_PASSWORD = process.env.SERVICENOW_PASSWORD ?? "";

const serviceNowClient = axios.create({
  baseURL: SERVICENOW_API_BASE,
  auth: {
    username: SERVICENOW_USER,
    password: SERVICENOW_PASSWORD,
  },
  headers: {
    "Content-Type": "application/json",
  },
});

export const fetchServiceNowTicket = async (ticketNumber: string) => {
  const response = await serviceNowClient.get(`/now/table/sc_request?sysparm_query=number=${ticketNumber}`);
  return response.data;
};

export const createServiceNowTicket = async (payload: Record<string, unknown>) => {
  const response = await serviceNowClient.post(`/now/table/sc_request`, payload);
  return response.data;
};
