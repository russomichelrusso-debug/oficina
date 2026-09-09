import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { eq, ilike, or } from "drizzle-orm";
import * as schema from "@oficina/database";
import { DatabaseService } from "../database/database.service";
import { computeStockBalances } from "./stock-balance";
import { CreatePartDto } from "./dto/create-part.dto";
import { UpdatePartDto } from "./dto/update-part.dto";
import { CreatePartCategoryDto } from "./dto/create-part-category.dto";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

@Injectable()
export class PartsService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  async findAll(search?: string) {
    const parts = await this.db.query.parts.findMany({
      where: search ? or(ilike(schema.parts.name, `%${search}%`), ilike(schema.parts.sku, `%${search}%`)) : undefined,
      with: { category: true },
      orderBy: (p, { asc }) => [asc(p.name)],
    });
    const balances = await computeStockBalances(this.database);
    return parts.map((part) => ({ ...part, currentStock: balances.get(part.id) ?? 0 }));
  }

  async findOne(id: string) {
    const part = await this.db.query.parts.findFirst({
      where: eq(schema.parts.id, id),
      with: { category: true },
    });
    if (!part) throw new NotFoundException("Peça não encontrada");
    const balances = await computeStockBalances(this.database, id);
    return { ...part, currentStock: balances.get(id) ?? 0 };
  }

  async create(dto: CreatePartDto) {
    const existing = await this.db.query.parts.findFirst({ where: eq(schema.parts.sku, dto.sku) });
    if (existing) throw new ConflictException("Já existe uma peça com este SKU");

    const [part] = await this.db
      .insert(schema.parts)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        sku: dto.sku,
        name: dto.name,
        categoryId: dto.categoryId,
        unitPrice: dto.unitPrice.toFixed(2),
        minStock: dto.minStock ?? 0,
      })
      .returning();
    return this.findOne(part.id);
  }

  async update(id: string, dto: UpdatePartDto) {
    await this.findOne(id);
    await this.db
      .update(schema.parts)
      .set({
        name: dto.name,
        categoryId: dto.categoryId,
        unitPrice: dto.unitPrice !== undefined ? dto.unitPrice.toFixed(2) : undefined,
        minStock: dto.minStock,
      })
      .where(eq(schema.parts.id, id));
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(schema.parts).where(eq(schema.parts.id, id));
    return { deleted: true };
  }

  findCategories() {
    return this.db.query.partCategories.findMany({ orderBy: (c, { asc }) => [asc(c.name)] });
  }

  async createCategory(dto: CreatePartCategoryDto) {
    const [category] = await this.db
      .insert(schema.partCategories)
      .values({ tenantId: DEFAULT_TENANT_ID, name: dto.name })
      .returning();
    return category;
  }

  async findLowStock() {
    const all = await this.findAll();
    return all.filter((p) => p.currentStock < p.minStock);
  }
}
