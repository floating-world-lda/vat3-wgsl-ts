// Copyright (c) Floating World, LDA. All Rights Reserved.

import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';

import VatBase from '../core/vatBase';
import { VatType, VatTexture } from '../core/vatTypes';

import Vat3SoftbodyMaterial from '../materials/vat3SoftBody';

export default class SoftbodyVat extends VatBase {
  public readonly vatType: VatType = VatType.Softbody;

  protected createPBRMaterial(): PBRMaterial {
    const material = super.createPBRMaterial();

    material.backFaceCulling = false;

    return material;
  }

  protected createVatMaterial(
    textures: Record<string, VatTexture>
  ): PBRMaterial {
    const material = this.createPBRMaterial();

    const vatMaterial = new Vat3SoftbodyMaterial(
      this.name,
      material,
      this.bufferManager,
      textures
    );

    return material;
  }
}
