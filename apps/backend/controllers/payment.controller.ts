import type { RequestHandler } from "express";
import { sendError, sendSuccess } from "../utils/responseBody";
import { PaymentService } from "../services/payment.service";
import { handleServiceError } from "../utils/errorMap";
import { asyncHandler } from "../utils/asyncHandler";
import { verifyPaymentSchema } from "../validators/payment.validator";

type PaymentControllerType = {
  createOrder: RequestHandler;
  verifyPayment: RequestHandler;
};
export const PaymentController: PaymentControllerType = {
  createOrder: asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (typeof id !== "string" || !id.trim())
      return sendError(res, 400, "Invalid Booking Id!");
    const result = await PaymentService.createOrder(id, req.user!.userId);
    if ("error" in result)
      return handleServiceError(res, result.error ?? "Unknown Error");
    return sendSuccess(res, 201, result.data, "Order Created!");
  }),
  verifyPayment: asyncHandler(async (req, res) => {
    const parsed = verifyPaymentSchema.safeParse(req.body);
    if (!parsed.success)
      return sendError(res, 400, "Invalid Input", parsed.error.issues);
    const isValid = PaymentService.verifySignature(
      parsed.data.razorpay_order_id,
      parsed.data.razorpay_payment_id,
      parsed.data.razorpay_signature,
    );
    if (!isValid) return sendError(res, 400, "Invalid payment signature");
    const result = await PaymentService.confirmAfterSignature(
      parsed.data.razorpay_order_id,
      parsed.data.razorpay_payment_id,
      req.user!.userId,
    );
    if ("error" in result)
      return handleServiceError(res, result.error ?? "Unknown Error");
    return sendSuccess(
      res,
      200,
      result.data,
      "Payment verified and booking confirmed",
    );
  }),
};
