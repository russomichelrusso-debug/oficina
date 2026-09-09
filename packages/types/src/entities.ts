import { RoleName } from "./enums";

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  active: boolean;
  roles: RoleName[];
  createdAt: string;
}

export interface CustomerDTO {
  id: string;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  createdAt: string;
}

export interface VehicleDTO {
  id: string;
  customerId: string;
  plate: string;
  brand: string;
  model: string;
  year?: number | null;
  color?: string | null;
  mileageKm?: number | null;
  createdAt: string;
}

export interface PlateLookupResultDTO {
  plate: string;
  brand?: string;
  model?: string;
  color?: string;
  year?: number;
  modelYear?: number;
  chassis?: string;
  city?: string;
  state?: string;
  returnCode?: string;
  returnMessage?: string;
  statusCode?: string;
  statusMessage?: string;
  notFound?: boolean;
}

export interface DashboardSummaryDTO {
  totalCustomers: number;
  totalVehicles: number;
  activeUsers: number;
  openServiceOrders: number;
  revenueToday: number;
}

export interface ServiceCategoryDTO {
  id: string;
  name: string;
}

export interface ServiceDTO {
  id: string;
  name: string;
  categoryId?: string | null;
  category?: ServiceCategoryDTO | null;
  estimatedMinutes?: number | null;
  basePrice: string;
}

export interface MechanicDTO {
  id: string;
  userId: string;
  specialty?: string | null;
  active: boolean;
  user?: UserDTO | { id: string; name: string; email: string };
}

export interface ServiceOrderItemDTO {
  id: string;
  serviceOrderId: string;
  type: "SERVICE" | "PART";
  referenceId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  total: string;
  status: string;
}

export interface ServiceOrderStatusHistoryDTO {
  id: string;
  serviceOrderId: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string | null;
  changedAt: string;
  note?: string | null;
}

export interface QuoteItemDTO {
  id: string;
  quoteId: string;
  type: "SERVICE" | "PART";
  referenceId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  total: string;
}

export interface QuoteApprovalDTO {
  id: string;
  quoteId: string;
  customerId: string;
  approvedAt: string;
  approvedItems: string[];
  signatureHash?: string | null;
}

export interface QuoteDTO {
  id: string;
  serviceOrderId: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  status: string;
  createdAt: string;
  items: QuoteItemDTO[];
  approvals: QuoteApprovalDTO[];
}

export interface DiagnosticItemDTO {
  id: string;
  description: string;
  severity?: string | null;
  recommendation?: string | null;
}

export interface DiagnosticDTO {
  id: string;
  serviceOrderId: string;
  summary?: string | null;
  createdAt: string;
  items: DiagnosticItemDTO[];
}

export interface ChecklistItemDTO {
  label: string;
  checked: boolean;
  note?: string;
}

export interface ChecklistDTO {
  id: string;
  serviceOrderId: string;
  templateName: string;
  items: ChecklistItemDTO[];
  completedBy?: string | null;
  completedAt?: string | null;
}

export interface MediaDTO {
  id: string;
  serviceOrderId?: string | null;
  vehicleId?: string | null;
  type: "PHOTO" | "VIDEO";
  stage: string;
  storageKey: string;
  mimeType: string;
  createdAt: string;
  url?: string;
}

export interface WorkSessionDTO {
  id: string;
  serviceOrderId: string;
  mechanicId: string;
  serviceId?: string | null;
  deviceId?: string | null;
  startAt: string;
  endAt?: string | null;
  durationSeconds?: number | null;
  mechanic?: MechanicDTO;
  service?: ServiceDTO;
}

export interface ServiceOrderDTO {
  id: string;
  number: number;
  customerId: string;
  vehicleId: string;
  status: string;
  mechanicId?: string | null;
  complaint?: string | null;
  publicToken: string;
  receivedAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: CustomerDTO;
  vehicle?: VehicleDTO;
  mechanic?: MechanicDTO | null;
  items?: ServiceOrderItemDTO[];
  statusHistory?: ServiceOrderStatusHistoryDTO[];
  quotes?: QuoteDTO[];
  diagnostics?: DiagnosticDTO[];
  checklists?: ChecklistDTO[];
  media?: MediaDTO[];
  workSessions?: WorkSessionDTO[];
}

export interface PartCategoryDTO {
  id: string;
  name: string;
}

export interface PartDTO {
  id: string;
  sku: string;
  name: string;
  categoryId?: string | null;
  category?: PartCategoryDTO | null;
  unitPrice: string;
  minStock: number;
  currentStock: number;
}

export interface SupplierDTO {
  id: string;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface StockMovementDTO {
  id: string;
  partId: string;
  type: string;
  quantity: number;
  serviceOrderId?: string | null;
  supplierId?: string | null;
  createdAt: string;
  part?: PartDTO;
  supplier?: SupplierDTO | null;
}

export interface PaymentDTO {
  id: string;
  serviceOrderId: string;
  method: string;
  amount: string;
  paidAt: string;
  installmentNumber?: number | null;
  installmentTotal?: number | null;
}

export interface AccountReceivableDTO {
  id: string;
  serviceOrderId: string;
  customerId: string;
  dueDate: string;
  amount: string;
  status: string;
  customer?: CustomerDTO;
}
