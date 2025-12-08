// Copyright (c) Floating World, LDA. All Rights Reserved.

import type { AssetContainer } from '@babylonjs/core/assetContainer';
import type { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Texture } from '@babylonjs/core/Materials/Textures';
import type { TextureSampler } from '@babylonjs/core/Materials/Textures/textureSampler';

import type { UniformValue } from 'utils/shaders';

export const VAT_TEXTURE_KEYS: VatTextureKey[] = [
  'vatColTex',
  'vatLookupTex',
  'vatPosTex',
  'vatPos2Tex',
  'vatRotTex',
  'vatSpareColTex',
];

export interface VatMetadata {
  'Axis System'?: string;
  'Bound Max X'?: number;
  'Bound Max Y'?: number;
  'Bound Max Z'?: number;
  'Bound Min X'?: number;
  'Bound Min Y'?: number;
  'Bound Min Z'?: number;
  'Frame Count'?: number;
  'Houdini FPS'?: number;
  Name?: string;
  'Particle Shard Count'?: number;
  'Spare Color Texture'?: boolean;
  'Two Position Textures'?: boolean;
  'Use HDR Textures'?: boolean;
  'VAT Type'?: string;
  'Vertex Count'?: number;
  [key: string]: unknown;
}

export type VatTextureFormat = 'exr' | 'png';

export type VatTextureKey =
  | 'vatColTex'
  | 'vatLookupTex'
  | 'vatPosTex'
  | 'vatPos2Tex'
  | 'vatRotTex'
  | 'vatSpareColTex';

export enum VatType {
  Particles = 'Particles',
  Rigidbody = 'Rigidbody',
  DynamicMesh = 'DynamicMesh',
  Softbody = 'Softbody',
}

export interface VatAssets {
  name: string;
  mesh: Mesh;
  textures: Record<string, VatTexture>;
  container: AssetContainer;
  vatConfig: VatConfig;
}

export type VatDynamicInputs = Record<
  keyof {
    enablePlayback: boolean;
    playbackSpeed: number;
    time: number;
    _pad: number;
    modelViewMatrix: Matrix;
    viewToModelMatrix: Matrix;
  },
  UniformValue
>;

export type VatInstanceData = {
  position: Vector3;
  forward: Vector3;
  velocity: Vector3;
};

export type VatInstanceDynamicData = {
  enablePlayback: number;
  playbackSpeed: number;
  time: number;
  pad?: number;
};

export interface VatTexture {
  sampler: TextureSampler;
  texture: Texture;
}

export type VatTextureConfig = Partial<
  Record<
    VatTextureKey,
    { format?: VatTextureFormat; name: string; samplingMode: number }
  >
>;

export type VatStaticInputs = Record<
  keyof {
    animateFirstFrame: boolean;
    displayFrame: number;
    enablePlayback: boolean;
    frameCount: number;
    frameRate: number;
    gameTimeAtFirstFrame: number;
    inputTime: number;
    noLerping: boolean;
    playbackSpeed: number;

    // Bounds and scaling
    boundMin: Vector3;
    boundMax: Vector3;
    globalParticlePiecesScaleMultiplier: number;
    additionalParticleScaleUniformMultiplier: number;

    // Particle-specific parameters
    hideParticlesOverlappingObjectOrigin: boolean;
    originEffectiveRadius: number;
    particleHeightBaseScale: number;
    particleWidthBaseScale: number;
    particlePiecesScaleAreInPositionAlpha: boolean;
    particleShards: boolean;
    particleShardCount: number;
    particleShardIndex: number;
    particleSpinPhase: number;
    particleTextureUScale: number;
    particleTextureVScale: number;
    scalebyVelocityAmount: number;
    spinFromHeading: boolean;
    surfaceNormals: boolean;
    useParticleBillboarding: boolean;
    useParticleVelocitySpin: boolean;

    // Instance parameters
    instance: boolean;
    instanceCount: number;
    instanceUpdateDynamicData: boolean;

    // Interpolation parameters
    interframeInterpolation: boolean;
    interpolateColor: boolean;
    interpolateSpareColor: boolean;

    // HDR texture parameters
    isColorTexHdr: boolean;
    isLookupTexHdr: boolean;
    isTexHdr: boolean;

    // Matrix parameters
    modelViewMatrix: Matrix;
    viewToModelMatrix: Matrix;
    worldViewProjection: Matrix;

    // Additional parameters
    additionalObjectSpaceOffset: Vector3;
    computeSpinfromHeadingVector: boolean;
    perParticleRandomSpinSpeed: number;
    perParticleRandomVelocityScale: number;
    stretchByVelocity: boolean;
    stretchByVelocityAmount: number;
    supportSurfaceNormalMaps: boolean;
    surfaceUVsfromColorRG: boolean;
    useAlphaForVelocityScale: boolean;
    useColorForVelocity: boolean;
    useCompressedNormals: boolean;
    useLookup: boolean;
    usePos2: boolean;
    useRightHandedCoordinates: boolean;
    useSpareColor: boolean;
    vertexCount: number;
  },
  UniformValue
>;

export interface VatConfig {
  dynamicInputs: VatDynamicInputs;
  staticInputs: VatStaticInputs;
  textureConfig: VatTextureConfig;
}
