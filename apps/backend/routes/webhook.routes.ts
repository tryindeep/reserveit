import { Router } from "express";
import express from "express";
import { handleRazorpayWebHook } from "../webhooks/razorpay.webhook";

export const webhookRouter = Router();

webhookRouter.post("/razorpay" , express.raw({
    type:"application/json"
}) , handleRazorpayWebHook)