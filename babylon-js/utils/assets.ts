// Copyright (c) Floating World, LDA. All Rights Reserved.

import { AssetContainer } from '@babylonjs/core/assetContainer';
import { Engine } from '@babylonjs/core/Engines/engine';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';

import '@babylonjs/loaders/glTF';
import '@babylonjs/core/Materials/Textures/Loaders/ddsTextureLoader';
import '@babylonjs/core/Materials/Textures/Loaders/ktxTextureLoader';

import { decodePngRgba8 } from './png';

const toAbsoluteUrl = (filePath: string): string => {
  if (/^https?:\/\//.test(filePath)) {
    return filePath;
  }

  return `${window.location.origin}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
};

export const loadAssetContainer = async (
  filePath: string,
  scene: Scene
): Promise<AssetContainer> => {
  const fullUrl = toAbsoluteUrl(filePath);
  try {
    return await LoadAssetContainerAsync(fullUrl, scene);
  } catch (error) {
    console.error(`Failed to load asset container from ${fullUrl}:`, error);
    throw error;
  }
};

export const loadTexture = async (
  filePath: string,
  scene: Scene,
  options: {
    gammaSpace?: boolean;
    invertY?: boolean;
    noMipmap?: boolean;
    samplingMode?: number;
    textureFormat?: number;
  } = {}
): Promise<Texture> => {
  const {
    gammaSpace = true,
    invertY = false,
    noMipmap = false,
    samplingMode = Texture.NEAREST_SAMPLINGMODE,
    textureFormat = Engine.TEXTUREFORMAT_RGBA,
  } = options;

  return new Promise((resolve, reject) => {
    const texture = new Texture(
      filePath,
      scene,
      noMipmap,
      invertY,
      samplingMode,
      () => resolve(texture),
      (message, exception) =>
        reject(
          new Error(
            `Failed to load texture from ${filePath}: ${message ?? exception}`
          )
        ),
      undefined,
      undefined,
      textureFormat
    );
    texture.gammaSpace = gammaSpace;
  });
};

/**
 * Loads an 8-bit RGBA PNG as a RawTexture; decoding the pixel bytes
 * instead of going through createImageBitmap/copyExternalImageToTexture. 
 * Use this for data textures (values must reach the GPU byte-for-byte).
 */
export const loadRawPngTexture = async (
  filePath: string,
  scene: Scene,
  options: { samplingMode?: number } = {}
): Promise<Texture> => {
  const { samplingMode = Texture.NEAREST_SAMPLINGMODE } = options;
  const fullUrl = toAbsoluteUrl(filePath);

  const response = await fetch(fullUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch PNG from ${fullUrl}: ${response.statusText}`
    );
  }

  const { width, height, data } = await decodePngRgba8(
    await response.arrayBuffer()
  );

  const texture = RawTexture.CreateRGBATexture(
    data,
    width,
    height,
    scene,
    false, // generateMipMaps
    false, // invertY
    samplingMode,
    Engine.TEXTURETYPE_UNSIGNED_BYTE
  );
  texture.name = filePath;
  texture.gammaSpace = false;

  return texture;
};
