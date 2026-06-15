// Copyright (c) Floating World, LDA. All Rights Reserved.

import {
  DataTexture,
  Mesh,
  NearestFilter,
  NoColorSpace,
  RGBAFormat,
  SRGBColorSpace,
  TextureLoader,
  UnsignedByteType,
} from 'three';
import type { ColorSpace, Group, MagnificationTextureFilter, MinificationTextureFilter, Texture } from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import type { VatGltfAsset } from '../core/vatTypes';
import { decodePngRgba8 } from './png';

const toAbsoluteUrl = (filePath: string): string => {
  if (/^https?:\/\//.test(filePath)) {
    return filePath;
  }
  return `${window.location.origin}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
};

export const loadGLTF = async (
  filePath: string
): Promise<VatGltfAsset> => {
  const fullUrl = toAbsoluteUrl(filePath);
  const loader = new GLTFLoader();

  const gltf = await loader.loadAsync(fullUrl);

  const scene = gltf.scene as Group;

  let mesh: Mesh | undefined;
  scene.traverse((node) => {
    if (!mesh && node instanceof Mesh) {
      mesh = node;
    }
  });

  if (!mesh) {
    throw new Error(`loadGLTF: no mesh found in ${fullUrl}`);
  }
  mesh.visible = false;

  return { scene, mesh };
};

export const loadTexture = async (
  filePath: string,
  options: {
    colorSpace?: ColorSpace;
    flipY?: boolean;
    generateMipmaps?: boolean;
    magFilter?: MagnificationTextureFilter;
    minFilter?: MinificationTextureFilter;
  } = {}
): Promise<Texture> => {
  const {
    colorSpace = SRGBColorSpace,
    flipY = false,
    generateMipmaps = false,
    magFilter = NearestFilter as MagnificationTextureFilter,
    minFilter = NearestFilter as MinificationTextureFilter,
  } = options;

  const fullUrl = toAbsoluteUrl(filePath);
  const texture = /\.exr$/i.test(fullUrl)
    ? await new EXRLoader().loadAsync(fullUrl)
    : await new TextureLoader().loadAsync(fullUrl);

  texture.colorSpace = colorSpace;
  texture.flipY = flipY;
  texture.generateMipmaps = generateMipmaps;
  texture.magFilter = magFilter;
  texture.minFilter = minFilter;
  texture.needsUpdate = true;

  return texture;
};

/**
 * Loads an 8-bit RGBA PNG as a DataTexture; decoding the pixel bytes
 * instead of going through createImageBitmap/copyExternalImageToTexture.
 * Use this for data textures (values must reach the GPU byte-for-byte).
 */
export const loadRawPngTexture = async (
  filePath: string,
  options: {
    magFilter?: MagnificationTextureFilter;
    minFilter?: MinificationTextureFilter;
  } = {}
): Promise<Texture> => {
  const {
    magFilter = NearestFilter as MagnificationTextureFilter,
    minFilter = NearestFilter as MinificationTextureFilter,
  } = options;

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

  const texture = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType);
  texture.colorSpace = NoColorSpace;
  texture.flipY = false;
  texture.generateMipmaps = false;
  texture.magFilter = magFilter;
  texture.minFilter = minFilter;
  texture.needsUpdate = true;

  return texture;
};
