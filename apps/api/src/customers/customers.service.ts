import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, or, ilike } from "drizzle-orm";
import * as schema from "@oficina/database";
import { DatabaseService } from "../database/database.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

@Injectable()
export class CustomersService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  findAll(search?: string) {
    return this.db.query.customers.findMany({
      where: search
        ? or(
            ilike(schema.customers.name, `%${search}%`),
            ilike(schema.customers.document, `%${search}%`),
            ilike(schema.customers.phone, `%${search}%`),
          )
        : undefined,
      orderBy: (c, { asc }) => [asc(c.name)],
    });
  }

  async findOne(id: string) {
    const customer = await this.db.query.customers.findFirst({
      where: eq(schema.customers.id, id),
      with: { vehicles: true },
    });
    if (!customer) throw new NotFoundException("Cliente não encontrado");
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    const [customer] = await this.db
      .insert(schema.customers)
      .values({ ...dto, tenantId: DEFAULT_TENANT_ID })
      .returning();
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    const [customer] = await this.db
      .update(schema.customers)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(schema.customers.id, id))
      .returning();
    return customer;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(schema.customers).where(eq(schema.customers.id, id));
    return { deleted: true };
  }
}
