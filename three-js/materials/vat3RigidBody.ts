// Copyright (c) Floating World, LDA. All Rights Reserved.

import { normalLocal, positionLocal, tangentLocal, texture, uv } from 'three/tsl';
import type { Node } from 'three/webgpu';

import vat3RigidBodyVertexRaw from './shaders/vat3-rigidbodyVertex.wgsl?raw';
import VatMaterial from './vatMaterial';

export default class Vat3RigidBodyMaterial extends VatMaterial {
  public getClassName(): string {
    return 'Vat3RigidBodyMaterial';
  }

  protected getVariantShader(): string {
    return vat3RigidBodyVertexRaw;
  }

  protected getVertexNodes(): Node[] {
    return [
      positionLocal,
      normalLocal,
      tangentLocal,
      uv(0),
      uv(1),
      uv(2),
      uv(3),
    ];
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