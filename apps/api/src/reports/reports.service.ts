import { Injectable } from "@nestjs/common";
import { and, gte, inArray, isNotNull, lte } from "drizzle-orm";
import * as schema from "@oficina/database";
import { ServiceOrderStatus } from "@oficina/types";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class ReportsService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  /** Produtividade por mecânico (spec §12 Fase 7): tempo total trabalhado no período. */
  async productivityByMechanic(from: string, to: string) {
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59.999`);

    const sessions = await this.db.query.workSessions.findMany({
      where: and(
        gte(schema.workSessions.startAt, start),
        lte(schema.workSessions.startAt, end),
      ),
      with: { mechanic: { with: { user: true } } },
    });

    const byMechanic = new Map<string, { mechanicId: string; name: string; totalSeconds: number; sessions: number }>();
    for (const session of sessions) {
      if (session.durationSeconds == null) continue;
      const key = session.mechanicId;
      const entry = byMechanic.get(key) ?? {
        mechanicId: key,
        name: session.mechanic?.user?.name ?? "—",
        totalSeconds: 0,
        sessions: 0,
      };
      entry.totalSeconds += session.durationSeconds;
      entry.sessions += 1;
      byMechanic.set(key, entry);
    }

    return Array.from(byMechanic.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);
  }

  /** Tempo médio real por serviço vs. estimativa do catálogo. */
  async averageTimeByService() {
    const sessions = await this.db.query.workSessions.findMany({
      where: and(
        isNotNull(schema.workSessions.durationSeconds),
        isNotNull(schema.workSessions.serviceId),
      ),
      with: { service: true },
    });

    const byService = new Map<string, { serviceId: string; name: string; estimatedMinutes: number | null; totalSeconds: number; count: number }>();
    for (const session of sessions) {
      if (!session.serviceId || session.durationSeconds == null) continue;
      const entry = byService.get(session.serviceId) ?? {
        serviceId: session.serviceId,
        name: session.service?.name ?? "—",
        estimatedMinutes: session.service?.estimatedMinutes ?? null,
        totalSeconds: 0,
        count: 0,
      };
      entry.totalSeconds += session.durationSeconds;
      entry.count += 1;
      byService.set(session.serviceId, entry);
    }

    return Array.from(byService.values()).map((entry) => ({
      ...entry,
      averageMinutes: Math.round(entry.totalSeconds / entry.count / 60),
    }));
  }

  /** Previsão de entrega (heurística): minutos estimados restantes por OS ativa. */
  async deliveryForecast() {
    const activeStatuses = [
      ServiceOrderStatus.EM_EXECUCAO,
      ServiceOrderStatus.AGUARDANDO_PECA,
      ServiceOrderStatus.CONTROLE_QUALIDADE,
    ];

    const orders = await this.db.query.serviceOrders.findMany({
      where: inArray(schema.serviceOrders.status, activeStatuses),
      with: { items: true, workSessions: true, vehicle: true, customer: true },
    });

    const serviceIds = orders.flatMap((o) => o.items.filter((i) => i.type === "SERVICE").map((i) => i.referenceId));
    const services = serviceIds.length
      ? await this.db.query.services.findMany({ where: inArray(schema.services.id, serviceIds) })
      : [];
    const estimateByServiceId = new Map(services.map((s) => [s.id, s.estimatedMinutes ?? 0]));

    return orders.map((order) => {
      const estimatedMinutes = order.items
        .filter((i) => i.type === "SERVICE")
        .reduce((sum, i) => sum + (estimateByServiceId.get(i.referenceId) ?? 0), 0);
      const workedSeconds = order.workSessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
      const remainingMinutes = Math.max(estimatedMinutes - Math.round(workedSeconds / 60), 0);

      return {
        serviceOrderId: order.id,
        number: order.number,
        customer: order.customer?.name,
        vehicle: order.vehicle ? `${order.vehicle.brand} ${order.vehicle.model} (${order.vehicle.plate})` : null,
        status: order.status,
        estimatedMinutes,
        remainingMinutes,
        forecastAt: new Date(Date.now() + remainingMinutes * 60_000).toISOString(),
      };
    });
  }
}
