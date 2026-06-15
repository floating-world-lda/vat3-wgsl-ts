# VAT HDR to LDR Converter

This directory contains tools for converting Vertex Animation Texture (VAT) HDR EXR files to normalized LDR textures suitable for real-time rendering.

## Overview

Houdini incorrectly encodes bounding information for softbody types which contain transform animation. This causes low-dynamic-range exports to distort over the frame range. High-dynamic-range exports, which don't use normalized values can be used to generate correct bounds and encode ldr textures using those values.

The Houdini VAT export process generates:
- **EXR textures**: High Dynamic Range (HDR) position/normal data
- **JSON metadata**: Bounding box information for normalization
- **GLB mesh**: Base mesh geometry

The EXR textures store **position deltas** (not absolute positions) that get added to the base mesh vertices in the shader. To use these textures efficiently on the GPU, they need to be converted from HDR to normalized LDR format (8-bit PNG or compressed KTX2).

### VAT File Naming Convention

The converter follows the VAT naming convention:
- `{asset_name}_pos.exr` - Position data (HDR input)
- `{asset_name}_data.json` - Metadata with bounds (input)
- `{asset_name}_pos.png` - Position data (LDR output)
- `{asset_name}_pos.ktx2` - Position data (compressed optional output)

**Example:**
```
cube_vat/
├── cube_vat_pos.exr      <- Input (HDR)
├── cube_vat_data.json    <- Input (metadata)
├── cube_vat_pos.png      <- Output (created by converter)
└── cube_vat_pos.ktx2     <- Output (optional, with --ktx flag)
```

## Installation

### Prerequisites

- Python 3.7 or later
- pip (Python package manager)

### Install Dependencies

**Recommended: Use a virtual environment**

```bash
cd src/lib/babylon/vat/scripts

# Create virtual environment (first time only)
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**Alternative: System-wide installation**

If you prefer not to use a virtual environment:

```bash
# macOS/Linux with Homebrew Python (use --user flag)
python3 -m pip install --user -r requirements.txt

# Or with pipx for isolated environments
brew install pipx
pipx install --include-deps -r requirements.txt
```

**Note**: After activating the virtual environment, you can run the converter normally. To deactivate the virtual environment when done, use `deactivate`.

**Adding to .gitignore**: The `venv/` directory should be ignored by git (already added to .gitignore).

### Required Dependencies

- **numpy**: Array operations and numerical processing
- **OpenEXR**: Reading HDR EXR texture files
- **Pillow**: PNG image writing

### Optional Dependencies

For KTX2 output, you need the KTX-Software tools:
- Install from: https://github.com/KhronosGroup/KTX-Software
- The `ktx` command-line tool must be in your PATH

## Usage

**Important**: If you installed dependencies in a virtual environment, activate it first:
```bash
cd src/lib/babylon/vat/scripts
source venv/bin/activate
```

### Basic Conversion (PNG Output)

Convert all VAT assets in a directory to normalized PNG:

```bash
python3 vat_hdr_to_ldr.py /path/to/vat/directory
```

The converter will:
1. Find all `*_pos.exr` files in the directory
2. Match each with its corresponding `*_data.json` file
3. Create `*_pos.png` files in the same directory

**Example:**
```bash
python3 vat_hdr_to_ldr.py /Users/me/assets/cube_vat

# Processes:
#   cube_vat_pos.exr + cube_vat_data.json -> cube_vat_pos.png
```

### KTX2 Output (Optional)

Convert to both PNG and compressed KTX2:

```bash
python3 vat_hdr_to_ldr.py /path/to/vat/directory --ktx
```

**Example:**
```bash
python3 vat_hdr_to_ldr.py /Users/me/assets/cube_vat --ktx

# Creates:
#   cube_vat_pos.png
#   cube_vat_pos.ktx2
```

### Verbose Output

Enable detailed logging with `-v` or `--verbose`:

```bash
python3 vat_hdr_to_ldr.py /path/to/vat/directory -v
```

This shows:
- Found VAT assets and file pairs
- Loaded bounding box values
- EXR dimensions and data ranges
- Normalization statistics
- Sample pixel values
- Conversion progress

### Multiple Assets

The converter automatically processes all VAT assets in a directory:

```bash
python3 vat_hdr_to_ldr.py /Users/me/assets/vat_collection

# If directory contains:
#   cube_vat_pos.exr + cube_vat_data.json
#   sphere_vat_pos.exr + sphere_vat_data.json
#
# Creates:
#   cube_vat_pos.png
#   sphere_vat_pos.png
```

## How It Works

### 1. Bounding Box Normalization

The converter reads bounding box data from the VAT JSON metadata:

```json
{
  "Bound Min X": -0.5,
  "Bound Min Y": 0.0,
  "Bound Min Z": -0.5,
  "Bound Max X": 0.5,
  "Bound Max Y": 2.0,
  "Bound Max Z": 0.5
}
```

### 2. HDR to LDR Conversion

Each pixel in the EXR texture is normalized using:

```
normalized_value = (hdr_value - bound_min) / (bound_max - bound_min)
```

This maps the HDR value range to [0, 1], which is then quantized to uint8 [0, 255]:

```
uint8_value = round(normalized_value * 255)
```

**Special case**: If a channel has constant values (bound_max == bound_min), it's mapped to 0.5 (gray) to avoid division by zero.

### 3. Shader Denormalization

In your shader, reverse the process to reconstruct HDR values:

```glsl
// Read normalized value from texture
vec4 texel = texture(vatTexture, uv);

// Denormalize to HDR range
vec3 position_delta = texel.rgb * (boundMax - boundMin) + boundMin;

// Apply to base mesh
vec3 final_position = base_position + position_delta;
```

### 4. Optional KTX2 Compression

If `--ktx` is specified, the PNG is further compressed to KTX2 format using:
- Format: `R8G8B8A8_UNORM` (same as PNG, no precision loss)
- Compression: `ZSTD` level 18 (maximum compression)
- Benefits: Faster GPU upload, smaller file size, same visual quality

## File Structure

```
src/lib/babylon/vat/scripts/
├── vat_hdr_to_ldr.py          # Main converter script
├── requirements.txt           # Python dependencies
└── README.md                  # This file

Example VAT Directory:
your_vat_asset/
├── assetname_pos.exr          # HDR position data (input)
├── assetname_data.json        # Metadata with bounds (input)
├── assetname.glb              # Base mesh (used by shader)
├── assetname_pos.png          # LDR position data (output)
└── assetname_pos.ktx2         # Compressed position data (optional output)
```

## Output Formats

### PNG (Default)

- **Format**: 8-bit RGBA PNG
- **Size**: ~400KB for 1024x400 texture
- **Compatibility**: Universal support
- **Use case**: Web, debugging, intermediate format

### KTX2 (Optional)

- **Format**: KTX2 with ZSTD compression
- **Size**: ~100KB for 1024x400 texture (4x smaller than PNG)
- **Compatibility**: Modern GPUs, WebGL 2.0+
- **Use case**: Production, optimized loading
- **Trade-off**: Requires KTX-Software tools installed

## Troubleshooting

### "No *_pos.exr files found"

**Problem**: Converter can't find any VAT files in the directory

**Solution**: 
- Verify your directory contains files with the naming convention: `{name}_pos.exr`
- Check that you're pointing to the correct directory
- Use `ls -la /path/to/directory` to inspect the contents

### "No matching JSON found"

**Problem**: Found EXR file but missing corresponding JSON metadata

**Solution**: 
- Ensure each `{asset}_pos.exr` has a matching `{asset}_data.json`
- Verify the asset names match exactly (case-sensitive)
- Example: `cube_vat_pos.exr` requires `cube_vat_data.json`

### "ktx tool not found"

**Problem**: KTX2 conversion fails with "ktx tool not found in PATH"

**Solution**: Install KTX-Software tools:
```bash
# macOS with Homebrew
brew install ktx

# Or download from: https://github.com/KhronosGroup/KTX-Software/releases
```

### High Reconstruction Errors

**Problem**: Converted textures produce artifacts in the shader

**Possible causes:**
1. **Incorrect JSON bounds**: Verify the bounds in your JSON metadata match the actual data range in the EXR
2. **Out-of-bounds values**: EXR contains values outside the specified bounds (will be clamped)
3. **Extreme value ranges**: Very large ranges (e.g., -1000 to +1000) lose precision in 8-bit quantization

**Solutions:**
- Re-export from Houdini with correct bounds
- Use tighter bounds that match your actual animation range
- Consider if your animation range is too large for 8-bit precision
- Test with verbose mode (`-v`) to inspect data ranges

### OpenEXR Import Errors

**Problem**: `ImportError: No module named 'OpenEXR'`

**Solution**: Ensure OpenEXR is properly installed:
```bash
pip3 install --upgrade OpenEXR Imath
```

On some systems you may need to install system libraries first:
```bash
# macOS
brew install openexr

# Linux (Ubuntu/Debian)
sudo apt-get install libopenexr-dev
```

## Technical Details

### Precision Analysis

8-bit quantization provides 256 discrete values per channel. For a typical VAT range:

- **Range**: [-0.5, 0.5] → 1.0 total range
- **Step size**: 1.0 / 255 ≈ 0.00392
- **Precision**: ~0.004 units per step

This is sufficient for most real-time animation, but very large ranges or subtle movements may show quantization artifacts.

### Memory Layout

Both PNG and KTX2 outputs use the same memory layout:
- **R channel**: X position delta
- **G channel**: Y position delta
- **B channel**: Z position delta
- **A channel**: Packed normal or auxiliary data

### Coordinate Systems

The converter preserves the coordinate system from Houdini:
- No axis swapping or transformations
- Direct mapping: EXR → LDR → Shader
- Ensure your shader uses the same coordinate conventions as your Houdini export

## Advanced Usage

### Batch Processing with Shell Script

Process multiple VAT directories:

```bash
#!/bin/bash
for dir in /path/to/vat_assets/*/; do
  echo "Processing: $dir"
  python3 vat_hdr_to_ldr.py "$dir" --ktx
done
```

### Integration with Build Pipeline

Add to your `package.json`:

```json
{
  "scripts": {
    "convert-vat": "python3 src/lib/babylon/vat/scripts/vat_hdr_to_ldr.py public/assets/vat/cube_vat --ktx",
    "convert-all-vat": "for dir in public/assets/vat/*/; do python3 src/lib/babylon/vat/scripts/vat_hdr_to_ldr.py \"$dir\" --ktx; done"
  }
}
```

Then run:
```bash
npm run convert-vat
# or
npm run convert-all-vat
```

## Best Practices

1. **Follow VAT naming conventions**: Use `{asset}_pos.exr` and `{asset}_data.json` naming
2. **Always use JSON bounds**: Never hardcode normalization ranges
3. **Use KTX2 in production**: Significantly smaller files with no quality loss
4. **Keep PNG for debugging**: PNG can be easily inspected in image viewers
5. **Verify coordinate systems**: Ensure Houdini export and shader use consistent coordinates
6. **Optimize bounds**: Use tight bounds that match your actual animation range for maximum precision
7. **Output to same directory**: Keep VAT assets together (EXR, JSON, GLB, PNG/KTX2)
8. **Test with verbose mode**: Use `-v` flag to inspect conversion details during development

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review the Houdini VAT export documentation
3. Verify JSON metadata matches your export settings
4. Test with `--verbose` and `--test-accuracy` flags for detailed diagnostics
