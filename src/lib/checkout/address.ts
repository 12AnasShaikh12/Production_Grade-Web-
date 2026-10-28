import { z } from "zod";

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`)
    .refine((v) => !/[<>]/.test(v), `${label} contains unsupported characters.`);

/** Indian mobile numbers: 10 digits starting 6–9, optional +91 / 0 prefix and spacing. */
export const indianMobile = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|0091|91(?=\d{10}$)|0(?=\d{10}$))/, ""))
  .refine((v) => /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit Indian mobile number.");

export const addressSchema = z.object({
  fullName: text("Full name", 2, 80),
  phone: indianMobile,
  email: z.email("Enter a valid email address.").max(120),
  line1: text("Address line 1", 3, 120),
  line2: z.string().trim().max(120).optional().default(""),
  landmark: z.string().trim().max(80).optional().default(""),
  city: text("City", 2, 60),
  state: z.enum(INDIAN_STATES, { error: "Select your state or union territory." }),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code."),
});

export type Address = z.infer<typeof addressSchema>;
export type AddressInput = z.input<typeof addressSchema>;
