// Copyright (c) Floating World, LDA. All Rights Reserved.

fn ApplyVat3_Deformation_DynamicMesh(vertInput: Vat3_VertexInputs, vatInputs: Vat3_StaticInputs) -> Vat3_Outputs {
  var vatOutputs: Vat3_Outputs;

  let animData = computeAnimationData(vatInputs);
  let uvs = computeUVs(vertInput.texCoord0, animData, vatInputs.isTexHdr != 0u, vec2<f32>(1.0, 1.0));

  let shouldInterpolate = vatInputs.noLerping == 0u && vatInputs.interframeInterpolation != 0u;
  let interpolationAlpha = select(0.0, fract(animData.currentFrame), shouldInterpolate);

  let isLookupHdr = vatInputs.isLookupTexHdr != 0u;
  let lookupThisFrame = textureSampleLevel(
    vatLookupTex,
    vatLookupTexSampler,
    uvs.thisFrameUv,
    0.0
  );

  var lookupNextFrame = lookupThisFrame;
  if (shouldInterpolate) {
    lookupNextFrame = textureSampleLevel(
      vatLookupTex,
      vatLookupTexSampler,
      uvs.nextFrameUv,
      0.0
    );
  }

  let thisFrameUv = decodeVatLookupUv(lookupThisFrame, isLookupHdr);
  let nextFrameUvCandidate = decodeVatLookupUv(lookupNextFrame, isLookupHdr);
  let nextFrameUv = select(thisFrameUv, nextFrameUvCandidate, shouldInterpolate);

  let usePos2 = vatInputs.usePos2 != 0u;
  let useSpareColor = vatInputs.useSpareColor != 0u;

  let textures = sampleVat3Textures(
    thisFrameUv,
    nextFrameUv,
    !shouldInterpolate,
    false,
    usePos2,
    useSpareColor
  );

  let inputBoundsRange = vatInputs.boundMax - vatInputs.boundMin;
  let isTexHdr = vatInputs.isTexHdr != 0u;

  var thisFramePos = decodePosition(
    textures.posThisFrame,
    inputBoundsRange,
    vatInputs.boundMin,
    isTexHdr
  );
  var nextFramePos = decodePosition(
    textures.posNextFrame,
    inputBoundsRange,
    vatInputs.boundMin,
    isTexHdr
  );

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
    textures.colorThisFrame,
    textures.colorNextFrame,
    interpolationAlpha,
    vatInputs.interframeInterpolation,
    vatInputs.interpolateColor
  );

  let interpolatedSpareColor = interpolateColor(
    textures.spareColorThisFrame,
    textures.spareColorNextFrame,
    interpolationAlpha,
    vatInputs.interframeInterpolation,
    vatInputs.interpolateSpareColor
  );

  let surfaceData = computeTextureBasedNormals(
    animData,
    textures,
    vatInputs,
    interpolationAlpha,
    vertexObjectPos
  );

  let surfaceUv = resolveVatSurfaceUv(
    interpolatedColorAndAlpha,
    textures.posThisFrame.a,
    vatInputs.surfaceUVsfromColorRG != 0u
  );

  let interpolatedAnimationProgress = mix(
    animData.animProgressThisFrame,
    animData.animProgressNextFrame,
    interpolationAlpha
  );

  vatOutputs.outAnimationProgress = vec3<f32>(
    interpolatedAnimationProgress,
    animData.animProgressThisFrame,
    animData.animProgressNextFrame
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

fn ApplyVat3_Deformation_Particles(vertInput: Vat3_VertexInputs, vatInputs: Vat3_StaticInputs) -> Vat3_Outputs {
  var vatOutputs: Vat3_Outputs;

  let inputBoundsRange = vatInputs.boundMax - vatInputs.boundMin;
  let isTexHdr = vatInputs.isTexHdr != 0u;

  let animData = computeAnimationData(vatInputs);

  let activePixelsRatio = computeActivePixelsRatio(vatInputs.boundMin, vatInputs.boundMax);
  let uvs = computeUVs(vertInput.texCoord1, animData, vatInputs.isTexHdr != 0u, activePixelsRatio);
  let thisFrameUv = uvs.thisFrameUv;
  let nextFrameUv = uvs.nextFrameUv;

  let textures = sampleVat3Textures(
    thisFrameUv,
    nextFrameUv,
    vatInputs.noLerping != 0u,
    false, // useLookup
    false, // usePos2
    true   // useSpareColor
  );

  // calculate interpolation alpha
  let interpolationAlpha = fract(animData.currentFrame);

  let interpolatedAnimationProgress = mix(animData.animProgressThisFrame, animData.animProgressNextFrame, interpolationAlpha);
  let outAnimationProgress = vec3<f32>(interpolatedAnimationProgress, animData.animProgressThisFrame, animData.animProgressNextFrame);

  let thisFramePos = decodePosition(textures.posThisFrame, inputBoundsRange, vatInputs.boundMin, isTexHdr);
  let nextFramePos = decodePosition(textures.posNextFrame, inputBoundsRange, vatInputs.boundMin, isTexHdr);

  // calculate pScale data
  let pScaleData = computePScaleData(textures.posThisFrame, textures.posNextFrame, vatInputs.boundMax, vatInputs.noLerping != 0u, false);

  // interpolate colors
  let interpolatedColorAndAlpha = interpolateColor(
    textures.colorThisFrame,
    textures.colorNextFrame,
    interpolationAlpha,
    vatInputs.interframeInterpolation,
    vatInputs.interpolateColor
  );

  let interpolatedSpareColor = interpolateColor(
    textures.spareColorThisFrame,
    textures.spareColorNextFrame,
    interpolationAlpha,
    vatInputs.interframeInterpolation,
    vatInputs.interpolateSpareColor
  );

  let particleEnabledThisFrame = clamp(sign(length(thisFramePos) - vatInputs.originEffectiveRadius), 0.0, 1.0);
  let particleEnabledNextFrame = clamp(sign(length(nextFramePos) - vatInputs.originEffectiveRadius), 0.0, 1.0);
  
  // calculate particle velocity data
  let velocityData = calculateVelocity(
    nextFramePos,
    thisFramePos,
    interpolatedColorAndAlpha,
    vatInputs.modelViewMatrix,
    vatInputs.perParticleRandomVelocityScale,
    vatInputs.useAlphaForVelocityScale != 0u,
    vatInputs.useColorForVelocity != 0u,
    false, // useInvertedColorR
  );
  
  // calculate particle orientation (billboarding + velocity spin)
  let particleDirections = calculateParticleOrientation(velocityData, vatInputs);
  
  // calculate particle scale
  let particleScaleData = computeParticleScale(
    pScaleData,
    particleEnabledThisFrame,
    particleEnabledNextFrame,
    interpolationAlpha,
    vatInputs
  );
  
  let particleRelRightPos = particleDirections.particleRightDir * vatInputs.particleWidthBaseScale * particleScaleData.finalScale * (vertInput.texCoord0.x - 0.5);
  let particleRelUpPos = particleDirections.particleUpDir * vatInputs.particleHeightBaseScale * particleScaleData.finalScale * (vertInput.texCoord0.y - 0.5);
  let particleFinalPos = particleRelRightPos + particleRelUpPos + thisFramePos;

  let particleForwardDir = normalize(cross(particleDirections.particleRightDir, particleDirections.particleUpDir));

  let offset = vatInputs.additionalObjectSpaceOffset;
  let relPos = particleFinalPos;
  let vertexObjectPos = relPos + offset;
  let outPosition = select(vertexObjectPos, vec3<f32>(0.0, 0.0, 0.0),
    isVatPaddingVertex(vertInput.texCoord1, vatInputs.frameCount));

  let outNormal = normalize((vatInputs.viewToModelMatrix * vec4<f32>(0.0, 0.0, 1.0, 0.0)).xyz);
  let outTangent = select(vec3<f32>(0.0, 0.0, 0.0), particleDirections.particleRightDir, vatInputs.supportSurfaceNormalMaps != 0u);

  let particleUvScale = vec2<f32>(vatInputs.particleTextureUScale, vatInputs.particleTextureVScale);
  let particleUvScaleRemaped = particleUvScale * (-0.5) + vec2<f32>(0.5, 0.5);
  let surfaceUv = particleUvScaleRemaped + vertInput.texCoord0 * particleUvScale;

  vatOutputs.outAnimationProgress = outAnimationProgress;
  vatOutputs.outColorAndAlpha = interpolatedColorAndAlpha;
  vatOutputs.outNormal = outNormal;
  vatOutputs.outPosition = outPosition;
  vatOutputs.outSpareColorAndAlpha = interpolatedSpareColor;
  vatOutputs.outTangent = outTangent;
  vatOutputs.surfaceUv = surfaceUv;

  return vatOutputs;
}

fn ApplyVat3_Deformation_Rigidbody(vertInput: Vat3_VertexInputs, vatInputs: Vat3_StaticInputs) -> Vat3_Outputs {
  var vatOutputs: Vat3_Outputs;

  let animData = computeAnimationData(vatInputs);
  let shouldInterpolate = vatInputs.noLerping == 0u && vatInputs.interframeInterpolation != 0u;
  let interpolationAlpha = select(0.0, fract(animData.currentFrame), shouldInterpolate);

  let activePixelsRatio = computeActivePixelsRatio(vatInputs.boundMin, vatInputs.boundMax);
  let uvs = computeUVs(vertInput.texCoord1, animData, vatInputs.isTexHdr != 0u, activePixelsRatio);

  let usePos2 = vatInputs.usePos2 != 0u;
  let useSpareColor = vatInputs.useSpareColor != 0u;
  let textures = sampleVat3Textures(
    uvs.thisFrameUv,
    uvs.nextFrameUv,
    vatInputs.noLerping != 0u,
    false,
    usePos2,
    useSpareColor
  );

  let interpolatedAnimationProgress = mix(
    animData.animProgressThisFrame,
    animData.animProgressNextFrame,
    interpolationAlpha
  );
  let outAnimationProgress = vec3<f32>(
    interpolatedAnimationProgress,
    animData.animProgressThisFrame,
    animData.animProgressNextFrame
  );

  let inputBoundsRange = vatInputs.boundMax - vatInputs.boundMin;
  let isHdr = vatInputs.isTexHdr != 0u;

  var thisFramePos = decodePosition(
    textures.posThisFrame,
    inputBoundsRange,
    vatInputs.boundMin,
    isHdr
  );
  var nextFramePos = decodePosition(
    textures.posNextFrame,
    inputBoundsRange,
    vatInputs.boundMin,
    isHdr
  );

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
    textures.posThisFrame,
    textures.posNextFrame,
    vatInputs.boundMax,
    vatInputs.noLerping != 0u,
    true
  );

  var originalPScale = pScaleData.pScaleThisFrame;
  if (shouldInterpolate) {
    originalPScale = mix(pScaleData.pScaleThisFrame, pScaleData.pScaleNextFrame, interpolationAlpha);
  }
  let finalPScale = select(1.0, originalPScale, vatInputs.particlePiecesScaleAreInPositionAlpha != 0u);

  var stretchScale = vec3<f32>(1.0, 1.0, 1.0);
  if (vatInputs.stretchByVelocity != 0u && vatInputs.useColorForVelocity != 0u) {
    let colorThisFrame = textures.colorThisFrame;
    var velocityColor = colorThisFrame;
    if (shouldInterpolate) {
      velocityColor = mix(colorThisFrame, textures.colorNextFrame, interpolationAlpha);
    }

    let objectSpaceVelocity = vec3<f32>(-velocityColor.r, velocityColor.g, velocityColor.b);
    stretchScale = vec3<f32>(1.0, 1.0, 1.0) + abs(objectSpaceVelocity) * vatInputs.stretchByVelocityAmount;
  }

  let globalScale = vatInputs.globalParticlePiecesScaleMultiplier * finalPScale;
  let pieceVectorWithScale = rotatedPivot * (stretchScale * globalScale);
  let pieceVertexPosition = pieceVectorWithScale + piecePosition;
  let vertexObjectPos = pieceVertexPosition + vatInputs.additionalObjectSpaceOffset;

  let interpolatedColorAndAlpha = interpolateColor(
    textures.colorThisFrame,
    textures.colorNextFrame,
    interpolationAlpha,
    vatInputs.interframeInterpolation,
    vatInputs.interpolateColor
  );

  let interpolatedSpareColor = interpolateColor(
    textures.spareColorThisFrame,
    textures.spareColorNextFrame,
    interpolationAlpha,
    vatInputs.interframeInterpolation,
    vatInputs.interpolateSpareColor
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

fn ApplyVat3_Deformation_Softbody(vertInput: Vat3_VertexInputs, vatInputs: Vat3_StaticInputs) -> Vat3_Outputs {
  var vatOutputs: Vat3_Outputs;

  let animData = computeAnimationData(vatInputs);

  let activePixelsRatio = computeActivePixelsRatio(vatInputs.boundMin, vatInputs.boundMax);
  let uvs = computeUVs(vertInput.texCoord1, animData, vatInputs.isTexHdr != 0u, activePixelsRatio);

  let textures = sampleVat3Textures(
    uvs.thisFrameUv,
    uvs.nextFrameUv,
    vatInputs.noLerping != 0u,
    false, // useLookup - not used for softbody
    false, // usePos2 - not used for softbody
    false  // useSpareColor - not used for softbody
  );

  // calculate interpolation alpha
  let interpolationAlpha = fract(animData.currentFrame);

  let interpolatedAnimationProgress = mix(animData.animProgressThisFrame, animData.animProgressNextFrame, interpolationAlpha);
  let outAnimationProgress = vec3<f32>(interpolatedAnimationProgress, animData.animProgressThisFrame, animData.animProgressNextFrame);

  let inputBoundsRange = vatInputs.boundMax - vatInputs.boundMin;
  let isTexHdr = vatInputs.isTexHdr != 0u;
  
  let thisFramePos = decodePosition(textures.posThisFrame, inputBoundsRange, vatInputs.boundMin, isTexHdr);
  let nextFramePos = decodePosition(textures.posNextFrame, inputBoundsRange, vatInputs.boundMin, isTexHdr);
  
  let lerpedPos = interpolateVector3(
    thisFramePos,
    nextFramePos,
    interpolationAlpha,
    vatInputs.interframeInterpolation,
    1u // interpolateVector - always true for softbody
  );

  let interpolatedColorAndAlpha = interpolateColor(
    textures.colorThisFrame,
    textures.colorNextFrame,
    interpolationAlpha,
    vatInputs.interframeInterpolation,
    vatInputs.interpolateColor
  );

  let interpolatedSpareColor = interpolateColor(
    textures.spareColorThisFrame,
    textures.spareColorNextFrame,
    interpolationAlpha,
    vatInputs.interframeInterpolation,
    vatInputs.interpolateSpareColor
  );

  let offset = vertInput.vertexPosition + vatInputs.additionalObjectSpaceOffset;
  let relPos = lerpedPos;// * 0.5;
  let vertexObjectPos = offset + vec3<f32>(relPos.x, relPos.y, relPos.z);// - relPos;
  let outPosition = select(vertexObjectPos, vec3<f32>(0.0, 0.0, 0.0),
    isVatPaddingVertex(vertInput.texCoord1, vatInputs.frameCount));

  let surfaceData = computeTextureBasedNormals(
    animData,
    textures,
    vatInputs,
    interpolationAlpha,
    vertexObjectPos
  );

  let surfaceUv = vertInput.texCoord0;

  vatOutputs.outAnimationProgress = outAnimationProgress;
  vatOutputs.outColorAndAlpha = interpolatedColorAndAlpha;
  vatOutputs.outNormal = surfaceData.normal;
  vatOutputs.outPosition = outPosition;
  vatOutputs.outSpareColorAndAlpha = interpolatedSpareColor;
  vatOutputs.outTangent = surfaceData.tangent;
  vatOutputs.surfaceUv = surfaceUv;

  return vatOutputs;
}