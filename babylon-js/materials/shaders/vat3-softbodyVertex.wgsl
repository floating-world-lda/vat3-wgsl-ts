// Copyright (c) Floating World, LDA. All Rights Reserved.

varying vOutColor : vec4<f32>;
varying vSurfaceUV : vec2<f32>;

var vatVertInputs: Vat3_VertexInputs;
vatVertInputs.vertexPosition = vertexInputs.position;
vatVertInputs.vertexNormal = vertexInputs.normal;
vatVertInputs.vertexTangent = vertexInputs.tangent.xyz;

vatVertInputs.texCoord0 = vertexInputs.uv;
vatVertInputs.texCoord1 = vertexInputs.uv2;

var updatedInputs: Vat3_StaticInputs = getVat3Inputs(vatVertInputs);
var vatOutputs: Vat3_Outputs = ApplyVat3_Deformation_Softbody(vatVertInputs, updatedInputs);

positionUpdated = vatOutputs.outPosition;
normalUpdated = vatOutputs.outNormal;

vertexOutputs.vOutColor = vatOutputs.outColorAndAlpha;
vertexOutputs.vSurfaceUV = vatOutputs.surfaceUv;
