import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import * as schema from "@oficina/database";
import { RoleName, StockMovementType } from "@oficina/types";
import { DatabaseService } from "../database/database.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { computeStockBalances } from "../parts/stock-balance";
import { CreateStockMovementDto } from "./dto/create-stock-movement.dto";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const OUTBOUND_TYPES = new Set([StockMovementType.SAIDA, StockMovementType.TRANSFERENCIA]);

@Injectable()
export class StockService {
  constructor(
    private readonly database: DatabaseService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private get db() {
    return this.database.db;
  }

  findAll(partId?: string) {
    return this.db.query.stockMovements.findMany({
      where: partId ? eq(schema.stockMovements.partId, partId) : undefined,
      with: { part: true, supplier: true, serviceOrder: true },
      orderBy: (m, { desc }) => [desc(m.createdAt)],
    });
  }

  async create(dto: CreateStockMovementDto, userId: string) {
    const part = await this.db.query.parts.findFirst({ where: eq(schema.parts.id, dto.partId) });
    if (!part) throw new NotFoundException("Peça não encontrada");

    if (OUTBOUND_TYPES.has(dto.type)) {
      const balances = await computeStockBalances(this.database, dto.partId);
      const current = balances.get(dto.partId) ?? 0;
      if (current < dto.quantity) {
        throw new BadRequestException(
          `Saldo insuficiente: disponível ${current}, solicitado ${dto.quantity}`,
        );
      }
    }

    const [movement] = await this.db
      .insert(schema.stockMovements)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        partId: dto.partId,
        type: dto.type,
        quantity: dto.quantity,
        serviceOrderId: dto.serviceOrderId,
        supplierId: dto.supplierId,
        createdBy: userId,
      })
      .returning();

    await this.notifyIfLowStock(dto.partId);

    return movement;
  }

  /** Peça abaixo de min_stock notifica o papel ESTOQUE (spec §6.3.3). */
  private async notifyIfLowStock(partId: string) {
    const part = await this.db.query.parts.findFirst({ where: eq(schema.parts.id, partId) });
    if (!part) return;
    const balances = await computeStockBalances(this.database, partId);
    const current = balances.get(partId) ?? 0;
    if (current >= part.minStock) return;

    const stockRole = await this.db.query.roles.findFirst({
      where: eq(schema.roles.name, RoleName.ESTOQUE),
    });
    if (!stockRole) return;

    const usersWithRole = await this.db
      .select({ userId: schema.userRoles.userId })
      .from(schema.userRoles)
      .where(eq(schema.userRoles.roleId, stockRole.id));

    if (usersWithRole.length === 0) return;

    await this.db.insert(schema.notifications).values(
      usersWithRole.map((u) => ({
        tenantId: DEFAULT_TENANT_ID,
        userId: u.userId,
        channel: "IN_APP",
        title: "Estoque baixo",
        body: `${part.name} (SKU ${part.sku}) está com saldo ${current}, abaixo do mínimo (${part.minStock}).`,
      })),
    );

    this.realtime.emitNotification({
      title: "Estoque baixo",
      body: `${part.name} está abaixo do estoque mínimo`,
    });
  }
}
