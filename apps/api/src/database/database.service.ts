import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@oficina/database";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  public db: NodePgDatabase<typeof schema>;

  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleInit() {
    await this.pool.query("SELECT 1");
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
