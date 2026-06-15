// Copyright (c) Floating World, LDA. All Rights Reserved.

import type { Mesh, Texture } from 'three';
import { mul, texture, uv } from 'three/tsl';
import type { Node } from 'three/webgpu';

import { getDefaultTexture } from '../utils/texture';

import vat3ParticlesVertexRaw from './shaders/vat3-particlesVertex.wgsl?raw';
import VatMaterial from './vatMaterial';

export default class Vat3ParticlesMaterial extends VatMaterial {
  private readonly _albedoMaskNode = texture(getDefaultTexture(), uv(0));

  public set albedoTexture(albedoTexture: Texture) {
    this._albedoMaskNode.value = albedoTexture;
  }

  public getClassName(): string {
    return 'Vat3ParticlesMaterial';
  }

  public override applyToMesh(mesh: Mesh): void {
    super.applyToMesh(mesh);

    this.material.colorNode   = mul(this.material.colorNode!, this._albedoMaskNode.rgb);
    this.material.opacityNode = mul(this.material.opacityNode!, this._albedoMaskNode.a);
  }

  protected getVariantShader(): string {
    return vat3ParticlesVertexRaw;
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
