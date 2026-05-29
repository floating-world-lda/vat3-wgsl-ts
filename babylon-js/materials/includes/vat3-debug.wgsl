/* 
 * VAT Shader Debug Visualization
 * 
 * Add these functions to vat3-utils.wgsl for debugging VAT data
 * Use by replacing normal color output in vat3-wrappers.wgsl
 */

// Visualize position delta as RGB color
// Red = X delta, Green = Y delta, Blue = Z delta
// Neutral gray = no delta
fn debugVisualizePositionDelta(delta: vec3<f32>, scale: f32) -> vec4<f32> {
  // Normalize delta to [0,1] range for visualization
  // Assuming deltas are roughly in [-scale, +scale] range
  let normalized = (delta / scale) * 0.5 + 0.5;
  return vec4<f32>(normalized, 1.0);
}

// Visualize bounds usage - show if position is within expected bounds
// Green = within bounds, Red = exceeds bounds
fn debugVisualizeBounds(pos: vec3<f32>, boundMin: vec3<f32>, boundMax: vec3<f32>) -> vec4<f32> {
  let inBounds = all(pos >= boundMin) && all(pos <= boundMax);
  let overBounds = any(pos < boundMin) || any(pos > boundMax);
  
  if (inBounds) {
    return vec4<f32>(0.0, 1.0, 0.0, 1.0); // Green = OK
  } else {
    // Show which axis is out of bounds
    let xOut = pos.x < boundMin.x || pos.x > boundMax.x;
    let yOut = pos.y < boundMin.y || pos.y > boundMax.y;
    let zOut = pos.z < boundMin.z || pos.z > boundMax.z;
    return vec4<f32>(
      select(0.0, 1.0, xOut), // Red channel = X out
      select(0.0, 1.0, yOut), // Green channel = Y out  
      select(0.0, 1.0, zOut), // Blue channel = Z out
      1.0
    );
  }
}

// Visualize texture sampling - shows raw texture values
fn debugVisualizeTextureSample(texValue: vec4<f32>) -> vec4<f32> {
  return texValue;
}

// Visualize denormalization step comparison
// Shows difference between HDR (direct) and LDR (denormalized) paths
fn debugComparePaths(
  texValue: vec4<f32>,
  denormalized: vec3<f32>,
  isTexHdr: bool
) -> vec4<f32> {
  if (isTexHdr) {
    // HDR: show raw texture (should be similar to denormalized)
    return vec4<f32>(texValue.xyz, 1.0);
  } else {
    // LDR: show denormalized result
    return vec4<f32>(denormalized, 1.0);
  }
}

// Visualize parent transform effect
// Red channel = original Z, Green channel = flipped Z, Blue = difference
fn debugParentTransformEffect(
  originalDelta: vec3<f32>,
  transformedDelta: vec3<f32>
) -> vec4<f32> {
  let diff = abs(transformedDelta - originalDelta);
  return vec4<f32>(
    (originalDelta.z + 1.0) * 0.5,      // Red = original Z
    (transformedDelta.z + 1.0) * 0.5,   // Green = transformed Z
    diff.z,                             // Blue = Z difference
    1.0
  );
}

// Animation progress visualization
// Shows which frame is being displayed (useful for debugging interpolation)
fn debugAnimationProgress(progress: f32) -> vec4<f32> {
  // Color gradient: Blue -> Cyan -> Green -> Yellow -> Red
  let r = clamp(progress * 2.0, 0.0, 1.0);
  let g = clamp(progress * 2.0 - 0.5, 0.0, 1.0);
  let b = clamp(1.0 - progress * 2.0, 0.0, 1.0);
  return vec4<f32>(r, g, b, 1.0);
}

/*
 * USAGE EXAMPLES:
 * 
 * In vat3-wrappers.wgsl, replace the color output line with one of these:
 * 
 * 1. Visualize position deltas:
 *    vatOutputs.outColorAndAlpha = debugVisualizePositionDelta(lerpedPos, 2.0);
 * 
 * 2. Check bounds:
 *    vatOutputs.outColorAndAlpha = debugVisualizeBounds(lerpedPos, vatInputs.boundMin, vatInputs.boundMax);
 * 
 * 3. Compare HDR vs LDR decoding:
 *    vatOutputs.outColorAndAlpha = debugComparePaths(textures.posThisFrame, thisFramePos, isTexHdr);
 * 
 * 4. Visualize parent transform effect:
 *    let debugColor = debugParentTransformEffect(lerpedPos, relPos);
 *    vatOutputs.outColorAndAlpha = debugColor;
 * 
 * 5. Show animation progress:
 *    vatOutputs.outColorAndAlpha = debugAnimationProgress(animData.animProgressThisFrame);
 * 
 * INTERPRETATION:
 * 
 * Position Delta Visualization:
 *   - Gray = no movement
 *   - Red+ = moving in +X direction
 *   - Green+ = moving in +Y direction
 *   - Blue+ = moving in +Z direction
 * 
 * Bounds Check:
 *   - Pure green = all deltas within bounds (good!)
 *   - Any red = position exceeds bounds (problem!)
 *   - Individual RGB channels show which axis is problematic
 * 
 * Parent Transform Effect:
 *   - Red = original Z value
 *   - Green = transformed Z value
 *   - Blue = amount of change
 *   - If Blue is visible = Z was flipped (expected for LDR)
 *   - If Blue is black = Z unchanged (expected for HDR)
 */
