import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import type { Scene } from '@babylonjs/core/scene';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { TextureSampler } from '@babylonjs/core/Materials/Textures/textureSampler';

let defaultSampler: TextureSampler | undefined;
let defaultTexture: Texture | undefined;

export const getDefaultSampler = (): TextureSampler => {
  if (!defaultSampler) {
    defaultSampler = new TextureSampler();
    defaultSampler.setParameters();
  }
  return defaultSampler;
};

export const getDefaultTexture = (scene: Scene): Texture => {
  if (defaultTexture) {
    return defaultTexture;
  }

  const size = 2;
  const whiteData = new Uint8Array(size * size * 4).fill(255);

  defaultTexture = RawTexture.CreateRGBATexture(
    whiteData,
    size,
    size,
    scene,
    false,
    false,
    Texture.NEAREST_SAMPLINGMODE
  );

  return defaultTexture;
};
