import { prisma } from "../../../config/prisma.js";
import { AuthRequest } from "../../../middlewares/auth.middleware.js";

export interface AuditLogInput {
  actorId: number;
  actorName: string;
  action: string; // e.g., "CREATE_SHOP", "UPDATE_SUBSCRIPTION_PLAN"
  targetType: string; // e.g., "Shop", "Subscription"
  targetId: number;
  details?: Record<string, any>;
}

/**
 * Log an action to the AuditLog table
 */
export const logAuditAction = async (input: AuditLogInput) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        actorName: input.actorName,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        details: input.details || undefined,
      },
    });
  } catch (error) {
    console.error("Error logging audit action:", error);
    // Don't throw — audit logging is non-critical
  }
};

/**
 * Helper to extract super-admin info from request
 */
export const getAuditActor = (req: AuthRequest) => {
  return {
    actorId: req.user?.userId || 0,
    actorName: req.user?.email || "Unknown",
  };
};
