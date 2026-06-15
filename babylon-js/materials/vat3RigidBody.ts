// Copyright (c) Floating World, LDA. All Rights Reserved.

import VatMaterialWgsl from './vat3Material';

import vatRigidBodyFragmentRaw from './shaders/vat3-rigidbodyFragment.wgsl?raw';
import vatRigidBodyVertexRaw from './shaders/vat3-rigidbodyVertex.wgsl?raw';

export default class Vat3RigidBodyMaterial extends VatMaterialWgsl {
  public getClassName(): string {
    return 'Vat3RigidBodyMaterial';
  }

  protected getCustomVatVertexFn(): string {
    return vatRigidBodyVertexRaw;
  }

  protected getCustomVatFragmentFn(): string {
    return vatRigidBodyFragmentRaw;
  }
}
