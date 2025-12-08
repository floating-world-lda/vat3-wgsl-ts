// Copyright (c) Floating World, LDA. All Rights Reserved.

import VatMaterialWgsl from './vat3Material';

export default class Vat3RigidBodyMaterial extends VatMaterialWgsl {
  protected getCustomVatVertexFn(): string {
    return this.getShaderString('vat3RigidbodyVertexShader');
  }

  protected getCustomVatFragmentFn(): string {
    return this.getShaderString('vat3RigidbodyFragmentShader');
  }
}
