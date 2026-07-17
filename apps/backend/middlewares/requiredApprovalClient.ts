import type { Request, Response, NextFunction } from "express";
import { db } from "@repo/db";
import { sendError } from "../utils/responseBody";

export const requireApprovedClient = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return sendError(res, 401, "Not authenticated");
  const client = await db.client.findUnique({ where: { userId: req.user.userId } });
  if (!client) return sendError(res, 404, "Client profile not found");
  if (client.status !== "APPROVED") return sendError(res, 403, `Your client account is ${client.status.toLowerCase()}`);
  req.client = client;
  next();
};