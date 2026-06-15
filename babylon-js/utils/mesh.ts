// Copyright (c) Floating World, LDA. All Rights Reserved.

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';

export const ensureVertexColors = (mesh: Mesh): void => {
  if (!mesh.isVerticesDataPresent(VertexBuffer.ColorKind)) {
    const count = mesh.getTotalVertices();
    const white = new Float32Array(count * 4).fill(1);
    mesh.setVerticesData(VertexBuffer.ColorKind, white, false);
  }
}
