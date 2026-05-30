// Copyright (c) Floating World, LDA. All Rights Reserved.

import type { Nullable } from '@babylonjs/core/types';
import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase';
import type { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import type { Scene } from '@babylonjs/core/scene';
import { ShaderLanguage } from '@babylonjs/core/Materials/shaderLanguage';
import { ShaderStore } from '@babylonjs/core/Engines/shaderStore';
import type { SubMesh } from '@babylonjs/core/Meshes/subMesh';
import { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer';
import type { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';

import vat3MacrosRaw from './includes/vat3-macros.wgsl?raw';
import vat3MathsRaw from './includes/vat3-maths.wgsl?raw';
import vat3SamplersRaw from './includes/vat3-samplers.wgsl?raw';
import vat3StructsRaw from './includes/vat3-structs.wgsl?raw';
import vat3VarsRaw from './includes/vat3-vars.wgsl?raw';
import vat3UtilsRaw from './includes/vat3-utils.wgsl?raw';
import vat3WrappersRaw from './includes/vat3-wrappers.wgsl?raw';

import VatBufferManager from '../core/vatBufferManager';
import { VatTexture } from '../core/vatTypes';

export default abstract class VatMaterial extends MaterialPluginBase {
  protected _isEnabled: boolean = true;

  constructor(
    name: string,
    material: PBRMaterial,
    protected readonly _bufferManager: VatBufferManager,
    protected readonly _textures: Record<string, VatTexture>
  ) {
    super(material, name, 5, {});

    this.isEnabled = true;
  }

  public get isEnabled(): boolean {
    return this._isEnabled;
  }

  public set isEnabled(enabled: boolean) {
    if (enabled) {
      console.log("ENABLE START", performance.now());
      this._enable(true);
      //
      this.markAllDefinesAsDirty();
      console.log("ENABLE END", performance.now());
    } else {
      this._enable(false);
    }
  }

  public bindForSubMesh(
    uniformBuffer: UniformBuffer,
    _scene: Scene,
    engine: WebGPUEngine,
    _subMesh: SubMesh
  ): void {
    if (!this._isEnabled) return;

    Object.entries(this._textures).forEach(([textureName, { texture }]) => {
      uniformBuffer.setTexture(`${textureName}`, texture);
    });

    engine.bindUniformBufferBase(
      this._bufferManager.getDynamicInputsBuffer().getBuffer()!,
      0, // not used in webgpu
      'vat3DynamicInputs'
    );
    engine.bindUniformBufferBase(
      this._bufferManager.getStaticInputsBuffer().getBuffer()!,
      666,
      'vat3StaticInputs'
    );
  }

  public isCompatible(shaderLanguage: ShaderLanguage): boolean {
    switch (shaderLanguage) {
      case ShaderLanguage.WGSL:
        return true;
      default:
        return false;
    }
  }

  public getCustomCode(
    shaderType: string,
    shaderLanguage: ShaderLanguage
  ): Nullable<{ [pointName: string]: string }> {
    if (shaderLanguage !== ShaderLanguage.WGSL) {
      return null;
    }

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
        CUSTOM_FRAGMENT_MAIN_END: this.getCustomVatFragmentFn(),
      };
    }
    return null;
  }

  protected abstract getCustomVatFragmentFn(): string;
  protected abstract getCustomVatVertexFn(): string;

  public getSamplers(samplers: string[]): void {
    Object.keys(this._textures).forEach(textureName => {
      samplers.push(`${textureName}Sampler`);
    });
  }

  public getShaderString(shaderName: string): string {
    const shader = ShaderStore.ShadersStoreWGSL[shaderName];
    if (typeof shader !== 'string') {
      throw new Error(
        `VatMaterial: Shader [${shaderName}] not found in ShaderStore.ShadersStoreWGSL.`
      );
    }

    return shader;
  }
}
