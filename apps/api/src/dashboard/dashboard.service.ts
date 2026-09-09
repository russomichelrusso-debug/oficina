import { Injectable } from "@nestjs/common";
import { count, eq } from "drizzle-orm";
import * as schema from "@oficina/database";
import { DatabaseService } from "../database/database.service";
import type { DashboardSummaryDTO } from "@oficina/types";

@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService) {}

  async getSummary(): Promise<DashboardSummaryDTO> {
    const db = this.database.db;

    const [[{ totalCustomers }], [{ totalVehicles }], [{ activeUsers }]] = await Promise.all([
      db.select({ totalCustomers: count() }).from(schema.customers),
      db.select({ totalVehicles: count() }).from(schema.vehicles),
      db.select({ activeUsers: count() }).from(schema.users).where(eq(schema.users.active, true)),
    ]);

    // Métricas de OS em andamento e faturamento do dia (ver spec §13) entram
    // quando os módulos de Ordem de Serviço e Financeiro forem implementados
    // (Fases 2/3 e 5). Por ora o dashboard reflete os dados da Fase 1.
    return { totalCustomers, totalVehicles, activeUsers };
  }
}
