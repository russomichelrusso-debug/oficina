import * as dotenv from "dotenv";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

dotenv.config({ path: path.resolve(__dirname, "../apps/api/.env") });

async function main() {
  const connectionString =
    process.env.DATABASE_URL ?? "postgresql://oficina:oficina@localhost:5432/oficina";
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  console.log("Aplicando migrations em", connectionString.replace(/:[^:@]+@/, ":****@"));
  await migrate(db, { migrationsFolder: path.resolve(__dirname, "migrations") });
  console.log("Migrations aplicadas com sucesso.");

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
