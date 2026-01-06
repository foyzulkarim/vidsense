import { z } from 'zod';
import { config } from '@/config';

// Video file magic bytes for validation
const VIDEO_SIGNATURES: Record<string, Buffer[]> = {
  'video/mp4': [
    Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]), // ftyp
    Buffer.from([0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70]),
    Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
  ],
  'video/quicktime': [
    Buffer.from([0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74]), // ftypqt
  ],
  'video/x-msvideo': [
    Buffer.from([0x52, 0x49, 0x46, 0x46]), // RIFF header for AVI
  ],
  'video/x-matroska': [
    Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), // EBML header for MKV
  ],
  'video/webm': [
    Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), // EBML header (same as MKV)
  ],
};

// Check if buffer starts with any of the signatures
function bufferStartsWith(buffer: Buffer, signatures: Buffer[]): boolean {
  return signatures.some((sig) => {
    if (buffer.length < sig.length) return false;
    return buffer.subarray(0, sig.length).equals(sig);
  });
}

// Validate file magic bytes
export function validateFileMagicBytes(buffer: Buffer): { valid: boolean; detectedType?: string } {
  // Check for MP4/MOV (ftyp box)
  if (buffer.length >= 12) {
    const ftypPos = buffer.indexOf('ftyp');
    if (ftypPos >= 0 && ftypPos <= 8) {
      return { valid: true, detectedType: 'video/mp4' };
    }
  }

  // Check for AVI (RIFF)
  if (bufferStartsWith(buffer, VIDEO_SIGNATURES['video/x-msvideo'])) {
    // Additional check for AVI type
    if (buffer.length >= 12 && buffer.subarray(8, 12).toString() === 'AVI ') {
      return { valid: true, detectedType: 'video/x-msvideo' };
    }
  }

  // Check for MKV/WebM (EBML)
  if (bufferStartsWith(buffer, VIDEO_SIGNATURES['video/x-matroska'])) {
    return { valid: true, detectedType: 'video/x-matroska' };
  }

  return { valid: false };
}

// Zod schema for upload request validation
export const uploadRequestSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long')
    .refine(
      (name) => {
        const ext = name.toLowerCase().split('.').pop();
        return ext && config.video.allowedExtensions.includes(`.${ext}`);
      },
      {
        message: `Invalid file extension. Allowed: ${config.video.allowedExtensions.join(', ')}`,
      }
    ),
  size: z
    .number()
    .int()
    .positive('File size must be positive')
    .max(
      config.storage.maxFileSizeBytes,
      `File size exceeds maximum of ${config.storage.maxFileSizeMB}MB`
    ),
  mimeType: z
    .string()
    .refine((type) => config.video.allowedMimeTypes.includes(type), {
      message: `Invalid MIME type. Allowed: ${config.video.allowedMimeTypes.join(', ')}`,
    }),
});

export type UploadRequestInput = z.infer<typeof uploadRequestSchema>;

// Zod schema for video ID
export const videoIdSchema = z.string().uuid('Invalid video ID');

// Zod schema for chat message
export const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long (max 2000 characters)'),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

// Validate video duration
export function validateDuration(durationSeconds: number): { valid: boolean; error?: string } {
  if (durationSeconds <= 0) {
    return { valid: false, error: 'Video duration must be positive' };
  }
  if (durationSeconds > config.video.maxDurationSeconds) {
    return {
      valid: false,
      error: `Video duration exceeds maximum of ${config.video.maxDurationSeconds} seconds`,
    };
  }
  return { valid: true };
}
