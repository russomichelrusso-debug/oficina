import { Injectable } from "@nestjs/common";
import { and, count, eq, gte, lte, notInArray, sql } from "drizzle-orm";
import * as schema from "@oficina/database";
import { ServiceOrderStatus } from "@oficina/types";
import { DatabaseService } from "../database/database.service";
import type { DashboardSummaryDTO } from "@oficina/types";

@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService) {}

  async getSummary(): Promise<DashboardSummaryDTO> {
    const db = this.database.db;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [
      [{ totalCustomers }],
      [{ totalVehicles }],
      [{ activeUsers }],
      [{ openServiceOrders }],
      [{ revenueToday }],
    ] = await Promise.all([
      db.select({ totalCustomers: count() }).from(schema.customers),
      db.select({ totalVehicles: count() }).from(schema.vehicles),
      db.select({ activeUsers: count() }).from(schema.users).where(eq(schema.users.active, true)),
      db
        .select({ openServiceOrders: count() })
        .from(schema.serviceOrders)
        .where(
          notInArray(schema.serviceOrders.status, [
            ServiceOrderStatus.ENCERRADO,
            ServiceOrderStatus.ENTREGUE,
          ]),
        ),
      db
        .select({ revenueToday: sql<string>`COALESCE(SUM(${schema.payments.amount}), 0)` })
        .from(schema.payments)
        .where(and(gte(schema.payments.paidAt, startOfDay), lte(schema.payments.paidAt, endOfDay))),
    ]);

    return {
      totalCustomers,
      totalVehicles,
      activeUsers,
      openServiceOrders,
      revenueToday: Number(revenueToday ?? 0),
    };
  }
}
