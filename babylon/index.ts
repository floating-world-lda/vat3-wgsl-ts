import type { Scene } from '@babylonjs/core/scene';

// import type ShaderService from 'services/shader.service';

import VatBase from 'core/vatBase';
import { type VatAssets, VatType } from 'core/vatTypes';

import SoftBodyVat from 'variants/softBodyVat';
import ParticleVat from 'variants/particlesVat';
import RigidBodyVat from 'variants/rigidBodyVat';
import DynamicMeshVat from 'variants/dynamicMeshVat';

import { initializeVat } from './core/vatContext';

export default class VAT3MaterialFactory {
  public static CreateVAT3Material(
    scene: Scene,
    vatAssets: VatAssets,
    vatType: VatType
  ): VatBase {
    switch (vatType) {
      case VatType.Particles:
        return new ParticleVat(scene, vatAssets);
      case VatType.DynamicMesh:
        return new DynamicMeshVat(scene, vatAssets);
      case VatType.Softbody:
        return new SoftBodyVat(scene, vatAssets);
      case VatType.Rigidbody:
        return new RigidBodyVat(scene, vatAssets);
      default:
        throw new Error(`Invalid VAT type: ${vatType}`);
    }
  }

  public static async LoadVAT3Assets(
    scene: Scene,
    rootPath: string,
    assetName: string
  ): Promise<VatAssets> {
    return VatBase.loadAssets(scene, rootPath, assetName);
  }

  // public static async LoadVAT3Shaders(
  //   shaderContextController: ShaderService
  // ): Promise<void> {
  //   return initializeVat(shaderContextController);
  // }
}
