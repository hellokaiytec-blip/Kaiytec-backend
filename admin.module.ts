// apps/api/src/modules/admin/admin.service.ts
import { pool } from "../../config/database";
import { ApiError } from "../../utils/ApiError";
import { NotificationsService } from "../notifications/notifications.service";

const notifService = new NotificationsService();

export class AdminService {
  // ─── Platform Stats ─────────────────────────────────────────────────────────
  async getPlatformStats() {
    const result = await pool.query("SELECT * FROM platform_stats");
    return result.rows[0];
  }

  // ─── Approve or Reject Seller ───────────────────────────────────────────────
  async reviewSeller(seller_id: string, action: "approve" | "reject", admin_id: string, reason?: string) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const sellerResult = await client.query(
        "SELECT s.*, u.id as user_id FROM sellers s JOIN users u ON u.id = s.user_id WHERE s.id = $1",
        [seller_id]
      );

      if (!sellerResult.rows[0]) throw new ApiError(404, "NOT_FOUND", "Seller not found");
      const seller = sellerResult.rows[0];

      if (seller.approval_status !== "pending") {
        throw new ApiError(400, "INVALID_STATE", "This application has already been reviewed");
      }

      const newStatus = action === "approve" ? "approved" : "rejected";

      await client.query(`
        UPDATE sellers
        SET approval_status = $1, approved_by = $2, approved_at = NOW(),
            rejection_reason = $3, updated_at = NOW()
        WHERE id = $4
      `, [newStatus, admin_id, reason || null, seller_id]);

      // Log admin action
      await client.query(`
        INSERT INTO admin_actions (admin_id, action, target_type, target_id, notes)
        VALUES ($1, $2, 'seller', $3, $4)
      `, [admin_id, action === "approve" ? "APPROVE_SELLER" : "REJECT_SELLER", seller_id, reason]);

      // Send notification to seller
      const notifTitle = action === "approve"
        ? "🎉 Seller Application Approved!"
        : "❌ Seller Application Not Approved";
      const notifBody = action === "approve"
        ? "Congratulations! Your seller account is now active. Start adding your products!"
        : `Your application was not approved. Reason: ${reason || "Please contact support."}`;

      await notifService.create({
        user_id: seller.user_id,
        type: action === "approve" ? "account_approved" : "account_rejected",
        title: notifTitle,
        body: notifBody,
        data: { seller_id },
      });

      await client.query("COMMIT");
      return { status: newStatus, seller_id };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // ─── Approve or Reject Provider ─────────────────────────────────────────────
  async reviewProvider(provider_id: string, action: "approve" | "reject", admin_id: string, reason?: string) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const providerResult = await client.query(
        "SELECT sp.*, u.id as user_id FROM service_providers sp JOIN users u ON u.id = sp.user_id WHERE sp.id = $1",
        [provider_id]
      );

      if (!providerResult.rows[0]) throw new ApiError(404, "NOT_FOUND", "Provider not found");
      const provider = providerResult.rows[0];

      if (provider.approval_status !== "pending") {
        throw new ApiError(400, "INVALID_STATE", "This application has already been reviewed");
      }

      const newStatus = action === "approve" ? "approved" : "rejected";

      await client.query(`
        UPDATE service_providers
        SET approval_status = $1, approved_by = $2, approved_at = NOW(),
            rejection_reason = $3, updated_at = NOW()
        WHERE id = $4
      `, [newStatus, admin_id, reason || null, provider_id]);

      await client.query(`
        INSERT INTO admin_actions (admin_id, action, target_type, target_id, notes)
        VALUES ($1, $2, 'provider', $3, $4)
      `, [admin_id, action === "approve" ? "APPROVE_PROVIDER" : "REJECT_PROVIDER", provider_id, reason]);

      await notifService.create({
        user_id: provider.user_id,
        type: action === "approve" ? "account_approved" : "account_rejected",
        title: action === "approve" ? "🎉 Provider Application Approved!" : "❌ Application Not Approved",
        body: action === "approve"
          ? "Your provider profile is now live. Clients can find you on Kaiytec!"
          : `Your application was not approved. Reason: ${reason || "Please contact support."}`,
        data: { provider_id },
      });

      await client.query("COMMIT");
      return { status: newStatus, provider_id };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // ─── Get Pending Seller Applications ───────────────────────────────────────
  async getPendingSellers(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const result = await pool.query(`
      SELECT
        s.id, s.business_name, s.business_address, s.business_category,
        s.description, s.government_id_url, s.passport_photo_url,
        s.created_at,
        u.full_name, u.phone, u.email
      FROM sellers s
      JOIN users u ON u.id = s.user_id
      WHERE s.approval_status = 'pending'
      ORDER BY s.created_at ASC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM sellers WHERE approval_status = 'pending'"
    );

    return {
      sellers: result.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }

  // ─── Get All Users (paginated + filterable) ────────────────────────────────
  async getUsers({ page = 1, limit = 20, role, search }: {
    page?: number; limit?: number; role?: string; search?: string;
  }) {
    const offset = (page - 1) * limit;
    const params: any[] = [];
    const conditions: string[] = [];

    if (role) {
      params.push(role);
      conditions.push(`u.role = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.full_name ILIKE $${params.length} OR u.phone ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    params.push(limit, offset);

    const result = await pool.query(`
      SELECT u.id, u.full_name, u.phone, u.email, u.role, u.is_active,
             u.is_verified, u.created_at,
             COALESCE(s.approval_status, sp.approval_status) as approval_status
      FROM users u
      LEFT JOIN sellers s ON s.user_id = u.id
      LEFT JOIN service_providers sp ON sp.user_id = u.id
      ${where}
      ORDER BY u.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users u ${where}`,
      params.slice(0, params.length - 2)
    );

    return {
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }

  // ─── Deactivate User ────────────────────────────────────────────────────────
  async deactivateUser(user_id: string, admin_id: string) {
    await pool.query(
      "UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1",
      [user_id]
    );

    await pool.query(
      "INSERT INTO admin_actions (admin_id, action, target_type, target_id) VALUES ($1, 'DEACTIVATE_USER', 'user', $2)",
      [admin_id, user_id]
    );
  }

  // ─── Remove Product ─────────────────────────────────────────────────────────
  async removeProduct(product_id: string, admin_id: string) {
    await pool.query(
      "UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1",
      [product_id]
    );

    await pool.query(
      "INSERT INTO admin_actions (admin_id, action, target_type, target_id) VALUES ($1, 'REMOVE_PRODUCT', 'product', $2)",
      [admin_id, product_id]
    );
  }

  // ─── Get Open Reports ───────────────────────────────────────────────────────
  async getReports(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const result = await pool.query(`
      SELECT r.*, reporter.full_name as reporter_name,
             p.name as product_name, s.business_name, sp.service_title
      FROM reports r
      JOIN users reporter ON reporter.id = r.reporter_id
      LEFT JOIN products p ON p.id = r.product_id
      LEFT JOIN sellers s ON s.id = r.seller_id
      LEFT JOIN service_providers sp ON sp.id = r.provider_id
      WHERE r.is_resolved = FALSE
      ORDER BY r.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return result.rows;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// apps/api/src/modules/admin/admin.routes.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Request, Response, NextFunction } from "express";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth.middleware";
import { ApiResponse } from "../../utils/ApiResponse";
import { rateLimit } from "express-rate-limit";

const router = Router();
const adminService = new AdminService();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(requireRole("admin"));

// Extra rate limiting for admin routes
const adminLimiter = rateLimit({ windowMs: 60_000, max: 500 });
router.use(adminLimiter);

router.get("/stats", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await adminService.getPlatformStats();
    ApiResponse.success(res, stats);
  } catch (err) { next(err); }
});

router.get("/users", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit, role, search } = req.query;
    const result = await adminService.getUsers({
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      role: role as string,
      search: search as string,
    });
    ApiResponse.paginated(res, result.users, parseInt(page as string) || 1, parseInt(limit as string) || 20, result.total);
  } catch (err) { next(err); }
});

router.patch("/users/:id/deactivate", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await adminService.deactivateUser(req.params.id, req.user!.id);
    ApiResponse.success(res, null, "User deactivated");
  } catch (err) { next(err); }
});

router.get("/sellers/pending", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await adminService.getPendingSellers(
      parseInt(req.query.page as string) || 1
    );
    ApiResponse.success(res, result);
  } catch (err) { next(err); }
});

router.post("/sellers/:id/approve", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await adminService.reviewSeller(req.params.id, "approve", req.user!.id);
    ApiResponse.success(res, result, "Seller approved successfully");
  } catch (err) { next(err); }
});

router.post("/sellers/:id/reject", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    const result = await adminService.reviewSeller(req.params.id, "reject", req.user!.id, reason);
    ApiResponse.success(res, result, "Seller application rejected");
  } catch (err) { next(err); }
});

router.post("/providers/:id/approve", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await adminService.reviewProvider(req.params.id, "approve", req.user!.id);
    ApiResponse.success(res, result, "Provider approved successfully");
  } catch (err) { next(err); }
});

router.post("/providers/:id/reject", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    const result = await adminService.reviewProvider(req.params.id, "reject", req.user!.id, reason);
    ApiResponse.success(res, result, "Provider application rejected");
  } catch (err) { next(err); }
});

router.delete("/products/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await adminService.removeProduct(req.params.id, req.user!.id);
    ApiResponse.success(res, null, "Product removed");
  } catch (err) { next(err); }
});

router.get("/reports", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reports = await adminService.getReports();
    ApiResponse.success(res, { reports });
  } catch (err) { next(err); }
});

export default router;
