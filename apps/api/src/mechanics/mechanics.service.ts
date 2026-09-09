import { Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import * as schema from "@oficina/database";
import { DatabaseService } from "../database/database.service";
import { CreateMechanicDto } from "./dto/create-mechanic.dto";
import { UpdateMechanicDto } from "./dto/update-mechanic.dto";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

@Injectable()
export class MechanicsService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  findAll() {
    return this.db.query.mechanics.findMany({
      with: { user: true },
    });
  }

  async findOne(id: string) {
    const mechanic = await this.db.query.mechanics.findFirst({
      where: eq(schema.mechanics.id, id),
      with: { user: true },
    });
    if (!mechanic) throw new NotFoundException("Mecânico não encontrado");
    return mechanic;
  }

  async findByUserId(userId: string) {
    const mechanic = await this.db.query.mechanics.findFirst({
      where: eq(schema.mechanics.userId, userId),
    });
    if (!mechanic) throw new NotFoundException("Usuário não está cadastrado como mecânico");
    return mechanic;
  }

  async create(dto: CreateMechanicDto) {
    const [mechanic] = await this.db
      .insert(schema.mechanics)
      .values({ tenantId: DEFAULT_TENANT_ID, ...dto })
      .returning();
    return this.findOne(mechanic.id);
  }

  async update(id: string, dto: UpdateMechanicDto) {
    await this.findOne(id);
    await this.db.update(schema.mechanics).set(dto).where(eq(schema.mechanics.id, id));
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db
      .update(schema.mechanics)
      .set({ active: false })
      .where(eq(schema.mechanics.id, id));
    return { deactivated: true };
  }
}
