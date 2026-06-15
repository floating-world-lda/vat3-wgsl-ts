# @floatingworld/vat3-threejs

Houdini Vertex Animation Texture (VAT) playback for [Three.js](https://threejs.org/) using WebGPU and [TSL](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language).

This package consumes VAT3 assets exported from Houdini and reconstructs animation entirely on the GPU using Three.js TSL materials and WGSL functions. It implements the `DynamicMesh`, `SoftBody`, `Rigidbody`, and `Particles` VAT3 variants while integrating directly with Three.js's WebGPU rendering pipeline.

For an overview of the VAT workflow, asset format, supported simulation types, and repository structure, see the [root README](../README.md). Both `vat3-threejs` and [`vat3-babylonjs`](../babylon-js) consume the same Houdini export format, so assets are interchangeable between the two runtimes.

> Requires Three.js's `WebGPURenderer` — the standard WebGL renderer is not supported, since VAT3 materials are implemented as TSL `wgslFn()`-based `MeshStandardNodeMaterial`s.

---

## Installation

```bash
npm install @floatingworld/vat3-threejs three
```

| Dependency | Type |
| ---------- | ---- |
| `three`    | peer (`^0.175.0`) |

---

## Quick Start

```ts
import { VAT3 } from '@floatingworld/vat3-threejs';

const assets = await VAT3.loadAssets('/assets/', 'vat3_dynamicMesh');

const vat = VAT3.createDynamicMesh(assets);
vat.setCamera(camera);
scene.add(vat.mesh);

renderer.setAnimationLoop(() => {
  vat.update(performance.now() * 0.001);
  renderer.render(scene, camera);
});
```

The runtime loads the exported asset package, creates the required GPU resources, and reconstructs animation directly within Three.js's render loop. `setCamera(camera)` must be called once before the first `update()` — Three.js variants recompute camera-relative matrices every frame, which Babylon's pipeline handles internally.

---

## Three.js Runtime Architecture

The Three.js implementation is designed to integrate with existing Three.js WebGPU rendering workflows rather than replacing them.

```text
VAT Asset
    │
    ▼
VAT Loader
    │
    ▼
VAT Material (TSL)
    │
    ▼
Three.js Render Pipeline
```

For each VAT variant:

* Geometry is loaded from the exported GLB.
* VAT textures are bound as TSL `texture()` nodes.
* Animation reconstruction occurs in WGSL functions composed via `wgslFn()`.
* Rendering continues through a `MeshStandardNodeMaterial`.

As a result, VAT meshes automatically participate in:

* Scene lighting
* Image-based lighting (IBL) via environment maps
* Shadows
* Tone mapping
* Post-processing effects

VAT meshes behave like ordinary Three.js scene objects while their animation is reconstructed entirely on the GPU.

---

## Asset Loading

```ts
const assets = await VAT3.loadAssets(
  '/assets/',
  'myAsset'
);
```

`VAT3.loadAssets()` loads:

* Geometry
* Metadata
* Animation textures

from a standard VAT3 asset package.

The asset format is shared across all VAT3 runtimes (see the root README's [Asset Package Format](../README.md#asset-package-format)), allowing the same export to be consumed by Babylon.js and Three.js without modification.

---

## Playback

Every VAT variant derives from the common `VatBase` API.

```ts
vat.update(time);
```

Animation time is supplied in seconds. Unlike the Babylon package, `update()` also recomputes the camera-relative matrices set via `setCamera()`.

### Playback Speed

```ts
vat.speed = 0.5;
```

Half speed.

```ts
vat.speed = 2.0;
```

Double speed.

### Seeking

```ts
vat.time = 3.5;
```

Jump directly to a specific point in the animation.

### Visibility

```ts
vat.setEnabled(false);
```

Disable rendering and playback.

---

## Supported Variants

### DynamicMesh

```ts
const vat = VAT3.createDynamicMesh(assets);
vat.setCamera(camera);
```

Per-vertex deformation using position and blend-weight lookup textures — for hero meshes with complex deformation that should remain a single mesh.

---

### SoftBody

```ts
const vat = VAT3.createSoftBody(assets);
vat.setCamera(camera);
```

Per-vertex position + rotation deformation, preserving local surface orientation under deformation — suited to cloth, jelly, and other deformables.

---

### Rigidbody

```ts
const vat = VAT3.createRigidBody(assets);
vat.setCamera(camera);
```

Transforms the whole mesh via a single position + rotation per frame — no per-vertex deformation. Use for rigid debris and objects that translate and tumble as a unit.

---

### Particles

```ts
const vat = VAT3.createParticles(assets);
vat.setCamera(camera);
```

GPU-instanced particle rendering using a `MeshStandardNodeMaterial`.

Supports:

* Albedo textures
* Scene lighting
* Shadows
* Image-based lighting (IBL)

```ts
vat.albedoTexture = texture;
```

---

## Texture Formats

VAT3 supports both HDR (`.exr`) and LDR (`.png` / `.ktx2`) assets.

The loader automatically configures Three.js texture resources based on asset metadata.

For most projects:

* LDR assets are recommended.
* HDR assets should be used when additional positional precision is required.

See the [root documentation](../README.md) for export and conversion workflows.

---

## API Reference

### Asset Loading

```ts
VAT3.loadAssets(
  rootPath,
  assetName
): Promise<VatAssets>
```

Loads a VAT asset package. `VatBase.unloadAssets(assets)` disposes its loaded textures.

---

### Variant Creation

```ts
VAT3.createDynamicMesh(assets)
```

```ts
VAT3.createSoftBody(assets)
```

```ts
VAT3.createRigidBody(assets)
```

```ts
VAT3.createParticles(assets)
```

Unlike the Babylon package's single overloaded `VAT3.create(scene, assets, VatType)`, each Three.js variant has its own factory method. `VAT3.initialize()` is currently a no-op reserved for future WebGPU setup — call it once at startup for forward compatibility.

---

### Common API

| Member              | Description                       |
| ------------------- | ---------------------------------- |
| `mesh`              | Three.js mesh                       |
| `material`          | TSL-based material                  |
| `name`              | Asset name                          |
| `frameRate`         | Authored frame rate                 |
| `vertexCount`       | Exported vertex count               |
| `speed`             | Playback speed multiplier           |
| `time`              | Current playback time               |
| `update()`          | Advance animation                   |
| `setCamera()`       | Required before the first `update()` |
| `setEnabled()`      | Enable or disable rendering         |
| `dispose()`         | Release resources                   |

---

### Exported types

`VatType`, `VatAssets`.

---

### Switching variants at runtime

There's no built-in "swap" — dispose the old instance, remove its mesh, then load and create the new one:

```ts
vat.dispose();
scene.remove(vat.mesh);

const newAssets = await VAT3.loadAssets('/', 'vat3_softBody');
const newVat = VAT3.createSoftBody(newAssets);
newVat.setCamera(camera);
scene.add(newVat.mesh);
```

---

## Playground

The repository includes [`demo/main.ts`](demo/main.ts), a reference implementation demonstrating the Quick Start pattern above against the example assets in [`../examples/`](../examples).

The demo:

* Loads VAT assets from a local example export.
* Demonstrates playback for the implemented variants.
* Provides a minimal reference implementation.

See:

```text
three-js/demo/main.ts
```

A StackBlitz demo — the no-install, interactive equivalent of the [Babylon.js Playground](../babylon-js/README.md#playground) — is planned.

---

## Advanced Topics

Most users will not need these extension points to consume VAT assets — they're documented here for anyone building custom materials or new VAT variants.

### Custom material plugins

Unlike the Babylon package, there's no `MaterialPluginBase` equivalent. Materials are plain TypeScript classes extending the abstract `VatMaterial` (`materials/vatMaterial.ts`), wrapping a `MeshStandardNodeMaterial` and composed using TSL's `wgslFn()`. A custom material implements two methods:

```ts
import VatMaterial from '../materials/vatMaterial';
import { texture } from 'three/tsl';
import myVariantVertexRaw from './my-variant-vertex.wgsl?raw';

export default class MyCustomMaterial extends VatMaterial {
  protected getVariantShader(): string {
    return myVariantVertexRaw;
  }

  protected getTextureNodes() {
    return [
      texture(this._textures.vatColTex.texture),
      texture(this._textures.vatPosTex.texture),
      texture(this._textures.vatRotTex.texture),
    ];
  }
}
```

`getVariantShader()` returns a WGSL function body that — together with the shared includes below — is compiled via `wgslFn()`. It must populate a `Vat3_Outputs` struct (`outPosition`, `outNormal`, `outColorAndAlpha`, etc.), which the inherited `applyToMesh(mesh)` writes into the material's `positionNode`, `normalNode`, `colorNode`, and `opacityNode`. `getTextureNodes()` returns the TSL `texture(...)` nodes the shader function samples, in the order it expects them.

### WGSL include pattern

Shared WGSL building blocks live under `materials/includes/` and are imported as raw strings (`?raw`), concatenated into a single `VAT3_WGSL_INCLUDES` constant in `core/vatContext.ts`:

```ts
export const VAT3_WGSL_INCLUDES: string = [
  vat3MacrosRaw,
  vat3StructsRaw,
  vat3MathsRaw,
  vat3UtilsRaw,
  vat3VarsRaw,
  vat3WrappersRaw,
  vat3InstancesRaw,
].join('\n');
```

This mirrors the Babylon package's "concatenate raw `.wgsl` imports as strings" pattern — they are not registered with a shader-include store. New shared includes should be added the same way: add a `.wgsl` file under `materials/includes/`, import it with the raw-string loader, and append it to `VAT3_WGSL_INCLUDES`.

### Adding a new variant

1. Add `materials/shaders/vat3-<name>Vertex.wgsl`, producing a `Vat3_Outputs` struct as above.
2. Create `materials/vat3<Name>.ts` extending `VatMaterial`, implementing `getVariantShader()` and `getTextureNodes()`.
3. Create `variants/<name>Vat.ts` extending `VatBase`, setting `vatType: VatType.<YourType>` and implementing `getCamera()` / `setCamera()` (copy the pattern from `DynamicMeshVat`).
4. Add a `static createX(assets)` factory method to `VAT3` in `index.ts`.

`VatMaterial` and `VatBase` are not yet part of this package's published `exports` — building on these patterns currently requires depending on the package source (e.g. as a workspace package).

---

## License

MIT © 2026 Floating World LDA — see [`../LICENSE`](../LICENSE).
