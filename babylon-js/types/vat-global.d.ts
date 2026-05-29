// Copyright (c) Floating World, LDA. All Rights Reserved.

import type { VAT3 } from "../index";
import type { VatType, VatAssets } from "../core/vatTypes";

declare global {
  interface Window {
    VAT3: typeof VAT3;
    VatType: typeof VatType;
  }
}

export {};