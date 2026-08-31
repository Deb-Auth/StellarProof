/**
 * Tests for the PDF download utility (`utils/downloadBlob`).
 *
 * The helper is what turns a client-generated PDF (invoices, certificates)
 * into an actual file on the user's disk, so these tests pin down the whole
 * object-URL lifecycle: create, anchor click, detach, revoke. jsdom
 * implements none of the URL object-store, so it is mocked here.
 */

import { downloadBlob } from "../downloadBlob";

const PDF_BLOB = new Blob(["%PDF-1.4 fake"], { type: "application/pdf" });

let createObjectURL: jest.Mock;
let revokeObjectURL: jest.Mock;

beforeEach(() => {
  createObjectURL = jest.fn(() => "blob:mock-url");
  revokeObjectURL = jest.fn();
  window.URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
  window.URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("downloadBlob", () => {
  it("creates an object URL for the blob it is given", () => {
    downloadBlob(PDF_BLOB, "invoice.pdf");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledWith(PDF_BLOB);
  });

  it("triggers the download through an anchor carrying the URL and filename", () => {
    const anchor = document.createElement("a");
    const click = jest.spyOn(anchor, "click").mockImplementation(() => {});
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tagName: string) =>
      tagName === "a" ? anchor : originalCreateElement(tagName),
    );

    downloadBlob(PDF_BLOB, "INV-2026-0001.pdf");

    expect(anchor.href).toBe("blob:mock-url");
    expect(anchor.getAttribute("download")).toBe("INV-2026-0001.pdf");
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("attaches the anchor to the document and detaches it again", () => {
    const anchor = document.createElement("a");
    jest.spyOn(anchor, "click").mockImplementation(() => {});
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tagName: string) =>
      tagName === "a" ? anchor : originalCreateElement(tagName),
    );

    const appendChild = jest.spyOn(document.body, "appendChild");
    const removeChild = jest.spyOn(document.body, "removeChild");

    downloadBlob(PDF_BLOB, "invoice.pdf");

    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(removeChild).toHaveBeenCalledWith(anchor);
    // Nothing is left behind in the DOM once the download has been kicked off.
    expect(document.body.contains(anchor)).toBe(false);
  });

  it("clicks the anchor while it is still attached, then revokes the URL", () => {
    const calls: string[] = [];
    const anchor = document.createElement("a");
    jest.spyOn(anchor, "click").mockImplementation(() => {
      calls.push(document.body.contains(anchor) ? "click-attached" : "click-detached");
    });
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tagName: string) =>
      tagName === "a" ? anchor : originalCreateElement(tagName),
    );
    revokeObjectURL.mockImplementation(() => calls.push("revoke"));

    downloadBlob(PDF_BLOB, "invoice.pdf");

    expect(calls).toEqual(["click-attached", "revoke"]);
  });

  it("revokes exactly the URL it created", () => {
    createObjectURL.mockReturnValue("blob:second-url");

    downloadBlob(PDF_BLOB, "invoice.pdf");

    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:second-url");
  });

  it("keeps each download independent when called repeatedly", () => {
    createObjectURL
      .mockReturnValueOnce("blob:first")
      .mockReturnValueOnce("blob:second");

    downloadBlob(PDF_BLOB, "first.pdf");
    downloadBlob(new Blob(["other"], { type: "application/pdf" }), "second.pdf");

    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL.mock.calls).toEqual([["blob:first"], ["blob:second"]]);
  });

  it("works for non-PDF blobs too", () => {
    const jsonBlob = new Blob(["{}"], { type: "application/json" });
    const anchor = document.createElement("a");
    jest.spyOn(anchor, "click").mockImplementation(() => {});
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tagName: string) =>
      tagName === "a" ? anchor : originalCreateElement(tagName),
    );

    downloadBlob(jsonBlob, "certificate.json");

    expect(createObjectURL).toHaveBeenCalledWith(jsonBlob);
    expect(anchor.getAttribute("download")).toBe("certificate.json");
  });
});
