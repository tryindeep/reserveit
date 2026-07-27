import { db } from "@repo/db";

export const ClientService = {
  getClientByUserId: async (userId: string) => db.client.findUnique({
    where: { userId },
    include: { user: { select: { id: true, email: true, name: true, phone: true } } },
  }),
  getTheatersByUserId: async (userId: string) => {
    const client = await db.client.findUnique({ where: { userId }, select: { id: true } });
    if (!client) return [];
    return db.theater.findMany({ where: { clientId: client.id }, include: { screens: true }, orderBy: { createdAt: "desc" } });
  },
  // List clients awaiting approval
  getPendingClients: async () => {
    return db.client.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { id: true, email: true, name: true, phone: true, createdAt: true } } },
      orderBy: { createdAt: "asc" },
    });
  },

  // Get a single client (detail view before approving)
  getClientById: async (id: string) => {
    return db.client.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, name: true, phone: true } } },
    });
  },

  // Approve or reject a pending client
  updateClientStatus: async (
    clientId: string,
    adminId: string,
    data: { status: "APPROVED" | "REJECTED"; rejectionReason?: string }
  ) => {
    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) return { error: "CLIENT_NOT_FOUND" as const };
    if (client.status !== "PENDING") return { error: "ALREADY_PROCESSED" as const };

    const updated = await db.client.update({
      where: { id: clientId },
      data: {
        status: data.status,
        approvedBy: data.status === "APPROVED" ? adminId : null,
        approvedAt: data.status === "APPROVED" ? new Date() : null,
        rejectionReason: data.status === "REJECTED" ? data.rejectionReason : null,
      },
    });
    return { data: updated };
  },
};
