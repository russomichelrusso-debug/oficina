import { Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import * as schema from "@oficina/database";
import { DatabaseService } from "../database/database.service";
import { StorageService } from "./storage.service";
import { CreateMediaDto } from "./dto/create-media.dto";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

@Injectable()
export class MediaService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: StorageService,
  ) {}

  private get db() {
    return this.database.db;
  }

  findAll(serviceOrderId?: string) {
    return this.db.query.media.findMany({
      where: serviceOrderId ? eq(schema.media.serviceOrderId, serviceOrderId) : undefined,
      orderBy: (m, { desc }) => [desc(m.createdAt)],
    });
  }

  async create(dto: CreateMediaDto, userId: string) {
    const buffer = Buffer.from(dto.dataBase64, "base64");
    const prefix = `os/${dto.serviceOrderId ?? "sem-os"}/${dto.stage}`;
    const key = this.storage.buildKey(prefix, dto.filename);
    await this.storage.save(key, buffer);

    const [record] = await this.db
      .insert(schema.media)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        serviceOrderId: dto.serviceOrderId,
        vehicleId: dto.vehicleId,
        type: dto.type,
        stage: dto.stage,
        storageKey: key,
        mimeType: dto.mimeType,
        createdBy: userId,
      })
      .returning();

    return { ...record, url: this.storage.publicUrl(key) };
  }

  async remove(id: string) {
    const record = await this.db.query.media.findFirst({ where: eq(schema.media.id, id) });
    if (!record) throw new NotFoundException("Mídia não encontrada");
    await this.db.delete(schema.media).where(eq(schema.media.id, id));
    return { deleted: true };
  }
}
