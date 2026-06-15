// Copyright (c) Floating World, LDA. All Rights Reserved.

// var<uniform> declarations are intentionally absent here.
// Three.js generates `var<uniform> vat3StaticInputs` and
// `var<uniform> vat3DynamicInputs` from the uniformGroup() nodes in
// VatBufferManager.  Declaring them again would cause a WGSL compile error.

fn getVat3Inputs(vertInput: Vat3_VertexInputs) -> Vat3_StaticInputs {
  // Construct a fully-typed Vat3_StaticInputs by copying each field from the
  // auto-generated uniform struct.  Explicit u32() casts are required for flag
  // fields because the uniformGroup-generated struct types may differ from the
  // declared Vat3_StaticInputs field types.
  var result: Vat3_StaticInputs;

  result.additionalObjectSpaceOffset                 = vat3StaticInputs.additionalObjectSpaceOffset;
  result.additionalParticleScaleUniformMultiplier    = vat3StaticInputs.additionalParticleScaleUniformMultiplier;
  result.animateFirstFrame                           = u32(vat3StaticInputs.animateFirstFrame);
  result.boundMax                                    = vat3StaticInputs.boundMax;
  result.boundMin                                    = vat3StaticInputs.boundMin;
  result.computeSpinfromHeadingVector                = u32(vat3StaticInputs.computeSpinfromHeadingVector);
  result.displayFrame                                = vat3StaticInputs.displayFrame;
  result.enablePlayback                              = u32(vat3StaticInputs.enablePlayback);
  result.frameCount                                  = vat3StaticInputs.frameCount;
  result.frameRate                                   = vat3StaticInputs.frameRate;
  result.gameTimeAtFirstFrame                        = vat3StaticInputs.gameTimeAtFirstFrame;
  result.globalParticlePiecesScaleMultiplier         = vat3StaticInputs.globalParticlePiecesScaleMultiplier;
  result.hideParticlesOverlappingObjectOrigin        = u32(vat3StaticInputs.hideParticlesOverlappingObjectOrigin);
  result.inputTime                                   = vat3StaticInputs.inputTime;
  result.instance                                    = u32(vat3StaticInputs.instance);
  result.instanceCount                               = vat3StaticInputs.instanceCount;
  result.instanceUpdateDynamicData                   = u32(vat3StaticInputs.instanceUpdateDynamicData);
  result.interframeInterpolation                     = u32(vat3StaticInputs.interframeInterpolation);
  result.interpolateColor                            = u32(vat3StaticInputs.interpolateColor);
  result.interpolateSpareColor                       = u32(vat3StaticInputs.interpolateSpareColor);
  result.isColorTexHdr                               = u32(vat3StaticInputs.isColorTexHdr);
  result.isLookupTexHdr                              = u32(vat3StaticInputs.isLookupTexHdr);
  result.isTexHdr                                    = u32(vat3StaticInputs.isTexHdr);
  result.modelViewMatrix                             = vat3StaticInputs.modelViewMatrix;
  result.noLerping                                   = u32(vat3StaticInputs.noLerping);
  result.originEffectiveRadius                       = vat3StaticInputs.originEffectiveRadius;
  result.particleHeightBaseScale                     = vat3StaticInputs.particleHeightBaseScale;
  result.particlePiecesScaleAreInPositionAlpha       = u32(vat3StaticInputs.particlePiecesScaleAreInPositionAlpha);
  result.particleShardCount                          = vat3StaticInputs.particleShardCount;
  result.particleShardIndex                          = vat3StaticInputs.particleShardIndex;
  result.particleShards                              = u32(vat3StaticInputs.particleShards);
  result.particleSpinPhase                           = vat3StaticInputs.particleSpinPhase;
  result.particleTextureUScale                       = vat3StaticInputs.particleTextureUScale;
  result.particleTextureVScale                       = vat3StaticInputs.particleTextureVScale;
  result.particleWidthBaseScale                      = vat3StaticInputs.particleWidthBaseScale;
  result.perParticleRandomSpinSpeed                  = vat3StaticInputs.perParticleRandomSpinSpeed;
  result.perParticleRandomVelocityScale              = vat3StaticInputs.perParticleRandomVelocityScale;
  result.playbackSpeed                               = vat3StaticInputs.playbackSpeed;
  result.scalebyVelocityAmount                       = vat3StaticInputs.scalebyVelocityAmount;
  result.spinFromHeading                             = u32(vat3StaticInputs.spinFromHeading);
  result.stretchByVelocity                           = u32(vat3StaticInputs.stretchByVelocity);
  result.stretchByVelocityAmount                     = vat3StaticInputs.stretchByVelocityAmount;
  result.supportSurfaceNormalMaps                    = u32(vat3StaticInputs.supportSurfaceNormalMaps);
  result.surfaceNormals                              = u32(vat3StaticInputs.surfaceNormals);
  result.surfaceUVsfromColorRG                       = u32(vat3StaticInputs.surfaceUVsfromColorRG);
  result.useAlphaForVelocityScale                    = u32(vat3StaticInputs.useAlphaForVelocityScale);
  result.useColorForVelocity                         = u32(vat3StaticInputs.useColorForVelocity);
  result.useCompressedNormals                        = u32(vat3StaticInputs.useCompressedNormals);
  result.useLookup                                   = u32(vat3StaticInputs.useLookup);
  result.useParticleBillboarding                     = u32(vat3StaticInputs.useParticleBillboarding);
  result.useParticleVelocitySpin                     = u32(vat3StaticInputs.useParticleVelocitySpin);
  result.usePos2                                     = u32(vat3StaticInputs.usePos2);
  result.useRightHandedCoordinates                   = u32(vat3StaticInputs.useRightHandedCoordinates);
  result.useSpareColor                               = u32(vat3StaticInputs.useSpareColor);
  result.vertexCount                                 = vat3StaticInputs.vertexCount;
  result.viewToModelMatrix                           = vat3StaticInputs.viewToModelMatrix;
  result.worldViewProjection                         = vat3StaticInputs.worldViewProjection;

  // Per-vertex random value: stable across frames, derived from vertex index.
  let vertexIndex = f32(vertInput.texCoord1.x);
  let vertexCount = f32(vat3StaticInputs.vertexCount);
  let random: f32 = randomFloat(vec2<f32>(vertexIndex / vertexCount, 1.0));

  // Dynamic overrides — these fields are re-computed each frame.
  result.enablePlayback              = u32(vat3DynamicInputs.enablePlayback);
  result.inputTime                   = vat3DynamicInputs.time;
  result.modelViewMatrix             = vat3DynamicInputs.modelViewMatrix;
  result.perParticleRandomSpinSpeed  = random * 0.2 - 0.1;
  result.perParticleRandomVelocityScale = random * 0.5 + 1.0;
  result.playbackSpeed               = vat3DynamicInputs.playbackSpeed;
  result.viewToModelMatrix           = vat3DynamicInputs.viewToModelMatrix;

  return result;
}
