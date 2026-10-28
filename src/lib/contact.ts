import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  email: z.email("Enter a valid email address.").max(120),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+\d\s-]*$/, "Use digits, spaces, + or - only.")
    .optional()
    .default(""),
  message: z.string().trim().min(10, "Please write at least 10 characters.").max(2000, "Please keep messages under 2000 characters."),
  /** Honeypot — real visitors never fill this hidden field. */
  website: z.string().max(0).optional().default(""),
});

export type ContactInput = z.infer<typeof contactSchema>;
