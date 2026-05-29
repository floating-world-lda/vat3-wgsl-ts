// Copyright (c) Floating World, LDA. All Rights Reserved.

fn calculateParticleOrientation(
  velocityData: Vat3_VelocityData,
  vatInputs: Vat3_StaticInputs
) -> Vat3_ParticleDirection {
  var particleRightDir: vec3<f32>;
  var particleUpDir: vec3<f32>;
  
  if (vatInputs.useParticleBillboarding != 0u) {
    let camRight = normalize((vatInputs.viewToModelMatrix * vec4<f32>(1.0, 0.0, 0.0, 0.0)).xyz);
    let camUp = normalize((vatInputs.viewToModelMatrix * vec4<f32>(0.0, 1.0, 0.0, 0.0)).xyz);

    particleRightDir = -camRight;
    particleUpDir = camUp;
  } else {
    particleRightDir = vec3<f32>(-1.0, 0.0, 0.0);
    particleUpDir = vec3<f32>(0.0, 1.0, 0.0);
  }
  
  if (vatInputs.useParticleVelocitySpin != 0u) {
    let velocityMagnitude = length(velocityData.velocity);
    let spinAngle = velocityMagnitude * vatInputs.perParticleRandomSpinSpeed;
    let cosSpin = cos(spinAngle);
    let sinSpin = sin(spinAngle);
    
    let rotatedRightDir = vec3<f32>(
      particleRightDir.x * cosSpin - particleRightDir.y * sinSpin,
      particleRightDir.x * sinSpin + particleRightDir.y * cosSpin,
      particleRightDir.z
    );
    let rotatedUpDir = vec3<f32>(
      particleUpDir.x * cosSpin - particleUpDir.y * sinSpin,
      particleUpDir.x * sinSpin + particleUpDir.y * cosSpin,
      particleUpDir.z
    );
    
    particleRightDir = rotatedRightDir;
    particleUpDir = rotatedUpDir;
  }
  
  return Vat3_ParticleDirection(particleRightDir, particleUpDir);
}

fn calculateVelocity(
  nextFramePos: vec3<f32>,
  thisFramePos: vec3<f32>,
  interpolatedColor: vec4<f32>,
  modelViewMatrix: mat4x4<f32>,
  perParticleRandomVelocityScale: f32,
  useAlphaForVelocityScale: bool,
  useColorForVelocity: bool,
  useInvertedColorR: bool
) -> Vat3_VelocityData {
  var velocity: vec3<f32>;
  
  if (useColorForVelocity) {
    let baseVelocity = vec3<f32>(
      select(interpolatedColor.r, interpolatedColor.r * (-1.0), useInvertedColorR),
      interpolatedColor.g,
      interpolatedColor.b
    );
    
    velocity = select(baseVelocity, baseVelocity * interpolatedColor.a, useAlphaForVelocityScale);
  } else {
    let posDelta = nextFramePos - thisFramePos;
    let viewPosDelta = (modelViewMatrix * vec4<f32>(posDelta, 0.0)).xyz;

    velocity = vec3<f32>(viewPosDelta.xy, 0.0);
  }
  
  // Apply per-particle random velocity scaling
  velocity = velocity * perParticleRandomVelocityScale;
  
  let direction = select(vec3<f32>(0.0, 0.0, 0.0), normalize(velocity), length(velocity) > 0.0);
  
  return Vat3_VelocityData(direction, velocity);
}

fn computeAnimationData(inputs: Vat3_StaticInputs) -> Vat3_AnimationData {
  let timeElapsed = inputs.inputTime - inputs.gameTimeAtFirstFrame;
  let animationProgress = (inputs.frameRate / (inputs.frameCount - 0.01)) * timeElapsed;
  let loopedAnimFrame = fract(animationProgress * inputs.playbackSpeed) * inputs.frameCount;
  
  let currentFrame = select(inputs.displayFrame, loopedAnimFrame, inputs.enablePlayback != 0u);
  
  let currentFramePlusOne = select(
    floor(inputs.displayFrame + 1.0),
    floor(loopedAnimFrame + 1.0),
    inputs.enablePlayback != 0u
  );
  
  let frameCount = inputs.frameCount;
  let frameCountInverse = 1.0 / frameCount;
  let animProgressThisFrame = scalarMod(currentFramePlusOne - 1.0, frameCount) * frameCountInverse;
  
  let animProgressNextFrame = select(
    scalarMod(currentFramePlusOne, frameCount) * frameCountInverse,
    animProgressThisFrame,
    inputs.noLerping != 0u
  );

  return Vat3_AnimationData(
    animProgressNextFrame,
    animProgressThisFrame,
    currentFrame,
    currentFramePlusOne,
    frameCount,
    frameCountInverse,
    loopedAnimFrame,
    timeElapsed
  );
}

fn computeParticleScale(
  pScaleData: Vat3_PScaleData,
  particleEnabledThisFrame: f32,
  particleEnabledNextFrame: f32,
  interpolation: f32,
  vatInputs: Vat3_StaticInputs
) -> Vat3_ParticleScale {
  let particleScaleMultiplier = vatInputs.globalParticlePiecesScaleMultiplier * vatInputs.additionalParticleScaleUniformMultiplier;
  
  let baseScale = select(
    particleScaleMultiplier,
    select(
      pScaleData.posAlphaThisFrame,
      mix(pScaleData.posAlphaThisFrame, pScaleData.posAlphaNextFrame, interpolation),
      vatInputs.interframeInterpolation != 0u
    ) * particleScaleMultiplier,
    vatInputs.particlePiecesScaleAreInPositionAlpha != 0u
  );
  
  let finalScale = baseScale;
  
  return Vat3_ParticleScale(baseScale, finalScale);
}

fn computePScaleData(posTexThisFrame: vec4<f32>, posTexNextFrame: vec4<f32>, boundMax: vec3<f32>, noLerp: bool, isRigidBody: bool) -> Vat3_PScaleData {
  let maxDataPScale = 1.0 / (1.0 - fract(boundMax.y));
  let posAlphaThisFrame = posTexThisFrame.a;
  let posAlphaNextFrame = posTexNextFrame.a;
  
  // Calculate clampedPScale based on mode
  let clampedPScaleThisFrame = select(
    posAlphaThisFrame, // For particles: clampedPScale = posAlpha
    1.0 - fract(posAlphaThisFrame * 4.0), // For rigid bodies: 1.0 - fract(posAlpha * 4.0)
    isRigidBody
  );
  
  let clampedPScaleNextFrame = select(
    select(posAlphaThisFrame, posAlphaNextFrame, noLerp), // For particles
    select(
      1.0 - fract(posAlphaThisFrame * 4.0),
      1.0 - fract(posAlphaNextFrame * 4.0),
      noLerp
    ), // For rigid bodies
    isRigidBody
  );
  
  let pScaleThisFrame = clampedPScaleThisFrame * maxDataPScale;
  let pScaleNextFrame = clampedPScaleNextFrame * maxDataPScale;
  
  return Vat3_PScaleData(
    clampedPScaleNextFrame,
    clampedPScaleThisFrame,
    maxDataPScale,
    posAlphaNextFrame,
    posAlphaThisFrame,
    pScaleNextFrame,
    pScaleThisFrame
  );
}

fn computeRigidQuaternion(
  textures: Vat3_TexturesData,
  vatInputs: Vat3_StaticInputs,
  interpolationAlpha: f32
) -> vec4<f32> {
  let dominantIndexThisFrame = i32(floor(textures.posThisFrame.a * 4.0));
  let dominantIndexNextFrame = i32(floor(textures.posNextFrame.a * 4.0));

  var rotThisFrame = textures.rotThisFrame;
  var rotNextFrame = textures.rotNextFrame;
  let isHdr = vatInputs.isTexHdr != 0u;

  if (!isHdr) {
    rotThisFrame = (rotThisFrame - vec4<f32>(0.5, 0.5, 0.5, 0.5)) * 2.0;
    rotNextFrame = (rotNextFrame - vec4<f32>(0.5, 0.5, 0.5, 0.5)) * 2.0;
  }

  let quaternionThisFrame = decodeQuaternion(rotThisFrame.xyz, dominantIndexThisFrame);
  let quaternionNextFrame = decodeQuaternion(rotNextFrame.xyz, dominantIndexNextFrame);

  if (vatInputs.noLerping != 0u || vatInputs.interframeInterpolation == 0u) {
    return quaternionThisFrame;
  }

  let rotationsPerFrame = abs(rotThisFrame.w);
  if (rotationsPerFrame <= 0.0001) {
    return quaternionThisFrame;
  }

  let reverseBoundXFract = fract(vatInputs.boundMin.x * (-1.0));
  let ldrScale = 1.0 / max(0.0001, 1.0 - reverseBoundXFract);
  let rpf = select(rotationsPerFrame * ldrScale, rotationsPerFrame, isHdr);

  return multiRpfQuaternionSmix(
    rpf,
    interpolationAlpha,
    rotThisFrame.w,
    quaternionThisFrame,
    quaternionNextFrame
  );
}

fn computeTextureBasedNormals(
  animData: Vat3_AnimationData,
  textures: Vat3_TexturesData,
  vatInputs: Vat3_StaticInputs,
  interpolationAlpha: f32,
  finalVertexPosition: vec3<f32>
) -> Vat3_SurfaceData {
  var surfaceData: Vat3_SurfaceData;
  
  if (vatInputs.useCompressedNormals != 0u) {
    let recoverComprNormal = normalize(recoverCompressedNormal(textures.posThisFrame.a));
    surfaceData.normal = recoverComprNormal;
    surfaceData.tangent = vec3<f32>(0.0, 0.0, 0.0);
  } else {
    var rotThisFrameToDecode: vec4<f32>;
    var rotNextFrameToDecode: vec4<f32>;
    
    let isTexHdr = vatInputs.isTexHdr != 0u;
    if (isTexHdr) {
      rotThisFrameToDecode = textures.rotThisFrame;
      rotNextFrameToDecode = textures.rotNextFrame;
    } else {
      rotThisFrameToDecode = (textures.rotThisFrame - vec4<f32>(0.5, 0.5, 0.5, 0.5)) * 2.0;
      rotNextFrameToDecode = (textures.rotNextFrame - vec4<f32>(0.5, 0.5, 0.5, 0.5)) * 2.0;
    }
    
    let decodedThisFrame = decodeRotationTexture(rotThisFrameToDecode, defaultNormal, defaultTangent);
    let decodedNextFrame = decodeRotationTexture(rotNextFrameToDecode, defaultNormal, defaultTangent);
    
    if (vatInputs.interframeInterpolation != 0u) {
      surfaceData.normal = mix(decodedThisFrame[0], decodedNextFrame[0], interpolationAlpha);
      surfaceData.tangent = mix(decodedThisFrame[1], decodedNextFrame[1], interpolationAlpha);
    } else {
      surfaceData.normal = decodedThisFrame[0];
      surfaceData.tangent = decodedThisFrame[1];
    }
    
    surfaceData.normal = normalize(surfaceData.normal);
    surfaceData.tangent = select(
      vec3<f32>(0.0, 0.0, 0.0), 
      normalize(surfaceData.tangent), 
      vatInputs.supportSurfaceNormalMaps != 0u
    );
  }

  return surfaceData;
}

fn computeUVs(texCoord: vec2<f32>, animData: Vat3_AnimationData) -> Vat3_UVs {
  let samplingVThisFrame = texCoord.y + animData.animProgressThisFrame;
  let samplingVNextFrame = texCoord.y + animData.animProgressNextFrame;

  let clampedThisFrameV = fract(samplingVThisFrame);
  let clampedNextFrameV = fract(samplingVNextFrame);
  
  let thisFrameUv = vec2<f32>(texCoord.x, clampedThisFrameV);
  let nextFrameUv = vec2<f32>(texCoord.x, clampedNextFrameV);
  return Vat3_UVs(nextFrameUv, thisFrameUv);
}

fn decodePosition(posTex: vec4<f32>, inputBoundsRange: vec3<f32>, boundMin: vec3<f32>, isTexHdr: bool) -> vec3<f32> {
  var pos = posTex.xyz;
  if (!isTexHdr) {
    // ldr encoding: map from [0, 1] back to original bounds range
    pos = pos * inputBoundsRange + boundMin;

  }
  return pos;
}

fn decodeVatLookupUv(lookupSample: vec4<f32>, isLookupHdr: bool) -> vec2<f32> {
  let maxRange = select(255.0, 2048.0, isLookupHdr);
  let u = lookupSample.x + lookupSample.y / maxRange;
  let v = lookupSample.z + lookupSample.w / maxRange;
  return vec2<f32>(u, v);
}

fn debugVatInputs(inputs: Vat3_StaticInputs) -> vec4<f32> {
  return vec4<f32>(inputs.frameRate * 100.0, 0.0, 0.0, 1.0);
}

fn getRigidPivot(vertInput: Vat3_VertexInputs) -> vec3<f32> {
  let restFramePosition = vec3<f32>(vertInput.texCoord2.x, vertInput.texCoord3.x, vertInput.texCoord3.y);
  return vertInput.vertexPosition - restFramePosition;
}

fn resolveVatSurfaceUv(
  colorPayload: vec4<f32>,
  posAlphaThisFrame: f32,
  useColorRg: bool
) -> vec2<f32> {
  let uvFromColor = vec2<f32>(colorPayload.r, 1.0 - colorPayload.g);
  let uvFromPosition = vec2<f32>(posAlphaThisFrame, 1.0 - colorPayload.a);
  return select(uvFromPosition, uvFromColor, useColorRg);
}

fn sampleVat3Textures(
  thisFrameUv: vec2<f32>,
  nextFrameUv: vec2<f32>,
  noLerp: bool,
  useLookup: bool,
  usePos2: bool,
  useSpareColor: bool
) -> Vat3_TexturesData {
  var result: Vat3_TexturesData;

  result.colorThisFrame = textureSampleLevel(vatColTex, vatColTexSampler, thisFrameUv, 0.0);
  result.posThisFrame = textureSampleLevel(vatPosTex, vatPosTexSampler, thisFrameUv, 0.0);
  result.rotThisFrame = textureSampleLevel(vatRotTex, vatRotTexSampler, thisFrameUv, 0.0);

  if (noLerp) {
    result.colorNextFrame = result.colorThisFrame;
    result.posNextFrame = result.posThisFrame;
    result.rotNextFrame = result.rotThisFrame;
  } else {
    result.colorNextFrame = textureSampleLevel(vatColTex, vatColTexSampler, nextFrameUv, 0.0);
    result.posNextFrame = textureSampleLevel(vatPosTex, vatPosTexSampler, nextFrameUv, 0.0);
    result.rotNextFrame = textureSampleLevel(vatRotTex, vatRotTexSampler, nextFrameUv, 0.0);
  }

  if (useLookup) {
    result.lookupThisFrame = textureSampleLevel(vatLookupTex, vatLookupTexSampler, thisFrameUv, 0.0);
    result.lookupNextFrame = select(
      textureSampleLevel(vatLookupTex, vatLookupTexSampler, nextFrameUv, 0.0), result.lookupThisFrame, noLerp);
  }

  if (usePos2) {
    result.pos2ThisFrame = textureSampleLevel(vatPos2Tex, vatPos2TexSampler, thisFrameUv, 0.0).xyz;
    result.pos2NextFrame = select(
      textureSampleLevel(vatPos2Tex, vatPos2TexSampler, nextFrameUv, 0.0).xyz, result.pos2ThisFrame, noLerp);
  }

  if (useSpareColor) {
    result.spareColorThisFrame = textureSampleLevel(vatSpareColTex, vatSpareColTexSampler, thisFrameUv, 0.0);
    result.spareColorNextFrame = select(
      textureSampleLevel(vatSpareColTex, vatSpareColTexSampler, nextFrameUv, 0.0), result.spareColorThisFrame, noLerp);
  }

  return result;
}