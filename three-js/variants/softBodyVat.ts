// Copyright (c) Floating World, LDA. All Rights Reserved.

import type { PerspectiveCamera } from 'three';

import VatBase from '../core/vatBase';
import { VatType, type VatTexture } from '../core/vatTypes';
import Vat3SoftbodyMaterial from '../materials/vat3SoftBody';
import type VatMaterial from '../materials/vatMaterial';

export default class SoftBodyVat extends VatBase {
  public readonly vatType: VatType = VatType.Softbody;

  private _camera: PerspectiveCamera | null = null;

  public setCamera(camera: PerspectiveCamera): void {
    this._camera = camera;
  }

  protected getCamera(): PerspectiveCamera | null {
    return this._camera;
  }

  protected createVatMaterial(
    textures: Record<string, VatTexture>
  ): VatMaterial {
    return new Vat3SoftbodyMaterial(this.bufferManager, textures);
  }
}
