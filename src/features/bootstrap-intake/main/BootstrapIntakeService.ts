import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { dialog, type BrowserWindow } from "electron";
import { AppError } from "@app/shared/errors/AppError";
import { FileSequenceStore } from "@app/shared/storage/FileSequenceStore";
import type {
  DuplicateScope,
  RawIngestBatchDetails,
  RawIngestFileResult,
  RawIngestStartInput,
  ScannerBatchInput,
  ScannerCapabilities
} from "../contracts";
import { BootstrapIntakeRepository } from "./BootstrapIntakeRepository";
import type { ScannerAdapter } from "./ScannerAdapter";
import { TwainWiaScannerAdapter } from "./TwainWiaScannerAdapter";

export class BootstrapIntakeService {
  constructor(
    private readonly repository: BootstrapIntakeRepository,
    private readonly sequenceStore: FileSequenceStore,
    private readonly scannerAdapter: ScannerAdapter = new TwainWiaScannerAdapter(),
    private readonly nowProvider: () => Date = () => new Date()
  ) {}

  async selectFoldersAndIngest(window: BrowserWindow, input: RawIngestStartInput): Promise<RawIngestBatchDetails | null> {
    const sourceSystem = input.sourceSystem.trim();
    if (!sourceSystem) {
      throw new AppError({
        code: "BUSINESS_BOOTSTRAP_SOURCE_REQUIRED",
        message: "Kallmetadata (source_system) maste anges.",
        type: "business"
      });
    }

    const dialogResult = await dialog.showOpenDialog(window, {
      title: "Valj källmappar for råzonsingest",
      properties: ["openDirectory", "multiSelections", "createDirectory"]
    });

    if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
      return null;
    }

    const discoveredFiles = await this.collectFiles(dialogResult.filePaths);
    return this.persistBatch({
      sourceSystem,
      sourceFolders: dialogResult.filePaths,
      discoveredFiles: discoveredFiles.map((fullPath) => ({ fullPath }))
    });
  }

  async getScannerCapabilities(): Promise<ScannerCapabilities> {
    const detected = await this.scannerAdapter.detectCapabilities();
    return {
      driver: detected.driver,
      deviceName: detected.deviceName,
      profile: detected.profile,
      supportsAdf: detected.supportsAdf,
      supportsDuplex: detected.supportsDuplex
    };
  }

  async scanToBatch(window: BrowserWindow, input?: ScannerBatchInput): Promise<RawIngestBatchDetails | null> {
    const capabilities = await this.scannerAdapter.detectCapabilities();
    const requestedFeeder = input?.feederMode ?? (capabilities.supportsAdf ? "adf" : "flatbed");
    const requestedScanMode = input?.scanMode ?? (capabilities.supportsDuplex ? "duplex" : "simplex");

    try {
      const scanResult = await this.scannerAdapter.scan(window, {
        preferredDeviceName: input?.preferredDeviceName,
        scannerProfile: input?.scannerProfile,
        feederMode: requestedFeeder,
        scanMode: requestedScanMode
      });

      if (!scanResult) {
        return null;
      }

      return this.persistBatch({
        sourceSystem: "scanner",
        sourceFolders: scanResult.sourceFolders,
        discoveredFiles: scanResult.files,
        scannerDeviceName: scanResult.scannerDeviceName,
        scannerProfile: scanResult.scannerProfile,
        scanMode: scanResult.scanMode,
        feederMode: scanResult.feederMode,
        scanTimestamp: scanResult.scanTimestamp
      });
    } catch (reason: unknown) {
      throw new AppError({
        code: "TECHNICAL_SCANNER_SCAN_FAILED",
        message:
          reason instanceof Error
            ? `Scannerfel: ${reason.message}`
            : "Scannerfel: kunde inte lasa scanneroutput.",
        type: "technical"
      });
    }
  }

  async listBatches() {
    return this.repository.listBatches();
  }

  async getBatch(ingestBatchId: string) {
    const batch = await this.repository.getBatch(ingestBatchId);
    if (!batch) {
      throw new AppError({
        code: "BUSINESS_BOOTSTRAP_BATCH_NOT_FOUND",
        message: `Ingestbatch ${ingestBatchId} kunde inte hittas.`,
        type: "business"
      });
    }
    return batch;
  }

  private async persistBatch(input: {
    sourceSystem: string;
    sourceFolders: string[];
    discoveredFiles: Array<{ fullPath: string; scanTimestamp?: string }>;
    scannerDeviceName?: string;
    scannerProfile?: string;
    scanMode?: "simplex" | "duplex";
    feederMode?: "flatbed" | "adf";
    scanTimestamp?: string;
  }): Promise<RawIngestBatchDetails> {
    const ingestBatchId = await this.sequenceStore.next("RB");
    const createdAt = this.nowProvider().toISOString();

    const seenInBatch = new Set<string>();
    const files: RawIngestFileResult[] = [];
    let totalNew = 0;
    let totalDuplicates = 0;
    let totalErrors = 0;

    for (const discovered of input.discoveredFiles) {
      const filePath = discovered.fullPath;
      const fileType = path.extname(filePath).toLowerCase().replace(/^\./, "") || "unknown";
      try {
        const fileStat = await stat(filePath);
        const hash = await this.hashFile(filePath);

        const duplicateInBatch = seenInBatch.has(hash);
        const duplicateExisting = await this.repository.hasExistingHash(hash);

        let status: RawIngestFileResult["status"] = "new";
        let duplicateScope: DuplicateScope | undefined;

        if (duplicateInBatch || duplicateExisting) {
          status = "duplicate";
          duplicateScope =
            duplicateInBatch && duplicateExisting
              ? "batch-and-existing"
              : duplicateInBatch
                ? "batch"
                : "existing";
          totalDuplicates += 1;
        } else {
          totalNew += 1;
        }

        const result: RawIngestFileResult = {
          fullPath: filePath,
          fileType,
          sizeBytes: fileStat.size,
          hash,
          scanTimestamp: discovered.scanTimestamp ?? input.scanTimestamp,
          status,
          duplicateScope
        };
        files.push(result);

        if (!duplicateInBatch) {
          seenInBatch.add(hash);
          await this.repository.insertBatchFile({ ingestBatchId, file: result });
        }
      } catch (reason: unknown) {
        totalErrors += 1;
        files.push({
          fullPath: filePath,
          fileType,
          sizeBytes: 0,
          hash: null,
          scanTimestamp: discovered.scanTimestamp ?? input.scanTimestamp,
          status: "error",
          errorMessage: reason instanceof Error ? reason.message : "Okant filfel vid ingest."
        });
      }
    }

    await this.repository.createBatch({
      ingestBatchId,
      sourceSystem: input.sourceSystem,
      createdAt,
      sourceFolders: input.sourceFolders,
      scannerDeviceName: input.scannerDeviceName,
      scannerProfile: input.scannerProfile,
      scanMode: input.scanMode,
      feederMode: input.feederMode,
      scanTimestamp: input.scanTimestamp,
      totalDiscovered: input.discoveredFiles.length,
      totalNew,
      totalDuplicates,
      totalErrors
    });

    return {
      ingestBatchId,
      sourceSystem: input.sourceSystem,
      createdAt,
      sourceFolders: input.sourceFolders,
      scannerDeviceName: input.scannerDeviceName,
      scannerProfile: input.scannerProfile,
      scanMode: input.scanMode,
      feederMode: input.feederMode,
      scanTimestamp: input.scanTimestamp,
      totalDiscovered: input.discoveredFiles.length,
      totalNew,
      totalDuplicates,
      totalErrors,
      files
    };
  }

  private async collectFiles(folderPaths: string[]): Promise<string[]> {
    const collected: string[] = [];

    async function walkFolder(folderPath: string) {
      const entries = await readdir(folderPath, { withFileTypes: true });
      for (const entry of entries) {
        const nextPath = path.join(folderPath, entry.name);
        if (entry.isDirectory()) {
          await walkFolder(nextPath);
        } else if (entry.isFile()) {
          collected.push(nextPath);
        }
      }
    }

    for (const folder of folderPaths) {
      await walkFolder(folder);
    }

    return collected;
  }

  private async hashFile(filePath: string): Promise<string> {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);

    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("end", () => resolve());
      stream.on("error", (error) => reject(error));
    });

    return hash.digest("hex");
  }
}
