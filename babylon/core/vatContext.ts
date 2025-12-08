import { loadShaderContext, ShaderType } from '../utils/shaders';

import vat3InstancesSource from 'materials/includes/vat3-instances.wgsl?raw';
import vat3MacrosSource from 'materials/includes/vat3-macros.wgsl?raw';
import vat3MathsSource from 'materials/includes/vat3-maths.wgsl?raw';
import vat3SamplersSource from 'materials/includes/vat3-samplers.wgsl?raw';
import vat3StructsSource from 'materials/includes/vat3-structs.wgsl?raw';
import vat3UtilsSource from 'materials/includes/vat3-utils.wgsl?raw';
import vat3VarsSource from 'materials/includes/vat3-vars.wgsl?raw';
import vat3WrappersSource from 'materials/includes/vat3-wrappers.wgsl?raw';

import vat3DynamicMeshFragmentSource from 'materials/shaders/vat3-dynamicMeshFragment.wgsl?raw';
import vat3DynamicMeshVertexSource from 'materials/shaders/vat3-dynamicMeshVertex.wgsl?raw';
import vat3ParticlesFragmentSource from 'materials/shaders/vat3-particlesFragment.wgsl?raw';
import vat3ParticlesVertexSource from 'materials/shaders/vat3-particlesVertex.wgsl?raw';
import vat3RigidbodyFragmentSource from 'materials/shaders/vat3-rigidbodyFragment.wgsl?raw';
import vat3RigidbodyVertexSource from 'materials/shaders/vat3-rigidbodyVertex.wgsl?raw';
import vat3SoftbodyFragmentSource from 'materials/shaders/vat3-softbodyFragment.wgsl?raw';
import vat3SoftbodyVertexSource from 'materials/shaders/vat3-softbodyVertex.wgsl?raw';

let _isInitialized = false;

export const initializeVat = async (): Promise<void> => {
  if (_isInitialized) {
    console.warn('VAT: system already initialized. Returning');
    return;
  }

  try {
    loadShaderContext({
      contextName: 'Vat3',
      includes: [
        {
          name: 'vat3Instances',
          source: vat3InstancesSource,
        },
        {
          name: 'vat3Macros',
          source: vat3MacrosSource,
        },
        {
          name: 'vat3Maths',
          source: vat3MathsSource,
        },
        {
          name: 'vat3Samplers',
          source: vat3SamplersSource,
        },
        {
          name: 'vat3Structs',
          source: vat3StructsSource,
        },
        {
          name: 'vat3Utils',
          source: vat3UtilsSource,
        },
        {
          name: 'vat3Vars',
          source: vat3VarsSource,
        },
        {
          name: 'vat3Wrappers',
          source: vat3WrappersSource,
        },
      ],
      shaders: [
        {
          name: 'vat3DynamicMeshFragmentShader',
          source: vat3DynamicMeshFragmentSource,
          type: ShaderType.Fragment,
        },
        {
          name: 'vat3DynamicMeshVertexShader',
          source: vat3DynamicMeshVertexSource,
          type: ShaderType.Vertex,
        },
        {
          name: 'vat3ParticlesFragmentShader',
          source: vat3ParticlesFragmentSource,
          type: ShaderType.Fragment,
        },
        {
          name: 'vat3ParticlesVertexShader',
          source: vat3ParticlesVertexSource,
          type: ShaderType.Vertex,
        },
        {
          name: 'vat3RigidbodyFragmentShader',
          source: vat3RigidbodyFragmentSource,
          type: ShaderType.Fragment,
        },
        {
          name: 'vat3RigidbodyVertexShader',
          source: vat3RigidbodyVertexSource,
          type: ShaderType.Vertex,
        },
        {
          name: 'vat3SoftbodyFragmentShader',
          source: vat3SoftbodyFragmentSource,
          type: ShaderType.Fragment,
        },
        {
          name: 'vat3SoftbodyVertexShader',
          source: vat3SoftbodyVertexSource,
          type: ShaderType.Vertex,
        },
      ],
    });
    _isInitialized = true;
  } catch (error) {
    throw new Error(
      `VAT: initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
