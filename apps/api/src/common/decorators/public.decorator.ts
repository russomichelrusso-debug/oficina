import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Marca um endpoint como acessível sem autenticação (ex.: login). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
