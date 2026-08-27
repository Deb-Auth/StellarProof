export const DEFAULT_MAX_MEDIA_SIZE = 50 * 1024 * 1024;

export const DEFAULT_MEDIA_ACCEPT: Record<string, string[]> = {
  "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".heic"],
  "video/*": [".mp4", ".mov", ".avi", ".webm", ".mkv"],
  "application/pdf": [".pdf"],
};

export interface MediaValidationOptions {
  maxSize?: number;
  accept?: Record<string, string[]>;
}

export interface MediaValidationResult {
  accepted: boolean;
  error: string | null;
}

function matchesMimeType(fileType: string, acceptedType: string): boolean {
  if (acceptedType.endsWith("/*")) {
    return fileType.startsWith(acceptedType.slice(0, -1));
  }

  return fileType === acceptedType;
}

function hasAcceptedExtension(fileName: string, extensions: string[]): boolean {
  const normalizedName = fileName.toLowerCase();
  return extensions.some((extension) =>
    normalizedName.endsWith(extension.toLowerCase()),
  );
}

export function isAcceptedMediaType(
  file: File,
  accept: Record<string, string[]> = DEFAULT_MEDIA_ACCEPT,
): boolean {
  return Object.entries(accept).some(
    ([mimeType, extensions]) =>
      matchesMimeType(file.type, mimeType) ||
      hasAcceptedExtension(file.name, extensions),
  );
}

export function validateMediaFile(
  file: File,
  {
    maxSize = DEFAULT_MAX_MEDIA_SIZE,
    accept = DEFAULT_MEDIA_ACCEPT,
  }: MediaValidationOptions = {},
): MediaValidationResult {
  if (file.size === 0) {
    return { accepted: false, error: "is empty" };
  }

  if (file.size > maxSize) {
    return { accepted: false, error: "exceeds the maximum file size" };
  }

  if (!isAcceptedMediaType(file, accept)) {
    return { accepted: false, error: "has an unsupported file type" };
  }

  return { accepted: true, error: null };
}
