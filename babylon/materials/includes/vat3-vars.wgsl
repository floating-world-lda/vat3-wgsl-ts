// Copyright (c) Floating World, LDA. All Rights Reserved.

var<uniform> vat3StaticInputs: Vat3_StaticInputs;
var<uniform> vat3DynamicInputs: Vat3_DynamicInputs;

fn getVat3Inputs(vertInput: Vat3_VertexInputs) -> Vat3_StaticInputs {
  var result = vat3StaticInputs;
  
  let vertexIndex = f32(vertInput.texCoord1.x);
  let vertexCount = f32(vat3StaticInputs.vertexCount);
  let random: f32 = randomFloat(vec2<f32>(vertexIndex / vertexCount, 1.0));

  result.enablePlayback = vat3DynamicInputs.enablePlayback;
  result.inputTime = vat3DynamicInputs.time;
  result.modelViewMatrix = vat3DynamicInputs.modelViewMatrix;
  result.perParticleRandomSpinSpeed = random * 0.2 - 0.1;
  result.perParticleRandomVelocityScale = random * 0.5 + 1.0;
  result.playbackSpeed = vat3DynamicInputs.playbackSpeed;
  result.viewToModelMatrix = vat3DynamicInputs.viewToModelMatrix;

  return result;
}
