// Copyright (c) Floating World, LDA. All Rights Reserved.

import type { Nullable } from '@babylonjs/core/types';
import type { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import type { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { ShaderLanguage } from '@babylonjs/core/Materials/shaderLanguage';
import { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer';
import type { SubMesh } from '@babylonjs/core/Meshes/subMesh';
import type { Scene } from '@babylonjs/core/scene';
import type { Texture } from '@babylonjs/core/Materials/Textures/texture';

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
import vat3ParticlesFragmentRaw from './shaders/vat3-particlesFragment.wgsl?raw';
import vat3ParticlesNovaFragmentRaw from './shaders/vat3-particlesNovaFragment.wgsl?raw';
import vat3ParticlesVertexRaw from './shaders/vat3-particlesVertex.wgsl?raw';

import type VatBufferManager from '../core/vatBufferManager';
import type { VatTexture } from '../core/vatTypes';

import { createUniformBufferFromParams, updateUniformBufferFromParams, type UniformValue } from '../utils/shaders';
import { getDefaultSampler, getDefaultTexture } from '../utils/texture';

import VatMaterial from './vat3Material';

export default class Vat3ParticlesMaterial extends VatMaterial {
  private static NOVA_STATIC_CONFIG?: NovaConfig;

  private _novaBuffer?: UniformBuffer;
  private _novaTextures?: Record<string, Texture>;

  constructor(
    name: string,
    material: PBRMaterial,
    bufferManager: VatBufferManager,
    textures: Record<string, VatTexture>,
    novaConfig?: NovaConfig
  ) {
    Vat3ParticlesMaterial.NOVA_STATIC_CONFIG = novaConfig;
    super(name, material, bufferManager, textures);
    Vat3ParticlesMaterial.NOVA_STATIC_CONFIG = undefined;

    if (novaConfig) {
      const scene = material.getScene();

      this._novaBuffer = createUniformBufferFromParams(
        scene.getEngine(),
        NovaDataManager.getDefaultUniformData() as unknown as Record<string, UniformValue>
      );
      updateUniformBufferFromParams(
        this._novaBuffer,
        NovaDataManager.convertConfigToUniformData(novaConfig) as unknown as Record<string, UniformValue>
      );

      const extracted = NovaDataManager.extractTextures(novaConfig, scene);
      this._novaTextures = {
        novaDissolveTex: extracted.dissolveTex ?? getDefaultTexture(scene),
        novaFlowmapTex:  extracted.flowmapTex  ?? getDefaultTexture(scene),
      };
    }
  }

  public override bindForSubMesh(
    uniformBuffer: UniformBuffer,
    scene: Scene,
    engine: WebGPUEngine,
    subMesh: SubMesh
  ): void {
    super.bindForSubMesh(uniformBuffer, scene, engine, subMesh);

    if (this._novaBuffer) {
      engine.bindUniformBufferBase(this._novaBuffer.getBuffer()!, 2, 'novaUniforms');

      Object.entries(this._novaTextures!).forEach(([name, texture]) => {
        uniformBuffer.setTexture(name, texture);
      });
    }
  }

  public getClassName(): string {
    return 'Vat3ParticlesMaterial';
  }

  public override getCustomCode(
    shaderType: string,
    shaderLanguage: ShaderLanguage
  ): Nullable<{ [pointName: string]: string }> {
    if (shaderLanguage !== ShaderLanguage.WGSL) return null;

    if (shaderType === 'vertex') {
      return {
        CUSTOM_VERTEX_DEFINITIONS: `
          ${vat3MacrosRaw}
          ${vat3MathsRaw}
          ${vat3SamplersRaw}
          ${vat3StructsRaw}
          ${vat3VarsRaw}
          ${vat3UtilsRaw}
          ${vat3WrappersRaw}
        `,
        CUSTOM_VERTEX_UPDATE_POSITION: this.getCustomVatVertexFn(),
      };
    }

    if (shaderType === 'fragment') {
      return {
        CUSTOM_FRAGMENT_DEFINITIONS: `
          ${vat3MathsRaw}
          ${vat3SamplersRaw}
          ${vat3StructsRaw}
          ${vat3VarsRaw}
          ${(Vat3ParticlesMaterial.NOVA_STATIC_CONFIG ?? this._novaBuffer) ? `
            ${novaUniformsWgsl}
            ${novaSamplersWgsl}
            ${novaNoiseWgsl}
            ${novaEasingWgsl}
            ${novaEmissiveWgsl}
            ${novaFlipbookWgsl}
            ${novaFlowmapWgsl}
            ${novaDissolveWgsl}
            ${novaWrapperWgsl}
          ` : ''}
        `,
        CUSTOM_FRAGMENT_MAIN_END: this.getCustomVatFragmentFn()
      };
    }

    return null;
  }

  public override getSamplers(samplers: string[]): void {
    super.getSamplers(samplers);
    if (Vat3ParticlesMaterial.NOVA_STATIC_CONFIG || this._novaBuffer) {
      samplers.push('novaDissolveTexSampler', 'novaFlowmapTexSampler');
    }
  }

  protected getCustomVatFragmentFn(): string {
    return (Vat3ParticlesMaterial.NOVA_STATIC_CONFIG || this._novaBuffer)
      ? vat3ParticlesNovaFragmentRaw
      : vat3ParticlesFragmentRaw;
  }

  protected getCustomVatVertexFn(): string {
    return vat3ParticlesVertexRaw;
  }
}
