// frontend/features/verification/utils/payloadBuilder.ts

import type { WizardFormData } from "../types/wizard.types";

export interface VerificationSubmissionPayload {
  contentHash: string;
  manifestHash: string | null;
  publicKey: string;
}

export interface PayloadBuilderOptions {
  /** Active wallet address, used when identity data is not part of this flow. */
  publicKey?: string;
}

/**
 * Extracts verification data from the wizard state and builds 
 * the final JSON payload required by the verification endpoints.
 */
export function buildVerificationPayload(
  formData: WizardFormData,
  options: PayloadBuilderOptions = {},
): VerificationSubmissionPayload {
  const content = formData.content;
  const publicKey =
    options.publicKey?.trim() || formData.identity?.issuerAddress.trim() || "";
  const contentHash =
    (content?.encryptionEnabled && content.spvResult?.encryptedHash) ||
    content?.contentHash ||
    formData.documents?.proofHash ||
    "";

  if (!publicKey) {
    throw new Error("A public key is required to build the verification payload");
  }

  if (!contentHash) {
    throw new Error("A content hash is required to build the verification payload");
  }

  return {
    contentHash,
    manifestHash: content?.manifestHash ?? null,
    publicKey,
  };
}