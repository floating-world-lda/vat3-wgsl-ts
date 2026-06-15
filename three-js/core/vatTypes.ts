// Copyright (c) Floating World, LDA. All Rights Reserved.

import type { Group, Matrix4, Mesh, Texture, Vector3 } from 'three';

export const VAT_TEXTURE_KEYS: VatTextureKey[] = [
  'vatColTex',
  'vatLookupTex',
  'vatPos2Tex',
  'vatPosTex',
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
  | 'vatPos2Tex'
  | 'vatPosTex'
  | 'vatRotTex'
  | 'vatSpareColTex';

export const VatType = {
  DynamicMesh: 'DynamicMesh',
  Particles: 'Particles',
  Rigidbody: 'Rigidbody',
  Softbody: 'Softbody',
} as const;
export type VatType = (typeof VatType)[keyof typeof VatType];

export interface VatGltfAsset {
  mesh: Mesh;
  scene: Group;
}

export interface VatAssets {
  gltf: VatGltfAsset;
  name: string;
  textures: Record<string, VatTexture>;
  vatConfig: VatConfig;
}

export type UniformValue = boolean | Matrix4 | number | Texture | Vector3;

export interface VatDynamicInputs {
  enablePlayback: boolean;
  playbackSpeed: number;
  time: number;
  _pad: number;
  modelViewMatrix: Matrix4;
  viewToModelMatrix: Matrix4;
}

export interface VatInstanceData {
  forward: Vector3;
  position: Vector3;
  velocity: Vector3;
}

export interface VatInstanceDynamicData {
  enablePlayback: number;
  pad?: number;
  playbackSpeed: number;
  time: number;
}

export interface VatTexture {
  texture: Texture;
}

export type VatTextureConfig = Partial<
  Record<
    VatTextureKey,
    { format?: VatTextureFormat; name: string; samplingMode: number }
  >
>;

export interface VatStaticInputs {
  additionalObjectSpaceOffset: Vector3;
  additionalParticleScaleUniformMultiplier: number;
  animateFirstFrame: boolean;
  boundMax: Vector3;
  boundMin: Vector3;
  computeSpinfromHeadingVector: boolean;
  displayFrame: number;
  enablePlayback: boolean;
  frameCount: number;
  frameRate: number;
  gameTimeAtFirstFrame: number;
  globalParticlePiecesScaleMultiplier: number;
  hideParticlesOverlappingObjectOrigin: boolean;
  inputTime: number;
  instance: boolean;
  instanceCount: number;
  instanceUpdateDynamicData: boolean;
  interframeInterpolation: boolean;
  interpolateColor: boolean;
  interpolateSpareColor: boolean;
  isColorTexHdr: boolean;
  isLookupTexHdr: boolean;
  isTexHdr: boolean;
  modelViewMatrix: Matrix4;
  noLerping: boolean;
  originEffectiveRadius: number;
  particleHeightBaseScale: number;
  particlePiecesScaleAreInPositionAlpha: boolean;
  particleShardCount: number;
  particleShardIndex: number;
  particleShards: boolean;
  particleSpinPhase: number;
  particleTextureUScale: number;
  particleTextureVScale: number;
  particleWidthBaseScale: number;
  perParticleRandomSpinSpeed: number;
  perParticleRandomVelocityScale: number;
  playbackSpeed: number;
  scalebyVelocityAmount: number;
  spinFromHeading: boolean;
  stretchByVelocity: boolean;
  stretchByVelocityAmount: number;
  supportSurfaceNormalMaps: boolean;
  surfaceNormals: boolean;
  surfaceUVsfromColorRG: boolean;
  useAlphaForVelocityScale: boolean;
  useColorForVelocity: boolean;
  useCompressedNormals: boolean;
  useLookup: boolean;
  useParticleBillboarding: boolean;
  useParticleVelocitySpin: boolean;
  usePos2: boolean;
  useRightHandedCoordinates: boolean;
  useSpareColor: boolean;
  vertexCount: number;
  viewToModelMatrix: Matrix4;
  worldViewProjection: Matrix4;
}

export interface VatConfig {
  dynamicInputs: VatDynamicInputs;
  staticInputs: VatStaticInputs;
  textureConfig: VatTextureConfig;
}
