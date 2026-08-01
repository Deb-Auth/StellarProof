import { listCertificatesQuerySchema } from "../routes/certificate.routes";

describe("listCertificatesQuerySchema", () => {
  it("accepts a bare request for the public global index", () => {
    const result = listCertificatesQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.creatorId).toBeUndefined();
      expect(result.data.search).toBeUndefined();
      expect(result.data.limit).toBe(20);
      expect(result.data.skip).toBe(0);
    }
  });

  it("accepts the global index query used by the search page (search+limit+skip)", () => {
    const result = listCertificatesQuerySchema.safeParse({
      search: "aurora",
      limit: "50",
      skip: "0",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe("aurora");
      expect(result.data.limit).toBe(50);
    }
  });

  it("keeps supporting the legacy per-creator query", () => {
    const result = listCertificatesQuerySchema.safeParse({
      creatorId: "665f1e2b3f4a5b6c7d8e9f01",
    });
    expect(result.success).toBe(true);
  });

  it("accepts search + creatorId combined", () => {
    const result = listCertificatesQuerySchema.safeParse({
      creatorId: "665f1e2b3f4a5b6c7d8e9f01",
      search: "cert.*(1)",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe("cert.*(1)");
    }
  });

  it("trims whitespace around the search term", () => {
    const result = listCertificatesQuerySchema.safeParse({
      search: "  aurora  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe("aurora");
    }
  });

  it("rejects a malformed creatorId", () => {
    expect(
      listCertificatesQuerySchema.safeParse({ creatorId: "bad-id" }).success,
    ).toBe(false);
  });

  it("rejects limit above 100 and negative skip", () => {
    expect(listCertificatesQuerySchema.safeParse({ limit: "999" }).success).toBe(
      false,
    );
    expect(listCertificatesQuerySchema.safeParse({ skip: "-1" }).success).toBe(
      false,
    );
  });

  it("rejects an over-long search term", () => {
    expect(
      listCertificatesQuerySchema.safeParse({ search: "x".repeat(300) }).success,
    ).toBe(false);
  });
});
