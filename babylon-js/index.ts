import type { Scene } from '@babylonjs/core/scene';

import VatBase from './core/vatBase';
import { initializeVat } from './core/vatContext';
import { type VatAssets, VatType } from './core/vatTypes';

import SoftBodyVat from './variants/softBodyVat';
import ParticleVat from './variants/particlesVat';
import RigidBodyVat from './variants/rigidBodyVat';
import DynamicMeshVat from './variants/dynamicMeshVat';

import { isBrowser } from './utils/browser';

export class VAT3 {
  public static create(
    scene: Scene,
    vatAssets: VatAssets,
    vatType: VatType
  ): VatBase {
    switch (vatType) {
      case VatType.DynamicMesh:
        return new DynamicMeshVat(scene, vatAssets);

      case VatType.Particles:
        return new ParticleVat(scene, vatAssets);

      case VatType.Rigidbody:
        return new RigidBodyVat(scene, vatAssets);

      case VatType.Softbody:
        return new SoftBodyVat(scene, vatAssets);

      default:
        throw new Error(`Invalid VAT type: ${vatType}`);
    }
  }

  public static async initialize(
  ): Promise<void> {
    return initializeVat();
  }

  public static async loadAssets(
    scene: Scene,
    rootPath: string,
    assetName: string
  ): Promise<VatAssets> {
    return VatBase.loadAssets(scene, rootPath, assetName);
  }
}

export { VatType };
export type { VatAssets };

if (isBrowser) {
  window.VAT3 = VAT3;
  window.VatType = VatType;
}
