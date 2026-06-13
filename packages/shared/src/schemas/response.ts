import { z } from "zod";

export const SubmitResponseSchema = z.object({
  answers: z
    .record(z.string(), z.union([z.string(), z.number()]))
    .refine((val) => JSON.stringify(val).length <= 50_000, {
      message: "Response payload too large (max 50kb)",
    }),
});
export type SubmitResponseInput = z.infer<typeof SubmitResponseSchema>;
