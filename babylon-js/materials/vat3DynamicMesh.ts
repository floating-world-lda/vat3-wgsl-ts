// Copyright (c) Floating World, LDA. All Rights Reserved.

import VatMaterialWgsl from './vat3Material';

import vatDynamicMeshFragmentRaw from './shaders/vat3-dynamicMeshFragment.wgsl?raw';
import vatDynamicMeshVertexRaw from './shaders/vat3-dynamicMeshVertex.wgsl?raw';

export default class Vat3DynamicMeshMaterial extends VatMaterialWgsl {
  public getClassName(): string {
    return 'Vat3DynamicMeshMaterial';
  }

  protected getCustomVatVertexFn(): string {
    return vatDynamicMeshVertexRaw;
  }

  protected getCustomVatFragmentFn(): string {
    return vatDynamicMeshFragmentRaw;
  }
}
