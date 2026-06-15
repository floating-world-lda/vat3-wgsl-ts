// Copyright (c) Floating World, LDA. All Rights Reserved.

varying vOutColor : vec4<f32>;
varying vSurfaceUV : vec2<f32>;

if (vat3DynamicInputs.enableGlowLayer != 0u) {
	let emissiveSample = textureSample(vatEmissiveTex, vatEmissiveTexSampler, fragmentInputs.vSurfaceUV);
	fragmentOutputs.color = vec4<f32>(emissiveSample.rgb * finalEmissive, emissiveSample.a);
} else {
	fragmentOutputs.color = finalColor * fragmentInputs.vOutColor;
}