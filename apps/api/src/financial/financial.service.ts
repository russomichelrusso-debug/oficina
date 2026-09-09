import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, gte, lte, ne, sql } from "drizzle-orm";
import * as schema from "@oficina/database";
import { AccountReceivableStatus } from "@oficina/types";
import { DatabaseService } from "../database/database.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { CreateAccountReceivableDto } from "./dto/create-account-receivable.dto";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

@Injectable()
export class FinancialService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  // ---- Pagamentos -----------------------------------------------------

  findPayments(serviceOrderId?: string) {
    return this.db.query.payments.findMany({
      where: serviceOrderId ? eq(schema.payments.serviceOrderId, serviceOrderId) : undefined,
      orderBy: (p, { desc }) => [desc(p.paidAt)],
    });
  }

  async createPayment(dto: CreatePaymentDto) {
    const order = await this.db.query.serviceOrders.findFirst({
      where: eq(schema.serviceOrders.id, dto.serviceOrderId),
    });
    if (!order) throw new NotFoundException("Ordem de serviço não encontrada");

    const [payment] = await this.db
      .insert(schema.payments)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        serviceOrderId: dto.serviceOrderId,
        method: dto.method,
        amount: dto.amount.toFixed(2),
        installmentNumber: dto.installmentNumber,
        installmentTotal: dto.installmentTotal,
      })
      .returning();

    await this.reconcileAccountsReceivable(dto.serviceOrderId);

    return payment;
  }

  /** Marca contas a receber da OS como PAGO quando os pagamentos cobrem o total pendente. */
  private async reconcileAccountsReceivable(serviceOrderId: string) {
    const [paid] = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${schema.payments.amount}), 0)` })
      .from(schema.payments)
      .where(eq(schema.payments.serviceOrderId, serviceOrderId));

    const receivables = await this.db.query.accountsReceivable.findMany({
      where: and(
        eq(schema.accountsReceivable.serviceOrderId, serviceOrderId),
        ne(schema.accountsReceivable.status, AccountReceivableStatus.PAGO),
      ),
    });

    const paidTotal = Number(paid?.total ?? 0);
    const dueTotal = receivables.reduce((sum, r) => sum + Number(r.amount), 0);

    if (receivables.length > 0 && paidTotal >= dueTotal) {
      await this.db
        .update(schema.accountsReceivable)
        .set({ status: AccountReceivableStatus.PAGO })
        .where(eq(schema.accountsReceivable.serviceOrderId, serviceOrderId));
    }
  }

  // ---- Contas a receber -------------------------------------------------

  async findAccountsReceivable(status?: AccountReceivableStatus) {
    await this.refreshOverdueStatuses();
    return this.db.query.accountsReceivable.findMany({
      where: status ? eq(schema.accountsReceivable.status, status) : undefined,
      with: { customer: true, serviceOrder: true },
      orderBy: (a, { asc }) => [asc(a.dueDate)],
    });
  }

  private async refreshOverdueStatuses() {
    await this.db
      .update(schema.accountsReceivable)
      .set({ status: AccountReceivableStatus.ATRASADO })
      .where(
        and(
          eq(schema.accountsReceivable.status, AccountReceivableStatus.PENDENTE),
          lte(schema.accountsReceivable.dueDate, new Date()),
        ),
      );
  }

  async createAccountReceivable(dto: CreateAccountReceivableDto) {
    const [receivable] = await this.db
      .insert(schema.accountsReceivable)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        serviceOrderId: dto.serviceOrderId,
        customerId: dto.customerId,
        dueDate: new Date(dto.dueDate),
        amount: dto.amount.toFixed(2),
        status: AccountReceivableStatus.PENDENTE,
      })
      .returning();
    return receivable;
  }

  // ---- Relatórios --------------------------------------------------------

  /** Fechamento diário (spec §6.4): total recebido por forma de pagamento. */
  async dailyClosing(date: string) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);

    const payments = await this.db.query.payments.findMany({
      where: and(gte(schema.payments.paidAt, start), lte(schema.payments.paidAt, end)),
    });

    const byMethod: Record<string, number> = {};
    let total = 0;
    for (const payment of payments) {
      const amount = Number(payment.amount);
      byMethod[payment.method] = (byMethod[payment.method] ?? 0) + amount;
      total += amount;
    }

    return { date, total, byMethod, count: payments.length };
  }

  /** Receita por período — recebida (pagamentos) vs. esperada (orçamentos aprovados). */
  async revenueReport(from: string, to: string) {
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59.999`);

    const payments = await this.db.query.payments.findMany({
      where: and(gte(schema.payments.paidAt, start), lte(schema.payments.paidAt, end)),
    });
    const received = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const quotes = await this.db.query.quotes.findMany({
      where: and(gte(schema.quotes.createdAt, start), lte(schema.quotes.createdAt, end)),
    });
    const expected = quotes
      .filter((q) => q.status === "APROVADO" || q.status === "PARCIAL")
      .reduce((sum, q) => sum + Number(q.total), 0);

    return { from, to, received, expected, paymentsCount: payments.length };
  }
}
