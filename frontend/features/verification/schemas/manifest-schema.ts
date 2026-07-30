import { z } from 'zod';

export const manifestSchema = z.object({
  contentHash: z.string({ required_error: "contentHash is required" }).min(1, "contentHash is required"),
  creator: z.string({ required_error: "creator is required" }).min(1, "creator is required").regex(/^G[A-Z2-7]{55}$/, "Invalid Stellar public key"),
  timestamp: z.string({ required_error: "timestamp is required" }).datetime({ message: "Invalid timestamp format, must be ISO 8601" }),
  metadata: z.record(z.string(), z.any()).optional(),
}).passthrough();

export type ManifestSchema = z.infer<typeof manifestSchema>;

export const validateManifest = (data: unknown) => {
  return manifestSchema.safeParse(data);
};
