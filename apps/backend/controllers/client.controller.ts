import type { RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendError, sendSuccess } from "../utils/responseBody";
import { handleServiceError } from "../utils/errorMap";
import { ClientService } from "../services/client.service";
import { updateClientStatusSchema } from "../validators/client.validator";

type ClientControllerType = {
  getPendingClients: RequestHandler;
  getClientById: RequestHandler;
  updateClientStatus: RequestHandler;
  getMyClient: RequestHandler;
  getMyTheaters: RequestHandler;
};

export const ClientController: ClientControllerType = {
  getMyClient: asyncHandler(async (req, res) => {
    const client = await ClientService.getClientByUserId(req.user!.userId);
    if (!client) return sendError(res, 404, "Client profile not found");
    return sendSuccess(res, 200, client);
  }),
  getMyTheaters: asyncHandler(async (req, res) => {
    const theaters = await ClientService.getTheatersByUserId(req.user!.userId);
    return sendSuccess(res, 200, theaters);
  }),
  getPendingClients: asyncHandler(async (req, res) => {
    const clients = await ClientService.getPendingClients();
    return sendSuccess(res, 200, clients);
  }),

  getClientById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (typeof id !== "string" || !id.trim()) return sendError(res, 400, "Invalid Client Id");
    const client = await ClientService.getClientById(id);
    if (!client) return sendError(res, 404, "Client not found");
    return sendSuccess(res, 200, client);
  }),

  updateClientStatus: asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (typeof id !== "string" || !id.trim()) return sendError(res, 400, "Invalid Client Id");

    const parsed = updateClientStatusSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, "Invalid Input", parsed.error.issues);

    const result = await ClientService.updateClientStatus(id, req.user!.userId, parsed.data);
    if ("error" in result) return handleServiceError(res, result.error ?? "Unknown Error");

    return sendSuccess(res, 200, result.data, `Client ${parsed.data.status.toLowerCase()}`);
  }),
};
