// Copyright (c) Floating World, LDA. All Rights Reserved.

import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';

import { VatType, type VatTexture } from 'core/vatTypes';
import VatBase from 'core/vatBase';
import Vat3DynamicMeshMaterial from 'materials/vat3DynamicMesh';

export default class DynamicMeshVat extends VatBase {
  public readonly vatType: VatType = VatType.DynamicMesh;

  protected createVatMaterial(
    textures: Record<string, VatTexture>
  ): PBRMaterial {
    const material = this.createPBRMaterial();

    new Vat3DynamicMeshMaterial(
      this.name,
      material,
      this.bufferManager,
      textures
    );

    return material;
  }
}
