// Copyright (c) Floating World, LDA. All Rights Reserved.

varying vColor : vec4<f32>;
varying vNormal : vec3<f32>;
varying vUV : vec2<f32>;

var particleTex: texture_2d<f32>;
var particleSampler: sampler;

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
  let textureColor = textureSample(particleTex, particleSampler, input.vUV);
  fragmentOutputs.color = textureColor * input.vColor;
}
