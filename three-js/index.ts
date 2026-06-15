// Copyright (c) Floating World, LDA. All Rights Reserved.

import { isBrowser } from './utils/browser';

import VatBase from './core/vatBase';
import { type VatAssets, VatType } from './core/vatTypes';
import DynamicMeshVat from './variants/dynamicMeshVat';
import ParticlesVat from './variants/particlesVat';
import RigidBodyVat from './variants/rigidBodyVat';
import SoftBodyVat from './variants/softBodyVat';

export class VAT3 {
  public static async loadAssets(
    rootPath: string,
    assetName: string
  ): Promise<VatAssets> {
    return VatBase.loadAssets(rootPath, assetName);
  }

  public static createSoftBody(assets: VatAssets): SoftBodyVat {
    return new SoftBodyVat(assets);
  }

  public static createDynamicMesh(assets: VatAssets): DynamicMeshVat {
    return new DynamicMeshVat(assets);
  }

  public static createRigidBody(assets: VatAssets): RigidBodyVat {
    return new RigidBodyVat(assets);
  }

  public static createParticles(assets: VatAssets): ParticlesVat {
    return new ParticlesVat(assets);
  }
}

export { VatType };
export type { VatAssets };

if (isBrowser) {
  (window as unknown as Record<string, unknown>).VAT3 = VAT3;
  (window as unknown as Record<string, unknown>).VatType = VatType;
}
