import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RoleName } from "@oficina/types";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { AuthenticatedUser } from "../types/authenticated-user";

/**
 * Guard de RBAC: valida se o usuário autenticado possui ao menos um dos
 * papéis exigidos pelo decorator @Roles(...) do endpoint. Endpoints sem
 * @Roles são liberados para qualquer usuário autenticado.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    if (!user) throw new ForbiddenException("Usuário não autenticado");

    // ADMIN tem acesso total por definição (spec §3).
    if (user.roles?.includes(RoleName.ADMIN)) return true;

    const hasRole = user.roles?.some((role) => requiredRoles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException(
        `Acesso negado: exige um dos papéis [${requiredRoles.join(", ")}]`,
      );
    }
    return true;
  }
}
