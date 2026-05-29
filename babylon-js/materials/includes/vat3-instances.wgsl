// Copyright (c) Floating World, LDA. All Rights Reserved.

struct Vat3_InstanceData {
  forward: vec4<f32>,
  position: vec4<f32>,
  velocity: vec4<f32>,
}

struct Vat3_InstanceDynamicData {
  enablePlayback: u32,
  playbackSpeed: f32,
  time: f32,
  _pad: f32,
}

var<storage, read> vat3InstanceData: array<Vat3_InstanceData>;
var<storage, read> vat3InstanceDynamicData: array<Vat3_InstanceDynamicData>;
