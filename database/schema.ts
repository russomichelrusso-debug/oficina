// Schema Drizzle ORM — ERP Oficina
// Cobre o modelo de dados completo descrito em docs/spec-erp-oficina.md (§4),
// mesmo que os módulos de negócio de fases futuras (OS, orçamento, estoque,
// financeiro...) ainda não tenham endpoints implementados na Fase 1.
// Isso evita migrations destrutivas quando essas fases forem construídas.
//
// Escolhido no lugar do Prisma porque o Prisma Client precisa baixar um
// binário de engine nativo de binaries.prisma.sh a cada `generate`; Drizzle
// é 100% TypeScript (usa o driver `pg` puro), sem esse binário — mais simples
// de rodar em CI/containers restritos, sem abrir mão de migrations tipadas.

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const roleNameEnum = pgEnum("role_name", [
  "ADMIN",
  "GERENTE",
  "RECEPCAO",
  "MECANICO",
  "ESTOQUE",
  "FINANCEIRO",
  "CLIENTE",
]);

export const serviceOrderStatusEnum = pgEnum("service_order_status", [
  "AGENDADO",
  "RECEBIDO",
  "DIAGNOSTICO",
  "ORCAMENTO",
  "AGUARDANDO_APROVACAO",
  "APROVADO",
  "EM_EXECUCAO",
  "AGUARDANDO_PECA",
  "CONTROLE_QUALIDADE",
  "PRONTO",
  "ENTREGUE",
  "ENCERRADO",
]);

export const lineItemTypeEnum = pgEnum("line_item_type", ["SERVICE", "PART"]);

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "ENTRADA",
  "SAIDA",
  "DEVOLUCAO",
  "AJUSTE",
  "TRANSFERENCIA",
]);

export const mediaTypeEnum = pgEnum("media_type", ["PHOTO", "VIDEO"]);
export const mediaStageEnum = pgEnum("media_stage", [
  "ENTRADA",
  "DIAGNOSTICO",
  "EXECUCAO",
  "FINALIZACAO",
]);

export const paymentMethodTypeEnum = pgEnum("payment_method_type", [
  "PIX",
  "DINHEIRO",
  "DEBITO",
  "CREDITO",
  "BOLETO",
]);

export const accountReceivableStatusEnum = pgEnum("account_receivable_status", [
  "PENDENTE",
  "PAGO",
  "ATRASADO",
]);

// ---------------------------------------------------------------------------
// Multiempresa (preparação) — spec §10 e §21
// ---------------------------------------------------------------------------

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 4.1 Identidade e acesso
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: roleNameEnum("name").notNull().unique(),
});

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 128 }).notNull().unique(),
  description: text("description"),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id").notNull().references(() => roles.id),
    permissionId: uuid("permission_id").notNull().references(() => permissions.id),
  },
  (t) => ({ pk: primaryKey({ columns: [t.roleId, t.permissionId] }) }),
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id").notNull().references(() => users.id),
    roleId: uuid("role_id").notNull().references(() => roles.id),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.roleId] }) }),
);

export const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

// ---------------------------------------------------------------------------
// 4.2 Clientes e veículos
// ---------------------------------------------------------------------------

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    name: varchar("name", { length: 255 }).notNull(),
    document: varchar("document", { length: 20 }),
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 255 }),
    address: text("address"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ tenantIdx: index("customers_tenant_idx").on(t.tenantId) }),
);

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    plate: varchar("plate", { length: 10 }).notNull(),
    brand: varchar("brand", { length: 100 }).notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    year: integer("year"),
    color: varchar("color", { length: 50 }),
    mileageKm: integer("mileage_km"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index("vehicles_tenant_idx").on(t.tenantId),
    plateIdx: index("vehicles_plate_idx").on(t.plate),
  }),
);

export const customersRelations = relations(customers, ({ many }) => ({
  vehicles: many(vehicles),
}));

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  customer: one(customers, { fields: [vehicles.customerId], references: [customers.id] }),
}));

// ---------------------------------------------------------------------------
// 4.3 Agendamento
// ---------------------------------------------------------------------------

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("AGENDADO"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 4.6 Catálogo de serviços
// ---------------------------------------------------------------------------

export const serviceCategories = pgTable("service_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 150 }).notNull(),
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  categoryId: uuid("category_id").references(() => serviceCategories.id),
  name: varchar("name", { length: 200 }).notNull(),
  estimatedMinutes: integer("estimated_minutes"),
  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull().default("0"),
});

// ---------------------------------------------------------------------------
// 4.5 Ordem de serviço (núcleo do sistema — implementado a partir da Fase 2/3)
// ---------------------------------------------------------------------------

export const mechanics = pgTable("mechanics", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").notNull().unique().references(() => users.id),
  specialty: varchar("specialty", { length: 150 }),
  active: boolean("active").notNull().default(true),
});

export const serviceOrders = pgTable(
  "service_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    number: serial("number").notNull().unique(),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id),
    status: serviceOrderStatusEnum("status").notNull().default("AGENDADO"),
    mechanicId: uuid("mechanic_id").references(() => mechanics.id),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    // Token opaco usado no link seguro do cliente (Fase 6, spec §3/§6.5) —
    // não é um JWT nem senha, apenas um identificador de posse do link.
    publicToken: uuid("public_token").defaultRandom().notNull(),
    complaint: text("complaint"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index("service_orders_tenant_idx").on(t.tenantId),
    statusIdx: index("service_orders_status_idx").on(t.status),
    publicTokenIdx: uniqueIndex("service_orders_public_token_idx").on(t.publicToken),
  }),
);

export const serviceOrderItems = pgTable("service_order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceOrderId: uuid("service_order_id").notNull().references(() => serviceOrders.id),
  type: lineItemTypeEnum("type").notNull(),
  referenceId: uuid("reference_id").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("PENDENTE"),
});

export const serviceOrderStatusHistory = pgTable("service_order_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceOrderId: uuid("service_order_id").notNull().references(() => serviceOrders.id),
  fromStatus: serviceOrderStatusEnum("from_status"),
  toStatus: serviceOrderStatusEnum("to_status").notNull(),
  changedBy: uuid("changed_by"),
  changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
  note: text("note"),
});

// ---------------------------------------------------------------------------
// 4.4 Orçamento e aprovação
// ---------------------------------------------------------------------------

export const quotes = pgTable("quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  serviceOrderId: uuid("service_order_id").notNull().references(() => serviceOrders.id),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 30 }).notNull().default("RASCUNHO"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const quoteItems = pgTable("quote_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  quoteId: uuid("quote_id").notNull().references(() => quotes.id),
  type: lineItemTypeEnum("type").notNull(),
  referenceId: uuid("reference_id").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
});

export const quoteApprovals = pgTable("quote_approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  quoteId: uuid("quote_id").notNull().references(() => quotes.id),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }).defaultNow().notNull(),
  ip: varchar("ip", { length: 64 }),
  device: varchar("device", { length: 255 }),
  approvedItems: jsonb("approved_items").notNull(),
  signatureHash: varchar("signature_hash", { length: 255 }),
});

// ---------------------------------------------------------------------------
// 4.7 Estoque
// ---------------------------------------------------------------------------

export const partCategories = pgTable("part_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 150 }).notNull(),
});

export const parts = pgTable("parts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  categoryId: uuid("category_id").references(() => partCategories.id),
  sku: varchar("sku", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  minStock: integer("min_stock").notNull().default(0),
});

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 200 }).notNull(),
  document: varchar("document", { length: 20 }),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 255 }),
});

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    partId: uuid("part_id").notNull().references(() => parts.id),
    type: stockMovementTypeEnum("type").notNull(),
    quantity: integer("quantity").notNull(),
    serviceOrderId: uuid("service_order_id").references(() => serviceOrders.id),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ partIdx: index("stock_movements_part_idx").on(t.partId) }),
);

// ---------------------------------------------------------------------------
// 4.8 Mecânico e tempo
// ---------------------------------------------------------------------------

export const workSessions = pgTable("work_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceOrderId: uuid("service_order_id").notNull().references(() => serviceOrders.id),
  mechanicId: uuid("mechanic_id").notNull().references(() => mechanics.id),
  serviceId: uuid("service_id").references(() => services.id),
  deviceId: varchar("device_id", { length: 128 }),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
});

// ---------------------------------------------------------------------------
// 4.9 Diagnóstico e checklist
// ---------------------------------------------------------------------------

export const diagnostics = pgTable("diagnostics", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceOrderId: uuid("service_order_id").notNull().references(() => serviceOrders.id),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  summary: text("summary"),
});

export const diagnosticItems = pgTable("diagnostic_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  diagnosticId: uuid("diagnostic_id").notNull().references(() => diagnostics.id),
  description: varchar("description", { length: 255 }).notNull(),
  severity: varchar("severity", { length: 30 }),
  recommendation: text("recommendation"),
});

export const checklists = pgTable("checklists", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceOrderId: uuid("service_order_id").notNull().references(() => serviceOrders.id),
  templateName: varchar("template_name", { length: 150 }).notNull(),
  items: jsonb("items").notNull(),
  completedBy: uuid("completed_by"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// 4.10 Mídia
// ---------------------------------------------------------------------------

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  serviceOrderId: uuid("service_order_id").references(() => serviceOrders.id),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),
  type: mediaTypeEnum("type").notNull(),
  stage: mediaStageEnum("stage").notNull(),
  storageKey: varchar("storage_key", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by"),
});

// ---------------------------------------------------------------------------
// 4.11 Financeiro
// ---------------------------------------------------------------------------

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  serviceOrderId: uuid("service_order_id").notNull().references(() => serviceOrders.id),
  method: paymentMethodTypeEnum("method").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow().notNull(),
  installmentNumber: integer("installment_number"),
  installmentTotal: integer("installment_total"),
});

export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 100 }).notNull(),
  active: boolean("active").notNull().default(true),
});

export const accountsReceivable = pgTable("accounts_receivable", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  serviceOrderId: uuid("service_order_id").notNull().references(() => serviceOrders.id),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: accountReceivableStatusEnum("status").notNull().default("PENDENTE"),
});

// ---------------------------------------------------------------------------
// 4.12 Sistema
// ---------------------------------------------------------------------------

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  channel: varchar("channel", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    userId: uuid("user_id"),
    action: varchar("action", { length: 100 }).notNull(),
    entity: varchar("entity", { length: 100 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    ip: varchar("ip", { length: 64 }),
    device: varchar("device", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ entityIdx: index("audit_logs_entity_idx").on(t.entity, t.entityId) }),
);

// ---------------------------------------------------------------------------
// Relations — Fases 2 a 7 (OS, orçamento, mecânico, estoque, financeiro)
// ---------------------------------------------------------------------------

export const mechanicsRelations = relations(mechanics, ({ one, many }) => ({
  user: one(users, { fields: [mechanics.userId], references: [users.id] }),
  workSessions: many(workSessions),
}));

export const serviceCategoriesRelations = relations(serviceCategories, ({ many }) => ({
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one }) => ({
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
}));

export const serviceOrdersRelations = relations(serviceOrders, ({ one, many }) => ({
  customer: one(customers, { fields: [serviceOrders.customerId], references: [customers.id] }),
  vehicle: one(vehicles, { fields: [serviceOrders.vehicleId], references: [vehicles.id] }),
  mechanic: one(mechanics, { fields: [serviceOrders.mechanicId], references: [mechanics.id] }),
  items: many(serviceOrderItems),
  statusHistory: many(serviceOrderStatusHistory),
  quotes: many(quotes),
  diagnostics: many(diagnostics),
  checklists: many(checklists),
  media: many(media),
  workSessions: many(workSessions),
  payments: many(payments),
  accountsReceivable: many(accountsReceivable),
}));

export const serviceOrderItemsRelations = relations(serviceOrderItems, ({ one }) => ({
  serviceOrder: one(serviceOrders, {
    fields: [serviceOrderItems.serviceOrderId],
    references: [serviceOrders.id],
  }),
}));

export const serviceOrderStatusHistoryRelations = relations(
  serviceOrderStatusHistory,
  ({ one }) => ({
    serviceOrder: one(serviceOrders, {
      fields: [serviceOrderStatusHistory.serviceOrderId],
      references: [serviceOrders.id],
    }),
  }),
);

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  serviceOrder: one(serviceOrders, {
    fields: [quotes.serviceOrderId],
    references: [serviceOrders.id],
  }),
  items: many(quoteItems),
  approvals: many(quoteApprovals),
}));

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quote: one(quotes, { fields: [quoteItems.quoteId], references: [quotes.id] }),
}));

export const quoteApprovalsRelations = relations(quoteApprovals, ({ one }) => ({
  quote: one(quotes, { fields: [quoteApprovals.quoteId], references: [quotes.id] }),
  customer: one(customers, {
    fields: [quoteApprovals.customerId],
    references: [customers.id],
  }),
}));

export const workSessionsRelations = relations(workSessions, ({ one }) => ({
  serviceOrder: one(serviceOrders, {
    fields: [workSessions.serviceOrderId],
    references: [serviceOrders.id],
  }),
  mechanic: one(mechanics, { fields: [workSessions.mechanicId], references: [mechanics.id] }),
  service: one(services, { fields: [workSessions.serviceId], references: [services.id] }),
}));

export const diagnosticsRelations = relations(diagnostics, ({ one, many }) => ({
  serviceOrder: one(serviceOrders, {
    fields: [diagnostics.serviceOrderId],
    references: [serviceOrders.id],
  }),
  items: many(diagnosticItems),
}));

export const diagnosticItemsRelations = relations(diagnosticItems, ({ one }) => ({
  diagnostic: one(diagnostics, {
    fields: [diagnosticItems.diagnosticId],
    references: [diagnostics.id],
  }),
}));

export const checklistsRelations = relations(checklists, ({ one }) => ({
  serviceOrder: one(serviceOrders, {
    fields: [checklists.serviceOrderId],
    references: [serviceOrders.id],
  }),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  serviceOrder: one(serviceOrders, {
    fields: [media.serviceOrderId],
    references: [serviceOrders.id],
  }),
  vehicle: one(vehicles, { fields: [media.vehicleId], references: [vehicles.id] }),
}));

export const partCategoriesRelations = relations(partCategories, ({ many }) => ({
  parts: many(parts),
}));

export const partsRelations = relations(parts, ({ one, many }) => ({
  category: one(partCategories, { fields: [parts.categoryId], references: [partCategories.id] }),
  stockMovements: many(stockMovements),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  stockMovements: many(stockMovements),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  part: one(parts, { fields: [stockMovements.partId], references: [parts.id] }),
  supplier: one(suppliers, { fields: [stockMovements.supplierId], references: [suppliers.id] }),
  serviceOrder: one(serviceOrders, {
    fields: [stockMovements.serviceOrderId],
    references: [serviceOrders.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  serviceOrder: one(serviceOrders, {
    fields: [payments.serviceOrderId],
    references: [serviceOrders.id],
  }),
}));

export const accountsReceivableRelations = relations(accountsReceivable, ({ one }) => ({
  serviceOrder: one(serviceOrders, {
    fields: [accountsReceivable.serviceOrderId],
    references: [serviceOrders.id],
  }),
  customer: one(customers, {
    fields: [accountsReceivable.customerId],
    references: [customers.id],
  }),
}));
