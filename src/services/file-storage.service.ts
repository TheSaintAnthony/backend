import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class FileStorageService {
  private readonly imagesPath: string;
  constructor(private configService: ConfigService) {
    this.imagesPath = this.configService.get<string>('IMAGES_PATH')!;
    this.ensureDirectoryExists(this.imagesPath);
  }
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
  async saveFile(
    file: Express.Multer.File,
    entityType: string,
    _entityId?: string,
  ): Promise<{
    filename: string;
    path: string;
    url: string;
    size: number;
    mimeType: string;
  }> {
    const fileExtension = path.extname(file.originalname);
    const filename = `${uuidv4()}${fileExtension}`;
    const entityPath = path.join(this.imagesPath, entityType);
    this.ensureDirectoryExists(entityPath);
    const fullPath = path.join(entityPath, filename);
    await fs.promises.writeFile(fullPath, file.buffer);
    const url = `/images/${entityType}/${filename}`;
    return {
      filename,
      path: fullPath,
      url,
      size: file.size,
      mimeType: file.mimetype,
    };
  }
  async deleteFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch {
    }
  }
  getFullPath(relativePath: string): string {
    return path.join(this.imagesPath, relativePath);
  }
}
