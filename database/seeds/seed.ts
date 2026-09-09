import * as dotenv from "dotenv";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import * as argon2 from "argon2";
import * as schema from "../schema";

dotenv.config({ path: path.resolve(__dirname, "../../apps/api/.env") });

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

const ROLE_NAMES = [
  "ADMIN",
  "GERENTE",
  "RECEPCAO",
  "MECANICO",
  "ESTOQUE",
  "FINANCEIRO",
  "CLIENTE",
] as const;

const PERMISSIONS: Record<(typeof ROLE_NAMES)[number], string[]> = {
  ADMIN: ["*"],
  GERENTE: [
    "customers.manage",
    "vehicles.manage",
    "quotes.manage",
    "service_orders.manage",
    "stock.manage",
    "financial.manage",
    "reports.view",
  ],
  RECEPCAO: [
    "customers.manage",
    "vehicles.manage",
    "quotes.manage",
    "service_orders.manage",
    "service_orders.approve",
    "service_orders.deliver",
  ],
  MECANICO: [
    "service_orders.view_own",
    "checklists.manage_own",
    "diagnostics.manage_own",
    "media.upload_own",
    "work_sessions.manage_own",
  ],
  ESTOQUE: ["stock.manage", "suppliers.manage", "purchases.manage"],
  FINANCEIRO: ["payments.manage", "accounts_receivable.manage", "reports.view"],
  CLIENTE: ["own_vehicle.view", "own_service_order.view"],
};

async function main() {
  const connectionString =
    process.env.DATABASE_URL ?? "postgresql://oficina:oficina@localhost:5432/oficina";
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  console.log("Seeding banco de dados da oficina...");

  await db
    .insert(schema.tenants)
    .values({ id: DEFAULT_TENANT_ID, name: "Oficina Padrão" })
    .onConflictDoNothing({ target: schema.tenants.id });

  for (const roleName of ROLE_NAMES) {
    await db.insert(schema.roles).values({ name: roleName }).onConflictDoNothing({ target: schema.roles.name });
    const [role] = await db.select().from(schema.roles).where(eq(schema.roles.name, roleName));

    for (const code of PERMISSIONS[roleName]) {
      await db
        .insert(schema.permissions)
        .values({ code, description: `Permissão: ${code}` })
        .onConflictDoNothing({ target: schema.permissions.code });
      const [permission] = await db
        .select()
        .from(schema.permissions)
        .where(eq(schema.permissions.code, code));

      await db
        .insert(schema.rolePermissions)
        .values({ roleId: role.id, permissionId: permission.id })
        .onConflictDoNothing();
    }
  }

  const adminPasswordHash = await argon2.hash("Admin@123");
  await db
    .insert(schema.users)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      name: "Administrador",
      email: "admin@oficina.com",
      passwordHash: adminPasswordHash,
      active: true,
    })
    .onConflictDoNothing({ target: schema.users.email });

  const [adminUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, "admin@oficina.com"));
  const [adminRole] = await db.select().from(schema.roles).where(eq(schema.roles.name, "ADMIN"));

  await db
    .insert(schema.userRoles)
    .values({ userId: adminUser.id, roleId: adminRole.id })
    .onConflictDoNothing();

  const customerId = "00000000-0000-0000-0000-000000000010";
  await db
    .insert(schema.customers)
    .values({
      id: customerId,
      tenantId: DEFAULT_TENANT_ID,
      name: "João da Silva",
      document: "12345678900",
      phone: "11999990000",
      email: "joao.silva@example.com",
    })
    .onConflictDoNothing({ target: schema.customers.id });

  await db
    .insert(schema.vehicles)
    .values({
      id: "00000000-0000-0000-0000-000000000020",
      tenantId: DEFAULT_TENANT_ID,
      customerId,
      plate: "ABC1D23",
      brand: "Toyota",
      model: "Corolla",
      year: 2019,
      color: "Prata",
      mileageKm: 124520,
    })
    .onConflictDoNothing({ target: schema.vehicles.id });

  console.log("Seed concluído.");
  console.log("Login de teste: admin@oficina.com / Admin@123");

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
