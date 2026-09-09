import { sql } from "drizzle-orm";
import type { DatabaseService } from "../database/database.service";

/**
 * Saldo de estoque = soma de todos os `stock_movements` da peça (spec §4.7,
 * §6.3): nunca um `UPDATE parts SET stock = stock - 1`, sempre derivado.
 */
export async function computeStockBalances(
  database: DatabaseService,
  partId?: string,
): Promise<Map<string, number>> {
  const rows = await database.db.execute(sql`
    SELECT part_id,
      COALESCE(SUM(
        CASE type
          WHEN 'ENTRADA' THEN quantity
          WHEN 'DEVOLUCAO' THEN quantity
          WHEN 'AJUSTE' THEN quantity
          WHEN 'SAIDA' THEN -quantity
          WHEN 'TRANSFERENCIA' THEN -quantity
          ELSE 0
        END
      ), 0)::int AS balance
    FROM stock_movements
    ${partId ? sql`WHERE part_id = ${partId}` : sql``}
    GROUP BY part_id
  `);

  const map = new Map<string, number>();
  for (const row of rows.rows as { part_id: string; balance: number }[]) {
    map.set(row.part_id, row.balance);
  }
  return map;
}
