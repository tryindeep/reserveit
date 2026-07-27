import type { Request, Response } from "express";
import crypto from "crypto";
import { PaymentService } from "../services/payment.service";

export const handleRazorpayWebHook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    if (typeof signature !== "string" || !Buffer.isBuffer(req.body)) return res.status(400).send("Invalid webhook payload");
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!).update(req.body).digest("hex");
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);
    if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) return res.status(400).send("Invalid signature");

    const event = JSON.parse(req.body.toString());
    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (!payment?.order_id || !payment?.id) return res.status(400).send("Invalid payment event");
      const result = await PaymentService.confirmFromWebhook(payment.order_id, payment.id);
      if ("error" in result) throw new Error(result.error);
    }
    return res.status(200).send("OK!");
  } catch (error) {
    console.error("Failed to process Razorpay webhook:", error);
    return res.status(500).send("Webhook processing failed");
  }
};
