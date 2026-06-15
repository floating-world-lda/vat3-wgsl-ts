// Copyright (c) Floating World, LDA. All Rights Reserved.

import type { Mesh, Texture } from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import type { Node } from 'three/webgpu';
import { normalLocal, positionLocal, uv, vec3, vec4, wgsl, wgslFn } from 'three/tsl';

import type VatBufferManager from '../core/vatBufferManager';
import { VAT3_WGSL_INCLUDES } from '../core/vatContext';

export default abstract class VatMaterial {
  public readonly material: MeshStandardNodeMaterial;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _vatOutputs: any = null;

  constructor(
    protected readonly _bufferManager: VatBufferManager,
    protected readonly _textures: Record<string, { texture: Texture }>
  ) {
    this.material = new MeshStandardNodeMaterial();
    this.material.side = 2;
  }

  public applyToMesh(mesh: Mesh): void {
    const includesNode = wgsl(VAT3_WGSL_INCLUDES);
    const variantCode  = this.getVariantShader();
    const fnStart      = variantCode.indexOf('\nfn ');
    const deformFn     = wgslFn(fnStart >= 0 ? variantCode.slice(fnStart + 1) : variantCode, [includesNode]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._vatOutputs = deformFn(
      ...this.getVertexNodes(),
      ...this.getTextureNodes(),
      this._bufferManager.dynamicActivation,
      this._bufferManager.staticActivation
    ) as any;

    const colorAndAlpha = vec4(this._vatOutputs.get('outColorAndAlpha')).toVertexStage();

    this.material.positionNode = vec3(this._vatOutputs.get('outPosition'));
    this.material.normalNode   = vec3(this._vatOutputs.get('outNormal'));
    this.material.colorNode    = vec3(colorAndAlpha);
    this.material.opacityNode  = colorAndAlpha.a;
    this.material.transparent  = true;

    mesh.material = this.material;
  }

  public get isEnabled(): boolean {
    return this.material.visible;
  }

  public set isEnabled(enabled: boolean) {
    this.material.visible = enabled;
  }

  protected getVertexNodes(): Node[] {
    return [
      positionLocal,
      normalLocal,
      uv(0),
      uv(1),
    ];
  }

  protected abstract getVariantShader(): string;
  protected abstract getTextureNodes(): Node[];

  public dispose(): void {
    this.material.dispose();
  }
}