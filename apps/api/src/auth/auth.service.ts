import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { eq } from "drizzle-orm";
import * as schema from "@oficina/database";
import { DatabaseService } from "../database/database.service";
import { LoginAttemptsService } from "./login-attempts.service";
import type { LoginResponseDTO, RoleName } from "@oficina/types";
import type { AuthenticatedUser } from "../common/types/authenticated-user";

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly loginAttempts: LoginAttemptsService,
  ) {}

  async login(email: string, password: string): Promise<LoginResponseDTO> {
    if (this.loginAttempts.isLocked(email)) {
      throw new ForbiddenException(
        "Muitas tentativas inválidas. Tente novamente em alguns minutos.",
      );
    }

    const user = await this.database.db.query.users.findFirst({
      where: eq(schema.users.email, email),
      with: { userRoles: { with: { role: true } } },
    });

    const passwordValid = user ? await argon2.verify(user.passwordHash, password) : false;

    if (!user || !user.active || !passwordValid) {
      this.loginAttempts.registerFailure(email);
      throw new UnauthorizedException("E-mail ou senha inválidos");
    }

    this.loginAttempts.reset(email);

    const roles = user.userRoles.map((ur) => ur.role.name) as RoleName[];
    const payload: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles,
    };

    const { accessToken, refreshToken } = await this.issueTokens(payload);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, roles },
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      const accessToken = await this.jwtService.signAsync(
        { id: payload.id, email: payload.email, tenantId: payload.tenantId, roles: payload.roles },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m" },
      );
      return { accessToken };
    } catch {
      throw new UnauthorizedException("Refresh token inválido ou expirado");
    }
  }

  private async issueTokens(payload: AuthenticatedUser) {
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
    });
    return { accessToken, refreshToken };
  }
}
