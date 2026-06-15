// Copyright (c) Floating World, LDA. All Rights Reserved.

const tau: f32 = 6.28318530718;

fn computeActivePixelsRatio(boundMin: vec3<f32>, boundMax: vec3<f32>) -> vec2<f32> {
  let scaledBoundMin = boundMin * 10.0;
  let scaledBoundMax = boundMax * 10.0;
  let ratioX = 1.0 - (ceil(scaledBoundMin.z) - scaledBoundMin.z);
  let ratioY = 1.0 - (ceil(scaledBoundMax.x) - scaledBoundMax.x);
  return vec2<f32>(ratioX, ratioY);
}

fn decodeQuaternion(XYZ: vec3<f32>, maxComponent: i32) -> vec4<f32> {
  let w = sqrt(1.0 - dot(XYZ, XYZ));
  switch maxComponent {
    case 0: { return vec4<f32>(XYZ.x, XYZ.y, XYZ.z, w); }
    case 1: { return vec4<f32>(w, XYZ.y, XYZ.z, XYZ.x); }
    case 2: { return vec4<f32>(XYZ.x, w, XYZ.z, XYZ.y); }
    case 3: { return vec4<f32>(XYZ.x, XYZ.y, w, XYZ.z); }
    default: { return vec4<f32>(XYZ.x, XYZ.y, XYZ.z, w); }
  }
}

fn decodeRotationTexture(rotTexData: vec4<f32>, normalDefaults: vec3<f32>, tangentDefaults: vec3<f32>) -> array<vec3<f32>, 2> {
  let crossNormal = cross(rotTexData.xyz, normalDefaults);
  let normalLengMul = rotTexData.www * normalDefaults;
  let normalToUnpack = cross(rotTexData.xyz, normalLengMul + crossNormal);
  let normal = normalToUnpack * 2.0 + normalDefaults;

  let crossTangent = cross(rotTexData.xyz, tangentDefaults);
  let tangentLengMul = rotTexData.www * tangentDefaults;
  let tangentToUnpack = cross(rotTexData.xyz, tangentLengMul + crossTangent);
  let tangent = tangentToUnpack * 2.0 + tangentDefaults;

  return array<vec3<f32>, 2>(normal, tangent);
}

fn decodeRotationTextureNoTangent(rotTexData: vec4<f32>, normalDefaults: vec3<f32>) -> vec3<f32> {
  let crossNormal = cross(rotTexData.xyz, normalDefaults);
  let normalLengMul = rotTexData.www * normalDefaults;
  let normalToUnpack = cross(rotTexData.xyz, normalLengMul + crossNormal);
  return normalToUnpack * 2.0 + normalDefaults;
}

fn interframePosition(V: vec3<f32>, A: vec3<f32>, P: vec3<f32>, T: f32) -> vec3<f32> {
  return V * T + 0.5 * A * T * T + P;
}

fn interpolateColor(
  colorThisFrame: vec4<f32>,
  colorNextFrame: vec4<f32>,
  interpolationAlpha: f32,
  interframeInterpolation: u32,
  interpolateColor: u32
) -> vec4<f32> {
  return select(
    colorThisFrame,
    mix(colorThisFrame, colorNextFrame, interpolationAlpha),
    interframeInterpolation != 0u && interpolateColor != 0u
  );
}

fn interpolateFloat(
  valueThisFrame: f32,
  valueNextFrame: f32,
  interpolationAlpha: f32,
  interframeInterpolation: u32,
  interpolateValue: u32
) -> f32 {
  return select(
    valueThisFrame,
    mix(valueThisFrame, valueNextFrame, interpolationAlpha),
    interframeInterpolation != 0u && interpolateValue != 0u
  );
}

fn interpolateVector3(
  vectorThisFrame: vec3<f32>,
  vectorNextFrame: vec3<f32>,
  interpolationAlpha: f32,
  interframeInterpolation: u32,
  interpolateVector: u32
) -> vec3<f32> {
  return select(
    vectorThisFrame,
    mix(vectorThisFrame, vectorNextFrame, interpolationAlpha),
    interframeInterpolation != 0u && interpolateVector != 0u
  );
}

fn multiRpfQuaternionSmix(
  rpf: f32,
  interpolationAlpha: f32,
  rotTexAlpha: f32,
  quaterionThisFrame: vec4<f32>,
  quaterionNextFrameInput: vec4<f32>
) -> vec4<f32> {
  let rpfCycle = fract(rpf) * 0.5;
  let rpfAlphaCycle = fract(rpf * interpolationAlpha) * 0.5;
  let sinRpfAlphaDif = sin((rpfCycle - rpfAlphaCycle) * tau);
  let sinAlpha = sin(rpfAlphaCycle * tau);
  let sinRpf = sin(rpfCycle * tau);

  var quaternionNextFrame = quaterionNextFrameInput;
  if (dot(quaterionThisFrame, quaternionNextFrame) < 0.0) {
    quaternionNextFrame = -quaternionNextFrame;
  }

  let rpfQuaternionThisFrame = sinRpfAlphaDif * quaterionThisFrame;
  let rpfQuaternionNextFrame = sinAlpha * quaternionNextFrame * sign(rotTexAlpha);
  let lerpedQuaternion = (rpfQuaternionThisFrame + rpfQuaternionNextFrame) / sinRpf;

  return normalize(lerpedQuaternion);
}

fn randomFloat(seed: vec2<f32>) -> f32 {
  return fract(sin(dot(seed, vec2<f32>(22.9898, 178.24313))) * 12858.24161);
}

fn recoverCompressedNormal(normalInAlpha: f32) -> vec3<f32> {
  let highRange = normalInAlpha * 1024.0;
  let lowRange = floor(normalInAlpha * 32.0);
  let angleToUnpack = vec2<f32>(lowRange / 31.5, (highRange - (lowRange * 32.0)) / 31.5);
  let unpackedAngle = angleToUnpack * 4.0 - vec2<f32>(2.0, 2.0);
  let dotSquare = dot(unpackedAngle, unpackedAngle);
  let dotSquareRemaped = sqrt(1.0 - (dotSquare * 0.25));
  let normalXZ = dotSquareRemaped * unpackedAngle;
  let unclampedNormal = vec3<f32>(normalXZ.x, 1.0 - (dotSquare * 0.5), normalXZ.y);
  return clamp(unclampedNormal, vec3<f32>(-1.0, -1.0, -1.0), vec3<f32>(1.0, 1.0, 1.0));
}

fn rotateVectorByQuaternion(vect: vec3<f32>, quat: vec4<f32>) -> vec3<f32> {
  let crossXYZ = cross(quat.xyz, vect);
  let quatWvec = quat.www * vect;
  return cross(quat.xyz, crossXYZ + quatWvec) * 2.0 + vect;
}

fn scalarMod(a: f32, b: f32) -> f32 {
  return a - b * floor(a / b);
}