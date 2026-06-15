// Copyright (c) Floating World, LDA. All Rights Reserved.

import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Constants } from '@babylonjs/core/Engines/constants';
import {
  ExrLoaderGlobalConfiguration,
  EXROutputType,
} from '@babylonjs/core/Materials/Textures/Loaders/EXR/exrLoader.configuration';
import type { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import type { Observer } from '@babylonjs/core/Misc/observable';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import type { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { TextureSampler } from '@babylonjs/core/Materials/Textures/textureSampler';

import { loadAssetContainer, loadRawPngTexture, loadTexture } from '../utils/assets';
import { ensureVertexColors } from '../utils/mesh';
import {
  getDefaultSampler,
  getDefaultTexture,
} from '../utils/texture';

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
import VatGlobalConfiguration from './vatGlobalConfiguration';
import VatMetadataProcessor from './vatMetadataProcessor';

export default abstract class VatBase {
  public abstract readonly vatType: VatType;

  public readonly name: string;

  public readonly frameCount: number = 1.0;
  public readonly frameRate: number = 30.0;
  public readonly vertexCount: number = 0.0;

  public readonly mesh: Mesh;
  public readonly material:
    | PBRMaterial
    | (ShaderMaterial & {
        albedoTexture?: Texture;
        emissiveColor?: Color4;
        emissiveTexture?: Texture;
      });

  protected bufferManager: VatBufferManager;

  protected glowLayerAfterRenderObserver?: Observer<AbstractMesh>;
  protected glowLayerBeforeRenderObserver?: Observer<AbstractMesh>;

  protected _dynamicInputs: VatDynamicInputs = {
    enableGlowLayer: false,
    enablePlayback: false,
    playbackSpeed: 1,
    time: 0,
  };

  protected _isEnabled: boolean = true;

  constructor(
    public readonly scene: Scene,
    assets: VatAssets,
    instanceCount: number = 0
  ) {
    this.name = assets.name;

    this.frameCount = assets.vatConfig.staticInputs.frameCount as number;
    this.frameRate = assets.vatConfig.staticInputs.frameRate as number;
    this.vertexCount = assets.vatConfig.staticInputs.vertexCount as number;

    this.bufferManager = new VatBufferManager(scene, assets.vatConfig);

    ensureVertexColors(assets.mesh);

    this.mesh = assets.mesh;
    this.mesh.name = `${this.name}_Mesh`;

    this.material = this.createVatMaterial(assets.textures);

    this.mesh.material = this.material;
  }

  public set speed(playbackSpeed: number) {
    this._dynamicInputs.playbackSpeed = playbackSpeed;
  }

  public set time(time: number) {
    this._dynamicInputs.time = time;
  }

  public attachGlowLayer(
    glowLayer: GlowLayer,
    enableRenderObserver = true,
  ): void {
    if (this.material) {
      glowLayer.addIncludedOnlyMesh(this.mesh);
      glowLayer.referenceMeshToUseItsOwnMaterial(this.mesh);
      if (enableRenderObserver) {
        this.glowLayerBeforeRenderObserver = (
          glowLayer as GlowLayer
        ).onBeforeRenderMeshToEffect.add(() => {
          this._dynamicInputs.enableGlowLayer = true;
          this.updateDynamicInputs(this._dynamicInputs);
        });
        this.glowLayerAfterRenderObserver = (
          glowLayer as GlowLayer
        ).onAfterRenderMeshToEffect.add(() => {
          this._dynamicInputs.enableGlowLayer = false;
          this.updateDynamicInputs(this._dynamicInputs);
        });
      }
    }
  }

  public dispose(): void {
    this.glowLayerAfterRenderObserver?.remove();
    this.glowLayerAfterRenderObserver = undefined;
    this.glowLayerBeforeRenderObserver?.remove();
    this.glowLayerBeforeRenderObserver = undefined;

    this.bufferManager.dispose();

    this.material.dispose(true, true);
    this.mesh.dispose();
  }

  public setEnabled(enabled: boolean): void {
    this._isEnabled = enabled;
    this._dynamicInputs.enablePlayback = enabled;
    this._dynamicInputs.time = 0;
    this.mesh.isVisible = enabled;
  }

  public update(time: number): void {
    if (!this._isEnabled) return;
    this._update(time);
  }

  protected createInstances(instanceCount: number): void {
    const matrices = new Float32Array(instanceCount * 16);
    const identity = Matrix.Identity();
    for (let i = 0; i < instanceCount; i++) {
      identity.copyToArray(matrices, i * 16);
    }
    this.mesh.thinInstanceSetBuffer('matrix', matrices, 16);
  }

  protected createPBRMaterial(): PBRMaterial {
    const material = new PBRMaterial(this.name + '_material', this.scene);
    material.albedoTexture = getDefaultTexture(this.scene);
    material.alpha = 1.0;
    material.alphaMode = Constants.ALPHA_COMBINE;
    material.albedoColor = new Color3(1, 1, 1);
    material.reflectivityColor = new Color3(0, 0, 0);
    material.transparencyMode = PBRMaterial.PBRMATERIAL_OPAQUE;
    material.useAlphaFromAlbedoTexture = true;

    return material;
  }

  protected abstract createVatMaterial(
    textures: Record<string, VatTexture>
  ): PBRMaterial | ShaderMaterial;

  protected _update(time: number): void {
    this.time = time;
    this.updateDynamicInputs(this._dynamicInputs);
  }

  protected updateDynamicInputs(data: VatDynamicInputs): void {
    this.bufferManager.updateDynamicInputs(data);
  }

  public static async loadAssets(
    scene: Scene,
    rootPath: string,
    assetName: string
  ): Promise<VatAssets> {
    try {
      const metadata = await this.loadMetadata(rootPath, assetName);
      const { name, type, overrides } =
        VatMetadataProcessor.processMetadata(metadata);

      const { container, mesh } = await this.loadMesh(
        scene,
        rootPath,
        assetName
      );

      if (!overrides.isTexHdr && overrides.useRightHandedCoordinates) {
        // remove parent for ldr animations
        mesh.parent = null;
      }

      const defaultConfig = VatDataManager.getDefaultData(type);
      const vatConfig = {
        dynamicInputs: defaultConfig.dynamicInputs,
        staticInputs: { ...defaultConfig.staticInputs, ...overrides },
        textureConfig: VatDataManager.updateTextureConfig(
          defaultConfig.textureConfig,
          Boolean(overrides.usePos2),
          Boolean(overrides.useSpareColor)
        ),
      };

      const texConfig = vatConfig.textureConfig;
      const staticInputs = vatConfig.staticInputs;

      this.loadTextureFormats(texConfig, {
        isTexHdr: Boolean(staticInputs.isTexHdr),
        isColorTexHdr:
          Boolean(staticInputs.isColorTexHdr) ||
          VatGlobalConfiguration.defaultColorTexHdr,
        isLookupTexHdr: Boolean(staticInputs.isLookupTexHdr),
      });

      const textures = await this.loadTexturesSafely(
        scene,
        rootPath,
        assetName,
        texConfig
      );

      const assets: VatAssets = {
        name,
        mesh,
        textures,
        container,
        vatConfig,
      };
      return assets;
    } catch (error) {
      console.error(`${this.name}: Failed to load VAT assets:`, error);
      throw error;
    }
  }

  protected static async loadMesh(
    scene: Scene,
    rootPath: string,
    assetName: string
  ): Promise<{ container: AssetContainer; mesh: Mesh }> {
    const meshPath = `${rootPath}${assetName}/${assetName}_mesh.glb`;
    const container = await loadAssetContainer(meshPath, scene);
    container.addAllToScene();

    const exportRootNode = container.rootNodes[0] as Mesh;
    const mesh = exportRootNode.getChildMeshes()[0] as Mesh;
    mesh.isVisible = false;

    return { container, mesh };
  }

  protected static async loadMetadata(
    rootPath: string,
    assetName: string
  ): Promise<VatMetadata> {
    try {
      const response = await fetch(
        `${rootPath}${assetName}/${assetName}_data.json`
      );
      if (!response.ok) {
        throw new Error(
          `${this.name}: Failed to load metadata: ${response.statusText}`
        );
      }

      const data = await response.json();
      const rawMetadata = data[0];
      const metadata: VatMetadata = Object.assign({}, rawMetadata);
      return metadata;
    } catch (error) {
      console.error(`${this.name}: Failed to load metadata:`, error);
      throw error;
    }
  }

  private static loadTextureFormats(
    texConfig: VatTextureConfig,
    flags: {
      isTexHdr: boolean;
      isColorTexHdr: boolean;
      isLookupTexHdr: boolean;
    }
  ): void {
    const { isTexHdr, isColorTexHdr, isLookupTexHdr } = flags;

    const textureFlags: Array<[VatTextureKey, boolean]> = [
      ['vatColTex', isTexHdr && isColorTexHdr],
      ['vatEmissiveTex', isTexHdr && isColorTexHdr],
      ['vatLookupTex', isLookupTexHdr],
      ['vatPosTex', isTexHdr],
      ['vatPos2Tex', isTexHdr],
      ['vatRotTex', isTexHdr],
      ['vatSpareColTex', isTexHdr && isColorTexHdr],
    ];

    if (textureFlags.some(([, hdr]) => hdr)) {
      ExrLoaderGlobalConfiguration.DefaultOutputType = EXROutputType.Float;
    }

    for (const [key, hdr] of textureFlags) {
      const samplerConfig = texConfig[key];
      if (!samplerConfig) continue;
      samplerConfig.format = hdr ? 'exr' : 'png';
    }
  }

  protected static async loadTexturesSafely(
    scene: Scene,
    rootPath: string,
    assetName: string,
    config: VatTextureConfig
  ): Promise<Record<VatTextureKey, VatTexture>> {
    const textures = {} as Record<VatTextureKey, VatTexture>;

    for (const key of VAT_TEXTURE_KEYS) {
      const samplerConfig = config[key];
      if (samplerConfig) {
        const fileName = samplerConfig.name;
        const format = samplerConfig.format || 'png';
        const path = `${rootPath}${assetName}/${assetName}${fileName}.${format}`;
        try {
          const textureSampler = new TextureSampler();
          textureSampler.setParameters();
          textureSampler.samplingMode = samplerConfig.samplingMode;

          const texture =
            key === 'vatLookupTex' && format === 'png'
              ? await loadRawPngTexture(path, scene, {
                  samplingMode: samplerConfig.samplingMode,
                })
              : await loadTexture(path, scene, {
                  gammaSpace:
                    key === 'vatColTex' ||
                    key === 'vatEmissiveTex' ||
                    key === 'vatSpareColTex'
                      ? true
                      : false,
                  invertY: false,
                  noMipmap: true,
                  samplingMode: samplerConfig.samplingMode,
                  textureFormat: undefined,
                });

          if (!texture.isReady()) {
            await new Promise<void>(resolve => {
              texture.onLoadObservable.addOnce(() => resolve());
            });
          }

          textures[key] = {
            texture,
            sampler: textureSampler,
          };
          continue;
        } catch (error) {
          console.warn(`${this.name}: Failed to load texture ${path}:`, error);
        }
      }
      textures[key] = {
        texture: getDefaultTexture(scene),
        sampler: getDefaultSampler(),
      };
    }

    return textures;
  }

  public static unloadAssets(assets: VatAssets): void {
    assets.container.dispose();
  }
}
