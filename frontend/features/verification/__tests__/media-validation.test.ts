import {
  DEFAULT_MAX_MEDIA_SIZE,
  isAcceptedMediaType,
  validateMediaFile,
} from "../mediaValidation";

function mockFile(name: string, size: number, type: string): File {
  const file = new File(["content"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("media file validation", () => {
  it.each([
    ["photo.png", "image/png"],
    ["recording.mp4", "video/mp4"],
    ["certificate.pdf", "application/pdf"],
  ])("accepts supported file %s with type %s", (name, type) => {
    const file = mockFile(name, 1024, type);

    expect(validateMediaFile(file)).toEqual({ accepted: true, error: null });
  });

  it("accepts a file exactly at the maximum size", () => {
    const file = mockFile("boundary.pdf", DEFAULT_MAX_MEDIA_SIZE, "application/pdf");

    expect(validateMediaFile(file).accepted).toBe(true);
  });

  it("rejects a file larger than the configured maximum", () => {
    const file = mockFile("large.png", 1025, "image/png");

    expect(validateMediaFile(file, { maxSize: 1024 })).toEqual({
      accepted: false,
      error: "exceeds the maximum file size",
    });
  });

  it("rejects empty files", () => {
    const file = mockFile("empty.pdf", 0, "application/pdf");

    expect(validateMediaFile(file)).toEqual({
      accepted: false,
      error: "is empty",
    });
  });

  it.each([
    ["malware.exe", "application/x-msdownload"],
    ["notes.txt", "text/plain"],
  ])("rejects unsupported file %s with type %s", (name, type) => {
    const file = mockFile(name, 1024, type);

    expect(validateMediaFile(file)).toEqual({
      accepted: false,
      error: "has an unsupported file type",
    });
  });

  it("supports custom accepted MIME types and extensions", () => {
    const csv = mockFile("records.csv", 1024, "text/csv");
    const accept = { "text/csv": [".csv"] };

    expect(isAcceptedMediaType(csv, accept)).toBe(true);
    expect(validateMediaFile(csv, { accept }).accepted).toBe(true);
  });

  it("uses the extension when a browser supplies no MIME type", () => {
    const file = mockFile("scan.JPEG", 1024, "");

    expect(validateMediaFile(file).accepted).toBe(true);
  });
});
