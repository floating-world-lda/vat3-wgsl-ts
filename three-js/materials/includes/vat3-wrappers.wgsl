// Copyright (c) Floating World, LDA. All Rights Reserved.

fn ApplyVat3_Deformation_DynamicMesh(
  vertInput: Vat3_VertexInputs,
  vatInputs: Vat3_StaticInputs,
  vatColTex:      texture_2d<f32>,
  vatLookupTex:   texture_2d<f32>,
  vatPos2Tex:     texture_2d<f32>,
  vatPosTex:      texture_2d<f32>,
  vatRotTex:      texture_2d<f32>,
  vatSpareColTex: texture_2d<f32>
) -> Vat3_Outputs {
  var vatOutputs: Vat3_Outputs;

  let animData = computeAnimationData(vatInputs);
  let uvs = computeUVs(vertInput.texCoord0, animData, vatInputs.isTexHdr != 0u, vec2<f32>(1.0, 1.0));

  let shouldInterpolate = vatInputs.noLerping == 0u && vatInputs.interframeInterpolation != 0u;
  let interpolationAlpha = select(0.0, fract(animData.currentFrame), shouldInterpolate);

  let isLookupHdr = vatInputs.isLookupTexHdr != 0u;
  let lookupThisFrame = vatLoad(vatLookupTex, uvs.thisFrameUv);

  var lookupNextFrame = lookupThisFrame;
  if (shouldInterpolate) {
    lookupNextFrame = vatLoad(vatLookupTex, uvs.nextFrameUv);
  }

  let thisFrameUv = decodeVatLookupUv(lookupThisFrame, isLookupHdr);
  let nextFrameUvCandidate = decodeVatLookupUv(lookupNextFrame, isLookupHdr);
  let nextFrameUv = select(thisFrameUv, nextFrameUvCandidate, shouldInterpolate);

  let usePos2 = vatInputs.usePos2 != 0u;
  let useSpareColor = vatInputs.useSpareColor != 0u;

  let textures = sampleVat3TexturesFromParams(
    thisFrameUv, nextFrameUv, !shouldInterpolate,
    false, usePos2, useSpareColor,
    vatColTex,
    vatLookupTex,
    vatPos2Tex,
    vatPosTex,
    vatRotTex,
    vatSpareColTex
  );

  let inputBoundsRange = vatInputs.boundMax - vatInputs.boundMin;
  let isTexHdr = vatInputs.isTexHdr != 0u;

  var thisFramePos = decodePosition(textures.posThisFrame, inputBoundsRange, vatInputs.boundMin, isTexHdr);
  var nextFramePos = decodePosition(textures.posNextFrame, inputBoundsRange, vatInputs.boundMin, isTexHdr);

  if (usePos2) {
    thisFramePos += textures.pos2ThisFrame;
    nextFramePos += textures.pos2NextFrame;
  }

  var vertexObjectPos = thisFramePos;
  if (shouldInterpolate) {
    vertexObjectPos = mix(thisFramePos, nextFramePos, interpolationAlpha);
  }
  vertexObjectPos += vatInputs.additionalObjectSpaceOffset;

  let interpolatedColorAndAlpha = interpolateColor(
    textures.colorThisFrame, textures.colorNextFrame,
    interpolationAlpha, vatInputs.interframeInterpolation, vatInputs.interpolateColor
  );

  let interpolatedSpareColor = interpolateColor(
    textures.spareColorThisFrame, textures.spareColorNextFrame,
    interpolationAlpha, vatInputs.interframeInterpolation, vatInputs.interpolateSpareColor
  );

  let surfaceData = computeTextureBasedNormals(animData, textures, vatInputs, interpolationAlpha, vertexObjectPos);

  let surfaceUv = resolveVatSurfaceUv(
    interpolatedColorAndAlpha,
    textures.posThisFrame.a,
    vatInputs.surfaceUVsfromColorRG != 0u
  );

  let interpolatedAnimationProgress = mix(animData.animProgressThisFrame, animData.animProgressNextFrame, interpolationAlpha);

  vatOutputs.outAnimationProgress = vec3<f32>(
    interpolatedAnimationProgress, animData.animProgressThisFrame, animData.animProgressNextFrame
  );
  vatOutputs.outPosition = select(vertexObjectPos, vec3<f32>(0.0, 0.0, 0.0),
    isVatPaddingVertex(vertInput.texCoord0, vatInputs.frameCount));
  vatOutputs.outNormal = surfaceData.normal;
  vatOutputs.outTangent = surfaceData.tangent;
  vatOutputs.surfaceUv = surfaceUv;
  vatOutputs.outColorAndAlpha = interpolatedColorAndAlpha;
  vatOutputs.outSpareColorAndAlpha = interpolatedSpareColor;

  return vatOutputs;
}

fn ApplyVat3_Deformation_Particles(
  vertInput: Vat3_VertexInputs,
  vatInputs: Vat3_StaticInputs,
  vatColTex:      texture_2d<f32>,
  vatLookupTex:   texture_2d<f32>,  // unused — always bound as 1×1 dummy
  vatPos2Tex:     texture_2d<f32>,  // unused — always bound as 1×1 dummy
  vatPosTex:      texture_2d<f32>,
  vatRotTex:      texture_2d<f32>,  // unused — always bound as 1×1 dummy
  vatSpareColTex: texture_2d<f32>
) -> Vat3_Outputs {
  var vatOutputs: Vat3_Outputs;

  let inputBoundsRange = vatInputs.boundMax - vatInputs.boundMin;
  let isTexHdr = vatInputs.isTexHdr != 0u;

  let animData = computeAnimationData(vatInputs);

  let activePixelsRatio = computeActivePixelsRatio(vatInputs.boundMin, vatInputs.boundMax);
  let uvs = computeUVs(vertInput.texCoord1, animData, isTexHdr, activePixelsRatio);

  let textures = sampleVat3TexturesFromParams(
    uvs.thisFrameUv, uvs.nextFrameUv, vatInputs.noLerping != 0u,
    false, false, true,
    vatColTex,
    vatLookupTex,
    vatPos2Tex,
    vatPosTex,
    vatRotTex,
    vatSpareColTex
  );

  let interpolationAlpha = fract(animData.currentFrame);

  let interpolatedAnimationProgress = mix(animData.animProgressThisFrame, animData.animProgressNextFrame, interpolationAlpha);
  let outAnimationProgress = vec3<f32>(interpolatedAnimationProgress, animData.animProgressThisFrame, animData.animProgressNextFrame);

  let thisFramePos = decodePosition(textures.posThisFrame, inputBoundsRange, vatInputs.boundMin, isTexHdr);
  let nextFramePos = decodePosition(textures.posNextFrame, inputBoundsRange, vatInputs.boundMin, isTexHdr);

  let pScaleData = computePScaleData(textures.posThisFrame, textures.posNextFrame, vatInputs.boundMax, vatInputs.noLerping != 0u, false);

  let interpolatedColorAndAlpha = interpolateColor(
    textures.colorThisFrame, textures.colorNextFrame,
    interpolationAlpha, vatInputs.interframeInterpolation, vatInputs.interpolateColor
  );

  let interpolatedSpareColor = interpolateColor(
    textures.spareColorThisFrame, textures.spareColorNextFrame,
    interpolationAlpha, vatInputs.interframeInterpolation, vatInputs.interpolateSpareColor
  );

  let particleEnabledThisFrame = clamp(sign(length(thisFramePos) - vatInputs.originEffectiveRadius), 0.0, 1.0);
  let particleEnabledNextFrame = clamp(sign(length(nextFramePos) - vatInputs.originEffectiveRadius), 0.0, 1.0);

  let velocityData = calculateVelocity(
    nextFramePos, thisFramePos,
    interpolatedColorAndAlpha,
    vatInputs.modelViewMatrix,
    vatInputs.perParticleRandomVelocityScale,
    vatInputs.useAlphaForVelocityScale != 0u,
    vatInputs.useColorForVelocity != 0u,
    false
  );

  let particleDirections = calculateParticleOrientation(velocityData, vatInputs);

  let particleScaleData = computeParticleScale(
    pScaleData, particleEnabledThisFrame, particleEnabledNextFrame, interpolationAlpha, vatInputs
  );

  let particleRelRightPos = particleDirections.particleRightDir * vatInputs.particleWidthBaseScale  * particleScaleData.finalScale * (vertInput.texCoord0.x - 0.5);
  let particleRelUpPos    = particleDirections.particleUpDir    * vatInputs.particleHeightBaseScale * particleScaleData.finalScale * (vertInput.texCoord0.y - 0.5);
  let particleFinalPos    = particleRelRightPos + particleRelUpPos + thisFramePos;

  let vertexObjectPos = particleFinalPos + vatInputs.additionalObjectSpaceOffset;

  let outNormal  = normalize((vatInputs.viewToModelMatrix * vec4<f32>(0.0, 0.0, 1.0, 0.0)).xyz);
  let outTangent = select(vec3<f32>(0.0, 0.0, 0.0), particleDirections.particleRightDir, vatInputs.supportSurfaceNormalMaps != 0u);

  let particleUvScale        = vec2<f32>(vatInputs.particleTextureUScale, vatInputs.particleTextureVScale);
  let particleUvScaleRemaped = particleUvScale * (-0.5) + vec2<f32>(0.5, 0.5);
  let surfaceUv              = particleUvScaleRemaped + vertInput.texCoord0 * particleUvScale;

  vatOutputs.outAnimationProgress = outAnimationProgress;
  vatOutputs.outColorAndAlpha = interpolatedColorAndAlpha;
  vatOutputs.outPosition = select(vertexObjectPos, vec3<f32>(0.0, 0.0, 0.0),
    isVatPaddingVertex(vertInput.texCoord1, vatInputs.frameCount));
  vatOutputs.outNormal = outNormal;
  vatOutputs.outSpareColorAndAlpha = interpolatedSpareColor;
  vatOutputs.outTangent = outTangent;
  vatOutputs.surfaceUv = surfaceUv;

  return vatOutputs;
}

fn ApplyVat3_Deformation_Rigidbody(
  vertInput: Vat3_VertexInputs,
  vatInputs: Vat3_StaticInputs,
  vatColTex:      texture_2d<f32>,
  vatLookupTex:   texture_2d<f32>,  // unused — always bound as 1×1 dummy
  vatPos2Tex:     texture_2d<f32>,
  vatPosTex:      texture_2d<f32>,
  vatRotTex:      texture_2d<f32>,
  vatSpareColTex: texture_2d<f32>
) -> Vat3_Outputs {
  var vatOutputs: Vat3_Outputs;

  let animData = computeAnimationData(vatInputs);
  let shouldInterpolate = vatInputs.noLerping == 0u && vatInputs.interframeInterpolation != 0u;
  let interpolationAlpha = select(0.0, fract(animData.currentFrame), shouldInterpolate);

  let activePixelsRatio = computeActivePixelsRatio(vatInputs.boundMin, vatInputs.boundMax);
  let uvs = computeUVs(vertInput.texCoord1, animData, vatInputs.isTexHdr != 0u, activePixelsRatio);

  let usePos2 = vatInputs.usePos2 != 0u;
  let useSpareColor = vatInputs.useSpareColor != 0u;

  let textures = sampleVat3TexturesFromParams(
    uvs.thisFrameUv, uvs.nextFrameUv, vatInputs.noLerping != 0u,
    false, usePos2, useSpareColor,
    vatColTex,
    vatLookupTex,
    vatPos2Tex,
    vatPosTex,
    vatRotTex,
    vatSpareColTex
  );

  let interpolatedAnimationProgress = mix(animData.animProgressThisFrame, animData.animProgressNextFrame, interpolationAlpha);
  let outAnimationProgress = vec3<f32>(interpolatedAnimationProgress, animData.animProgressThisFrame, animData.animProgressNextFrame);

  let inputBoundsRange = vatInputs.boundMax - vatInputs.boundMin;
  let isHdr = vatInputs.isTexHdr != 0u;

  var thisFramePos = decodePosition(textures.posThisFrame, inputBoundsRange, vatInputs.boundMin, isHdr);
  var nextFramePos = decodePosition(textures.posNextFrame, inputBoundsRange, vatInputs.boundMin, isHdr);

  if (usePos2) {
    thisFramePos += textures.pos2ThisFrame;
    nextFramePos += textures.pos2NextFrame;
  }

  var piecePosition = thisFramePos;
  if (shouldInterpolate) {
    piecePosition = mix(thisFramePos, nextFramePos, interpolationAlpha);
  }

  let quaternion = computeRigidQuaternion(textures, vatInputs, interpolationAlpha);
  let rotatedPivot = rotateVectorByQuaternion(getRigidPivot(vertInput), quaternion);

  let pScaleData = computePScaleData(
    textures.posThisFrame, textures.posNextFrame,
    vatInputs.boundMax, vatInputs.noLerping != 0u, true
  );

  var originalPScale = pScaleData.pScaleThisFrame;
  if (shouldInterpolate) {
    originalPScale = mix(pScaleData.pScaleThisFrame, pScaleData.pScaleNextFrame, interpolationAlpha);
  }
  let finalPScale = select(1.0, originalPScale, vatInputs.particlePiecesScaleAreInPositionAlpha != 0u);

  var stretchScale = vec3<f32>(1.0, 1.0, 1.0);
  if (vatInputs.stretchByVelocity != 0u && vatInputs.useColorForVelocity != 0u) {
    var velocityColor = textures.colorThisFrame;
    if (shouldInterpolate) {
      velocityColor = mix(textures.colorThisFrame, textures.colorNextFrame, interpolationAlpha);
    }
    let objectSpaceVelocity = vec3<f32>(-velocityColor.r, velocityColor.g, velocityColor.b);
    stretchScale = vec3<f32>(1.0, 1.0, 1.0) + abs(objectSpaceVelocity) * vatInputs.stretchByVelocityAmount;
  }

  let globalScale = vatInputs.globalParticlePiecesScaleMultiplier * finalPScale;
  let pieceVectorWithScale = rotatedPivot * (stretchScale * globalScale);
  let vertexObjectPos = pieceVectorWithScale + piecePosition + vatInputs.additionalObjectSpaceOffset;

  let interpolatedColorAndAlpha = interpolateColor(
    textures.colorThisFrame, textures.colorNextFrame,
    interpolationAlpha, vatInputs.interframeInterpolation, vatInputs.interpolateColor
  );

  let interpolatedSpareColor = interpolateColor(
    textures.spareColorThisFrame, textures.spareColorNextFrame,
    interpolationAlpha, vatInputs.interframeInterpolation, vatInputs.interpolateSpareColor
  );

  let rotatedNormal = normalize(rotateVectorByQuaternion(vertInput.vertexNormal, quaternion));
  let rotatedTangent = select(
    vec3<f32>(0.0, 0.0, 0.0),
    normalize(rotateVectorByQuaternion(vertInput.vertexTangent, quaternion)),
    vatInputs.supportSurfaceNormalMaps != 0u
  );

  vatOutputs.outAnimationProgress = outAnimationProgress;
  vatOutputs.outColorAndAlpha = interpolatedColorAndAlpha;
  vatOutputs.outNormal = rotatedNormal;
  vatOutputs.outPosition = select(vertexObjectPos, vec3<f32>(0.0, 0.0, 0.0),
    isVatPaddingVertex(vertInput.texCoord1, vatInputs.frameCount));
  vatOutputs.outSpareColorAndAlpha = interpolatedSpareColor;
  vatOutputs.outTangent = rotatedTangent;
  vatOutputs.surfaceUv = vertInput.texCoord0;

  return vatOutputs;
}

fn ApplyVat3_Deformation_Softbody(
  vertInput: Vat3_VertexInputs,
  vatInputs: Vat3_StaticInputs,
  vatColTex:      texture_2d<f32>,
  vatLookupTex:   texture_2d<f32>,  // unused — always bound as 1×1 dummy
  vatPos2Tex:     texture_2d<f32>,  // unused — always bound as 1×1 dummy
  vatPosTex:      texture_2d<f32>,
  vatRotTex:      texture_2d<f32>,  // unused — always bound as 1×1 dummy
  vatSpareColTex: texture_2d<f32>   // unused — always bound as 1×1 dummy
) -> Vat3_Outputs {
  var vatOutputs: Vat3_Outputs;

  let animData = computeAnimationData(vatInputs);
  let activePixelsRatio = computeActivePixelsRatio(vatInputs.boundMin, vatInputs.boundMax);
  let uvs = computeUVs(vertInput.texCoord1, animData, vatInputs.isTexHdr != 0u, activePixelsRatio);

  let textures = sampleVat3TexturesFromParams(
    uvs.thisFrameUv, uvs.nextFrameUv, vatInputs.noLerping != 0u,
    false, false, false,
    vatColTex,
    vatLookupTex,
    vatPos2Tex,
    vatPosTex,
    vatRotTex,
    vatSpareColTex
  );

  let interpolationAlpha = fract(animData.currentFrame);

  let interpolatedAnimationProgress = mix(animData.animProgressThisFrame, animData.animProgressNextFrame, interpolationAlpha);
  let outAnimationProgress = vec3<f32>(interpolatedAnimationProgress, animData.animProgressThisFrame, animData.animProgressNextFrame);

  let inputBoundsRange = vatInputs.boundMax - vatInputs.boundMin;
  let isTexHdr = vatInputs.isTexHdr != 0u;

  let thisFramePos = decodePosition(textures.posThisFrame, inputBoundsRange, vatInputs.boundMin, isTexHdr);
  let nextFramePos = decodePosition(textures.posNextFrame, inputBoundsRange, vatInputs.boundMin, isTexHdr);

  let lerpedPos = interpolateVector3(
    thisFramePos, nextFramePos, interpolationAlpha,
    vatInputs.interframeInterpolation,
    1u
  );

  let interpolatedColorAndAlpha = interpolateColor(
    textures.colorThisFrame, textures.colorNextFrame,
    interpolationAlpha, vatInputs.interframeInterpolation, vatInputs.interpolateColor
  );

  let interpolatedSpareColor = interpolateColor(
    textures.spareColorThisFrame, textures.spareColorNextFrame,
    interpolationAlpha, vatInputs.interframeInterpolation, vatInputs.interpolateSpareColor
  );

  let vertexObjectPos = vertInput.vertexPosition + lerpedPos + vatInputs.additionalObjectSpaceOffset;

  let surfaceData = computeTextureBasedNormals(animData, textures, vatInputs, interpolationAlpha, vertexObjectPos);

  vatOutputs.outAnimationProgress = outAnimationProgress;
  vatOutputs.outPosition = select(vertexObjectPos, vec3<f32>(0.0, 0.0, 0.0),
    isVatPaddingVertex(vertInput.texCoord1, vatInputs.frameCount));
  vatOutputs.outNormal = surfaceData.normal;
  vatOutputs.outTangent = surfaceData.tangent;
  vatOutputs.surfaceUv = vertInput.texCoord0;
  vatOutputs.outColorAndAlpha = interpolatedColorAndAlpha;
  vatOutputs.outSpareColorAndAlpha = interpolatedSpareColor;

  return vatOutputs;
}
