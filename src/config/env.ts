import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const rootDirectory = path.resolve(__dirname, "../../");
const envExamplePath = path.join(rootDirectory, ".env.example");
const envPath = path.join(rootDirectory, ".env");

if (fs.existsSync(envExamplePath)) {
  dotenv.config({ path: envExamplePath });
}

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
} else {
  console.warn("[Lappy] .env file not found at", envPath);
}
