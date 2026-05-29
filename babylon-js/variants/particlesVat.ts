// Copyright (c) Floating World, LDA. All Rights Reserved.

import { AssetContainer } from '@babylonjs/core/assetContainer';
import { Constants } from '@babylonjs/core/Engines/constants';
import { Material } from '@babylonjs/core/Materials/material';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Scene } from '@babylonjs/core/scene';

import type { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import type { Texture } from '@babylonjs/core/Materials/Textures/texture';

import {
  getDefaultSampler,
  getDefaultTexture,
} from '../utils/texture';

import VatBase from '../core/vatBase';
import { VatType, type VatAssets, type VatTexture } from '../core/vatTypes';

import Vat3ParticlesMaterial from '../materials/vat3Particles';

export default class ParticleVat extends VatBase {
  public readonly vatType: VatType = VatType.Particles;

  public set particleTexture(texture: Texture) {
    (this.material as ShaderMaterial).setTexture('particleTex', texture);
  }

  constructor(
    public readonly scene: Scene,
    assets: VatAssets
  ) {
    super(scene, assets, 0);
  }

  protected createVatMaterial(
    textures: Record<string, VatTexture>
  ): ShaderMaterial {
    this.createInstances(this.vertexCount);

    const vat3Particles = new Vat3ParticlesMaterial(
      this.name + '_ShaderMat',
      this.scene,
      this.bufferManager
    );
    vat3Particles.alphaMode = Constants.ALPHA_COMBINE;
    vat3Particles.backFaceCulling = false;
    vat3Particles.transparencyMode = Material.MATERIAL_OPAQUE;

    vat3Particles.setTexture('particleTex', getDefaultTexture(this.scene));
    vat3Particles.setTextureSampler('particleSampler', getDefaultSampler());

    vat3Particles.onCompiled = (_): void => {
      Object.entries(textures).forEach(([texName, wgslTexture]) => {
        vat3Particles.setTexture(`${texName}`, wgslTexture.texture);
        vat3Particles.setTextureSampler(
          `${texName}Sampler`,
          wgslTexture.sampler
        );
      });
    };

    return vat3Particles;
  }

  protected static override async loadMesh(
    scene: Scene,
    _rootPath: string,
    _assetName: string
  ): Promise<{ container: AssetContainer; mesh: Mesh }> {
    const container = new AssetContainer(scene);
    const planeMesh = MeshBuilder.CreatePlane('plane', {
      size: 1.0,
      sideOrientation: Mesh.DOUBLESIDE,
    });
    container.meshes = [planeMesh];
    return { container, mesh: planeMesh };
  }
}
