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

export interface DashboardSummaryDTO {
  totalCustomers: number;
  totalVehicles: number;
  activeUsers: number;
}
