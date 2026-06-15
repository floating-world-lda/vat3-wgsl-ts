// Copyright (c) Floating World, LDA. All Rights Reserved.

import { Vector3 } from 'three';

import { VatType, type VatMetadata, type VatStaticInputs } from './vatTypes';

export default class VatMetadataProcessor {
  static processMetadata(metadata: VatMetadata): {
    name: string;
    type: VatType;
    overrides: Partial<VatStaticInputs>;
  } {
    const typeStr = metadata['VAT Type'];
    if (!typeStr) {
      throw new Error('VAT Type is required');
    }
    const type = VatType[typeStr as keyof typeof VatType];

    const name = metadata['Name'];
    if (!name) {
      throw new Error('VAT Name is required');
    }

    const overrides: Partial<VatStaticInputs> = {};

    if (metadata['Axis System']) {
      switch (metadata['Axis System']) {
        case 'Right-Handed Y-Up':
          overrides.useRightHandedCoordinates = true;
          break;
        default:
          throw new Error(
            `VatMetadataProcessor: coordinate system "${metadata['Axis System']}" is not supported in Three.js. Only "Right-Handed Y-Up" assets are compatible.`
          );
      }
    }

    if (
      metadata['Bound Min X'] !== undefined &&
      metadata['Bound Min Y'] !== undefined &&
      metadata['Bound Min Z'] !== undefined
    ) {
      overrides.boundMin = new Vector3(
        metadata['Bound Min X'],
        metadata['Bound Min Y'],
        metadata['Bound Min Z']
      );
    }

    if (
      metadata['Bound Max X'] !== undefined &&
      metadata['Bound Max Y'] !== undefined &&
      metadata['Bound Max Z'] !== undefined
    ) {
      overrides.boundMax = new Vector3(
        metadata['Bound Max X'],
        metadata['Bound Max Y'],
        metadata['Bound Max Z']
      );
    }

    if (metadata['Frame Count']) {
      overrides.frameCount = metadata['Frame Count'];
    }

    if (metadata['Houdini FPS']) {
      overrides.frameRate = metadata['Houdini FPS'];
    }

    if (metadata['Particle Shard Count']) {
      overrides.particleShardCount = metadata['Particle Shard Count'];
    }

    if (metadata['Spare Color Texture'] !== undefined) {
      overrides.useSpareColor = Boolean(metadata['Spare Color Texture']);
    }

    if (metadata['Two Position Textures'] !== undefined) {
      overrides.usePos2 = Boolean(metadata['Two Position Textures']);
    }

    if (metadata['Use HDR Textures'] !== undefined) {
      overrides.isTexHdr = Boolean(metadata['Use HDR Textures']);
    }

    if (metadata['Vertex Count']) {
      overrides.vertexCount = metadata['Vertex Count'];
    }

    return { name, type, overrides };
  }
}
