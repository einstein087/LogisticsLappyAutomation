import axios from "axios";

const OUTLOOK_API_BASE = process.env.OUTLOOK_API_BASE ?? "https://graph.microsoft.com/v1.0";
const OUTLOOK_ACCESS_TOKEN = process.env.OUTLOOK_ACCESS_TOKEN ?? "";
const MAILBOX = process.env.OUTLOOK_MAILBOX ?? "laptopallocation@company.com";

const graphClient = axios.create({
  baseURL: OUTLOOK_API_BASE,
  headers: {
    Authorization: `Bearer ${OUTLOOK_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
});

const normalizeKey = (key: string) => key.toLowerCase().replace(/[\s\t]+/g, " ").replace(/\s*\/+\s*/g, " / ").trim();

const stripHtml = (body: string) =>
  body
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"');

export const getOutlookMessageText = (body: { contentType: string; content: string }) => {
  if (!body?.content) return "";
  if (body.contentType?.toLowerCase() === "html") {
    return stripHtml(body.content);
  }
  return body.content;
};

export const fetchRecentLaptopEmails = async () => {
  const response = await graphClient.get(`/users/${MAILBOX}/mailFolders/inbox/messages`, {
    params: {
      $select: "subject,body,from,toRecipients",
      $filter: "contains(subject,'Laptop Allocation Request') or contains(subject,'Pickup & Delivery Request')",
      $top: 25,
    },
  });
  return response.data.value ?? [];
};

export const parseOutlookEmail = (body: string) => {
  const global: Record<string, string> = {};
  const pickup: Record<string, string> = {};
  const delivery: Record<string, string> = {};
  const asset: Record<string, string> = {};

  let section: "global" | "pickup" | "delivery" | "asset" = "global";

  body
    .replace(/<[^>]+>/g, "\n")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const normalized = line.toLowerCase();
      if (/^pickup details/i.test(line)) {
        section = "pickup";
        return;
      }
      if (/^delivery details/i.test(line)) {
        section = "delivery";
        return;
      }
      if (/^asset details/i.test(line)) {
        section = "asset";
        return;
      }

      const match = line.match(/^([^:\-]+)[:\-]\s*(.+)$/);
      if (!match) {
        return;
      }

      const key = normalizeKey(match[1]);
      const value = match[2].trim();
      const target = section === "pickup" ? pickup : section === "delivery" ? delivery : section === "asset" ? asset : global;
      target[key] = value;
    });

  const buildLocation = (source: Record<string, string>) => ({
    location: source["location"],
    name: source["name"],
    phone: source["phone"],
    address: source["address"],
  });

  const assetTagKey = asset["asset tag / serial number"] ?? asset["asset tag"] ?? asset["serial number"];

  return {
    employee_id: global["employee id"] ?? "",
    project: global["project"] ?? global["project name"] ?? "",
    business_justification: global["business justification"] ?? "",
    priority: global["priority"] ?? "Normal",
    pickup_details: buildLocation(pickup),
    delivery_details: buildLocation(delivery),
    asset_details: {
      asset_type: asset["asset type"],
      asset_tag: assetTagKey,
      accessories: asset["accessories"],
    },
  };
};
