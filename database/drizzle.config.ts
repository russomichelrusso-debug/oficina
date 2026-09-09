import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, "../apps/api/.env") });

export default defineConfig({
  schema: "./schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://oficina:oficina@localhost:5432/oficina",
  },
});
