// Copyright (c) Floating World, LDA. All Rights Reserved.

import { AssetContainer } from '@babylonjs/core/assetContainer';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';

import type { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import type { Texture } from '@babylonjs/core/Materials/Textures/texture';

import type { NovaConfig } from '@floatingworld/nova-babylonjs';

import VatBase from '../core/vatBase';
import { VatType, type VatAssets, type VatTexture } from '../core/vatTypes';

import Vat3ParticlesLTMaterial from '../materials/vat3ParticlesLT';

export default class ParticlesVatLT extends VatBase {
  private static NOVA_STATIC_CONFIG?: NovaConfig;

  public readonly vatType: VatType = VatType.ParticlesLT;

  public set albedoTexture(texture: Texture) {
    (this.material as Vat3ParticlesLTMaterial).albedoTexture = texture;
  }

  public set emissiveTexture(texture: Texture) {
    (this.material as Vat3ParticlesLTMaterial).emissiveTexture = texture;
  }

  constructor(
    public readonly scene: Scene,
    assets: VatAssets,
    novaConfig?: NovaConfig
  ) {
    ParticlesVatLT.NOVA_STATIC_CONFIG = novaConfig;
    super(scene, assets, 0);
    ParticlesVatLT.NOVA_STATIC_CONFIG = undefined;

    this._updateMeshVertexData();
  }

  private _updateMeshVertexData(): void {
    const positions = new Array(this.vertexCount * 4 * 3).fill(0);
    const uvs: number[] = [];
    const uv2s: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < this.vertexCount; i++) {
      const u = i / this.vertexCount;
      const vi = i * 4;

      uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
      uv2s.push(u, 0, u, 0, u, 0, u, 0);
      indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
    }

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.uvs = uvs;
    vertexData.uvs2 = uv2s;
    vertexData.indices = indices;
    vertexData.applyToMesh(this.mesh, false);

    this.mesh.alwaysSelectAsActiveMesh = true;
  }
  
  protected createVatMaterial(textures: Record<string, VatTexture>): ShaderMaterial {
    const vat3Particles = new Vat3ParticlesLTMaterial(
      this.name + '_ShaderMat',
      this.scene,
      this.bufferManager,
      ParticlesVatLT.NOVA_STATIC_CONFIG
    );

    vat3Particles.onCompiled = (_): void => {
      Object.entries(textures).forEach(([texName, wgslTexture]) => {
        vat3Particles.setTexture(`${texName}`, wgslTexture.texture);
        vat3Particles.setTextureSampler(`${texName}Sampler`, wgslTexture.sampler);
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
    const mesh = MeshBuilder.CreatePlane('plane', {
      size: 1.0,
      sideOrientation: Mesh.DOUBLESIDE,
    });
    container.meshes = [mesh];
    return { container, mesh };
  }
}
