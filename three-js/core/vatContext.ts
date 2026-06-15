// Copyright (c) Floating World, LDA. All Rights Reserved.

import _vat3InstancesRaw from '../materials/includes/vat3-instances.wgsl?raw';
import _vat3MacrosRaw from '../materials/includes/vat3-macros.wgsl?raw';
import _vat3MathsRaw from '../materials/includes/vat3-maths.wgsl?raw';
import _vat3StructsRaw from '../materials/includes/vat3-structs.wgsl?raw';
import _vat3UtilsRaw from '../materials/includes/vat3-utils.wgsl?raw';
import _vat3VarsRaw from '../materials/includes/vat3-vars.wgsl?raw';
import _vat3WrappersRaw from '../materials/includes/vat3-wrappers.wgsl?raw';

export const VAT3_WGSL_INCLUDES: string = [
  _vat3MacrosRaw,
  _vat3StructsRaw,
  _vat3MathsRaw,
  _vat3UtilsRaw,
  _vat3VarsRaw,
  _vat3WrappersRaw,
  _vat3InstancesRaw,
].join('\n');
