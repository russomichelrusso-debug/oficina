import { Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import * as schema from "@oficina/database";
import { DatabaseService } from "../database/database.service";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

@Injectable()
export class SuppliersService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  findAll() {
    return this.db.query.suppliers.findMany({ orderBy: (s, { asc }) => [asc(s.name)] });
  }

  async findOne(id: string) {
    const supplier = await this.db.query.suppliers.findFirst({ where: eq(schema.suppliers.id, id) });
    if (!supplier) throw new NotFoundException("Fornecedor não encontrado");
    return supplier;
  }

  async create(dto: CreateSupplierDto) {
    const [supplier] = await this.db
      .insert(schema.suppliers)
      .values({ tenantId: DEFAULT_TENANT_ID, ...dto })
      .returning();
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);
    const [supplier] = await this.db
      .update(schema.suppliers)
      .set(dto)
      .where(eq(schema.suppliers.id, id))
      .returning();
    return supplier;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(schema.suppliers).where(eq(schema.suppliers.id, id));
    return { deleted: true };
  }
}
