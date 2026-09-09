import { RoleName } from "@oficina/types";

export interface AuthenticatedUser {
  id: string;
  email: string;
  tenantId: string;
  roles: RoleName[];
}
