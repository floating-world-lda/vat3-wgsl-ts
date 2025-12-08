// Copyright (c) Floating World, LDA. All Rights Reserved.

import type { Scene } from '@babylonjs/core/scene';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer';
import type { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';

import {
  createUniformBufferFromParams,
  updateUniformBufferFromParams,
} from 'utils/shaders';

import type { VatConfig, VatDynamicInputs } from './vatTypes';

export default class VatBufferManager {
  private _vatDynamicInputsBuffer: UniformBuffer;
  private _vatStaticInputsBuffer: UniformBuffer;

  constructor(scene: Scene, vatConfig: VatConfig) {
    const engine = scene.getEngine() as WebGPUEngine;

    this._vatDynamicInputsBuffer = createUniformBufferFromParams(
      engine,
      vatConfig.dynamicInputs
    );
    updateUniformBufferFromParams(
      this._vatDynamicInputsBuffer,
      vatConfig.dynamicInputs
    );
    this._vatStaticInputsBuffer = createUniformBufferFromParams(
      engine,
      vatConfig.staticInputs
    );
    updateUniformBufferFromParams(
      this._vatStaticInputsBuffer,
      vatConfig.staticInputs
    );

    const instanceCount = vatConfig.staticInputs.instanceCount as number;
  }

  public getDynamicInputsBuffer(): UniformBuffer {
    return this._vatDynamicInputsBuffer;
  }

  public getStaticInputsBuffer(): UniformBuffer {
    return this._vatStaticInputsBuffer;
  }

  public setBuffersForMaterial(material: ShaderMaterial): void {
    material.setUniformBuffer(
      'vat3DynamicInputs',
      this._vatDynamicInputsBuffer
    );
    material.setUniformBuffer('vat3StaticInputs', this._vatStaticInputsBuffer);
  }

  public updateDynamicInputs(updates: VatDynamicInputs): void {
    updateUniformBufferFromParams(this._vatDynamicInputsBuffer, updates);
  }

  public dispose(): void {
    this._vatDynamicInputsBuffer.dispose();
    this._vatStaticInputsBuffer.dispose();
  }
}
