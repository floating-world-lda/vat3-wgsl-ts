// Copyright (c) Floating World, LDA. All Rights Reserved.

import { texture } from 'three/tsl';
import type { Node } from 'three/webgpu';

import vat3DynamicMeshVertexRaw from './shaders/vat3-dynamicMeshVertex.wgsl?raw';
import VatMaterial from './vatMaterial';

export default class Vat3DynamicMeshMaterial extends VatMaterial {
  public getClassName(): string {
    return 'Vat3DynamicMeshMaterial';
  }

  protected getVariantShader(): string {
    return vat3DynamicMeshVertexRaw;
  }

  protected getTextureNodes(): Node[] {
    const pos      = this._textures['vatPosTex'].texture;
    const col      = this._textures['vatColTex'].texture;
    const rot      = this._textures['vatRotTex'].texture;
    const pos2     = this._textures['vatPos2Tex'].texture;
    const spareCol = this._textures['vatSpareColTex'].texture;
    const lookup   = this._textures['vatLookupTex'].texture;

    return [
      texture(col),
      texture(lookup),
      texture(pos2),
      texture(pos),
      texture(rot),
      texture(spareCol),
    ];
  }
}