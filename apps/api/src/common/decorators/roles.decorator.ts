import { SetMetadata } from "@nestjs/common";
import { RoleName } from "@oficina/types";

export const ROLES_KEY = "roles";

/** Restringe o endpoint aos papéis informados. Ver spec §3 (RBAC). */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
