// Copyright (c) Floating World, LDA. All Rights Reserved.

#include<sceneUboDeclaration>
#include<meshUboDeclaration>

#include<instancesDeclaration>

#include<vat3Macros>
#include<vat3Maths>
#include<vat3Samplers>
#include<vat3Structs>
#include<vat3Vars>
#include<vat3Utils>
#include<vat3Wrappers>

attribute position : vec3<f32>;
attribute normal : vec3<f32>;
attribute uv: vec2<f32>;
attribute uv2: vec2<f32>;

varying vColor : vec4<f32>;
varying vNormal : vec3<f32>;
varying vUV : vec2<f32>;

@vertex
fn main(input : VertexInputs) -> FragmentInputs {
  #include<instancesVertex>

  let instanceID = f32(vertexInputs.instanceIndex);
  let instanceUV = vec2<f32>(instanceID / f32(vat3StaticInputs.vertexCount), 0.0);

  var vatVertInputs: Vat3_VertexInputs;
  vatVertInputs.vertexPosition = vertexInputs.position;

  vatVertInputs.texCoord0 = vertexInputs.uv;
  vatVertInputs.texCoord1 = instanceUV;

  var updatedInputs: Vat3_StaticInputs = getVat3Inputs(vatVertInputs);
  updatedInputs.particleShardIndex = 0.0;// shardIndex;
  
  var vatOutputs: Vat3_Outputs  = ApplyVat3_Deformation_Particles(vatVertInputs, updatedInputs);

  vertexOutputs.position = scene.viewProjection * mesh.world * vec4<f32>((vatOutputs.outPosition), 1.0);

  vertexOutputs.vColor = vec4<f32>(vatOutputs.outColorAndAlpha);
  vertexOutputs.vNormal = vatOutputs.outNormal;
  vertexOutputs.vUV = vatOutputs.surfaceUv;
}
