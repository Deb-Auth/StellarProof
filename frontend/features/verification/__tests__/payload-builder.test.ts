import { useWizardStore } from "../store/wizard.store";
import type { WizardFormData } from "../types/wizard.types";
import { buildVerificationPayload } from "../utils/payloadBuilder";

const PUBLIC_KEY = `G${"A".repeat(55)}`;
const CONTENT_HASH = "a".repeat(64);
const MANIFEST_HASH = "b".repeat(64);
const ENCRYPTED_HASH = "c".repeat(64);

function setMockZustandData(formData: WizardFormData): WizardFormData {
  useWizardStore.setState({ formData });
  return useWizardStore.getState().formData;
}

describe("Review & Submit payload builder", () => {
  afterEach(() => {
    useWizardStore.getState().resetWizard();
  });

  it("formats Zustand wizard data to match the submission schema", () => {
    const formData = setMockZustandData({
      identity: { issuerAddress: PUBLIC_KEY },
      content: {
        file: { name: "evidence.png", size: 2048, type: "image/png" },
        contentHash: CONTENT_HASH,
        hashProgress: 100,
        isHashing: false,
        manifest: {
          content: '{"name":"Evidence"}',
          format: "json",
          fileName: "manifest.json",
          fileSize: 19,
        },
        manifestHash: MANIFEST_HASH,
        encryptionEnabled: false,
        spvResult: null,
      },
    });

    expect(buildVerificationPayload(formData)).toEqual({
      contentHash: CONTENT_HASH,
      manifestHash: MANIFEST_HASH,
      publicKey: PUBLIC_KEY,
    });
  });

  it("uses the encrypted SPV hash when encryption is enabled", () => {
    const formData = setMockZustandData({
      identity: { issuerAddress: PUBLIC_KEY },
      content: {
        file: null,
        contentHash: CONTENT_HASH,
        hashProgress: 100,
        isHashing: false,
        manifest: null,
        manifestHash: null,
        encryptionEnabled: true,
        spvResult: {
          encryptedHash: ENCRYPTED_HASH,
          storageId: "spv-store-123",
        },
      },
    });

    expect(buildVerificationPayload(formData)).toEqual({
      contentHash: ENCRYPTED_HASH,
      manifestHash: null,
      publicKey: PUBLIC_KEY,
    });
  });

  it("supports the legacy document hash and an active-wallet override", () => {
    const formData = setMockZustandData({
      documents: {
        assetCode: "USDC",
        amount: "100",
        proofHash: CONTENT_HASH,
      },
    });

    expect(
      buildVerificationPayload(formData, { publicKey: `  ${PUBLIC_KEY}  ` }),
    ).toEqual({
      contentHash: CONTENT_HASH,
      manifestHash: null,
      publicKey: PUBLIC_KEY,
    });
  });

  it("rejects incomplete Zustand data that cannot match the schema", () => {
    const formData = setMockZustandData({});

    expect(() => buildVerificationPayload(formData)).toThrow(
      "A public key is required",
    );
    expect(() =>
      buildVerificationPayload(formData, { publicKey: PUBLIC_KEY }),
    ).toThrow("A content hash is required");
  });
});
