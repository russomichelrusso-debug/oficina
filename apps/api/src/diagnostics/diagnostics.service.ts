import { Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import * as schema from "@oficina/database";
import { DatabaseService } from "../database/database.service";
import { CreateDiagnosticDto } from "./dto/create-diagnostic.dto";

@Injectable()
export class DiagnosticsService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  findAll(serviceOrderId?: string) {
    return this.db.query.diagnostics.findMany({
      where: serviceOrderId ? eq(schema.diagnostics.serviceOrderId, serviceOrderId) : undefined,
      with: { items: true },
      orderBy: (d, { desc }) => [desc(d.createdAt)],
    });
  }

  async findOne(id: string) {
    const diagnostic = await this.db.query.diagnostics.findFirst({
      where: eq(schema.diagnostics.id, id),
      with: { items: true },
    });
    if (!diagnostic) throw new NotFoundException("Diagnóstico não encontrado");
    return diagnostic;
  }

  async create(dto: CreateDiagnosticDto, userId: string) {
    const [diagnostic] = await this.db
      .insert(schema.diagnostics)
      .values({ serviceOrderId: dto.serviceOrderId, summary: dto.summary, createdBy: userId })
      .returning();

    if (dto.items.length > 0) {
      await this.db.insert(schema.diagnosticItems).values(
        dto.items.map((item) => ({
          diagnosticId: diagnostic.id,
          description: item.description,
          severity: item.severity,
          recommendation: item.recommendation,
        })),
      );
    }

    return this.findOne(diagnostic.id);
  }
}
