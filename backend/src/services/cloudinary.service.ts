import crypto from 'crypto';
import { Readable } from 'stream';
import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
}

export class CloudinaryService {
  /**
   * Upload an image buffer (from Multer memory storage) to Cloudinary
   */
  static async uploadProfilePicture(
    buffer: Buffer,
    userId: string,
    mimetype: string
  ): Promise<CloudinaryUploadResult> {
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const publicId = `advd/profile-pictures/user_${userId}_${uniqueSuffix}`;

    if (!isCloudinaryConfigured()) {
      console.warn(
        '[Cloudinary] API credentials not configured. Generating secure mock storage URI.'
      );
      // In offline/test mode, generate a secure-url mock with valid structure
      return {
        secureUrl: `https://res.cloudinary.com/advd-chamber/image/upload/c_fill,g_face,w_400,h_400/v1730000000/${publicId}.webp`,
        publicId,
      };
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'advd/profile-pictures',
          public_id: `user_${userId}_${uniqueSuffix}`,
          resource_type: 'image',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        },
        (error, result) => {
          if (error || !result) {
            return reject(
              new Error(
                `Cloudinary profile picture upload failed: ${error?.message || 'Unknown error'}`
              )
            );
          }

          resolve({
            secureUrl: result.secure_url,
            publicId: result.public_id,
          });
        }
      );

      // Pipe the memory buffer to Cloudinary
      const readable = Readable.from(buffer);
      readable.pipe(uploadStream);
    });
  }

  /**
   * Upload a base64 Data URI to Cloudinary (for backwards compatibility / data migrations)
   */
  static async uploadBase64(
    base64Data: string,
    userId: string
  ): Promise<CloudinaryUploadResult> {
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const publicId = `advd/profile-pictures/user_${userId}_${uniqueSuffix}`;

    if (!isCloudinaryConfigured()) {
      return {
        secureUrl: `https://res.cloudinary.com/advd-chamber/image/upload/c_fill,g_face,w_400,h_400/v1730000000/${publicId}.webp`,
        publicId,
      };
    }

    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'advd/profile-pictures',
      public_id: `user_${userId}_${uniqueSuffix}`,
      resource_type: 'image',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    });

    return {
      secureUrl: result.secure_url,
      publicId: result.public_id,
    };
  }

  /**
   * Delete an existing image from Cloudinary by its public ID
   */
  static async deleteImage(publicId?: string): Promise<boolean> {
    if (!publicId || !publicId.trim()) {
      return false;
    }

    if (!isCloudinaryConfigured()) {
      return true;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true,
      });

      return result.result === 'ok' || result.result === 'not found';
    } catch (err: any) {
      console.warn(`[Cloudinary] Failed to delete previous image ${publicId}:`, err.message);
      return false;
    }
  }
}
