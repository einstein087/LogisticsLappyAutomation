const debugEnabled = process.env.DEBUG === "1" || process.env.DEBUG?.toLowerCase() === "true";

const maskValue = (value?: string | null) => {
  if (!value) return null;
  if (value.length <= 12) return "*****";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const formatArgs = (args: unknown[]) => args.map((arg) => {
  if (typeof arg === "object" && arg !== null) {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}).join(" ");

export const debug = (...args: unknown[]) => {
  if (!debugEnabled) return;
  console.debug("[Lappy][DEBUG]", formatArgs(args));
};

export const info = (...args: unknown[]) => {
  console.info("[Lappy][INFO]", formatArgs(args));
};

export const warn = (...args: unknown[]) => {
  console.warn("[Lappy][WARN]", formatArgs(args));
};

export const error = (...args: unknown[]) => {
  console.error("[Lappy][ERROR]", formatArgs(args));
};

export const getEnvSummary = () => ({
  node_env: process.env.NODE_ENV ?? "development",
  debug: debugEnabled,
  database_url: maskValue(process.env.DATABASE_URL),
  outlook_mailbox: process.env.OUTLOOK_MAILBOX ?? null,
  oracle_hcm_api_base: process.env.ORACLE_HCM_API_BASE ?? null,
  service_now_api_base: process.env.SERVICENOW_API_BASE ?? null,
  mailer_subject_filter: process.env.OUTLOOK_SUBJECT_FILTER ?? "Laptop Allocation Request",
});
