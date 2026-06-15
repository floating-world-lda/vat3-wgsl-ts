# VAT3 — Houdini Vertex Animation Textures

VAT3 brings SideFX Houdini's Vertex Animation Textures (VAT) workflow to modern WebGPU renderers.

Artists author simulations in Houdini and export them as a portable asset package consisting of geometry, textures, and metadata. At runtime, Babylon.js and Three.js reconstruct those simulations entirely on the GPU by sampling animation data from textures rather than evaluating animation or simulation logic on the CPU.

The result is a scalable workflow for rendering cloth, destruction, fluids, crowds, particles, and other complex effects in real time while preserving a clean separation between content creation and runtime implementation.

---

## Overview

A VAT asset is authored once in Houdini and can be consumed by any VAT3 runtime.

```text
Houdini Simulation
        │
        ▼
   VAT3 Export
(mesh + textures + metadata)
        │
        ▼
   Shared Asset Format
        │
   ┌────┴────┐
   ▼         ▼
Babylon.js  Three.js
```

The exported asset contains all information required to reconstruct animation at runtime. Renderer implementations provide engine-specific loaders, shaders, and material integration while sharing the same underlying asset format.

This separation allows artists and engineers to work independently:

* Artists iterate entirely within Houdini.
* Runtime code remains stable as assets evolve.
* The same export can be used across multiple rendering engines.
* Animation playback occurs entirely on the GPU.

---

## Supported VAT Types

VAT3 supports the core VAT workflows provided by Houdini.

| VAT Type      | Description                                                                                |
| ------------- | ------------------------------------------------------------------------------------------ |
| `Softbody`    | Deforming meshes with stable topology such as cloth, vegetation, or character deformation. |
| `Rigidbody`   | Packed rigid-body simulations where each piece receives independent transform animation.   |
| `DynamicMesh` | Simulations with changing topology such as fluids, remeshing, and surface generation.      |
| `Particles`   | Point-based simulations rendered as GPU particles or billboards.                           |

Each VAT type uses a different texture encoding strategy but follows the same export and loading pipeline.

For authoring requirements and simulation-specific exporter settings, refer to the SideFX VAT documentation.

---

## Asset Pipeline

VAT3 is built around a shared asset contract between Houdini and the runtime.

### Authoring

Simulations are authored and exported from Houdini using the included VAT3 exporter.

The exporter is based on SideFX Labs Vertex Animation Textures 3.0 and has been extended for modern WebGPU workflows, GLB export, and Babylon.js / Three.js compatibility.

### Distribution

The exported asset package can be versioned, hosted, compressed, streamed, or bundled like any other static content.

No Houdini-specific runtime logic is required after export.

### Runtime

At load time the runtime:

1. Loads geometry and metadata.
2. Creates GPU textures from VAT data.
3. Binds VAT shaders and uniforms.
4. Reconstructs animation directly on the GPU.

No skeletal animation, simulation playback, or CPU-side deformation occurs during rendering.

---

## Asset Package Format

A VAT export produces a self-contained asset directory.

```text
asset/
├── asset_mesh.glb
├── asset_data.json
├── asset_pos.(png|exr)
├── asset_rot.(png|exr)
├── asset_col.(png|exr)
├── asset_lookup.(png|exr)
├── asset_pos2.(png|exr)
└── asset_col2.(png|exr)
```

Not every VAT type produces every texture.

The runtime consumes these files as a single asset package:

| File      | Purpose                                         |
| --------- | ----------------------------------------------- |
| `_mesh`   | Geometry container.                             |
| `_data`   | Export metadata and playback configuration.     |
| `_pos`    | Vertex or particle position data.               |
| `_rot`    | Rotation and orientation data.                  |
| `_col`    | Per-frame color and auxiliary attributes.       |
| `_lookup` | DynamicMesh frame blending and topology lookup. |
| `_pos2`   | Optional secondary position texture.            |
| `_col2`   | Optional auxiliary color data.                  |

The metadata file describes how textures should be interpreted and reconstructed by the runtime.

---

## Runtime Architecture

VAT3 is organized around a shared asset format and renderer-specific implementations.

```text
                Shared Asset
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
     Loader       Material      Shaders
        │             │             │
        └─────────────┴─────────────┘
                      │
                      ▼
              GPU Reconstruction
```

Both runtime packages implement the same high-level concepts:

* Asset loading
* Texture management
* Playback controls
* Frame interpolation
* GPU animation reconstruction

Renderer-specific concerns such as material systems, shader languages, and resource binding remain isolated within each package.

---

## Repository Layout

```text
/
├── houdini/
├── babylon-js/
├── three-js/
├── examples/
└── docs/
```

### [`houdini/`](houdini/)

Contains the VAT3 Houdini Digital Asset (HDA), helper scripts, and reference scenes used to generate example exports.

### [`babylon-js/`](babylon-js/)

Babylon.js implementation using WebGPU and WGSL shaders.

### [`three-js/`](three-js/)

Three.js implementation using WebGPU and Three.js shader infrastructure.

### [`examples/`](examples/)

Reference VAT exports covering each supported VAT type.

These assets are useful for validation, testing, and learning the format.

---

## Packages

### `@floatingworld/vat3-babylonjs`

Babylon.js runtime implementation.

Features:

* WebGPU-first architecture
* WGSL shader implementations
* Babylon material integration
* Optional Nova FX integration for particle workflows

See [babylon-js/README.md](babylon-js/README.md) for installation, API documentation, and examples.

### `@floatingworld/vat3-threejs`

Three.js runtime implementation.

Features:

* WebGPU renderer support
* Three.js material integration
* Shared VAT asset compatibility
* TSL/WebGPU shader implementations

See [three-js/README.md](three-js/README.md) for installation, API documentation, and examples.

---

## Reference Assets & Scenes

The repository includes [example exports](examples/) and corresponding [Houdini scene files](houdini/scenes/) for each supported VAT type.

These assets serve as reference implementations for:

* Export validation
* Runtime testing
* Pipeline integration
* Learning the VAT asset format

Example assets and source scenes are intended to remain synchronized so that every runtime example can be traced back to its Houdini source.

---

## Further Reading

VAT3 builds on SideFX's Vertex Animation Textures 3.0 workflow.

For detailed exporter documentation, authoring guidance, and VAT theory:

* [SideFX Labs VAT 3.0 Documentation](https://www.sidefx.com/docs/houdini/nodes/out/labs--vertex_animation_textures-3.0.html)
* VAT 3.0 Tutorial Series ([Part 1](https://www.artstation.com/artwork/zOyke6), [Part 2](https://www.artstation.com/artwork/5XJZV8))
* [Vertex Animation Textures for Unreal](https://www.sidefx.com/tutorials/vertex-animation-textures-for-unreal/)
* [SideFX Learning Resources](https://80.lv/articles/a-complete-guide-on-sidefx-s-vertex-animation-textures-tool)

Renderer-specific implementation details can be found in the Babylon.js and Three.js package documentation.

---

## License

MIT © 2026 Floating World LDA.

See [LICENSE](LICENSE) for details.

Built by [Floating World](https://floatingworld.pt).
