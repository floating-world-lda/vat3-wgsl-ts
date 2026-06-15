// Copyright (c) Floating World, LDA. All Rights Reserved.

varying vOutColor : vec4<f32>;
varying vParticleLife : f32;
varying vParticleRandom : f32;
varying vSurfaceUV : vec2<f32>;

var vatVertInputs: Vat3_VertexInputs;
vatVertInputs.vertexPosition = vertexInputs.position;
vatVertInputs.vertexNormal = vertexInputs.normal;

vatVertInputs.texCoord0 = vertexInputs.uv;
vatVertInputs.texCoord1 = vertexInputs.uv2;

var updatedInputs: Vat3_StaticInputs = getVat3Inputs(vatVertInputs);
var vatOutputs: Vat3_Outputs = ApplyVat3_Deformation_Particles(vatVertInputs, updatedInputs);

positionUpdated = vatOutputs.outPosition;
normalUpdated = vatOutputs.outNormal;

// particle age is encoded in color or spare color alpha
var perParticleAge = select(
    vatOutputs.outColorAndAlpha.a,
    vatOutputs.outSpareColorAndAlpha.a,
    updatedInputs.useSpareColor != 0u
);

vertexOutputs.vOutColor = vatOutputs.outColorAndAlpha;
vertexOutputs.vParticleLife = perParticleAge;
vertexOutputs.vParticleRandom = (updatedInputs.perParticleRandomVelocityScale - 1.0) * 2.0;
vertexOutputs.vSurfaceUV = vatOutputs.surfaceUv;
