import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import * as schema from "@oficina/database";
import { RoleName, ServiceOrderStatus } from "@oficina/types";
import { DatabaseService } from "../database/database.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { CreateServiceOrderDto } from "./dto/create-service-order.dto";
import { isTransitionAllowed } from "./status-machine";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

@Injectable()
export class ServiceOrdersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private get db() {
    return this.database.db;
  }

  async findAll(
    filters: { status?: ServiceOrderStatus; mechanicId?: string; customerId?: string },
    user?: AuthenticatedUser,
  ) {
    const conditions = [] as any[];
    if (filters.status) conditions.push(eq(schema.serviceOrders.status, filters.status));
    if (filters.customerId) conditions.push(eq(schema.serviceOrders.customerId, filters.customerId));

    // Mecânico só lista as próprias OS (spec §3) — ignora qualquer
    // mechanicId vindo da query e força o filtro pelo seu próprio registro.
    const privileged = [RoleName.ADMIN, RoleName.GERENTE, RoleName.RECEPCAO, RoleName.FINANCEIRO, RoleName.ESTOQUE];
    if (user && !user.roles.some((r) => privileged.includes(r)) && user.roles.includes(RoleName.MECANICO)) {
      const mechanic = await this.db.query.mechanics.findFirst({
        where: eq(schema.mechanics.userId, user.id),
      });
      conditions.push(eq(schema.serviceOrders.mechanicId, mechanic?.id ?? "00000000-0000-0000-0000-000000000000"));
    } else if (filters.mechanicId) {
      conditions.push(eq(schema.serviceOrders.mechanicId, filters.mechanicId));
    }

    return this.db.query.serviceOrders.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: {
        customer: true,
        vehicle: true,
        mechanic: { with: { user: true } },
        items: true,
      },
      orderBy: (o, { desc }) => [desc(o.createdAt)],
    });
  }

  async findOne(id: string, user?: AuthenticatedUser) {
    const order = await this.db.query.serviceOrders.findFirst({
      where: eq(schema.serviceOrders.id, id),
      with: {
        customer: true,
        vehicle: true,
        mechanic: { with: { user: true } },
        items: true,
        statusHistory: { orderBy: (h, { desc }) => [desc(h.changedAt)] },
        quotes: { with: { items: true, approvals: true } },
        diagnostics: { with: { items: true } },
        checklists: true,
        media: true,
        workSessions: { with: { mechanic: { with: { user: true } }, service: true } },
        accountsReceivable: true,
        payments: true,
      },
    });
    if (!order) throw new NotFoundException("Ordem de serviço não encontrada");
    if (user) await this.assertCanAccess(order, user);
    return order;
  }

  /** Regra de negócio §3: mecânico só acessa OS onde mechanic_id = user.id (via mechanics.userId). */
  private async assertCanAccess(
    order: { mechanicId: string | null },
    user: AuthenticatedUser,
  ) {
    const privileged = [RoleName.ADMIN, RoleName.GERENTE, RoleName.RECEPCAO, RoleName.FINANCEIRO];
    if (user.roles.some((r) => privileged.includes(r))) return;
    if (user.roles.includes(RoleName.MECANICO)) {
      const mechanic = await this.db.query.mechanics.findFirst({
        where: eq(schema.mechanics.userId, user.id),
      });
      if (mechanic && order.mechanicId === mechanic.id) return;
    }
    throw new ForbiddenException("Você não tem acesso a esta ordem de serviço");
  }

  async create(dto: CreateServiceOrderDto, userId: string) {
    const [order] = await this.db
      .insert(schema.serviceOrders)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        customerId: dto.customerId,
        vehicleId: dto.vehicleId,
        mechanicId: dto.mechanicId,
        complaint: dto.complaint,
        status: ServiceOrderStatus.AGENDADO,
        createdBy: userId,
      })
      .returning();

    await this.db.insert(schema.serviceOrderStatusHistory).values({
      serviceOrderId: order.id,
      fromStatus: null,
      toStatus: ServiceOrderStatus.AGENDADO,
      changedBy: userId,
      note: "OS criada",
    });

    return this.findOne(order.id);
  }

  async assignMechanic(id: string, mechanicId: string) {
    await this.findOne(id);
    await this.db
      .update(schema.serviceOrders)
      .set({ mechanicId, updatedAt: new Date() })
      .where(eq(schema.serviceOrders.id, id));
    return this.findOne(id);
  }

  async changeStatus(
    id: string,
    status: ServiceOrderStatus,
    note: string | undefined,
    user: AuthenticatedUser,
    overrideFinancialHold = false,
  ) {
    const order = await this.findOne(id, user);
    const from = order.status as ServiceOrderStatus;

    if (from === status) throw new ConflictException("A OS já está neste status");
    if (!isTransitionAllowed(from, status)) {
      throw new ConflictException(`Transição inválida: ${from} → ${status}`);
    }

    if (status === ServiceOrderStatus.ORCAMENTO && order.quotes.length === 0) {
      throw new ConflictException("É necessário ao menos um orçamento vinculado para avançar");
    }

    if (status === ServiceOrderStatus.APROVADO) {
      const hasApproval = order.quotes.some((q: any) => q.approvals.length > 0);
      if (!hasApproval) {
        throw new ConflictException("É necessário um registro de aprovação do orçamento");
      }
    }

    if (status === ServiceOrderStatus.ENTREGUE && !overrideFinancialHold) {
      const pending = order.accountsReceivable.some((a: any) => a.status !== "PAGO");
      if (pending) {
        throw new ConflictException(
          "Existem contas a receber pendentes vinculadas a esta OS. Um gerente pode liberar a entrega mesmo assim.",
        );
      }
    }

    const timestamps: Record<string, Date> = { updatedAt: new Date() };
    if (status === ServiceOrderStatus.RECEBIDO) timestamps.receivedAt = new Date();
    if (status === ServiceOrderStatus.EM_EXECUCAO && !order.startedAt) timestamps.startedAt = new Date();
    if (status === ServiceOrderStatus.PRONTO) timestamps.finishedAt = new Date();
    if (status === ServiceOrderStatus.ENTREGUE) timestamps.deliveredAt = new Date();

    await this.db
      .update(schema.serviceOrders)
      .set({ status, ...timestamps })
      .where(eq(schema.serviceOrders.id, id));

    await this.db.insert(schema.serviceOrderStatusHistory).values({
      serviceOrderId: id,
      fromStatus: from,
      toStatus: status,
      changedBy: user.id,
      note,
    });

    this.realtime.emitServiceOrderUpdated({ id, number: order.number, status });

    return this.findOne(id);
  }

  async addItem(
    serviceOrderId: string,
    dto: { type: "SERVICE" | "PART"; referenceId: string; description: string; quantity: number; unitPrice: number },
  ) {
    await this.findOne(serviceOrderId);
    const total = dto.quantity * dto.unitPrice;
    const [item] = await this.db
      .insert(schema.serviceOrderItems)
      .values({
        serviceOrderId,
        type: dto.type,
        referenceId: dto.referenceId,
        description: dto.description,
        quantity: dto.quantity.toFixed(2),
        unitPrice: dto.unitPrice.toFixed(2),
        total: total.toFixed(2),
        status: "PENDENTE",
      })
      .returning();
    return item;
  }

  /**
   * Avanço automático de AGUARDANDO_APROVACAO → APROVADO quando o cliente
   * aprova o orçamento pelo link público (spec §6.1, passo 5). Não passa
   * por `changeStatus` porque não há um `AuthenticatedUser` nesse fluxo.
   */
  async advanceAfterApproval(id: string) {
    const order = await this.findOne(id);
    if (order.status !== ServiceOrderStatus.AGUARDANDO_APROVACAO) return order;

    await this.db
      .update(schema.serviceOrders)
      .set({ status: ServiceOrderStatus.APROVADO, updatedAt: new Date() })
      .where(eq(schema.serviceOrders.id, id));

    await this.db.insert(schema.serviceOrderStatusHistory).values({
      serviceOrderId: id,
      fromStatus: ServiceOrderStatus.AGUARDANDO_APROVACAO,
      toStatus: ServiceOrderStatus.APROVADO,
      changedBy: null,
      note: "Aprovado pelo cliente via link seguro",
    });

    this.realtime.emitServiceOrderUpdated({
      id,
      number: order.number,
      status: ServiceOrderStatus.APROVADO,
    });

    return this.findOne(id);
  }

  async removeItem(serviceOrderId: string, itemId: string) {
    await this.findOne(serviceOrderId);
    await this.db
      .delete(schema.serviceOrderItems)
      .where(
        and(eq(schema.serviceOrderItems.id, itemId), eq(schema.serviceOrderItems.serviceOrderId, serviceOrderId)),
      );
    return { deleted: true };
  }
}
