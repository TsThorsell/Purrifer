import path from "node:path";
import { dialog, type BrowserWindow } from "electron";
import type { ScannerAdapter, ScannerDiscovery, ScannerScanRequest, ScannerScanResult } from "./ScannerAdapter";

export class TwainWiaScannerAdapter implements ScannerAdapter {
  constructor(private readonly nowProvider: () => Date = () => new Date()) {}

  async detectCapabilities(): Promise<ScannerDiscovery> {
    const profile = "ads-1300";
    const isWindows = process.platform === "win32";
    return {
      driver: "twain-wia",
      deviceName: "Brother ADS-1300 (detected profile)",
      profile,
      supportsAdf: isWindows,
      supportsDuplex: isWindows
    };
  }

  async scan(window: BrowserWindow, request: ScannerScanRequest): Promise<ScannerScanResult | null> {
    const capabilities = await this.detectCapabilities();
    const normalizedFeeder = capabilities.supportsAdf ? request.feederMode : "flatbed";
    const normalizedScanMode = capabilities.supportsDuplex ? request.scanMode : "simplex";
    const scanTimestamp = this.nowProvider().toISOString();

    // Adapter boundary: emulate a TWAIN/WIA scan output handoff by selecting produced files.
    const result = await dialog.showOpenDialog(window, {
      title: "Valj skannade filer (TWAIN/WIA output)",
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Scans", extensions: ["pdf", "png", "jpg", "jpeg", "tif", "tiff"] },
        { name: "All files", extensions: ["*"] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const sourceFolders = Array.from(new Set(result.filePaths.map((filePath) => path.dirname(filePath))));

    return {
      sourceFolders,
      scannerDeviceName: request.preferredDeviceName?.trim() || capabilities.deviceName,
      scannerProfile: request.scannerProfile?.trim() || capabilities.profile,
      feederMode: normalizedFeeder,
      scanMode: normalizedScanMode,
      scanTimestamp,
      files: result.filePaths.map((fullPath) => ({ fullPath, scanTimestamp }))
    };
  }
}


