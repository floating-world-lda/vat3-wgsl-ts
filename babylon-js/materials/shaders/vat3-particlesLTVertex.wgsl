// Copyright (c) Floating World, LDA. All Rights Reserved.

attribute position : vec3<f32>;
attribute uv: vec2<f32>;
attribute uv2: vec2<f32>;

varying vOutColor : vec4<f32>;
varying vParticleLife : f32;
varying vParticleRandom : f32;
varying vSurfaceUV: vec2<f32>;

@vertex
fn main(input : VertexInputs) -> FragmentInputs {
  let instanceUV = vec2<f32>(vertexInputs.uv2.x, 0.0);

  var vatVertInputs: Vat3_VertexInputs;
  vatVertInputs.texCoord0 = vertexInputs.uv;
  vatVertInputs.texCoord1 = instanceUV;
  vatVertInputs.vertexPosition = vertexInputs.position;

  var updatedInputs: Vat3_StaticInputs = getVat3Inputs(vatVertInputs);
  updatedInputs.particleShardIndex = 0.0;

  var vatOutputs: Vat3_Outputs = ApplyVat3_Deformation_Particles(vatVertInputs, updatedInputs);

  vertexOutputs.position = scene.viewProjection * mesh.world * vec4<f32>((vatOutputs.outPosition), 1.0);

  // particle age is encoded in color or spare color alpha
  var perParticleAge = select(
      vatOutputs.outColorAndAlpha.a,
      vatOutputs.outSpareColorAndAlpha.a,
      updatedInputs.useSpareColor != 0u
  );

  vertexOutputs.vOutColor = vec4<f32>(vatOutputs.outColorAndAlpha);
  vertexOutputs.vParticleLife = perParticleAge;
  vertexOutputs.vParticleRandom = (updatedInputs.perParticleRandomVelocityScale - 1.0) * 2.0;
  vertexOutputs.vSurfaceUV = vatOutputs.surfaceUv;
}
