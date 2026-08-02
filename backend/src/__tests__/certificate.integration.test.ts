/**
 * Integration test — GET /api/v1/certificates
 *
 * Mounts the real certificate router through Express and drives it with
 * supertest. Only the Certificate Mongoose model is mocked, so the route
 * validation and controller → service path behave exactly as in production.
 */
import request from "supertest";
import express from "express";
import certificateRoutes from "../routes/certificate.routes";
import { globalErrorHandler } from "../middlewares/errorHandler";
import Certificate from "../models/Certificate.model";

jest.mock("../models/Certificate.model");

const CertificateMock = Certificate as unknown as {
  find: jest.Mock;
  countDocuments: jest.Mock;
};

function mockQueryChain(docs: unknown[], total: number) {
  const lean = jest.fn().mockResolvedValue(docs);
  const limit = jest.fn().mockReturnValue({ lean });
  const skip = jest.fn().mockReturnValue({ limit });
  const sort = jest.fn().mockReturnValue({ skip });
  const populateManifest = jest.fn().mockReturnValue({ sort });
  const populateAsset = jest.fn().mockReturnValue({ populate: populateManifest });
  CertificateMock.find.mockReturnValue({ populate: populateAsset });
  CertificateMock.countDocuments.mockResolvedValue(total);
}

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/certificates", certificateRoutes);
  app.use(globalErrorHandler);
  return app;
}

const sampleDoc = {
  _id: "665f1e2b3f4a5b6c7d8e9f01",
  certificateId: "cert-onchain-0001",
  transactionHash: "deadbeefcafe0011",
  contractAddress: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
  stellarNetwork: "testnet",
  mintedAt: new Date("2026-07-10T09:30:00.000Z"),
  assetId: {
    fileName: "Aurora — Limited Edition Album",
    mimeType: "audio/mpeg",
  },
  manifestId: {
    contentHash: "0xa1b2c3d4e5f6",
    creator: "GBVBK2TX7QHEQNIMUPBVPZ7EONL52TWKQ7OXFDJPAJPYGNZFACUQBXP",
    metadata: { description: "Limited release album verified on-chain" },
  },
};

describe("GET /api/v1/certificates", () => {
  const app = buildTestApp();

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryChain([sampleDoc], 1);
  });

  it("serves the public global index without a creatorId", async () => {
    const res = await request(app).get("/api/v1/certificates");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.certificates[0].certificateId).toBe("cert-onchain-0001");
    // Global mode: no creator filter applied.
    expect(CertificateMock.find).toHaveBeenCalledWith({});
  });

  it("applies the search filter the frontend sends", async () => {
    const res = await request(app)
      .get("/api/v1/certificates")
      .query({ search: "aurora", limit: "50", skip: "0" });

    expect(res.status).toBe(200);
    const filter = CertificateMock.find.mock.calls[0][0];
    expect(filter.$and).toHaveLength(1);
    expect(filter.$and[0].$or[0].certificateId.$regex).toBe("aurora");
    expect(filter.$and[0].$or[0].certificateId.$options).toBe("i");
  });

  it("still serves the legacy per-creator listing", async () => {
    const res = await request(app)
      .get("/api/v1/certificates")
      .query({ creatorId: "665f1e2b3f4a5b6c7d8e9f01" });

    expect(res.status).toBe(200);
    const filter = CertificateMock.find.mock.calls[0][0];
    expect(String(filter.$and[0].creatorId)).toBe("665f1e2b3f4a5b6c7d8e9f01");
  });

  it("rejects an invalid creatorId with a 400 envelope", async () => {
    const res = await request(app)
      .get("/api/v1/certificates")
      .query({ creatorId: "not-valid" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Invalid query parameters");
  });

  it("rejects an out-of-range limit", async () => {
    const res = await request(app)
      .get("/api/v1/certificates")
      .query({ limit: "250" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
