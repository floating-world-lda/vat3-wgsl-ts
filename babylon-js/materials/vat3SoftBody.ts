// Copyright (c) Floating World, LDA. All Rights Reserved.

import VatMaterialWgsl from './vat3Material';

import vatSoftBodyFragmentRaw from './shaders/vat3-softbodyFragment.wgsl?raw';
import vatSoftBodyVertexRaw from './shaders/vat3-softbodyVertex.wgsl?raw';

export default class Vat3SoftbodyMaterial extends VatMaterialWgsl {
  public getClassName(): string {
    return 'Vat3SoftbodyMaterial';
  }

  protected getCustomVatVertexFn(): string {
    return vatSoftBodyVertexRaw;
  }

  protected getCustomVatFragmentFn(): string {
    return vatSoftBodyFragmentRaw;
  }
}
