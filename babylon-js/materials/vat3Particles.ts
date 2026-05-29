// Copyright (c) Floating World, LDA. All Rights Reserved.

import type { Scene } from '@babylonjs/core/scene';
import { ShaderLanguage } from '@babylonjs/core/Materials/shaderLanguage';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';

import type VatBufferManager from '../core/vatBufferManager';

export default class Vat3ParticlesMaterial extends ShaderMaterial {
  constructor(name: string, scene: Scene, bufferManager: VatBufferManager) {
    super(name, scene, 'vat3Particles', {
      attributes: ['normal', 'position', 'tangent', 'uv', 'uv2'],
      uniformBuffers: ['Mesh', 'Scene'],
      shaderLanguage: ShaderLanguage.WGSL,
    });

    bufferManager.setBuffersForMaterial(this);
  }
}
