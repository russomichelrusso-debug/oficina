import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as argon2 from "argon2";
import { eq, inArray } from "drizzle-orm";
import * as schema from "@oficina/database";
import { DatabaseService } from "../database/database.service";
import { RoleName } from "@oficina/types";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  private toDTO(user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    active: boolean;
    createdAt: Date;
    userRoles: { role: { name: string } }[];
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      active: user.active,
      roles: user.userRoles.map((ur) => ur.role.name),
      createdAt: user.createdAt,
    };
  }

  async findAll() {
    const users = await this.db.query.users.findMany({
      with: { userRoles: { with: { role: true } } },
      orderBy: (u, { desc }) => [desc(u.createdAt)],
    });
    return users.map((u) => this.toDTO(u));
  }

  async findOne(id: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, id),
      with: { userRoles: { with: { role: true } } },
    });
    if (!user) throw new NotFoundException("Usuário não encontrado");
    return this.toDTO(user);
  }

  async create(dto: CreateUserDto) {
    const existing = await this.db.query.users.findFirst({
      where: eq(schema.users.email, dto.email),
    });
    if (existing) throw new ConflictException("Já existe um usuário com este e-mail");

    const passwordHash = await argon2.hash(dto.password);
    const roles = await this.resolveRoles(dto.roles);

    const [user] = await this.db
      .insert(schema.users)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        name: dto.name,
        email: dto.email,
        passwordHash,
        phone: dto.phone,
        active: dto.active ?? true,
      })
      .returning();

    if (roles.length > 0) {
      await this.db
        .insert(schema.userRoles)
        .values(roles.map((role) => ({ userId: user.id, roleId: role.id })));
    }

    return this.findOne(user.id);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    if (dto.roles) {
      const roles = await this.resolveRoles(dto.roles);
      await this.db.delete(schema.userRoles).where(eq(schema.userRoles.userId, id));
      if (roles.length > 0) {
        await this.db
          .insert(schema.userRoles)
          .values(roles.map((role) => ({ userId: id, roleId: role.id })));
      }
    }

    await this.db
      .update(schema.users)
      .set({
        name: dto.name,
        phone: dto.phone,
        active: dto.active,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id));

    return this.findOne(id);
  }

  async deactivate(id: string) {
    await this.findOne(id);
    await this.db.update(schema.users).set({ active: false }).where(eq(schema.users.id, id));
    return this.findOne(id);
  }

  private async resolveRoles(names: RoleName[]) {
    if (!names?.length) return [];
    return this.db.select().from(schema.roles).where(inArray(schema.roles.name, names));
  }
}
