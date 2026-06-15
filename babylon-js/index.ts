import type { Scene } from '@babylonjs/core/scene';

import type { NovaConfig } from '@floatingworld/nova-babylonjs';

import { isBrowser } from './utils/browser';

import VatBase from './core/vatBase';
import VatGlobalConfiguration from './core/vatGlobalConfiguration';
import { type VatAssets, VatType } from './core/vatTypes';

import DynamicMeshVat from './variants/dynamicMeshVat';
import ParticlesVat from './variants/particlesVat';
import ParticlesVatLT from './variants/particlesVatLT';
import RigidBodyVat from './variants/rigidBodyVat';
import SoftBodyVat from './variants/softBodyVat';

export class VAT3 {
  public static create(scene: Scene, vatAssets: VatAssets, vatType: VatType.DynamicMesh): DynamicMeshVat;
  public static create(scene: Scene, vatAssets: VatAssets, vatType: VatType.Particles, novaConfig?: NovaConfig): ParticlesVat;
  public static create(scene: Scene, vatAssets: VatAssets, vatType: VatType.ParticlesLT, novaConfig?: NovaConfig): ParticlesVatLT;
  public static create(scene: Scene, vatAssets: VatAssets, vatType: VatType.Rigidbody): RigidBodyVat;
  public static create(scene: Scene, vatAssets: VatAssets, vatType: VatType.Softbody): SoftBodyVat;
  public static create(
    scene: Scene,
    vatAssets: VatAssets,
    vatType: VatType,
    novaConfig?: NovaConfig,
  ): VatBase {
    switch (vatType) {
      case VatType.DynamicMesh:
        return new DynamicMeshVat(scene, vatAssets);

      case VatType.Particles:
        return new ParticlesVat(scene, vatAssets, novaConfig);

      case VatType.ParticlesLT:
        return new ParticlesVatLT(scene, vatAssets, novaConfig);

      case VatType.Rigidbody:
        return new RigidBodyVat(scene, vatAssets);

      case VatType.Softbody:
        return new SoftBodyVat(scene, vatAssets);

      default:
        throw new Error(`Invalid VAT type: ${vatType}`);
    }
  }

  public static async loadAssets(
    scene: Scene,
    rootPath: string,
    assetName: string
  ): Promise<VatAssets> {
    return VatBase.loadAssets(scene, rootPath, assetName);
  }
}

export type { VatAssets };
export { VatGlobalConfiguration };
export { VatType };

if (isBrowser) {
  window.VAT3 = VAT3;
  window.VatType = VatType;
}
