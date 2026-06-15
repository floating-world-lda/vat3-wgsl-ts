// Copyright (c) Floating World, LDA. All Rights Reserved.
//
// VAT3 Particles vertex entry — Three.js / TSL.
//
// Actively sampled: vatPosTex, vatColTex, vatSpareColTex.
// Unused pairs (vatRotTex, vatPos2Tex, vatLookupTex) receive 1×1 dummy
// textures from vatBase.ts but are forwarded to satisfy the wrapper signature.

fn vatParticlesVertex(
  vertexPosition: vec3<f32>,
  vertexNormal:   vec3<f32>,
  texCoord0:      vec2<f32>,
  texCoord1:      vec2<f32>,

  vatColTex:      texture_2d<f32>,
  vatLookupTex:   texture_2d<f32>,  // unused — always bound as 1×1 dummy
  vatPos2Tex:     texture_2d<f32>,  // unused — always bound as 1×1 dummy
  vatPosTex:      texture_2d<f32>,
  vatRotTex:      texture_2d<f32>,  // unused — always bound as 1×1 dummy
  vatSpareColTex: texture_2d<f32>,

  _dynActivation: f32,
  _staActivation: f32
) -> Vat3_Outputs {
  var vi: Vat3_VertexInputs;
  vi.vertexPosition = vertexPosition;
  vi.vertexNormal   = vertexNormal;
  vi.vertexTangent  = vec3<f32>(0.0, 0.0, 0.0);
  vi.texCoord0      = texCoord0;
  vi.texCoord1      = texCoord1;

  let vatInputs = getVat3Inputs(vi);

  return ApplyVat3_Deformation_Particles(
    vi, vatInputs,
    vatColTex,
    vatLookupTex,
    vatPos2Tex,
    vatPosTex,
    vatRotTex,
    vatSpareColTex
  );
}
