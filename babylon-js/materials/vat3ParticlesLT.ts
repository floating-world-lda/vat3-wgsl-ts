// Copyright (c) Floating World, LDA. All Rights Reserved.

import '@babylonjs/core/ShadersWGSL/ShadersInclude/instancesDeclaration';
import '@babylonjs/core/ShadersWGSL/ShadersInclude/instancesVertex';
import '@babylonjs/core/ShadersWGSL/ShadersInclude/meshUboDeclaration';
import '@babylonjs/core/ShadersWGSL/ShadersInclude/sceneUboDeclaration';

import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Constants } from '@babylonjs/core/Engines/constants';
import { Material } from '@babylonjs/core/Materials/material';
import type { Scene } from '@babylonjs/core/scene';
import { ShaderLanguage } from '@babylonjs/core/Materials/shaderLanguage';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import type { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { TextureSampler } from '@babylonjs/core/Materials/Textures/textureSampler';
import { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer';

import {
  NovaDataManager,
  novaDissolveWgsl,
  novaEasingWgsl,
  novaEmissiveWgsl,
  novaFlipbookWgsl,
  novaFlowmapWgsl,
  novaNoiseWgsl,
  novaSamplersWgsl,
  novaUniformsWgsl,
  novaWrapperWgsl,
} from '@floatingworld/nova-babylonjs';
import type { NovaConfig } from '@floatingworld/nova-babylonjs';

import vat3MacrosRaw from './includes/vat3-macros.wgsl?raw';
import vat3MathsRaw from './includes/vat3-maths.wgsl?raw';
import vat3SamplersRaw from './includes/vat3-samplers.wgsl?raw';
import vat3StructsRaw from './includes/vat3-structs.wgsl?raw';
import vat3VarsRaw from './includes/vat3-vars.wgsl?raw';
import vat3UtilsRaw from './includes/vat3-utils.wgsl?raw';
import vat3WrappersRaw from './includes/vat3-wrappers.wgsl?raw';
import vat3ParticlesFragmentRaw from './shaders/vat3-particlesLTFragment.wgsl?raw';
import vat3ParticlesNovaFragmentRaw from './shaders/vat3-particlesNovaLTFragment.wgsl?raw';
import vat3ParticlesVertexRaw from './shaders/vat3-particlesLTVertex.wgsl?raw';

import type VatBufferManager from '../core/vatBufferManager';
import { createUniformBufferFromParams, updateUniformBufferFromParams, type UniformValue } from '../utils/shaders';

import { getDefaultSampler, getDefaultTexture } from '../utils/texture';

export default class Vat3ParticlesLTMaterial extends ShaderMaterial {
  private _emissiveColor: Color4 = new Color4(1, 1, 1, 0.125);
  private _novaBuffer?: UniformBuffer;

  constructor(name: string, scene: Scene, bufferManager: VatBufferManager, novaConfig?: NovaConfig) {
    const _fullVertexShader = `
      #include<sceneUboDeclaration>
      #include<meshUboDeclaration>
      #include<instancesDeclaration>
      ${vat3MacrosRaw}
      ${vat3MathsRaw}
      ${vat3SamplersRaw}
      ${vat3StructsRaw}
      ${vat3VarsRaw}
      ${vat3UtilsRaw}
      ${vat3WrappersRaw}
      ${vat3ParticlesVertexRaw}
    `;
    const _fullFragmentShader = `
      #include<sceneUboDeclaration>
      #include<meshUboDeclaration>
      uniform vEmissiveColor: vec4<f32>;
      ${vat3MathsRaw}
      ${vat3SamplersRaw}
      ${vat3StructsRaw}
      ${vat3VarsRaw}
      ${
        novaConfig
          ? `
            ${novaUniformsWgsl}
            ${novaSamplersWgsl}
            ${novaNoiseWgsl}
            ${novaEasingWgsl}
            ${novaEmissiveWgsl}
            ${novaFlipbookWgsl}
            ${novaFlowmapWgsl}
            ${novaDissolveWgsl}
            ${novaWrapperWgsl}
            `
          : ""
      }
      ${novaConfig ? vat3ParticlesNovaFragmentRaw : vat3ParticlesFragmentRaw }
    `;

    super(name, scene, {
      vertexSource: _fullVertexShader,
      fragmentSource: _fullFragmentShader,
    }, {
      attributes: ['position', 'uv', 'uv2'],
      uniformBuffers: ['Mesh', 'Scene'],
      uniforms: ['vEmissiveColor'],
      shaderLanguage: ShaderLanguage.WGSL,
    });

    bufferManager.setBuffersForMaterial(this);

    this.alphaMode = Constants.ALPHA_COMBINE;
    this.backFaceCulling = false;
    this.emissiveColor = new Color4(1, 1, 1, 0.125);
    this.transparencyMode = Material.MATERIAL_ALPHABLEND;

    this.setTexture('albedoTexture', getDefaultTexture(scene));
    this.setTextureSampler('albedoTextureSampler', getDefaultSampler());

    this.setTexture('vatEmissiveTex', getDefaultTexture(scene));
    this.setTextureSampler('vatEmissiveTexSampler', getDefaultSampler());

    if (novaConfig) {
      this._novaBuffer = createUniformBufferFromParams(
        scene.getEngine(),
        NovaDataManager.getDefaultUniformData() as unknown as Record<string, UniformValue>
      );
      updateUniformBufferFromParams(
        this._novaBuffer,
        NovaDataManager.convertConfigToUniformData(novaConfig) as unknown as Record<string, UniformValue>
      );
      this.setUniformBuffer('novaUniforms', this._novaBuffer);

      const textures = NovaDataManager.extractTextures(novaConfig, scene);
      this.setTexture('novaDissolveTex', textures.dissolveTex!);
      this.setTextureSampler('novaDissolveSampler', new TextureSampler().setParameters());
      this.setTexture('novaFlowmapTex', textures.flowmapTex!);
      this.setTextureSampler('novaFlowmapSampler', new TextureSampler().setParameters());
    }
  }

  public set albedoTexture(texture: Texture) {
    this.setTexture('albedoTexture', texture);
    this.setTextureSampler('albedoTextureSampler', new TextureSampler().setParameters());
  }

  public get emissiveColor(): Color4 {
    return this._emissiveColor;
  }

  public set emissiveColor(color: Color4) {
    this._emissiveColor = color;
    this.setColor4('vEmissiveColor', color);
  }

  public set emissiveTexture(texture: Texture) {
    this.setTexture('vatEmissiveTex', texture);
    this.setTextureSampler('vatEmissiveTexSampler', new TextureSampler().setParameters());
  }
}
