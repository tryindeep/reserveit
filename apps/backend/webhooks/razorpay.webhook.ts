import type { Request , Response } from "express";
import crypto from "crypto"
import { PaymentService } from "../services/payment.service";

export const handleRazorpayWebHook = async (req : Request , res : Response) => {
    const signature = req.headers["x-razorpay-signature"] as string;

    const expected = crypto.createHmac("sha256" , process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(req.body)
    .digest("hex");

    if(signature !== expected) return res.status(400).send("Invalid signature");
    
    // RAZOR PAY CHECK
    const event = JSON.parse(req.body.toString());
    if(event.event === "payment.captured") {
        const payment = event.payload.payment.entity;
        await PaymentService.confirmFromWebhook(payment.order_id, payment.id);
    }
    return res.status(200).send("OK!")
};