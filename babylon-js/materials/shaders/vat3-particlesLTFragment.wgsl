// Copyright (c) Floating World, LDA. All Rights Reserved.

varying vOutColor : vec4<f32>;
varying vParticleLife : f32;
varying vParticleRandom : f32;
varying vSurfaceUV: vec2<f32>;

var albedoTexture: texture_2d<f32>;
var albedoTextureSampler: sampler;

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
  if (vat3DynamicInputs.enableGlowLayer != 0u) {
    let emissiveSample = textureSample(vatEmissiveTex, vatEmissiveTexSampler, input.vSurfaceUV);
    let emissiveScale = uniforms.vEmissiveColor.rgb * uniforms.vEmissiveColor.a;
    fragmentOutputs.color = vec4<f32>(
      emissiveSample.rgb * input.vOutColor.rgb * emissiveScale,
      emissiveSample.a * input.vOutColor.a
    );
  } else {
    let textureColor = textureSample(albedoTexture, albedoTextureSampler, input.vSurfaceUV);
    fragmentOutputs.color = textureColor * input.vOutColor;
  }
}