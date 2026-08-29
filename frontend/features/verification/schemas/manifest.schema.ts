// frontend/features/verification/schemas/manifest.schema.ts

import { z } from 'zod';

export const manifestSchema = z.object({
  title: z
    .string()
    .min(1, { message: 'Title is required' })
    .max(100, { message: 'Title must be 100 characters or less' }),
  description: z
    .string()
    .min(1, { message: 'Description is required' })
    .max(500, { message: 'Description must be 500 characters or less' }),
  version: z
    .string()
    .min(1, { message: 'Version is required' })
    .regex(/^\d+\.\d+\.\d+$/, { message: 'Version must follow semantic versioning (e.g., 1.0.0)' }),
  author: z
    .string()
    .min(1, { message: 'Author name or address is required' }),
});

export type ManifestFormData = z.infer<typeof manifestSchema>;