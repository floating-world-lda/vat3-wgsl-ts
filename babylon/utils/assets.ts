import { AssetContainer } from '@babylonjs/core/assetContainer';
import { Engine } from '@babylonjs/core/Engines/engine';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';

import '@babylonjs/loaders/glTF';
import '@babylonjs/core/Materials/Textures/Loaders/ddsTextureLoader';
import '@babylonjs/core/Materials/Textures/Loaders/ktxTextureLoader';

export const loadAssetContainer = async (
  filePath: string,
  scene: Scene,
  isLocalPath = true
): Promise<AssetContainer> => {
  const fullUrl = isLocalPath
    ? `${window.location.protocol}//${window.location.host}${filePath}`
    : filePath;

  try {
    return await LoadAssetContainerAsync(fullUrl, scene);
  } catch (error) {
    console.error(`Failed to load asset container from ${filePath}:`, error);
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

  try {
    const texture = new Texture(
      filePath,
      scene,
      noMipmap,
      invertY,
      samplingMode,
      undefined,
      undefined,
      undefined,
      undefined,
      textureFormat
    );

    texture.gammaSpace = gammaSpace;
    return texture;
  } catch (error) {
    console.error(`Failed to load texture from ${filePath}:`, error);
    throw error;
  }
};
