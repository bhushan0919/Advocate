import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface SavedFileInfo {
  storageKey: string;
  storedFileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  storageProvider: 'local' | 's3';
}

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];

export const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];

export const MAX_DOCUMENT_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

class StorageService {
  private baseDir: string;

  constructor() {
    this.baseDir =
      process.env.DOCUMENT_STORAGE_DIR ||
      path.resolve(process.cwd(), 'uploads/documents');

    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Generates a safe, sanitized filename with a cryptographically unique prefix
   */
  private generateSafeFileName(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const base = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);
    const uniqueId = crypto.randomUUID();
    return `${uniqueId}-${base}${ext}`;
  }

  /**
   * Resolves a storage path and strictly verifies that path traversal is prevented
   */
  public resolveFilePath(storageKey: string, workspaceId: string): string {
    // Sanitize parameters to avoid any directory traversal
    const safeWorkspace = workspaceId.replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanKey = path.basename(storageKey);

    const fullPath = path.resolve(this.baseDir, safeWorkspace, cleanKey);

    // Verify resolved path is strictly inside baseDir
    if (!fullPath.startsWith(path.resolve(this.baseDir))) {
      throw new Error('Access denied: Invalid path traversal detected.');
    }

    return fullPath;
  }

  /**
   * Save a file buffer or stream to partitioned local storage
   */
  public async saveFile(
    workspaceId: string,
    file: { originalname: string; mimetype: string; size: number; buffer?: Buffer; path?: string }
  ): Promise<SavedFileInfo> {
    const safeWorkspace = workspaceId.replace(/[^a-zA-Z0-9_-]/g, '');
    const wsDir = path.resolve(this.baseDir, safeWorkspace);

    if (!fs.existsSync(wsDir)) {
      fs.mkdirSync(wsDir, { recursive: true });
    }

    const storedFileName = this.generateSafeFileName(file.originalname);
    const destinationPath = path.resolve(wsDir, storedFileName);

    if (file.buffer) {
      await fs.promises.writeFile(destinationPath, file.buffer);
    } else if (file.path) {
      await fs.promises.copyFile(file.path, destinationPath);
      // Clean up temporary upload file if exists
      try {
        await fs.promises.unlink(file.path);
      } catch {
        // Ignore unlink failures for temp files
      }
    } else {
      throw new Error('No file buffer or path provided for storage.');
    }

    const stats = await fs.promises.stat(destinationPath);

    return {
      storageKey: storedFileName,
      storedFileName,
      originalFileName: file.originalname,
      fileSize: stats.size,
      mimeType: file.mimetype,
      storageProvider: 'local',
    };
  }

  /**
   * Get file read stream for preview or download
   */
  public getFileStream(storageKey: string, workspaceId: string): fs.ReadStream {
    const fullPath = this.resolveFilePath(storageKey, workspaceId);
    if (!fs.existsSync(fullPath)) {
      throw new Error('Requested document file was not found on disk.');
    }
    return fs.createReadStream(fullPath);
  }

  /**
   * Check if file exists on disk
   */
  public fileExists(storageKey: string, workspaceId: string): boolean {
    try {
      const fullPath = this.resolveFilePath(storageKey, workspaceId);
      return fs.existsSync(fullPath);
    } catch {
      return false;
    }
  }

  /**
   * Delete a stored file
   */
  public async deleteFile(storageKey: string, workspaceId: string): Promise<boolean> {
    try {
      const fullPath = this.resolveFilePath(storageKey, workspaceId);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to delete document ${storageKey}:`, error);
      return false;
    }
  }
}

export const storageService = new StorageService();

