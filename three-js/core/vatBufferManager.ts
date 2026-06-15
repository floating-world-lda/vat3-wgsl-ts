// Copyright (c) Floating World, LDA. All Rights Reserved.

import { Matrix4, Vector3 } from 'three';
import type { Node, UniformNode } from 'three/webgpu';
import { float, uniform, uniformGroup } from 'three/tsl';

import type { VatConfig, VatDynamicInputs } from './vatTypes';

export default class VatBufferManager {
  public readonly dynamicActivation: Node;
  public readonly staticActivation:  Node;

  private readonly _dynamicGroup: ReturnType<typeof uniformGroup>;
  private readonly _staticGroup:  ReturnType<typeof uniformGroup>;

  private readonly _enablePlayback:    UniformNode<number>;
  private readonly _modelViewMatrix:   UniformNode<Matrix4>;
  private readonly _playbackSpeed:     UniformNode<number>;
  private readonly _time:              UniformNode<number>;
  private readonly _viewToModelMatrix: UniformNode<Matrix4>;

  private readonly _staticMat4Nodes:   UniformNode<Matrix4>[];
  private readonly _staticScalarNodes: UniformNode<number>[];
  private readonly _staticVec3Nodes:   UniformNode<Vector3>[];

  constructor(vatConfig: VatConfig) {
    const { dynamicInputs: d, staticInputs: s } = vatConfig;

    const dg = uniformGroup('vat3DynamicInputs');
    const sg = uniformGroup('vat3StaticInputs');

    this._enablePlayback    = uniform(d.enablePlayback ? 1 : 0, 'uint').setGroup(dg).label('enablePlayback');
    this._modelViewMatrix   = uniform(d.modelViewMatrix.clone(), 'mat4').setGroup(dg).label('modelViewMatrix');
    this._playbackSpeed     = uniform(d.playbackSpeed).setGroup(dg).label('playbackSpeed');
    this._time              = uniform(d.time).setGroup(dg).label('time');
    this._viewToModelMatrix = uniform(d.viewToModelMatrix.clone(), 'mat4').setGroup(dg).label('viewToModelMatrix');

    this._dynamicGroup = dg;
    this._staticGroup  = sg;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.dynamicActivation = float(0)
      .add(this._enablePlayback)
      .add(this._playbackSpeed)
      .add(this._time)
      .add((this._modelViewMatrix as any).element(0).x)   // eslint-disable-line @typescript-eslint/no-explicit-any
      .add((this._viewToModelMatrix as any).element(0).x); // eslint-disable-line @typescript-eslint/no-explicit-any

    this._staticVec3Nodes = [
      uniform(s.additionalObjectSpaceOffset, 'vec3').setGroup(sg).label('additionalObjectSpaceOffset'),
      uniform(s.boundMax, 'vec3').setGroup(sg).label('boundMax'),
      uniform(s.boundMin, 'vec3').setGroup(sg).label('boundMin'),
    ];

    this._staticMat4Nodes = [
      uniform((s.modelViewMatrix as Matrix4).clone(), 'mat4').setGroup(sg).label('modelViewMatrix'),
      uniform((s.viewToModelMatrix as Matrix4).clone(), 'mat4').setGroup(sg).label('viewToModelMatrix'),
      uniform((s.worldViewProjection as Matrix4).clone(), 'mat4').setGroup(sg).label('worldViewProjection'),
    ];

    this._staticScalarNodes = [
      uniform(s.additionalParticleScaleUniformMultiplier).setGroup(sg).label('additionalParticleScaleUniformMultiplier'),
      uniform(s.animateFirstFrame ? 1 : 0, 'uint').setGroup(sg).label('animateFirstFrame'),
      uniform(s.computeSpinfromHeadingVector ? 1 : 0, 'uint').setGroup(sg).label('computeSpinfromHeadingVector'),
      uniform(s.displayFrame).setGroup(sg).label('displayFrame'),
      uniform(s.enablePlayback ? 1 : 0, 'uint').setGroup(sg).label('enablePlayback'),
      uniform(s.frameCount).setGroup(sg).label('frameCount'),
      uniform(s.frameRate).setGroup(sg).label('frameRate'),
      uniform(s.gameTimeAtFirstFrame).setGroup(sg).label('gameTimeAtFirstFrame'),
      uniform(s.globalParticlePiecesScaleMultiplier).setGroup(sg).label('globalParticlePiecesScaleMultiplier'),
      uniform(s.hideParticlesOverlappingObjectOrigin ? 1 : 0, 'uint').setGroup(sg).label('hideParticlesOverlappingObjectOrigin'),
      uniform(s.inputTime).setGroup(sg).label('inputTime'),
      uniform(s.instance ? 1 : 0, 'uint').setGroup(sg).label('instance'),
      uniform(s.instanceCount).setGroup(sg).label('instanceCount'),
      uniform(s.instanceUpdateDynamicData ? 1 : 0, 'uint').setGroup(sg).label('instanceUpdateDynamicData'),
      uniform(s.interframeInterpolation ? 1 : 0, 'uint').setGroup(sg).label('interframeInterpolation'),
      uniform(s.interpolateColor ? 1 : 0, 'uint').setGroup(sg).label('interpolateColor'),
      uniform(s.interpolateSpareColor ? 1 : 0, 'uint').setGroup(sg).label('interpolateSpareColor'),
      uniform(s.isColorTexHdr ? 1 : 0, 'uint').setGroup(sg).label('isColorTexHdr'),
      uniform(s.isLookupTexHdr ? 1 : 0, 'uint').setGroup(sg).label('isLookupTexHdr'),
      uniform(s.isTexHdr ? 1 : 0, 'uint').setGroup(sg).label('isTexHdr'),
      uniform(s.noLerping ? 1 : 0, 'uint').setGroup(sg).label('noLerping'),
      uniform(s.originEffectiveRadius).setGroup(sg).label('originEffectiveRadius'),
      uniform(s.particleHeightBaseScale).setGroup(sg).label('particleHeightBaseScale'),
      uniform(s.particlePiecesScaleAreInPositionAlpha ? 1 : 0, 'uint').setGroup(sg).label('particlePiecesScaleAreInPositionAlpha'),
      uniform(s.particleShardCount).setGroup(sg).label('particleShardCount'),
      uniform(s.particleShardIndex).setGroup(sg).label('particleShardIndex'),
      uniform(s.particleShards ? 1 : 0, 'uint').setGroup(sg).label('particleShards'),
      uniform(s.particleSpinPhase).setGroup(sg).label('particleSpinPhase'),
      uniform(s.particleTextureUScale).setGroup(sg).label('particleTextureUScale'),
      uniform(s.particleTextureVScale).setGroup(sg).label('particleTextureVScale'),
      uniform(s.particleWidthBaseScale).setGroup(sg).label('particleWidthBaseScale'),
      uniform(s.perParticleRandomSpinSpeed).setGroup(sg).label('perParticleRandomSpinSpeed'),
      uniform(s.perParticleRandomVelocityScale).setGroup(sg).label('perParticleRandomVelocityScale'),
      uniform(s.playbackSpeed).setGroup(sg).label('playbackSpeed'),
      uniform(s.scalebyVelocityAmount).setGroup(sg).label('scalebyVelocityAmount'),
      uniform(s.spinFromHeading ? 1 : 0, 'uint').setGroup(sg).label('spinFromHeading'),
      uniform(s.stretchByVelocity ? 1 : 0, 'uint').setGroup(sg).label('stretchByVelocity'),
      uniform(s.stretchByVelocityAmount).setGroup(sg).label('stretchByVelocityAmount'),
      uniform(s.supportSurfaceNormalMaps ? 1 : 0, 'uint').setGroup(sg).label('supportSurfaceNormalMaps'),
      uniform(s.surfaceNormals ? 1 : 0, 'uint').setGroup(sg).label('surfaceNormals'),
      uniform(s.surfaceUVsfromColorRG ? 1 : 0, 'uint').setGroup(sg).label('surfaceUVsfromColorRG'),
      uniform(s.useAlphaForVelocityScale ? 1 : 0, 'uint').setGroup(sg).label('useAlphaForVelocityScale'),
      uniform(s.useColorForVelocity ? 1 : 0, 'uint').setGroup(sg).label('useColorForVelocity'),
      uniform(s.useCompressedNormals ? 1 : 0, 'uint').setGroup(sg).label('useCompressedNormals'),
      uniform(s.useLookup ? 1 : 0, 'uint').setGroup(sg).label('useLookup'),
      uniform(s.useParticleBillboarding ? 1 : 0, 'uint').setGroup(sg).label('useParticleBillboarding'),
      uniform(s.useParticleVelocitySpin ? 1 : 0, 'uint').setGroup(sg).label('useParticleVelocitySpin'),
      uniform(s.usePos2 ? 1 : 0, 'uint').setGroup(sg).label('usePos2'),
      uniform(s.useRightHandedCoordinates ? 1 : 0, 'uint').setGroup(sg).label('useRightHandedCoordinates'),
      uniform(s.useSpareColor ? 1 : 0, 'uint').setGroup(sg).label('useSpareColor'),
      uniform(s.vertexCount).setGroup(sg).label('vertexCount'),
    ];

    let staticChain = float(0);
    for (const n of this._staticScalarNodes) staticChain = staticChain.add(n);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const n of this._staticVec3Nodes) staticChain = staticChain.add((n as any).x);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const n of this._staticMat4Nodes) staticChain = staticChain.add((n as any).element(0).x);
    this.staticActivation = staticChain;
  }

  public updateDynamicInputs(updates: VatDynamicInputs): void {
    this._enablePlayback.value = updates.enablePlayback ? 1 : 0;
    this._modelViewMatrix.value.copy(updates.modelViewMatrix);
    this._playbackSpeed.value = updates.playbackSpeed;
    this._time.value = updates.time;
    this._viewToModelMatrix.value.copy(updates.viewToModelMatrix);
    this._dynamicGroup.needsUpdate = true;
  }

  public dispose(): void {}
}
