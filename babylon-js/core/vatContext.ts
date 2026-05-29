
import { loadShaderContext, ShaderType } from '../utils/shaders';

import _vat3InstancesRaw from '../materials/includes/vat3-instances.wgsl?raw';
import _vat3MacrosRaw from '../materials/includes/vat3-macros.wgsl?raw';
import _vat3MathsRaw from '../materials/includes/vat3-maths.wgsl?raw';
import _vat3SamplersRaw from '../materials/includes/vat3-samplers.wgsl?raw';
import _vat3StructsRaw from '../materials/includes/vat3-structs.wgsl?raw';
import _vat3VarsRaw from '../materials/includes/vat3-vars.wgsl?raw';
import _vat3UtilsRaw from '../materials/includes/vat3-utils.wgsl?raw';
import _vat3WrappersRaw from '../materials/includes/vat3-wrappers.wgsl?raw';

import _vat3ParticelsVertexShader from '../materials/shaders/vat3-particlesVertex.wgsl?raw';
import _vat3ParticelsFragmentShader from '../materials/shaders/vat3-particlesFragment.wgsl?raw';

let _isInitialized = false;

export const initializeVat = async (): Promise<void> => {
  if (_isInitialized) {
    console.warn('VAT3: system already initialized. Returning');
    return;
  }

  try {
    await loadShaderContext({
      contextName: 'Vat3',
      includes: [
        {
          name: 'vat3Macros',
          source: _vat3MacrosRaw,
        },
        {
          name: 'vat3Maths',
          source: _vat3MathsRaw,
        },
        {
          name: 'vat3Samplers',
          source: _vat3SamplersRaw,
        },
        {
          name: 'vat3Structs',
          source: _vat3StructsRaw,
        },
        {
          name: 'vat3Vars',
          source: _vat3VarsRaw,
        },
        {
          name: 'vat3Utils',
          source: _vat3UtilsRaw,
        },
        {
          name: 'vat3Wrappers',
          source: _vat3WrappersRaw,
        },
        {
          name: 'vat3Instances',
          source: _vat3InstancesRaw,
        },
      ],
      shaders: [
        {
          name: 'vat3ParticlesVertexShader',
          source: _vat3ParticelsVertexShader,
          type: ShaderType.Vertex,
        },
        {
          name: 'vat3ParticlesFragmentShader',
          source: _vat3ParticelsFragmentShader,
          type: ShaderType.Fragment,
        },
      ],
    });

    _isInitialized = true;
  } catch (error) {
    throw new Error(
      `VAT3: initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
