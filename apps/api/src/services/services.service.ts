import { Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import * as schema from "@oficina/database";
import { DatabaseService } from "../database/database.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { CreateServiceCategoryDto } from "./dto/create-service-category.dto";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

@Injectable()
export class ServicesService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  findAll() {
    return this.db.query.services.findMany({
      with: { category: true },
      orderBy: (s, { asc }) => [asc(s.name)],
    });
  }

  async findOne(id: string) {
    const service = await this.db.query.services.findFirst({
      where: eq(schema.services.id, id),
      with: { category: true },
    });
    if (!service) throw new NotFoundException("Serviço não encontrado");
    return service;
  }

  async create(dto: CreateServiceDto) {
    const [service] = await this.db
      .insert(schema.services)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        name: dto.name,
        categoryId: dto.categoryId,
        estimatedMinutes: dto.estimatedMinutes,
        basePrice: dto.basePrice.toFixed(2),
      })
      .returning();
    return service;
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.findOne(id);
    const [service] = await this.db
      .update(schema.services)
      .set({
        name: dto.name,
        categoryId: dto.categoryId,
        estimatedMinutes: dto.estimatedMinutes,
        basePrice: dto.basePrice !== undefined ? dto.basePrice.toFixed(2) : undefined,
      })
      .where(eq(schema.services.id, id))
      .returning();
    return service;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(schema.services).where(eq(schema.services.id, id));
    return { deleted: true };
  }

  findCategories() {
    return this.db.query.serviceCategories.findMany({ orderBy: (c, { asc }) => [asc(c.name)] });
  }

  async createCategory(dto: CreateServiceCategoryDto) {
    const [category] = await this.db
      .insert(schema.serviceCategories)
      .values({ tenantId: DEFAULT_TENANT_ID, name: dto.name })
      .returning();
    return category;
  }
}
