// Shared zod schemas: used by React Hook Form on the client AND re-validated on the server.
import { z } from "zod";

// Strip control characters and trim: basic input sanitisation for free text.
const clean = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim())
    .pipe(z.string().max(max));
const text = (max = 120) => clean(max);
const optText = (max = 500) => clean(max).optional().or(z.literal(""));
const id = z.coerce.number().int().positive();
const mobile = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().regex(/^[+\d][\d\s-]{7,16}$/, "Enter a valid mobile number"));

export const loginSchema = z.object({
  login: text(120).pipe(z.string().min(1, "Enter your login")),
  password: z.string().min(1, "Enter your password").max(200),
});

export const walkInSchema = z.object({
  name: optText(120),
  mobile,
  regNo: text(20).pipe(z.string().min(4, "Enter the registration number")),
  vehicleTypeId: id.optional(),
  brand: optText(60),
  model: optText(60),
  color: optText(30),
  serviceIds: z.array(id).min(1, "Select at least one service"),
  priority: z.enum(["normal", "priority", "vip"]).default("normal"),
  subscriptionId: id.optional().nullable(),
  notes: optText(500),
  notifyOptIn: z.boolean().optional(),
});

export const quoteSchema = z.object({
  partnerId: id.optional().nullable(),
  vehicleTypeId: id,
  serviceIds: z.array(id).min(1),
});

export const paymentSchema = z.object({
  amount: z.coerce.number().positive("Enter an amount"),
  method: z.enum(["cash", "upi", "card", "online"]),
  reference: optText(80),
});

export const jobActionSchema = z.object({
  action: z.enum([
    "assign", "unassign", "start", "pause", "resume", "finish", "qc_pass", "qc_fail",
    "ready", "deliver", "cancel", "payment", "refund", "invoice",
  ]),
  params: z
    .object({
      bay_id: id.optional(),
      employee_ids: z.array(id).optional(),
      notes: optText(500),
      reason: optText(300),
      amount: z.coerce.number().positive().optional(),
      method: z.enum(["cash", "upi", "card", "online"]).optional(),
      reference: optText(80),
    })
    .default({}),
});

export const inspectionSchema = z.object({
  kind: z.enum(["before", "after"]),
  damage_notes: optText(1000),
  customer_notes: optText(1000),
  accessories: optText(500),
  staff_confirmed: z.boolean().optional(),
  customer_confirmed: z.boolean().optional(),
  photo_front: z.string().max(4_000_000).optional(),
  photo_rear: z.string().max(4_000_000).optional(),
  photo_left: z.string().max(4_000_000).optional(),
  photo_right: z.string().max(4_000_000).optional(),
});

export const bookingSchema = z.object({
  partnerId: id.optional(),
  vehicleId: id,
  serviceIds: z.array(id).min(1, "Select at least one service"),
  slot: z.string().datetime({ message: "Choose a date and time" }),
  notes: optText(500),
});

export const bookingActionSchema = z.object({
  action: z.enum(["confirm", "arrive", "check_in", "cancel", "no_show"]),
  reason: optText(300),
});

export const packageSellSchema = z.object({
  partnerId: id,
  packageId: id,
  method: z.enum(["cash", "upi", "card", "online"]),
});

export const pricingSchema = z.object({
  cells: z
    .array(
      z.object({
        service_id: id,
        vehicle_type_id: id,
        customer_type: z.enum(["standard", "vip", "corporate", "membership"]).default("standard"),
        price: z.union([z.coerce.number().min(0).max(1_000_000), z.null()]),
      }),
    )
    .min(1)
    .max(500),
});

export const settingsSchema = z.object({
  warn_min: z.coerce.number().int().min(1).max(600).optional(),
  critical_min: z.coerce.number().int().min(1).max(600).optional(),
  open_hour: z.coerce.number().int().min(0).max(23).optional(),
  close_hour: z.coerce.number().int().min(1).max(24).optional(),
  tz: text(60).optional(),
  priority_mode: z.enum(["fifo", "priority"]).optional(),
  priority_order: text(80).optional(),
  auto_assign: z.enum(["0", "1"]).optional(),
});

export const feedbackSchema = z.object({
  jobId: id,
  rating: z.coerce.number().int().min(1).max(5),
  comment: optText(500),
});

export const profileSchema = z.object({
  name: text(120).pipe(z.string().min(1)),
  otm_cw_mobile: mobile.optional(),
  otm_cw_whatsapp: optText(20),
  email: z.string().email().max(120).optional().or(z.literal("")),
  street: optText(200),
  otm_cw_notify_opt_in: z.boolean().optional(),
  otm_cw_notify_channel: z.enum(["auto", "whatsapp", "telegram", "sms", "email", "all", "none"]).optional(),
});

const flag = z.enum(["0", "1"]);
export const notifySettingsSchema = z.object({
  shop_name: text(80).optional(),
  wa_enabled: flag.optional(), wa_phone_id: text(40).optional(), wa_lang: text(10).optional(), wa_country: text(4).optional(),
  wa_token: text(500).optional(), wa_token_clear: z.boolean().optional(),
  tg_enabled: flag.optional(), tg_token: text(200).optional(), tg_token_clear: z.boolean().optional(),
  sms_enabled: flag.optional(), sms_sid: text(80).optional(), sms_from: text(30).optional(),
  sms_token: text(200).optional(), sms_token_clear: z.boolean().optional(),
  email_enabled: flag.optional(),
  events: z.record(z.string().max(40), z.object({
    enabled: z.boolean().optional(), template: text(500).optional(), wa_template: text(100).optional(),
  })).optional(),
});
export const notifyTestSchema = z.object({ channel: z.enum(["whatsapp", "telegram", "sms", "email"]), to: text(120).pipe(z.string().min(3)) });
export const notifyJobSchema = z.object({
  event: z.enum(["vehicle_assigned", "wash_started", "vehicle_ready", "delivered"]),
  channels: z.array(z.enum(["whatsapp", "telegram", "sms", "email"])).max(4).optional(),
});

/** Generic resource payload: a flat bag of primitives / id arrays, filtered again by Odoo's whitelist. */
export const resourceValuesSchema = z
  .record(
    z.string().max(60),
    z.union([
      z.string().max(2000).transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim()),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(z.coerce.number().int()).max(200),
      z.array(z.object({ service_id: z.coerce.number().int(), qty: z.coerce.number().int().min(1).max(100) })).max(50),
    ]),
  )
  .refine((o) => Object.keys(o).length <= 40);
