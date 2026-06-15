// Copyright (c) Floating World, LDA. All Rights Reserved.

struct Vat3_AnimationData {
  animProgressNextFrame: f32,
  animProgressThisFrame: f32,
  currentFrame: f32,
  currentFramePlusOne: f32,
  frameCount: f32,
  frameCountInverse: f32,
  loopedAnimFrame: f32,
  timeElapsed: f32,
}

struct Vat3_DynamicInputs {
  enableGlowLayer: u32,
  enablePlayback: u32,
  playbackSpeed: f32,
  time: f32,
}

struct Vat3_Outputs {
  outAnimationProgress: vec3<f32>,
  outColorAndAlpha: vec4<f32>,
  outNormal: vec3<f32>,
  outPosition: vec3<f32>,
  outSpareColorAndAlpha: vec4<f32>,
  outTangent: vec3<f32>,
  surfaceUv: vec2<f32>,
}

struct Vat3_Bounds {
  boundMin: vec3<f32>,
  boundMax: vec3<f32>,
}

struct Vat3_ParticleDirection {
  particleRightDir: vec3<f32>,
  particleUpDir: vec3<f32>,
}

struct Vat3_ParticleScale {
  baseScale: f32,
  finalScale: f32,
}

struct Vat3_PScaleData {
  clampedPScaleNextFrame: f32,
  clampedPScaleThisFrame: f32,
  maxDataPScale: f32,
  posAlphaNextFrame: f32,
  posAlphaThisFrame: f32,
  pScaleNextFrame: f32,
  pScaleThisFrame: f32,
}

struct Vat3_StaticInputs {
  additionalObjectSpaceOffset: vec3<f32>,
  additionalParticleScaleUniformMultiplier: f32,
  animateFirstFrame: u32,
  boundMax: vec3<f32>,
  boundMin: vec3<f32>,
  computeSpinfromHeadingVector: u32,
  displayFrame: f32,
  enablePlayback: u32,
  frameCount: f32,
  frameRate: f32,
  gameTimeAtFirstFrame: f32,
  globalParticlePiecesScaleMultiplier: f32,
  hideParticlesOverlappingObjectOrigin: u32,
  inputTime: f32,
  instance: u32,
  instanceCount: f32,
  instanceUpdateDynamicData: u32,
  interframeInterpolation: u32,
  interpolateColor: u32,
  interpolateSpareColor: u32,
  isColorTexHdr: u32,
  isLookupTexHdr: u32,
  isTexHdr: u32,
  modelViewMatrix: mat4x4<f32>,
  noLerping: u32,
  originEffectiveRadius: f32,
  particleHeightBaseScale: f32,
  particlePiecesScaleAreInPositionAlpha: u32,
  particleShards: u32,
  particleShardCount: f32,
  particleShardIndex: f32,
  particleSpinPhase: f32,
  particleTextureUScale: f32,
  particleTextureVScale: f32,
  particleWidthBaseScale: f32,
  perParticleRandomSpinSpeed: f32,
  perParticleRandomVelocityScale: f32,
  playbackSpeed: f32,
  scalebyVelocityAmount: f32,
  spinFromHeading: u32,
  stretchByVelocity: u32,
  stretchByVelocityAmount: f32,
  supportSurfaceNormalMaps: u32,
  surfaceNormals: u32,
  surfaceUVsfromColorRG: u32,
  useAlphaForVelocityScale: u32,
  useColorForVelocity: u32,
  useCompressedNormals: u32,
  useLookup: u32,
  useParticleBillboarding: u32,
  useParticleVelocitySpin: u32,
  usePos2: u32,
  useRightHandedCoordinates: u32,
  useSpareColor: u32,
  vertexCount: f32,
  viewToModelMatrix: mat4x4<f32>,
}

struct Vat3_SurfaceData {
  normal: vec3<f32>,
  tangent: vec3<f32>,
}

struct Vat3_TexturesData {
  colorNextFrame: vec4<f32>,
  colorThisFrame: vec4<f32>,
  lookupNextFrame: vec4<f32>,
  lookupThisFrame: vec4<f32>,
  pos2NextFrame: vec3<f32>,
  pos2ThisFrame: vec3<f32>,
  posNextFrame: vec4<f32>,
  posThisFrame: vec4<f32>,
  rotNextFrame: vec4<f32>,
  rotThisFrame: vec4<f32>,
  spareColorNextFrame: vec4<f32>,
  spareColorThisFrame: vec4<f32>,
}

struct Vat3_UVs {
  nextFrameUv: vec2<f32>,
  thisFrameUv: vec2<f32>,
}

struct Vat3_VelocityData {
  direction: vec3<f32>,
  velocity: vec3<f32>,
}

struct Vat3_VertexInputs {
  texCoord0: vec2<f32>,
  texCoord1: vec2<f32>,
  texCoord2: vec2<f32>,
  texCoord3: vec2<f32>,
  vertexNormal: vec3<f32>,
  vertexPosition: vec3<f32>,
  vertexTangent: vec3<f32>,
}