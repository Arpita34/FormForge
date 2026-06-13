import { z } from "zod";

export const MagicLinkSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type MagicLinkInput = z.infer<typeof MagicLinkSchema>;
