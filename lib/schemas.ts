import { z } from "zod";

export const transactionInputSchema = z.object({
  description: z.string().trim().min(1, "Informe uma descrição").max(120),
  amount: z
    .number({ invalid_type_error: "Valor inválido" })
    .positive("O valor deve ser maior que zero")
    .max(99_999_999, "Valor muito alto"),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().trim().min(1, "Selecione uma categoria").max(60),
  date: z.string().min(1),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;
