// Copyright (c) Floating World, LDA. All Rights Reserved.

varying vOutColor : vec4<f32>;
varying vParticleLife : f32;
varying vParticleRandom : f32;
varying vSurfaceUV : vec2<f32>;

let novaUV = ComputeNovaUV(fragmentInputs.vSurfaceUV, fragmentInputs.vParticleLife, fragmentInputs.vParticleRandom);

if (vat3DynamicInputs.enableGlowLayer != 0u) {
  let emissiveSample = textureSample(vatEmissiveTex, vatEmissiveTexSampler, novaUV);
  let emissiveRGB = ApplyNovaEmissive(emissiveSample.rgb * finalEmissive, novaUV, fragmentInputs.vParticleLife);
  let glowBase = ApplyNovaDissolve(vec4<f32>(emissiveRGB, emissiveSample.a), novaUV, fragmentInputs.vParticleLife);
  fragmentOutputs.color = glowBase;
} else {
  let novaAlbedo = textureSample(albedoSampler, albedoSamplerSampler, novaUV);
  fragmentOutputs.color = ApplyNovaParticleEffects(novaAlbedo * fragmentInputs.vOutColor, novaUV, fragmentInputs.vParticleLife);
}
