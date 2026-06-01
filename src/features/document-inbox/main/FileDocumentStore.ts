import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
}

export class FileDocumentStore {
  constructor(private readonly baseDirectory: string) {}

  async writeDocument(documentId: string, fileName: string, bytes: number[]): Promise<string> {
    const safeFileName = sanitizeFileName(fileName || `${documentId}.bin`);
    const documentDirectory = path.join(this.baseDirectory, "documents", documentId);
    const storedPath = path.join(documentDirectory, safeFileName);
    await mkdir(documentDirectory, { recursive: true });
    await writeFile(storedPath, Buffer.from(bytes));
    return storedPath;
  }
}


