// Copyright (c) Floating World, LDA. All Rights Reserved.

import { Matrix4, NoColorSpace, SRGBColorSpace } from 'three';
import type { Mesh, PerspectiveCamera } from 'three';
import type { MeshStandardNodeMaterial } from 'three/webgpu';

import { loadGLTF, loadRawPngTexture, loadTexture } from '../utils/assets';
import { getDefaultTexture, NEAREST_NEAREST } from '../utils/texture';

import {
  VatType,
  type VatMetadata,
  type VatTextureKey,
  type VatAssets,
  type VatDynamicInputs,
  type VatTexture,
  type VatTextureConfig,
  VAT_TEXTURE_KEYS,
} from './vatTypes';

import VatBufferManager from './vatBufferManager';
import VatDataManager from './vatDataManager';
import VatMetadataProcessor from './vatMetadataProcessor';
import type VatMaterial from '../materials/vatMaterial';

export default abstract class VatBase {
  public abstract readonly vatType: VatType;

  public readonly frameRate: number = 30.0;
  public readonly material: MeshStandardNodeMaterial;
  public readonly mesh: Mesh;
  public readonly name: string;
  public readonly vertexCount: number = 0;

  protected bufferManager: VatBufferManager;

  protected _dynamicInputs: VatDynamicInputs = {
    _pad: 0,
    enablePlayback: false,
    modelViewMatrix: new Matrix4(),
    playbackSpeed: 1,
    time: 0,
    viewToModelMatrix: new Matrix4(),
  };

  protected _isEnabled: boolean = true;
  private readonly _modelViewMatrix = new Matrix4();
  private readonly _viewToModelMatrix = new Matrix4();

  protected abstract getCamera(): PerspectiveCamera | null;

  constructor(assets: VatAssets) {
    this.bufferManager = new VatBufferManager(assets.vatConfig);
    this.frameRate = assets.vatConfig.staticInputs.frameRate as number;
    this.mesh = assets.gltf.mesh;
    this.mesh.name = `${assets.name}_Mesh`;
    this.name = assets.gltf.mesh.name || assets.name;
    this.vertexCount = assets.vatConfig.staticInputs.vertexCount as number;

    const vatMaterial = this.createVatMaterial(assets.textures);
    vatMaterial.applyToMesh(this.mesh);
    this.material = vatMaterial.material;
  }

  public set speed(playbackSpeed: number) {
    this._dynamicInputs.playbackSpeed = playbackSpeed;
  }

  public set time(time: number) {
    this._dynamicInputs.time = time;
  }

  public dispose(): void {
    this.bufferManager.dispose();
    this.material.dispose();
    this.mesh.geometry.dispose();
  }

  public setEnabled(enabled: boolean): void {
    this._isEnabled = enabled;
    this._dynamicInputs.enablePlayback = enabled;
    this._dynamicInputs.time = 0;
    this.mesh.visible = enabled;
  }

  public update(time: number): void {
    this._update(time);
  }

  protected abstract createVatMaterial(
    textures: Record<string, VatTexture>
  ): VatMaterial;

  protected _update(time: number): void {
    this.time = time;

    const camera = this.getCamera();
    if (!camera) {
      throw new Error('VatBase: no camera provided for matrix computation');
    }

    const viewMatrix = camera.matrixWorldInverse;
    const worldMatrix = this.mesh.matrixWorld;

    this._modelViewMatrix.multiplyMatrices(viewMatrix, worldMatrix);
    this._viewToModelMatrix.copy(this._modelViewMatrix).invert();

    this._dynamicInputs.modelViewMatrix.copy(this._modelViewMatrix);
    this._dynamicInputs.viewToModelMatrix.copy(this._viewToModelMatrix);
    this.updateDynamicInputs(this._dynamicInputs);
  }

  protected updateDynamicInputs(data: VatDynamicInputs): void {
    this.bufferManager.updateDynamicInputs(data);
  }

  public static async loadAssets(
    rootPath: string,
    assetName: string
  ): Promise<VatAssets> {
    const metadata = await VatBase.loadMetadata(rootPath, assetName);
    const { name, type, overrides } =
      VatMetadataProcessor.processMetadata(metadata);

    const gltf = await loadGLTF(`${rootPath}${assetName}/${assetName}_mesh.glb`);

    const defaultConfig = VatDataManager.getDefaultData(type);
    const vatConfig = {
      dynamicInputs: defaultConfig.dynamicInputs,
      staticInputs: { ...defaultConfig.staticInputs, ...overrides },
      textureConfig: VatDataManager.updateTextureConfig({
        baseTextureConfig: defaultConfig.textureConfig,
        usePos2: Boolean(overrides.usePos2),
        useSpareColor: Boolean(overrides.useSpareColor),
      }),
    };

    const textures = await VatBase.loadTexturesSafely({
      assetName,
      config: vatConfig.textureConfig,
      isColorTexHdr: Boolean(vatConfig.staticInputs.isColorTexHdr),
      isTexHdr: Boolean(vatConfig.staticInputs.isTexHdr),
      rootPath,
    });

    return { name, gltf, textures, vatConfig };
  }

  private static async loadMetadata(
    rootPath: string,
    assetName: string
  ): Promise<VatMetadata> {
    const response = await fetch(
      `${rootPath}${assetName}/${assetName}_data.json`
    );
    if (!response.ok) {
      throw new Error(
        `VatBase: failed to load metadata: ${response.statusText}`
      );
    }
    const data = await response.json();
    return Object.assign({}, data[0]) as VatMetadata;
  }

  private static async loadTexturesSafely({
    assetName,
    config,
    isColorTexHdr,
    isTexHdr,
    rootPath,
  }: {
    assetName: string;
    config: VatTextureConfig;
    isColorTexHdr: boolean;
    isTexHdr: boolean;
    rootPath: string;
  }): Promise<Record<VatTextureKey, VatTexture>> {
    const textures = {} as Record<VatTextureKey, VatTexture>;

    for (const key of VAT_TEXTURE_KEYS) {
      const samplerConfig = config[key];
      if (samplerConfig) {
        const isColor = key === 'vatColTex' || key === 'vatSpareColTex';
        const useHdr = isColor ? (isTexHdr && isColorTexHdr) : isTexHdr;
        const format = useHdr ? 'exr' : 'png';
        const path = `${rootPath}${assetName}/${assetName}${samplerConfig.name}.${format}`;
        try {
          const texture =
            key === 'vatLookupTex' && format === 'png'
              ? await loadRawPngTexture(path, {
                  magFilter: samplerConfig.samplingMode as import('three').MagnificationTextureFilter,
                  minFilter: samplerConfig.samplingMode as import('three').MinificationTextureFilter,
                })
              : await loadTexture(path, {
                  colorSpace: isColor ? SRGBColorSpace : NoColorSpace,
                  flipY: false,
                  generateMipmaps: false,
                  magFilter: samplerConfig.samplingMode as import('three').MagnificationTextureFilter,
                  minFilter: samplerConfig.samplingMode as import('three').MinificationTextureFilter,
                });
          textures[key] = { texture };
          continue;
        } catch (error) {
          console.warn(`VatBase: failed to load texture ${path}:`, error);
        }
      }
      textures[key] = { texture: getDefaultTexture() };
    }

    return textures;
  }

  public static unloadAssets(assets: VatAssets): void {
    assets.gltf.mesh.geometry.dispose();
    Object.values(assets.textures).forEach(({ texture }) => texture.dispose());
  }
}
