// Copyright (c) Floating World, LDA. All Rights Reserved.

import type { PerspectiveCamera, Texture } from 'three';

import VatBase from '../core/vatBase';
import { VatType, type VatTexture } from '../core/vatTypes';
import Vat3ParticlesMaterial from '../materials/vat3Particles';
import type VatMaterial from '../materials/vatMaterial';

export default class ParticlesVat extends VatBase {
  public readonly vatType: VatType = VatType.Particles;

  private _camera: PerspectiveCamera | null = null;
  private declare _vatMaterial: Vat3ParticlesMaterial;

  public setCamera(camera: PerspectiveCamera): void {
    this._camera = camera;
  }

  public set albedoTexture(albedoTexture: Texture) {
    this._vatMaterial.albedoTexture = albedoTexture;
  }

  protected getCamera(): PerspectiveCamera | null {
    return this._camera;
  }

  protected createVatMaterial(
    textures: Record<string, VatTexture>
  ): VatMaterial {
    this._vatMaterial = new Vat3ParticlesMaterial(this.bufferManager, textures);
    return this._vatMaterial;
  }
}
