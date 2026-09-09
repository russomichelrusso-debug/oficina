import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import * as schema from "@oficina/database";
import { DatabaseService } from "../database/database.service";
import { QuotesService } from "../quotes/quotes.service";
import { ApproveQuoteDto } from "../quotes/dto/approve-quote.dto";

/**
 * Portal do cliente (spec §3, §6.5, Fase 6): acesso somente leitura ao
 * próprio veículo/OS via link seguro com token de acesso, sem senha
 * tradicional. O token é opaco (`service_orders.public_token`), não um JWT.
 */
@Injectable()
export class PublicService {
  constructor(
    private readonly database: DatabaseService,
    private readonly quotesService: QuotesService,
  ) {}

  private get db() {
    return this.database.db;
  }

  async findServiceOrderByToken(token: string) {
    const order = await this.db.query.serviceOrders.findFirst({
      where: eq(schema.serviceOrders.publicToken, token),
      with: {
        customer: true,
        vehicle: true,
        mechanic: { with: { user: true } },
        items: true,
        statusHistory: { orderBy: (h, { asc }) => [asc(h.changedAt)] },
        quotes: { with: { items: true, approvals: true } },
        media: true,
      },
    });
    if (!order) throw new NotFoundException("Link inválido ou expirado");
    return order;
  }

  async approveQuote(
    token: string,
    quoteId: string,
    dto: ApproveQuoteDto,
    context: { ip?: string; device?: string },
  ) {
    const order = await this.findServiceOrderByToken(token);
    const quote = order.quotes.find((q) => q.id === quoteId);
    if (!quote) throw new ForbiddenException("Este orçamento não pertence a esta ordem de serviço");
    return this.quotesService.approve(quoteId, dto, context);
  }
}
