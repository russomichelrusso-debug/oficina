import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { AuthenticatedUser } from "../types/authenticated-user";

/**
 * Guard global: exige um access token JWT válido, exceto em rotas marcadas
 * com @Public() (ex.: /auth/login, /auth/refresh).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException("Token de acesso não informado");
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Token de acesso inválido ou expirado");
    }
  }

  private extractToken(request: any): string | undefined {
    const authHeader: string | undefined = request.headers?.authorization;
    if (!authHeader) return undefined;
    const [type, token] = authHeader.split(" ");
    return type === "Bearer" ? token : undefined;
  }
}
