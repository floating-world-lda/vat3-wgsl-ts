// Copyright (c) Floating World, LDA. All Rights Reserved.

import { Matrix4, Vector3 } from 'three';

import {
  VatType,
  type VatConfig,
  type VatDynamicInputs,
  type VatInstanceData,
  type VatInstanceDynamicData,
  type VatStaticInputs,
  type VatTextureConfig,
} from './vatTypes';
import { NEAREST_NEAREST } from '../utils/texture';

export default class VatDataManager {
  private static defaultData: Record<VatType, VatConfig> =
    VatDataManager.initializeDefaultData();

  public static getDefaultData(vatType: VatType): VatConfig {
    return this.defaultData[vatType];
  }

  public static getDefaultDynamicInputs(): VatDynamicInputs {
    return {
      enablePlayback: false,
      playbackSpeed: 1.0,
      time: 0,
      _pad: 0,
      modelViewMatrix: new Matrix4(),
      viewToModelMatrix: new Matrix4(),
    };
  }

  public static getDefaultInstanceData(instanceCount: number): Float32Array {
    const initialData = new Float32Array(instanceCount * 12);

    for (let i = 0; i < instanceCount; i++) {
      const baseIndex = i * 12;
      const forward = new Vector3(0, 0, 1);
      const position = new Vector3(0, 0, 0);

      initialData[baseIndex + 0] = forward.x;
      initialData[baseIndex + 1] = forward.y;
      initialData[baseIndex + 2] = forward.z;
      initialData[baseIndex + 3] = 0.0;

      initialData[baseIndex + 4] = position.x;
      initialData[baseIndex + 5] = position.y;
      initialData[baseIndex + 6] = position.z;
      initialData[baseIndex + 7] = 1.0;

      initialData[baseIndex + 8] = 0.0;
      initialData[baseIndex + 9] = 0.0;
      initialData[baseIndex + 10] = 0.0;
      initialData[baseIndex + 11] = 1.0;
    }

    return initialData;
  }

  public static getDefaultInstanceDynamicData(
    instanceCount: number
  ): Float32Array {
    const floatsPerInstance = 4;
    const initialData = new Float32Array(instanceCount * floatsPerInstance);

    for (let i = 0; i < instanceCount; i++) {
      const baseIndex = i * floatsPerInstance;
      initialData[baseIndex + 0] = 0.0; // enablePlayback
      initialData[baseIndex + 1] = 1.0; // playbackSpeed
      initialData[baseIndex + 2] = 0.0; // time
      initialData[baseIndex + 3] = 1.0; // _pad
    }

    return initialData;
  }

  public static getDefaultStaticInputs(): VatStaticInputs {
    return {
      additionalObjectSpaceOffset: new Vector3(0, 0, 0),
      additionalParticleScaleUniformMultiplier: 1.0,
      animateFirstFrame: false,
      boundMax: new Vector3(1, 1, 1),
      boundMin: new Vector3(0, 0, 0),
      computeSpinfromHeadingVector: false,
      displayFrame: 0,
      enablePlayback: true,
      frameCount: 1,
      frameRate: 30,
      gameTimeAtFirstFrame: 0,
      globalParticlePiecesScaleMultiplier: 1,
      hideParticlesOverlappingObjectOrigin: true,
      inputTime: 0,
      instance: false,
      instanceCount: 0,
      instanceUpdateDynamicData: false,
      interframeInterpolation: false,
      interpolateColor: true,
      interpolateSpareColor: true,
      isColorTexHdr: true,
      isLookupTexHdr: false,
      isTexHdr: false,
      modelViewMatrix: new Matrix4(),
      noLerping: false,
      originEffectiveRadius: 1,
      particleHeightBaseScale: 0.5,
      particlePiecesScaleAreInPositionAlpha: false,
      particleShardCount: 0,
      particleShardIndex: 0,
      particleShards: false,
      particleSpinPhase: 0,
      particleTextureUScale: 1,
      particleTextureVScale: 1,
      particleWidthBaseScale: 0.5,
      perParticleRandomSpinSpeed: 0,
      perParticleRandomVelocityScale: 0,
      playbackSpeed: 1.0,
      scalebyVelocityAmount: 0,
      spinFromHeading: false,
      stretchByVelocity: true,
      stretchByVelocityAmount: 1.0,
      supportSurfaceNormalMaps: true,
      surfaceNormals: true,
      surfaceUVsfromColorRG: false,
      useAlphaForVelocityScale: false,
      useColorForVelocity: false,
      useCompressedNormals: true,
      useLookup: false,
      useParticleBillboarding: true,
      useParticleVelocitySpin: false,
      usePos2: false,
      useRightHandedCoordinates: true,
      useSpareColor: false,
      vertexCount: 0,
      viewToModelMatrix: new Matrix4(),
      worldViewProjection: new Matrix4(),
    };
  }

  public static initializeDefaultData(): Record<VatType, VatConfig> {
    const dynamicMeshStaticInputs = this.getDefaultStaticInputs();

    return {
      [VatType.DynamicMesh]: {
        dynamicInputs: this.getDefaultDynamicInputs(),
        staticInputs: {
          ...dynamicMeshStaticInputs,
          useLookup: true,
          noLerping: true,
          supportSurfaceNormalMaps: true,
          surfaceNormals: true,
          useCompressedNormals: false,
        },
        textureConfig: {
          vatColTex: { name: '_col', samplingMode: NEAREST_NEAREST },
          vatPosTex: { name: '_pos', samplingMode: NEAREST_NEAREST },
          vatRotTex: { name: '_rot', samplingMode: NEAREST_NEAREST },
          vatLookupTex: { name: '_lookup', samplingMode: NEAREST_NEAREST },
        },
      },
      [VatType.Particles]: {
        dynamicInputs: this.getDefaultDynamicInputs(),
        staticInputs: this.getDefaultStaticInputs(),
        textureConfig: {
          vatColTex: { name: '_col', samplingMode: NEAREST_NEAREST },
          vatPosTex: { name: '_pos', samplingMode: NEAREST_NEAREST },
        },
      },
      [VatType.Rigidbody]: {
        dynamicInputs: this.getDefaultDynamicInputs(),
        staticInputs: this.getDefaultStaticInputs(),
        textureConfig: {
          vatColTex: { name: '_col', samplingMode: NEAREST_NEAREST },
          vatPosTex: { name: '_pos', samplingMode: NEAREST_NEAREST },
          vatRotTex: { name: '_rot', samplingMode: NEAREST_NEAREST },
        },
      },
      [VatType.Softbody]: {
        dynamicInputs: this.getDefaultDynamicInputs(),
        staticInputs: {
          ...dynamicMeshStaticInputs,
          useCompressedNormals: dynamicMeshStaticInputs.isTexHdr,
        },
        textureConfig: {
          vatColTex: { name: '_col', samplingMode: NEAREST_NEAREST },
          vatPosTex: { name: '_pos', samplingMode: NEAREST_NEAREST },
          vatRotTex: { name: '_rot', samplingMode: NEAREST_NEAREST },
        },
      },
    };
  }

  public static updateInstanceData(
    instanceData: VatInstanceData[]
  ): Float32Array {
    const instanceCount = instanceData.length;
    const instanceFloatData = new Float32Array(instanceCount * 12);

    for (let i = 0; i < instanceCount; i++) {
      const baseIndex = i * 12;
      const { forward, position, velocity } = instanceData[i];

      instanceFloatData[baseIndex + 0] = forward.x;
      instanceFloatData[baseIndex + 1] = forward.y;
      instanceFloatData[baseIndex + 2] = forward.z;
      instanceFloatData[baseIndex + 3] = 0.0;

      instanceFloatData[baseIndex + 4] = position.x;
      instanceFloatData[baseIndex + 5] = position.y;
      instanceFloatData[baseIndex + 6] = position.z;
      instanceFloatData[baseIndex + 7] = 1.0;

      instanceFloatData[baseIndex + 8] = velocity.x;
      instanceFloatData[baseIndex + 9] = velocity.y;
      instanceFloatData[baseIndex + 10] = velocity.z;
      instanceFloatData[baseIndex + 11] = 1.0;
    }

    return instanceFloatData;
  }

  public static updateInstanceDynamicData(
    instanceDynamicData: VatInstanceDynamicData[]
  ): Float32Array {
    const instanceCount = instanceDynamicData.length;
    const instanceFloatData = new Float32Array(instanceCount * 4);

    for (let i = 0; i < instanceCount; i++) {
      const baseIndex = i * 4;
      instanceFloatData[baseIndex + 0] = instanceDynamicData[i].enablePlayback;
      instanceFloatData[baseIndex + 1] = instanceDynamicData[i].playbackSpeed;
      instanceFloatData[baseIndex + 2] = instanceDynamicData[i].time;
      instanceFloatData[baseIndex + 3] = instanceDynamicData[i].pad ?? 0.0;
    }

    return instanceFloatData;
  }

  public static updateTextureConfig({
    baseTextureConfig,
    usePos2 = false,
    useSpareColor = false,
  }: {
    baseTextureConfig: VatTextureConfig;
    usePos2?: boolean;
    useSpareColor?: boolean;
  }): VatTextureConfig {
    const augmentedConfig = { ...baseTextureConfig };

    if (usePos2) {
      augmentedConfig.vatPos2Tex = {
        name: '_pos2',
        samplingMode: NEAREST_NEAREST,
      };
    }

    if (useSpareColor) {
      augmentedConfig.vatSpareColTex = {
        name: '_col2',
        samplingMode: NEAREST_NEAREST,
      };
    }

    return augmentedConfig;
  }
}
