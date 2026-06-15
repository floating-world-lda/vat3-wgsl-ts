# @floatingworld/vat3-babylonjs

Houdini Vertex Animation Texture (VAT) playback for [Babylon.js](https://www.babylonjs.com/) using WebGPU and WGSL.

This package consumes VAT3 assets exported from Houdini and reconstructs animation entirely on the GPU using Babylon.js materials and shaders. It implements all supported VAT3 variants while integrating directly with Babylon's rendering pipeline.

For an overview of the VAT workflow, asset format, supported simulation types, and repository structure, see the [root README](../README.md).

> Requires Babylon.js WebGPU. VAT3 materials are implemented as WGSL `MaterialPluginBase` plugins (or WGSL `ShaderMaterial`s) and are not compatible with Babylon's WebGL renderer.

---

## Installation

```bash
npm install @floatingworld/vat3-babylonjs @babylonjs/core @babylonjs/loaders
```

| Dependency                      | Type                      |
| ------------------------------- | ------------------------- |
| `@babylonjs/core`               | peer                      |
| `@babylonjs/loaders`            | peer                      |
| `@floatingworld/nova-babylonjs` | optional particle effects |

---

## Quick Start

```ts
import { VAT3, VatType } from '@floatingworld/vat3-babylonjs';

const assets = await VAT3.loadAssets(
  scene,
  '/assets/',
  'vat3_dynamicMesh'
);

const vat = VAT3.create(
  scene,
  assets,
  VatType.DynamicMesh
);

scene.onBeforeRenderObservable.add(() => {
  vat.update(performance.now() * 0.001);
});
```

The runtime loads the exported asset package, creates the required GPU resources, and reconstructs animation directly within Babylon's rendering pipeline.

---

## Babylon Runtime Architecture

The Babylon implementation is designed to integrate with existing Babylon rendering workflows rather than replacing them.

```text
VAT Asset
    │
    ▼
VAT Loader
    │
    ▼
VAT Material
    │
    ▼
Babylon Render Pipeline
```

For most VAT variants:

* Geometry is loaded from the exported GLB.
* VAT textures are bound as material inputs.
* Animation reconstruction occurs in WGSL vertex shaders.
* Rendering continues through Babylon's standard PBR pipeline.

As a result, VAT meshes automatically participate in:

* Scene lighting
* Image-based lighting (IBL)
* Reflection probes
* Shadows
* Glow layers
* Tone mapping
* Post-processing effects

VAT meshes behave like ordinary Babylon scene objects while their animation is reconstructed entirely on the GPU.

---

## Asset Loading

```ts
const assets = await VAT3.loadAssets(
  scene,
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

Animation time is supplied in seconds.

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
const vat = VAT3.create(
  scene,
  assets,
  VatType.DynamicMesh
);
```

Reconstructs meshes whose topology changes over time, such as fluids and remeshing simulations.

Uses position and lookup textures to rebuild animated geometry every frame.

---

### SoftBody

```ts
const vat = VAT3.create(
  scene,
  assets,
  VatType.Softbody
);
```

Per-vertex deformation for cloth, vegetation, and other simulations with stable topology.

Supports full Babylon PBR lighting and shading.

---

### Rigidbody

```ts
const vat = VAT3.create(
  scene,
  assets,
  VatType.Rigidbody
);
```

Reconstructs rigid-body simulations by applying position and quaternion animation to packed pieces exported from Houdini.

Supports full Babylon PBR rendering.

---

### Particles

```ts
const vat = VAT3.create(
  scene,
  assets,
  VatType.Particles
);
```

GPU-instanced particle rendering using Babylon's PBR pipeline.

Supports:

* Albedo textures
* Normal maps
* Scene lighting
* Shadows
* Environment lighting

```ts
vat.albedoTexture = texture;
vat.normalTexture = normalTexture;
```

---

### ParticlesLT

```ts
const vat = VAT3.create(
  scene,
  assets,
  VatType.ParticlesLT
);
```

A lightweight particle renderer optimized for large particle counts.

Unlike the other variants:

* Uses billboard geometry.
* Uses an unlit shader.
* Does not load a glb mesh (faster downloading).
* Does not participate in Babylon's PBR lighting model.

Use this variant for sparks, embers, dust, debris, and similar high-count effects.

```ts
vat.albedoTexture = texture;
vat.emissiveTexture = emissiveTexture;
```

---

## Optional Nova Integration

Particle variants can optionally integrate with [`@floatingworld/nova-babylonjs`](../../nova/babylon-js).

Nova provides additional particle-oriented effects layered on top of VAT playback, including:

* Dissolve effects
* Flipbook animation
* Flow mapping
* HDR emissive modulation

```ts
const vat = VAT3.create(
  scene,
  assets,
  VatType.Particles,
  novaConfig
);
```

Nova is not required for VAT playback and is only applicable to the `Particles` and `ParticlesLT` variants.

---

## Texture Formats

VAT3 supports both HDR (`.exr`) and LDR (`.png` / `.ktx2`) assets.

The loader automatically configures Babylon texture resources based on asset metadata.

For most projects:

* LDR assets are recommended.
* HDR assets should be used when additional positional precision is required.

See the [root documentation](../README.md) for export and conversion workflows.

---

## API Reference

### Asset Loading

```ts
VAT3.loadAssets(
  scene,
  rootPath,
  assetName
): Promise<VatAssets>
```

Loads a VAT asset package.

---

### Variant Creation

```ts
VAT3.create(
  scene,
  assets,
  VatType.DynamicMesh
)
```

```ts
VAT3.create(
  scene,
  assets,
  VatType.Softbody
)
```

```ts
VAT3.create(
  scene,
  assets,
  VatType.Rigidbody
)
```

```ts
VAT3.create(
  scene,
  assets,
  VatType.Particles
)
```

```ts
VAT3.create(
  scene,
  assets,
  VatType.ParticlesLT
)
```

---

### Common API

| Member              | Description                 |
| ------------------- | --------------------------- |
| `mesh`              | Babylon mesh                |
| `material`          | Babylon material            |
| `frameCount`        | Total animation frames      |
| `frameRate`         | Authored frame rate         |
| `vertexCount`       | Exported vertex count       |
| `speed`             | Playback speed multiplier   |
| `time`              | Current playback time       |
| `update()`          | Advance animation           |
| `setEnabled()`      | Enable or disable rendering |
| `attachGlowLayer()` | Register with a glow layer  |
| `dispose()`         | Release resources           |

---

## Playground

The repository includes a [Babylon Playground](https://playground.babylonjs.com/) example demonstrating every supported VAT type.

The Playground:

* Loads the IIFE build directly from a CDN.
* Loads VAT assets from a remote source.
* Demonstrates playback and asset switching.
* Provides a minimal reference implementation.

See:

```text
babylon-js/playground/vat_examples_all.js
```

---

## Advanced Topics

Most users will not need these extension points to consume VAT assets — they're documented here for anyone building custom materials or new VAT variants.

### Custom material plugins

Every variant except `ParticlesVatLT` extends `PBRMaterial` via `VatMaterial`, a `MaterialPluginBase` subclass. A custom material extends `VatMaterial` and injects WGSL that populates a `Vat3_Outputs` struct (`outPosition`, `outNormal`, `outColorAndAlpha`, etc.), which `VatMaterial` writes into the underlying `PBRMaterial` pipeline.

### WGSL include pattern

Shared WGSL building blocks live under `materials/includes/` and are imported as raw strings (`?raw`) and concatenated directly into `CUSTOM_VERTEX_DEFINITIONS` / `CUSTOM_FRAGMENT_DEFINITIONS` — they are not registered with Babylon's `ShaderStore.IncludesShadersStoreWGSL`.

> ⚠️ Custom varyings should avoid Babylon's built-in PBR varying names (e.g. `vColor`). A colliding name is silently overwritten by Babylon's `vertexColorMixing` logic.

### Adding a new variant

1. Add the variant's vertex/fragment WGSL, producing a `Vat3_Outputs` struct.
2. Create `materials/vat3<Name>.ts` extending `VatMaterial`.
3. Create `variants/<name>Vat.ts` extending `VatBase`.
4. Add a new `VatType` and a corresponding `VAT3.create()` overload.

`VatMaterial` and `VatBase` are not yet part of this package's published `exports` — building on these patterns currently requires depending on the package source (e.g. as a workspace package).

---

## License

MIT © 2026 Floating World LDA — see [`../LICENSE`](../LICENSE).
