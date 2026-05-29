// Copyright (c) Floating World, LDA. All Rights Reserved.

import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { ShaderStore } from '@babylonjs/core/Engines/shaderStore';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Vector2, Vector3, Vector4 } from '@babylonjs/core/Maths/math.vector';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer';

export enum ShaderType {
  Compute = 'compute',
  Fragment = 'fragment',
  Vertex = 'vertex',
}

export interface ShaderContext {
  contextName: string;
  includes?: ShaderIncludeDefinition[];
  shaders?: ShaderDefinition[];
}

export interface ShaderDefinition {
  name: string;
  source: string;
  type: ShaderType;
}

export interface ShaderIncludeDefinition {
  name: string;
  source: string;
}

export type UniformValue =
  | boolean
  | number
  | Vector2
  | Vector3
  | Vector4
  | Color3
  | Color4
  | Matrix
  | Texture;

export const createUniformBufferFromParams = (
  engine: AbstractEngine,
  params: Record<string, UniformValue>
): UniformBuffer => {
  const ubo = new UniformBuffer(engine);
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'boolean' || typeof value === 'number') {
      ubo.addUniform(key, 1);
    } else if (value instanceof Vector2) {
      ubo.addUniform(key, 2);
    } else if (value instanceof Vector3 || value instanceof Color3) {
      ubo.addUniform(key, 3);
    } else if (value instanceof Vector4 || value instanceof Color4) {
      ubo.addUniform(key, 4);
    } else if (value instanceof Matrix) {
      ubo.addUniform(key, 16);
    } else {
      throw new Error(`Unsupported uniform type for key: ${key}`);
    }
  }
  ubo.create();
  return ubo;
};

export const loadShaderContext = (context: ShaderContext): void => {
  if (!context?.contextName) {
    throw new Error('Shader context requires a contextName');
  }

  try {
    context.includes?.forEach(include => {
      if (ShaderStore.IncludesShadersStoreWGSL[include.name]) {
        return;
      }
      ShaderStore.IncludesShadersStoreWGSL[include.name] = include.source;
    });

    context.shaders?.forEach(shader => {
      if (ShaderStore.ShadersStoreWGSL[shader.name]) {
        return;
      }
      ShaderStore.ShadersStoreWGSL[shader.name] = shader.source;
    });
  } catch (error) {
    throw new Error(
      `Shader context '${context.contextName}' failed to load: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
};

export const updateUniformBufferFromParams = (
  ubo: UniformBuffer,
  params: Record<string, UniformValue>
): void => {
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'boolean') {
      ubo.updateInt(key, value ? 1 : 0);
    } else if (typeof value === 'number') {
      ubo.updateFloat(key, value);
    } else if (value instanceof Vector2) {
      ubo.updateFloat2(key, value.x, value.y);
    } else if (value instanceof Vector3) {
      ubo.updateFloat3(key, value.x, value.y, value.z);
    } else if (value instanceof Vector4) {
      ubo.updateFloat4(key, value.x, value.y, value.z, value.w);
    } else if (value instanceof Color3) {
      ubo.updateColor3(key, value);
    } else if (value instanceof Color4) {
      ubo.updateColor4(key, new Color3(value.r, value.g, value.b), value.a);
    } else if (value instanceof Matrix) {
      ubo.updateMatrix(key, value);
    } else {
      throw new Error(`Unsupported uniform type for key: ${key}`);
    }
  }
  ubo.update();
};