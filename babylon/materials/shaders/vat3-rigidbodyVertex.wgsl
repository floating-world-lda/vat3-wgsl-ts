varying vColor : vec4<f32>;

var vatVertInputs: Vat3_VertexInputs;
vatVertInputs.vertexPosition = vertexInputs.position;
vatVertInputs.vertexNormal = vertexInputs.normal;
vatVertInputs.vertexTangent = vertexInputs.tangent.xyz;

vatVertInputs.texCoord0 = vertexInputs.uv;
vatVertInputs.texCoord1 = vertexInputs.uv2;
vatVertInputs.texCoord2 = vertexInputs.uv3;
vatVertInputs.texCoord3 = vertexInputs.uv4;

var updatedInputs: Vat3_StaticInputs = getVat3Inputs(vatVertInputs);
var vatOutputs: Vat3_Outputs = ApplyVat3_Deformation_Rigidbody(vatVertInputs, updatedInputs);

positionUpdated = vatOutputs.outPosition;
normalUpdated = vatOutputs.outNormal;

vertexOutputs.vColor = vatOutputs.outColorAndAlpha;
