import type { BrowserWindow } from "electron";

export interface ScannerDiscovery {
  driver: "twain-wia";
  deviceName: string;
  profile: string;
  supportsAdf: boolean;
  supportsDuplex: boolean;
}

export interface ScannerScanRequest {
  preferredDeviceName?: string;
  scannerProfile?: string;
  feederMode: "flatbed" | "adf";
  scanMode: "simplex" | "duplex";
}

export interface ScannerScanFile {
  fullPath: string;
  scanTimestamp: string;
}

export interface ScannerScanResult {
  sourceFolders: string[];
  scannerDeviceName: string;
  scannerProfile: string;
  feederMode: "flatbed" | "adf";
  scanMode: "simplex" | "duplex";
  scanTimestamp: string;
  files: ScannerScanFile[];
}

export interface ScannerAdapter {
  detectCapabilities(): Promise<ScannerDiscovery>;
  scan(window: BrowserWindow, request: ScannerScanRequest): Promise<ScannerScanResult | null>;
}


