import z from "zod";

export const updateClientStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().min(1).optional(),
}).refine(
  (data) => data.status !== "REJECTED" || !!data.rejectionReason,
  { message: "rejectionReason is required when status is REJECTED", path: ["rejectionReason"] }
);