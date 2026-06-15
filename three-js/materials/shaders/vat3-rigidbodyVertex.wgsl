// Copyright (c) Floating World, LDA. All Rights Reserved.
//
// VAT3 Rigidbody vertex entry — Three.js / TSL.
//
// Actively sampled: vatPosTex, vatColTex, vatRotTex.
// Conditionally sampled (flag-gated): vatPos2Tex (usePos2), vatSpareColTex (useSpareColor).
// Unused: vatLookupTex (1×1 dummy).
//
// getRigidPivot() uses texCoord2/3, so those are forwarded via vi.

fn vatRigidbodyVertex(
  vertexPosition: vec3<f32>,
  vertexNormal:   vec3<f32>,
  vertexTangent:  vec3<f32>,
  texCoord0:      vec2<f32>,
  texCoord1:      vec2<f32>,
  texCoord2:      vec2<f32>,
  texCoord3:      vec2<f32>,

  vatColTex:      texture_2d<f32>,
  vatLookupTex:   texture_2d<f32>,  // unused — always bound as 1×1 dummy
  vatPos2Tex:     texture_2d<f32>,
  vatPosTex:      texture_2d<f32>,
  vatRotTex:      texture_2d<f32>,
  vatSpareColTex: texture_2d<f32>,

  _dynActivation: f32,
  _staActivation: f32
) -> Vat3_Outputs {
  var vi: Vat3_VertexInputs;
  vi.vertexPosition = vertexPosition;
  vi.vertexNormal   = vertexNormal;
  vi.vertexTangent  = vertexTangent;
  vi.texCoord0      = texCoord0;
  vi.texCoord1      = texCoord1;
  vi.texCoord2      = texCoord2;
  vi.texCoord3      = texCoord3;

  let vatInputs = getVat3Inputs(vi);

  return ApplyVat3_Deformation_Rigidbody(
    vi, vatInputs,
    vatColTex,
    vatLookupTex,
    vatPos2Tex,
    vatPosTex,
    vatRotTex,
    vatSpareColTex
  );
}
