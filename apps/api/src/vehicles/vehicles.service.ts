import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, ilike } from "drizzle-orm";
import * as schema from "@oficina/database";
import { DatabaseService } from "../database/database.service";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

@Injectable()
export class VehiclesService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  findAll(params: { customerId?: string; plate?: string }) {
    const conditions = [];
    if (params.customerId) conditions.push(eq(schema.vehicles.customerId, params.customerId));
    if (params.plate) conditions.push(ilike(schema.vehicles.plate, `%${normalizePlate(params.plate)}%`));

    return this.db.query.vehicles.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: { customer: true },
      orderBy: (v, { desc }) => [desc(v.createdAt)],
    });
  }

  async findOne(id: string) {
    const vehicle = await this.db.query.vehicles.findFirst({
      where: eq(schema.vehicles.id, id),
      with: { customer: true },
    });
    if (!vehicle) throw new NotFoundException("Veículo não encontrado");
    return vehicle;
  }

  async create(dto: CreateVehicleDto) {
    const [vehicle] = await this.db
      .insert(schema.vehicles)
      .values({ ...dto, plate: normalizePlate(dto.plate), tenantId: DEFAULT_TENANT_ID })
      .returning();
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id);
    const [vehicle] = await this.db
      .update(schema.vehicles)
      .set({ ...dto, plate: dto.plate ? normalizePlate(dto.plate) : undefined, updatedAt: new Date() })
      .where(eq(schema.vehicles.id, id))
      .returning();
    return vehicle;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(schema.vehicles).where(eq(schema.vehicles.id, id));
    return { deleted: true };
  }
}
