// Copyright (c) Floating World, LDA. All Rights Reserved.

fn vatSoftbodyVertex(
  vertexPosition: vec3<f32>,
  vertexNormal:   vec3<f32>,
  texCoord0:      vec2<f32>,
  texCoord1:      vec2<f32>,

  vatColTex:      texture_2d<f32>,
  vatLookupTex:   texture_2d<f32>,
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
  vi.vertexTangent  = vec3<f32>(0.0, 0.0, 0.0);
  vi.texCoord0      = texCoord0;
  vi.texCoord1      = texCoord1;

  let vatInputs = getVat3Inputs(vi);

  return ApplyVat3_Deformation_Softbody(
    vi, vatInputs,
    vatColTex,
    vatLookupTex,
    vatPos2Tex,
    vatPosTex,
    vatRotTex,
    vatSpareColTex
  );
}
