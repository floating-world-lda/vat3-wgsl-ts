// Copyright (c) Floating World, LDA. All Rights Reserved.

import {
  DataTexture,
  NearestFilter,
  RGBAFormat,
  UnsignedByteType,
} from 'three';
import type { Texture } from 'three';

let defaultTexture: Texture | undefined;

export const NEAREST_NEAREST = NearestFilter;

export const getDefaultTexture = (): Texture => {
  if (defaultTexture) {
    return defaultTexture;
  }

  // 2×2 opaque white DataTexture — used as safe fallback for missing VAT textures
  const data = new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255,
                               255, 255, 255, 255, 255, 255, 255, 255]);
  defaultTexture = new DataTexture(data, 2, 2, RGBAFormat, UnsignedByteType);
  defaultTexture.needsUpdate = true;
  return defaultTexture;
};
