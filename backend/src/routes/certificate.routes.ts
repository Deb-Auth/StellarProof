/**
 * Certificate Routes – request validation schemas and route definitions.
 *
 * Endpoints:
 *   GET /api/v1/certificates?creatorId=<ObjectId>&search=<term>&limit=20&skip=0
 *     Returns a paginated list of certificates. `creatorId` narrows the list
 *     to a single owner; when omitted the endpoint exposes the public global
 *     certificate index. `search` matches the on-chain certificateId,
 *     transactionHash and contractAddress (case-insensitive).
 *
 * All Zod schemas are co-located with the routes that use them.
 */
import { Router } from "express";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { certificateController } from "../controllers/certificate.controller";

// ---------------------------------------------------------------------------
// Zod schema – query parameters for the certificate list endpoint.
// Exported so the validation contract can be unit-tested directly.
// ---------------------------------------------------------------------------
export const listCertificatesQuerySchema = z.object({
  creatorId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "creatorId must be a valid MongoDB ObjectId")
    .optional(),
  search: z
    .string()
    .trim()
    .max(256, "search must be at most 256 characters")
    .optional(),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform(Number)
    .pipe(
      z
        .number()
        .int("limit must be an integer")
        .min(1, "limit must be at least 1")
        .max(100, "limit must be at most 100")
    ),
  skip: z
    .string()
    .optional()
    .default("0")
    .transform(Number)
    .pipe(
      z
        .number()
        .int("skip must be an integer")
        .min(0, "skip must be a non-negative integer")
    ),
});

// ---------------------------------------------------------------------------
// Query validation middleware
// ---------------------------------------------------------------------------
function validateListCertificatesQuery(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = listCertificatesQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: "Invalid query parameters",
      details: result.error.flatten().fieldErrors,
    });
    return;
  }
  req.query = result.data as unknown as typeof req.query;
  next();
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const router = Router();

/**
 * GET /api/v1/certificates?creatorId=<ObjectId>&search=<term>&limit=20&skip=0
 *
 * Query parameters:
 *   - creatorId  (optional) – MongoDB ObjectId of the certificate owner. When
 *                omitted, the public global certificate index is returned.
 *   - search     (optional, ≤256 chars) – matches certificateId, transactionHash
 *                and contractAddress (case-insensitive).
 *   - limit      (optional, 1–100, default 20) – page size.
 *   - skip       (optional, ≥0, default 0)     – offset for pagination.
 *
 * Response 200:
 * {
 *   "success": true,
 *   "data": {
 *     "certificates": [ ...ICertificate ],
 *     "total": 42,
 *     "limit": 20,
 *     "skip": 0
 *   }
 * }
 */
router.get(
  "/",
  validateListCertificatesQuery,
  certificateController.listCertificates.bind(certificateController)
);

export default router;
