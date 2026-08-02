import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import Certificate, { type ICertificate } from "../models/Certificate.model";
import { AppError } from "../errors/AppError";
import type {
  ListCertificatesQuery,
  CertificateListResult,
} from "../types/certificate.types";

/** Escape user input so it can be safely embedded in a MongoDB `$regex`. */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class CertificateService {
  async listCertificates(query: ListCertificatesQuery): Promise<CertificateListResult> {
    const { creatorId, search, limit, skip } = query;

    if (creatorId && !mongoose.Types.ObjectId.isValid(creatorId)) {
      throw new AppError(
        "creatorId must be a valid MongoDB ObjectId",
        StatusCodes.BAD_REQUEST,
        "INVALID_CREATOR_ID"
      );
    }

    if (limit < 1 || limit > 100) {
      throw new AppError(
        "limit must be between 1 and 100",
        StatusCodes.BAD_REQUEST,
        "INVALID_PAGINATION"
      );
    }

    if (skip < 0) {
      throw new AppError(
        "skip must be a non-negative integer",
        StatusCodes.BAD_REQUEST,
        "INVALID_PAGINATION"
      );
    }

    const conditions: Record<string, unknown>[] = [];

    // Per-owner listing when creatorId is supplied; otherwise the query
    // targets the public global certificate index.
    if (creatorId) {
      conditions.push({ creatorId: new mongoose.Types.ObjectId(creatorId) });
    }

    // Full-text-ish search across the on-chain identifiers of a certificate.
    if (search) {
      const matcher = { $regex: escapeRegex(search), $options: "i" };
      conditions.push({
        $or: [
          { certificateId: matcher },
          { transactionHash: matcher },
          { contractAddress: matcher },
        ],
      });
    }

    const filter = conditions.length > 0 ? { $and: conditions } : {};

    const [certificates, total] = await Promise.all([
      Certificate.find(filter)
        // Populate the linked asset + manifest so the frontend can render
        // human-readable names/descriptions without extra round-trips.
        .populate("assetId", "fileName mimeType storageReferenceId")
        .populate("manifestId", "contentHash creator metadata")
        .sort({ mintedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<Record<string, unknown>[]>(),
      Certificate.countDocuments(filter),
    ]);

    return { certificates, total, limit, skip };
  }

  async getCertificateById(id: string): Promise<ICertificate | null> {
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { certificateId: id }] }
      : { certificateId: id };

    return Certificate.findOne(query)
      .populate("manifestId")
      .populate("assetId")
      .exec();
  }
}

export const certificateService = new CertificateService();
