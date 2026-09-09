import { Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import * as schema from "@oficina/database";
import { DatabaseService } from "../database/database.service";
import { CreateChecklistDto } from "./dto/create-checklist.dto";
import { UpdateChecklistDto } from "./dto/update-checklist.dto";

@Injectable()
export class ChecklistsService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  findAll(serviceOrderId?: string) {
    return this.db.query.checklists.findMany({
      where: serviceOrderId ? eq(schema.checklists.serviceOrderId, serviceOrderId) : undefined,
    });
  }

  async findOne(id: string) {
    const checklist = await this.db.query.checklists.findFirst({
      where: eq(schema.checklists.id, id),
    });
    if (!checklist) throw new NotFoundException("Checklist não encontrado");
    return checklist;
  }

  async create(dto: CreateChecklistDto) {
    const [checklist] = await this.db
      .insert(schema.checklists)
      .values({
        serviceOrderId: dto.serviceOrderId,
        templateName: dto.templateName,
        items: dto.items,
      })
      .returning();
    return checklist;
  }

  async update(id: string, dto: UpdateChecklistDto) {
    await this.findOne(id);
    const [checklist] = await this.db
      .update(schema.checklists)
      .set({ items: dto.items })
      .where(eq(schema.checklists.id, id))
      .returning();
    return checklist;
  }

  async complete(id: string, userId: string) {
    await this.findOne(id);
    const [checklist] = await this.db
      .update(schema.checklists)
      .set({ completedBy: userId, completedAt: new Date() })
      .where(eq(schema.checklists.id, id))
      .returning();
    return checklist;
  }
}
