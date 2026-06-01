import type { PurriferApi } from "@app/registry/purriferApi";

declare global {
  interface Window {
    purrifer: PurriferApi;
  }
}

export {};


