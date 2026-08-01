import mongoose from "mongoose";
import { certificateService } from "../services/certificate.service";
import Certificate from "../models/Certificate.model";
import type { ListCertificatesQuery } from "../types/certificate.types";

jest.mock("../models/Certificate.model");

const CertificateMock = Certificate as unknown as {
  find: jest.Mock;
  countDocuments: jest.Mock;
};

/** Wire the Mongoose query chain used by CertificateService.listCertificates. */
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

function baseQuery(partial: Partial<ListCertificatesQuery>): ListCertificatesQuery {
  return { limit: 20, skip: 0, ...partial };
}

describe("CertificateService.listCertificates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("queries the global index when creatorId is omitted", async () => {
    mockQueryChain([{ certificateId: "cert-1" }], 1);

    const result = await certificateService.listCertificates(baseQuery({}));

    expect(CertificateMock.find).toHaveBeenCalledWith({});
    expect(result.total).toBe(1);
    expect(result.certificates).toHaveLength(1);
  });

  it("filters by creatorId when supplied", async () => {
    mockQueryChain([], 0);
    const creatorId = new mongoose.Types.ObjectId().toHexString();

    await certificateService.listCertificates(baseQuery({ creatorId }));

    const filter = CertificateMock.find.mock.calls[0][0];
    expect(filter.$and).toHaveLength(1);
    expect(String(filter.$and[0].creatorId)).toBe(creatorId);
  });

  it("builds a case-insensitive $or search across on-chain identifiers", async () => {
    mockQueryChain([], 0);

    await certificateService.listCertificates(baseQuery({ search: "cert-ABC" }));

    const filter = CertificateMock.find.mock.calls[0][0];
    const searchCondition = filter.$and.find(
      (c: Record<string, unknown>) => "$or" in c,
    ) as { $or: Record<string, { $regex: string; $options: string }>[] };

    expect(searchCondition.$or.map((entry) => Object.keys(entry)[0])).toEqual([
      "certificateId",
      "transactionHash",
      "contractAddress",
    ]);
    expect(searchCondition.$or[0].certificateId.$regex).toBe("cert-ABC");
    expect(searchCondition.$or[0].certificateId.$options).toBe("i");
  });

  it("escapes regex metacharacters in the search term", async () => {
    mockQueryChain([], 0);

    await certificateService.listCertificates(baseQuery({ search: "cert.*(1)" }));

    const filter = CertificateMock.find.mock.calls[0][0];
    const searchCondition = filter.$and.find(
      (c: Record<string, unknown>) => "$or" in c,
    ) as { $or: Record<string, { $regex: string }>[] };

    expect(searchCondition.$or[0].certificateId.$regex).toBe(
      "cert\\.\\*\\(1\\)",
    );
  });

  it("combines creatorId and search under $and", async () => {
    mockQueryChain([{ certificateId: "cert-9" }], 1);
    const creatorId = new mongoose.Types.ObjectId().toHexString();

    await certificateService.listCertificates(
      baseQuery({ creatorId, search: "cert-9" }),
    );

    const filter = CertificateMock.find.mock.calls[0][0];
    expect(filter.$and).toHaveLength(2);
    expect(CertificateMock.countDocuments).toHaveBeenCalledWith(filter);
  });

  it("rejects an invalid creatorId", async () => {
    await expect(
      certificateService.listCertificates(baseQuery({ creatorId: "not-an-id" })),
    ).rejects.toMatchObject({ code: "INVALID_CREATOR_ID" });
  });

  it("rejects out-of-range pagination", async () => {
    await expect(
      certificateService.listCertificates(baseQuery({ limit: 0 })),
    ).rejects.toMatchObject({ code: "INVALID_PAGINATION" });
    await expect(
      certificateService.listCertificates(baseQuery({ skip: -1 })),
    ).rejects.toMatchObject({ code: "INVALID_PAGINATION" });
  });

  it("populates asset and manifest relations for the frontend", async () => {
    mockQueryChain([], 0);

    await certificateService.listCertificates(baseQuery({}));

    const findResult = CertificateMock.find.mock.results[0].value;
    expect(findResult.populate).toHaveBeenCalledWith(
      "assetId",
      "fileName mimeType storageReferenceId",
    );
  });
});
