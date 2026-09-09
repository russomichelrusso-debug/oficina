import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import * as schema from "@oficina/database";
import { QuoteStatus } from "@oficina/types";
import { DatabaseService } from "../database/database.service";
import { ServiceOrdersService } from "../service-orders/service-orders.service";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { ApproveQuoteDto } from "./dto/approve-quote.dto";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

@Injectable()
export class QuotesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly serviceOrders: ServiceOrdersService,
  ) {}

  private get db() {
    return this.database.db;
  }

  findAll(serviceOrderId?: string) {
    return this.db.query.quotes.findMany({
      where: serviceOrderId ? eq(schema.quotes.serviceOrderId, serviceOrderId) : undefined,
      with: { items: true, approvals: true, serviceOrder: true },
      orderBy: (q, { desc }) => [desc(q.createdAt)],
    });
  }

  async findOne(id: string) {
    const quote = await this.db.query.quotes.findFirst({
      where: eq(schema.quotes.id, id),
      with: { items: true, approvals: true, serviceOrder: true },
    });
    if (!quote) throw new NotFoundException("Orçamento não encontrado");
    return quote;
  }

  async create(dto: CreateQuoteDto) {
    const subtotal = dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discount = dto.discount ?? 0;
    const tax = dto.tax ?? 0;
    const total = subtotal - discount + tax;

    const [quote] = await this.db
      .insert(schema.quotes)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        serviceOrderId: dto.serviceOrderId,
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        status: QuoteStatus.RASCUNHO,
      })
      .returning();

    await this.db.insert(schema.quoteItems).values(
      dto.items.map((item) => ({
        quoteId: quote.id,
        type: item.type,
        referenceId: item.referenceId,
        description: item.description,
        quantity: item.quantity.toFixed(2),
        unitPrice: item.unitPrice.toFixed(2),
        total: (item.quantity * item.unitPrice).toFixed(2),
      })),
    );

    return this.findOne(quote.id);
  }

  async send(id: string) {
    await this.findOne(id);
    await this.db.update(schema.quotes).set({ status: QuoteStatus.ENVIADO }).where(eq(schema.quotes.id, id));
    return this.findOne(id);
  }

  /**
   * Fluxo de aprovação do cliente (spec §6.1, passo 4-5): total, parcial ou
   * recusa, sempre gravando `quote_approvals` com IP/dispositivo/hash.
   * Usado tanto pelo painel interno quanto pelo link público do cliente.
   */
  async approve(
    id: string,
    dto: ApproveQuoteDto,
    context: { ip?: string; device?: string },
  ) {
    const quote = await this.findOne(id);
    if (quote.approvals.length > 0) {
      throw new BadRequestException("Este orçamento já foi respondido pelo cliente");
    }

    const approvedIds = dto.approvedItemIds ?? [];
    const validIds = new Set(quote.items.map((i) => i.id));
    for (const approvedId of approvedIds) {
      if (!validIds.has(approvedId)) {
        throw new BadRequestException("Item aprovado não pertence a este orçamento");
      }
    }

    const status =
      approvedIds.length === 0
        ? QuoteStatus.RECUSADO
        : approvedIds.length === quote.items.length
          ? QuoteStatus.APROVADO
          : QuoteStatus.PARCIAL;

    await this.db.insert(schema.quoteApprovals).values({
      quoteId: id,
      customerId: quote.serviceOrder.customerId,
      ip: context.ip,
      device: context.device,
      approvedItems: approvedIds,
      signatureHash: dto.signatureHash,
    });

    await this.db.update(schema.quotes).set({ status }).where(eq(schema.quotes.id, id));

    if (status !== QuoteStatus.RECUSADO) {
      // Itens aprovados viram os itens reais da OS (execução, cronômetro,
      // baixa de peça) — o orçamento por si só não é a fonte de verdade
      // do que será executado.
      const approvedQuoteItems = quote.items.filter((item) => approvedIds.includes(item.id));
      if (approvedQuoteItems.length > 0) {
        await this.db.insert(schema.serviceOrderItems).values(
          approvedQuoteItems.map((item) => ({
            serviceOrderId: quote.serviceOrderId,
            type: item.type,
            referenceId: item.referenceId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            status: "PENDENTE",
          })),
        );
      }
      await this.serviceOrders.advanceAfterApproval(quote.serviceOrderId);
    }

    return this.findOne(id);
  }
}
