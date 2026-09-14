import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { AdminService } from './adminService.js';

const adminService = new AdminService();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');
const TEMP_DIR = path.join(UPLOADS_DIR, 'temp');

export interface UploadMetadata {
  uploadId: string;
  lectureId: string;
  sourceName: string;
  savedFileName: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number[];
  status: 'uploading' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export class VideoUploadService {
  private directoriesEnsured = false;

  ensureDirectories() {
    if (this.directoriesEnsured) return;
    
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
    
    this.directoriesEnsured = true;
  }

  private getSessionDir(uploadId: string): string {
    // Sanitize uploadId to prevent path traversal
    const safeUploadId = path.basename(uploadId);
    return path.join(TEMP_DIR, safeUploadId);
  }

  private getMetadataPath(uploadId: string): string {
    return path.join(this.getSessionDir(uploadId), 'metadata.json');
  }

  private async readMetadata(uploadId: string): Promise<UploadMetadata> {
    const metaPath = this.getMetadataPath(uploadId);
    if (!fs.existsSync(metaPath)) {
      throw new Error(`Upload session not found: ${uploadId}`);
    }
    const content = await fs.promises.readFile(metaPath, 'utf8');
    return JSON.parse(content) as UploadMetadata;
  }

  private async writeMetadata(uploadId: string, metadata: UploadMetadata): Promise<void> {
    const metaPath = this.getMetadataPath(uploadId);
    metadata.updatedAt = new Date().toISOString();
    await fs.promises.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
  }

  async initUpload(lectureId: string, params: { sourceName: string; fileSize: number; chunkSize?: number }): Promise<{
    uploadId: string;
    chunkSize: number;
    totalChunks: number;
  }> {
    this.ensureDirectories();
    const { sourceName, fileSize } = params;
    if (!fileSize || fileSize <= 0) {
      throw new Error('Invalid file size');
    }

    const chunkSize = params.chunkSize || 5 * 1024 * 1024; // 5MB default chunk
    const totalChunks = Math.ceil(fileSize / chunkSize);
    const uploadId = crypto.randomUUID();

    // Sanitize extension and generate collision-proof filename
    const ext = path.extname(sourceName) || '.mp4';
    const cleanExt = ext.replace(/[^a-zA-Z0-9.]/g, '').toLowerCase() || '.mp4';
    const savedFileName = `${crypto.randomUUID()}${cleanExt}`;

    const sessionDir = this.getSessionDir(uploadId);
    await fs.promises.mkdir(sessionDir, { recursive: true });

    const metadata: UploadMetadata = {
      uploadId,
      lectureId,
      sourceName: path.basename(sourceName),
      savedFileName,
      fileSize,
      chunkSize,
      totalChunks,
      uploadedChunks: [],
      status: 'uploading',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.writeMetadata(uploadId, metadata);

    return {
      uploadId,
      chunkSize,
      totalChunks,
    };
  }

  async getUploadStatus(lectureId: string, uploadId: string) {
    this.ensureDirectories();
    const metadata = await this.readMetadata(uploadId);
    if (metadata.lectureId !== lectureId) {
      throw new Error('Upload does not belong to this lecture');
    }

    return {
      uploadId: metadata.uploadId,
      totalChunks: metadata.totalChunks,
      chunkSize: metadata.chunkSize,
      fileSize: metadata.fileSize,
      uploadedChunks: metadata.uploadedChunks,
      status: metadata.status,
    };
  }

  async saveChunkStream(
    lectureId: string,
    uploadId: string,
    chunkIndex: number,
    contentLength: number | undefined,
    inputStream: NodeJS.ReadableStream
  ): Promise<{ chunkIndex: number; success: boolean }> {
    this.ensureDirectories();
    const metadata = await this.readMetadata(uploadId);

    if (metadata.lectureId !== lectureId) {
      throw new Error('Upload does not belong to this lecture');
    }
    if (metadata.status === 'completed') {
      throw new Error('Upload is already completed');
    }
    if (chunkIndex < 0 || chunkIndex >= metadata.totalChunks) {
      throw new Error(`Invalid chunk index: ${chunkIndex}. Total chunks: ${metadata.totalChunks}`);
    }

    // Expected chunk size check
    const isLastChunk = chunkIndex === metadata.totalChunks - 1;
    const expectedChunkSize = isLastChunk
      ? metadata.fileSize - chunkIndex * metadata.chunkSize
      : metadata.chunkSize;

    if (contentLength !== undefined && contentLength > 0 && contentLength !== expectedChunkSize) {
      throw new Error(`Chunk size mismatch. Expected ${expectedChunkSize} bytes, got ${contentLength}`);
    }

    const sessionDir = this.getSessionDir(uploadId);
    const chunkPath = path.join(sessionDir, `chunk_${chunkIndex}`);
    const tempChunkPath = path.join(sessionDir, `chunk_${chunkIndex}.tmp`);

    const writeStream = fs.createWriteStream(tempChunkPath);
    let bytesWritten = 0;

    inputStream.on('data', (chunk: Buffer) => {
      bytesWritten += chunk.length;
    });

    try {
      await pipeline(inputStream, writeStream);

      // Verify written bytes
      if (bytesWritten !== expectedChunkSize) {
        if (fs.existsSync(tempChunkPath)) await fs.promises.unlink(tempChunkPath);
        throw new Error(`Uploaded chunk incomplete: received ${bytesWritten} bytes, expected ${expectedChunkSize}`);
      }

      // Rename from .tmp to official chunk file
      await fs.promises.rename(tempChunkPath, chunkPath);

      // Update metadata safely
      if (!metadata.uploadedChunks.includes(chunkIndex)) {
        metadata.uploadedChunks.push(chunkIndex);
        metadata.uploadedChunks.sort((a, b) => a - b);
        await this.writeMetadata(uploadId, metadata);
      }

      return { chunkIndex, success: true };
    } catch (err) {
      if (fs.existsSync(tempChunkPath)) {
        await fs.promises.unlink(tempChunkPath).catch(() => {});
      }
      throw err;
    }
  }

  async finalizeUpload(lectureId: string, uploadId: string, duration?: number) {
    this.ensureDirectories();
    const metadata = await this.readMetadata(uploadId);

    if (metadata.lectureId !== lectureId) {
      throw new Error('Upload does not belong to this lecture');
    }
    if (metadata.status === 'completed') {
      throw new Error('Upload is already marked completed');
    }

    const sessionDir = this.getSessionDir(uploadId);

    // 1. Validate all chunks are present
    if (metadata.uploadedChunks.length !== metadata.totalChunks) {
      const missing = [];
      for (let i = 0; i < metadata.totalChunks; i++) {
        if (!metadata.uploadedChunks.includes(i)) missing.push(i);
      }
      throw new Error(`Cannot finalize upload. Missing chunks: [${missing.join(', ')}]`);
    }

    for (let i = 0; i < metadata.totalChunks; i++) {
      const chunkFile = path.join(sessionDir, `chunk_${i}`);
      if (!fs.existsSync(chunkFile)) {
        throw new Error(`Missing chunk file on disk: chunk_${i}`);
      }
    }

    // 2. Sequentially merge chunks directly into final video file
    const finalFilePath = path.join(VIDEOS_DIR, metadata.savedFileName);
    const tempFinalFilePath = path.join(VIDEOS_DIR, `${metadata.savedFileName}.tmp`);

    const finalWriteStream = fs.createWriteStream(tempFinalFilePath);

    try {
      for (let i = 0; i < metadata.totalChunks; i++) {
        const chunkFile = path.join(sessionDir, `chunk_${i}`);
        const chunkReadStream = fs.createReadStream(chunkFile);
        await pipeline(chunkReadStream, finalWriteStream, { end: false });
      }
      finalWriteStream.end();

      // Wait for finish
      await new Promise<void>((resolve, reject) => {
        finalWriteStream.on('finish', resolve);
        finalWriteStream.on('error', reject);
      });

      // 3. Verify final merged file size on disk matches metadata.fileSize
      const stat = await fs.promises.stat(tempFinalFilePath);
      if (stat.size !== metadata.fileSize) {
        await fs.promises.unlink(tempFinalFilePath).catch(() => {});
        throw new Error(`Merged video size mismatch! Expected ${metadata.fileSize} bytes, got ${stat.size}`);
      }

      // 4. Rename temp to final
      await fs.promises.rename(tempFinalFilePath, finalFilePath);

      // 5. Insert record into PostgreSQL DB
      const videoRecord = await adminService.addLectureVideo(lectureId, {
        sourceName: metadata.sourceName,
        url: `/uploads/videos/${metadata.savedFileName}`,
        duration: duration || 0,
      });

      // 6. Mark session completed and cleanup temp chunks
      metadata.status = 'completed';
      await this.writeMetadata(uploadId, metadata);

      // Delete temp chunks and directory
      await fs.promises.rm(sessionDir, { recursive: true, force: true }).catch(() => {});

      return videoRecord;
    } catch (err) {
      if (fs.existsSync(tempFinalFilePath)) {
        await fs.promises.unlink(tempFinalFilePath).catch(() => {});
      }
      throw err;
    }
  }
}

export const videoUploadService = new VideoUploadService();
