# VAT Extraction & Comparison Scripts

This directory contains Python scripts for extracting and comparing Vertex Animation Texture (VAT) data to diagnose artifacts in the VAT pipeline.

## Overview

These tools help verify that the VAT export process correctly captures geometry data from Houdini by:
1. Exporting vertex positions from Houdini scenes (ground truth)
2. Comparing Houdini data against GLB base mesh + EXR texture deltas
3. Testing different integration operations to determine correct shader behavior

The VAT pipeline stores position **deltas** in the EXR texture, which are added to the base GLB mesh positions at runtime.

## Scripts

### 1. `extract_houdini_vertex_positions.py`
Extracts vertex positions from Houdini geometry (must run inside Houdini).

**Purpose:** Creates ground truth data from source Houdini scene.

**Outputs:**
- JSON files with full frame data
- Numpy `.npy` files for efficient comparison
- Per-frame CSV files for manual inspection

### 2. `compare_houdini_to_exr.py`
Unified comparison tool that extracts EXR data and compares against Houdini ground truth.

**Purpose:** 
- Auto-discovers EXR, JSON, and GLB files in VAT directory
- Extracts position deltas from EXR texture internally
- Loads base mesh from GLB
- Tests multiple integration operations (base+delta, base-delta, etc.)
- Compares results against Houdini ground truth
- Reports which operation produces the best match

**Outputs:**
- JSON summary with comparison metrics and best operation
- Per-frame CSV files with vertex-level comparison data
- (Optional) Debug files with extracted EXR data

## Installation

Install required Python dependencies:

```bash
pip install -r requirements.txt
```

**Dependencies:**
- `numpy` - Array operations
- `OpenEXR` - Reading EXR textures
- `Imath` - EXR utilities
- `pygltflib` - Loading GLB mesh data
- `scipy` - (optional) For improved performance
- `pillow` - Image utilities

**Note:** The Houdini extractor requires the `hou` module and must run inside Houdini's Python environment.

## File Naming Convention

All scripts use a consistent naming pattern:

**Multi-frame exports** (no `--frame` argument):
```
filename.npy              # Numpy array (frames, vertices, 3)
filename.json             # Full JSON with all frames
filename_metadata.json    # Compact metadata
filename.0001.csv         # Per-frame CSV files (4-digit padding)
filename.0002.csv
...
```

**Single-frame exports** (with `--frame N`):
```
filename.NNNN.npy         # Numpy array (1, vertices, 3)
filename.NNNN.json        # JSON for single frame
filename.NNNN_metadata.json
filename.NNNN.csv         # CSV for single frame
```

**CSV Format:**
```csv
idx,x,y,z
0000,-0.500000,0.500000,0.500000
0001,0.500000,0.500000,0.500000
0002,-0.500000,-0.500000,0.500000
...
```

Where:
- `idx` - Vertex index (0-based, zero-padded to 4 digits)
- `x,y,z` - Position in world-space meters (6 decimal places)

**Comparison CSV Format:**
```csv
idx,houdini_x,houdini_y,houdini_z,base_x,base_y,base_z,delta_x,delta_y,delta_z,error
0000,1.234567,2.345678,3.456789,1.000000,2.000000,3.000000,0.234567,0.345678,0.456789,0.000123
...
```

## Usage Examples

### Extract from Houdini

Run in Houdini's Python Shell after selecting a geometry node:

```python
# Extract all frames (e.g., frames 1-100)
export_selected_node(
    output_dir="/path/to/houdini_export",
    frame_start=1,
    frame_end=100,
    filename_prefix="sphere",
    save_format="both"  # json, binary, or both
)

# Extract single frame
export_selected_node(
    output_dir="/path/to/houdini_export",
    frame=50,
    filename_prefix="sphere"
)

# Extract with custom CSV directory
export_selected_node(
    output_dir="/path/to/houdini_export",
    frame_start=1,
    frame_end=100,
    filename_prefix="sphere",
    csv_dir="/path/to/csvs"
)
```

**Output files:**
```
sphere.npy
sphere.json
sphere_metadata.json
sphere.0001.csv
sphere.0002.csv
...
sphere.0100.csv
```

### Compare Houdini to EXR + GLB

The comparison tool auto-discovers files and validates the VAT pipeline:

```bash
# Compare all frames (outputs to /tmp/compare_houdini_exr_results by default)
python compare_houdini_to_exr.py \
    --houdini-dir /path/to/houdini_export \
    --vat-dir /path/to/vat_data

# Compare single frame
python compare_houdini_to_exr.py \
    --houdini-dir /path/to/houdini_export \
    --vat-dir /path/to/vat_data \
    --frame 50

# Custom output directory and prefix
python compare_houdini_to_exr.py \
    --houdini-dir /path/to/houdini_export \
    --vat-dir /path/to/vat_data \
    --output-dir /tmp/my_results \
    --prefix sphere_test

# Adjust tolerance (default: 1e-4 meters = 0.1mm)
python compare_houdini_to_exr.py \
    --houdini-dir /path/to/houdini_export \
    --vat-dir /path/to/vat_data \
    --tol 0.001

# Write extracted EXR data to debug files
python compare_houdini_to_exr.py \
    --houdini-dir /path/to/houdini_export \
    --vat-dir /path/to/vat_data \
    --write-exr-debug
```

**Input directories:**
- `--houdini-dir`: Contains `.npy`, `_metadata.json`, and `.csv` files from Houdini export
- `--vat-dir`: Contains `.exr` texture, `_data.json` metadata, and `.glb` base mesh

**Output files:**
```
/tmp/compare_houdini_exr_results/
  comparison_summary.json           # Full comparison report
  comparison_compare.0001.csv       # Per-frame vertex comparison
  comparison_compare.0002.csv
  ...
  comparison_exr_extracted.npy      # (if --write-exr-debug)
  comparison_exr_extracted.0001.csv # (if --write-exr-debug)
```

**Comparison Report Structure:**
```json
{
  "houdini_dir": "/path/to/houdini_export",
  "vat_dir": "/path/to/vat_data",
  "tolerance": 0.0001,
  "validation": {
    "frame_count": 100,
    "vertex_count": 482,
    "warnings": []
  },
  "frames_analyzed": [
    {
      "frame": 1,
      "status": "success",
      "best_operation": "base + delta",
      "match_quality": "perfect",
      "operations_tested": {
        "base + delta": {
          "rms_error": 0.000000123,
          "max_error": 0.000000789,
          "num_above_tol": 0,
          "percent_above_tol": 0.0
        },
        "base - delta": { ... },
        "delta only": { ... },
        "base only": { ... }
      }
    }
  ]
}
```

**Match Quality Levels:**
- `perfect` - All vertices within tolerance
- `excellent` - < 1% of vertices above tolerance
- `good` - < 5% of vertices above tolerance
- `poor` - ≥ 5% of vertices above tolerance

## Complete Workflow Example

Diagnose VAT export artifacts using the complete pipeline:

```bash
# Step 1: Export from Houdini (in Houdini Python Shell)
# Select your geometry node, then:
export_selected_node(
    output_dir="/tmp/houdini_export",
    frame_start=1,
    frame_end=100,
    filename_prefix="sphere",
    save_format="both"
)

# Step 2: Compare and analyze
python compare_houdini_to_exr.py \
    --houdini-dir /tmp/houdini_export \
    --vat-dir /path/to/vat_data \
    --output-dir /tmp/results \
    --prefix sphere

# Step 3: Review problematic frames
python compare_houdini_to_exr.py \
    --houdini-dir /tmp/houdini_export \
    --vat-dir /path/to/vat_data \
    --frame 50 \
    --output-dir /tmp/results \
    --prefix sphere_frame50

# Step 4: Manual CSV inspection (if needed)
# The comparison CSV shows all data side-by-side:
# /tmp/results/sphere_compare.0050.csv
# Columns: idx, houdini_x/y/z, base_x/y/z, delta_x/y/z, error
```

## Understanding Results

### Perfect Match
```json
{
  "best_operation": "base + delta",
  "match_quality": "perfect",
  "operations_tested": {
    "base + delta": {
      "rms_error": 0.000000123,
      "max_error": 0.000000089
    }
  }
}
```
**Interpretation:** The VAT pipeline is working correctly with `base + delta` operation. The shader should add EXR deltas to base mesh positions.

### Good Match with Minor Errors
```json
{
  "best_operation": "base + delta",
  "match_quality": "excellent",
  "operations_tested": {
    "base + delta": {
      "rms_error": 0.000123,
      "max_error": 0.000456,
      "num_above_tol": 3,
      "percent_above_tol": 0.62
    }
  }
}
```
**Interpretation:** Pipeline is mostly accurate. A few vertices show small discrepancies, possibly due to:
- Floating-point precision limits
- Denormalization artifacts in LDR textures
- Texture filtering/sampling

### Wrong Operation Detected
```json
{
  "best_operation": "base - delta",
  "operations_tested": {
    "base + delta": {
      "rms_error": 2.456
    },
    "base - delta": {
      "rms_error": 0.000012
    }
  }
}
```
**Interpretation:** The shader is using the wrong operation. If `base - delta` matches best, the shader should subtract deltas instead of adding them.

### Vertex Count Mismatch
```json
{
  "status": "error",
  "message": "Vertex count mismatch: Houdini=482, VAT=480, GLB=482"
}
```
**Interpretation:** Critical error. The EXR texture doesn't match the mesh. Check texture export settings.


## Troubleshooting

### Houdini Exporter Issues

**Problem:** `No SOP/display node found`  
**Solution:** Select a SOP-level geometry node, not an object-level container.

**Problem:** `Vertex count changed at frame X`  
**Solution:** Ensure geometry topology is constant across frames (use timeshift or consistent deformation).

### Comparison Tool Issues

**Problem:** `Could not find EXR and JSON files`  
**Solution:** Verify the VAT directory contains the exported `.exr` texture, `_data.json` metadata, and `.glb` base mesh.

**Problem:** `Could not find .npy file`  
**Solution:** Verify the Houdini export directory contains the `.npy` file from the Houdini extraction step.

**Problem:** `Vertex count mismatch`  
**Solution:** Ensure the GLB base mesh, EXR texture, and Houdini export all use the same mesh topology.

**Problem:** `Frame count mismatch`  
**Solution:** Export the same frame range in Houdini and VAT. Check the `Frame Count` field in the VAT JSON metadata.

**Problem:** Large position errors with LDR textures  
**Solution:** Verify `Bound Min/Max` values in metadata JSON are correct. Incorrect bounds cause denormalization errors.

**Problem:** Wrong operation detected (e.g., `base - delta` instead of `base + delta`)  
**Solution:** This indicates a shader bug. The shader should use the operation reported as `best_operation` in the comparison results.

## Best Practices

1. **Always export ground truth first** - Run Houdini extraction before comparison.

2. **Use consistent frame ranges** - Export the same frame range in both Houdini and VAT (typically starting at frame 1).

3. **Start with single frames** - When debugging, use `--frame 1` to quickly test without processing entire sequences.

4. **Use appropriate tolerance** - Default 1e-4m (0.1mm) is good for most cases. Increase for lower-precision data.

5. **Check comparison CSV files** - When errors are found, inspect the comparison CSV to see per-vertex houdini/base/delta/error values.

6. **Verify metadata** - Ensure the VAT metadata JSON has correct bounds, especially for LDR textures.

7. **Test with simple geometry first** - Use a sphere or cube to validate the pipeline before complex meshes.

8. **Use default output directory** - The default `/tmp/compare_houdini_exr_results` makes quick iterations easy.

## Technical Notes

### VAT Delta Storage
- The VAT pipeline stores **position deltas** (offsets) in the EXR texture, not absolute positions
- At runtime, the shader adds these deltas to the base GLB mesh: `final_pos = base_pos + delta`
- Frame 1 typically has deltas near zero (matching the base mesh)
- The comparison tool tests multiple operations to determine the correct integration method

### Coordinate Spaces
- All positions are in **world-space meters**
- Houdini and Babylon.js both use meter units by default
- Be aware of any transforms applied at export time

### Float Precision
- Numpy arrays use `float32` (same as GPU)
- CSV files write 6 decimal places (`%.6f`)
- Vertex indices use 4-digit zero-padding (`%04d`)
- Comparison tolerance accounts for floating-point precision limits

### HDR vs LDR Textures
- **HDR (EXR):** Deltas stored directly as float32, no denormalization needed
- **LDR (PNG):** Deltas normalized to [0,1], require denormalization using metadata bounds
- Denormalization: `world_delta = normalized_delta * (bounds_max - bounds_min) + bounds_min`

### Memory Considerations
- Large sequences (100+ frames, 10k+ vertices) can use significant memory
- Use single-frame comparison for initial tests
- Comparison CSV files are verbose but helpful for debugging; rely on JSON summary for overview

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify all dependencies are installed correctly
3. Test with simple geometry (cube/sphere) to isolate the problem
4. Review comparison CSV files to understand error patterns
5. Check that the `best_operation` field indicates the correct shader operation

## License

These scripts are part of the www-floatingworld-static project.

## Technical Notes

### Coordinate Spaces
- All positions are in **world-space meters**
- Houdini and Babylon.js both use meter units by default
- Be aware of any transforms applied at export time

### Float Precision
- Numpy arrays use `float32` (same as GPU)
- CSV files write 6 decimal places (`%.6f`)
- Comparison tolerance accounts for floating-point precision limits

### HDR vs LDR Textures
- **HDR (EXR):** Positions stored directly as float32, no denormalization needed
- **LDR (PNG):** Positions normalized to [0,1], require denormalization using metadata bounds
- Denormalization: `world_pos = normalized_pos * (bounds_max - bounds_min) + bounds_min`

### Memory Considerations
- Large sequences (100+ frames, 10k+ vertices) can use significant memory
- Use single-frame extraction for initial tests
- CSV files are verbose; rely on .npy for large datasets

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify all dependencies are installed correctly
3. Test with simple geometry (cube/sphere) to isolate the problem
4. Review CSV files manually to understand error patterns
5. Check that Houdini and EXR use the same coordinate space and units

## License

These scripts are part of the www-floatingworld-static project.
