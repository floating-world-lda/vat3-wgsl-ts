// Copyright (c) Floating World, LDA. All Rights Reserved.

import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';

import VatBase from '../core/vatBase';
import { VatType, type VatTexture } from '../core/vatTypes';

import Vat3RigidBodyMaterial from '../materials/vat3RigidBody';

export default class RigidBodyVat extends VatBase {
  public readonly vatType: VatType = VatType.Rigidbody;

  protected createVatMaterial(
    textures: Record<string, VatTexture>
  ): PBRMaterial {
    const material = this.createPBRMaterial();

    this._vatPlugin = new Vat3RigidBodyMaterial(
      this.name,
      material,
      this.bufferManager,
      textures
    );

    return material;
  }
}
