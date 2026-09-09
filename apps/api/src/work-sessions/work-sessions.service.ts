import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "@oficina/database";
import { RoleName } from "@oficina/types";
import { DatabaseService } from "../database/database.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { StartWorkSessionDto } from "./dto/start-work-session.dto";

@Injectable()
export class WorkSessionsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private get db() {
    return this.database.db;
  }

  findAll(filters: { serviceOrderId?: string; mechanicId?: string; active?: boolean }) {
    const conditions = [] as any[];
    if (filters.serviceOrderId) conditions.push(eq(schema.workSessions.serviceOrderId, filters.serviceOrderId));
    if (filters.mechanicId) conditions.push(eq(schema.workSessions.mechanicId, filters.mechanicId));
    if (filters.active) conditions.push(isNull(schema.workSessions.endAt));

    return this.db.query.workSessions.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: {
        mechanic: { with: { user: true } },
        service: true,
        serviceOrder: true,
      },
      orderBy: (w, { desc }) => [desc(w.startAt)],
    });
  }

  private async resolveMechanic(user: AuthenticatedUser) {
    const mechanic = await this.db.query.mechanics.findFirst({
      where: eq(schema.mechanics.userId, user.id),
    });
    if (!mechanic) throw new BadRequestException("Usuário autenticado não é um mecânico cadastrado");
    return mechanic;
  }

  async start(dto: StartWorkSessionDto, user: AuthenticatedUser) {
    const mechanic = await this.resolveMechanic(user);

    const active = await this.db.query.workSessions.findFirst({
      where: and(eq(schema.workSessions.mechanicId, mechanic.id), isNull(schema.workSessions.endAt)),
    });
    if (active) {
      throw new BadRequestException(
        "Você já tem uma sessão de trabalho em andamento. Finalize-a antes de iniciar outra.",
      );
    }

    const [session] = await this.db
      .insert(schema.workSessions)
      .values({
        serviceOrderId: dto.serviceOrderId,
        mechanicId: mechanic.id,
        serviceId: dto.serviceId,
        deviceId: dto.deviceId,
        startAt: new Date(),
      })
      .returning();

    const order = await this.db.query.serviceOrders.findFirst({
      where: eq(schema.serviceOrders.id, dto.serviceOrderId),
    });

    this.realtime.emitWorkSessionUpdated({
      serviceOrderId: dto.serviceOrderId,
      serviceOrderNumber: order?.number,
      mechanicId: mechanic.id,
      mechanicName: user.email,
      status: "STARTED",
    });

    return session;
  }

  async finish(id: string, user: AuthenticatedUser) {
    const session = await this.db.query.workSessions.findFirst({
      where: eq(schema.workSessions.id, id),
    });
    if (!session) throw new NotFoundException("Sessão de trabalho não encontrada");
    if (session.endAt) throw new BadRequestException("Esta sessão já foi finalizada");

    if (!user.roles.includes(RoleName.ADMIN) && !user.roles.includes(RoleName.GERENTE)) {
      const mechanic = await this.resolveMechanic(user);
      if (mechanic.id !== session.mechanicId) {
        throw new ForbiddenException("Você só pode finalizar suas próprias sessões");
      }
    }

    const endAt = new Date();
    const durationSeconds = Math.round((endAt.getTime() - session.startAt.getTime()) / 1000);

    const [updated] = await this.db
      .update(schema.workSessions)
      .set({ endAt, durationSeconds })
      .where(eq(schema.workSessions.id, id))
      .returning();

    const order = await this.db.query.serviceOrders.findFirst({
      where: eq(schema.serviceOrders.id, session.serviceOrderId),
    });

    this.realtime.emitWorkSessionUpdated({
      serviceOrderId: session.serviceOrderId,
      serviceOrderNumber: order?.number,
      mechanicId: session.mechanicId,
      status: "FINISHED",
      durationSeconds,
    });

    return updated;
  }
}
