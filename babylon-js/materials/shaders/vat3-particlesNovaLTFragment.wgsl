// Copyright (c) Floating World, LDA. All Rights Reserved.

varying vOutColor : vec4<f32>;
varying vParticleLife : f32;
varying vParticleRandom : f32;
varying vSurfaceUV: vec2<f32>;

var albedoTexture: texture_2d<f32>;
var albedoTextureSampler: sampler;

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
  let novaUV = ComputeNovaUV(input.vSurfaceUV, input.vParticleLife, input.vParticleRandom);

  if (vat3DynamicInputs.enableGlowLayer != 0u) {
    let emissiveSample = textureSample(vatEmissiveTex, vatEmissiveTexSampler, novaUV);
    let emissiveScale = uniforms.vEmissiveColor.rgb * uniforms.vEmissiveColor.a;
    let emissiveRGB = ApplyNovaEmissive(
      emissiveSample.rgb * input.vOutColor.rgb * emissiveScale,
      novaUV, input.vParticleLife
    );
    let glowBase = ApplyNovaDissolve(
      vec4<f32>(emissiveRGB, emissiveSample.a * input.vOutColor.a),
      novaUV, input.vParticleLife
    );
    fragmentOutputs.color = glowBase;
  } else {
    let textureColor = textureSample(albedoTexture, albedoTextureSampler, novaUV);
    fragmentOutputs.color = ApplyNovaParticleEffects(textureColor * input.vOutColor, novaUV, input.vParticleLife);
  }
}
