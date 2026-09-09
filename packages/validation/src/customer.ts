import { z } from "zod";

// Validação de formato (11 ou 14 dígitos). O cálculo de dígito verificador
// de CPF/CNPJ pode ser adicionado depois sem mudar o contrato do schema.
const documentRegex = /^\d{11}(\d{3})?$/;

export const createCustomerSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  document: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => documentRegex.test(v), "Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos")
    .optional(),
  phone: z.string().min(8).optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
