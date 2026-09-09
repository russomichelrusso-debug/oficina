import { z } from "zod";

export const createVehicleSchema = z.object({
  customerId: z.string().uuid("Cliente inválido"),
  plate: z
    .string()
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .refine((v) => v.length === 7, "Placa deve ter 7 caracteres (Mercosul ou antiga)"),
  brand: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1950).max(new Date().getFullYear() + 1).optional(),
  color: z.string().optional(),
  mileageKm: z.number().int().nonnegative().optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = createVehicleSchema.partial().omit({ customerId: true });
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
