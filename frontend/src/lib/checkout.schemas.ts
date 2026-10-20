import { z } from "zod";

export const providerSchema = z.enum(["stripe", "paypal", "razorpay", "crypto"]);

export const checkoutSchema = z.object({
  offerId: z.number().int().positive(),
  optionId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(10).default(1),
  inputs: z.record(z.string().max(40), z.string().max(200)).default({}),
  provider: providerSchema,
});
export type CheckoutInput = z.input<typeof checkoutSchema>;

export const settingsSchema = z.object({
  site_name: z.string().trim().min(1).max(60),
  support_email: z.string().trim().max(120),
  auto_complete_hours: z.number().int().min(1).max(720),
  payment_methods: z.object({ stripe: z.boolean(), paypal: z.boolean(), razorpay: z.boolean(), crypto: z.boolean() }),
});

export const orderActionSchema = z.object({
  orderId: z.number().int().positive(),
  action: z.enum(["refund", "release", "cancel", "deliver"]),
  note: z.string().trim().max(4000).default(""),
});
