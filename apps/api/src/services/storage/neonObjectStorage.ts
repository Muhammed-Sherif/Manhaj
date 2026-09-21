import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { PutObjectInput, StorageProvider, StoredObject } from './types.js';

export interface NeonStorageConfig {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class NeonObjectStorage implements StorageProvider {
  readonly name = 'neon';
  private s3: S3Client;

  constructor(private readonly config: NeonStorageConfig) {
    if (!config.endpoint || !config.bucket || !config.accessKeyId) {
      throw new Error(
        'Neon Object Storage requires AWS_ENDPOINT_URL_S3, AWS_S3_BUCKET and AWS_ACCESS_KEY_ID'
      );
    }

    this.s3 = new S3Client({
      forcePathStyle: true,
      region: config.region || 'eu-central-1',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      }
    });
  }

  async put({ key, body, contentType }: PutObjectInput): Promise<StoredObject> {
    await this.s3.send(new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));

    return {
      key,
      url: this.urlFor(key),
      size: body.byteLength,
      contentType,
    };
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    }));
  }

  urlFor(key: string): string {
    const base = `${this.config.endpoint}/${this.config.bucket}`.replace(/\/+$/, '');
    return `${base}/${key.replace(/^\/+/, '')}`;
  }
}
