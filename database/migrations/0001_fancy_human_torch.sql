ALTER TABLE "service_orders" ADD COLUMN "public_token" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "service_orders" ADD COLUMN "complaint" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "service_orders_public_token_idx" ON "service_orders" USING btree ("public_token");