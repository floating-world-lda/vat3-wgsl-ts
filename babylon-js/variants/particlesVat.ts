// Copyright (c) Floating World, LDA. All Rights Reserved.

import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Constants } from '@babylonjs/core/Engines/constants';
import { Material } from '@babylonjs/core/Materials/material';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { Texture } from '@babylonjs/core/Materials/Textures/texture';

import type { NovaConfig } from '@floatingworld/nova-babylonjs';

import { getDefaultTexture } from '../utils/texture';

import VatBase from '../core/vatBase';
import { VatType, type VatAssets, type VatTexture } from '../core/vatTypes';

import Vat3ParticlesMaterial from '../materials/vat3Particles';

export default class ParticlesVat extends VatBase {
  // constructor super work-around
  private static NOVA_STATIC_CONFIG?: NovaConfig;

  public readonly vatType: VatType = VatType.Particles;

  public set albedoTexture(texture: Texture) {
    (this.material as PBRMaterial).albedoTexture = texture;
  }

  public set normalTexture(texture: Texture) {
    (this.material as PBRMaterial).bumpTexture = texture;
  }

  constructor(
    public readonly scene: Scene,
    assets: VatAssets,
    novaConfig?: NovaConfig
  ) {
    ParticlesVat.NOVA_STATIC_CONFIG = novaConfig;
    super(scene, assets, 0);
    ParticlesVat.NOVA_STATIC_CONFIG = undefined;
  }

  protected createPBRMaterial(): PBRMaterial {
    const material = super.createPBRMaterial();

    material.backFaceCulling = false;
    material.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
    material.useAlphaFromAlbedoTexture = true;

    return material;
  }

  protected createVatMaterial(textures: Record<string, VatTexture>): PBRMaterial {
    const material = this.createPBRMaterial();

    material.albedoTexture = getDefaultTexture(this.scene);
    material.albedoTexture.hasAlpha = true;
    material.alphaMode = Constants.ALPHA_COMBINE;
    material.backFaceCulling = false;
    material.transparencyMode = Material.MATERIAL_ALPHABLEND;
    material.useAlphaFromAlbedoTexture = true;

    new Vat3ParticlesMaterial(
      this.name,
      material,
      this.bufferManager,
      textures,
      ParticlesVat.NOVA_STATIC_CONFIG
    );

    return material;
  }
}
