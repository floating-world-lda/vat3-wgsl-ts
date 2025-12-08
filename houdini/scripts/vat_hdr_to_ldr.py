#!/usr/bin/env python3
"""
VAT HDR to LDR Converter

Converts Vertex Animation Texture (VAT) HDR EXR files to normalized LDR textures.
Uses bounding box data from JSON metadata for precise normalization.
Optionally outputs KTX2 format for optimized GPU compression.

VAT Naming Convention:
    {asset_name}_pos.exr       -> Position data (HDR)
    {asset_name}_data.json     -> Metadata with bounds
    {asset_name}_pos.png       -> Position data (LDR, output)
    {asset_name}_pos.ktx2      -> Position data (compressed, optional output)

Usage:
    # Convert to PNG (default)
    python3 vat_hdr_to_ldr.py /path/to/vat/directory

    # Convert to KTX2
    python3 vat_hdr_to_ldr.py /path/to/vat/directory --ktx

    # Verbose output
    python3 vat_hdr_to_ldr.py /path/to/vat/directory -v
"""

import argparse
import glob
import json
import os
import subprocess
import sys
from typing import Tuple, List
import numpy as np
from PIL import Image
import OpenEXR
import Imath


class VATHDRToLDRConverter:
    """Convert VAT HDR EXR textures to normalized LDR format."""
    
    def __init__(self, exr_path: str, json_path: str, verbose: bool = False, calculate_bounds: bool = False):
        """
        Initialize converter.
        
        Args:
            exr_path: Path to input EXR file
            json_path: Path to VAT JSON metadata file
            verbose: Enable verbose logging
            calculate_bounds: Calculate actual bounds from EXR data instead of using JSON
        """
        self.exr_path = exr_path
        self.json_path = json_path
        self.verbose = verbose
        self.calculate_bounds = calculate_bounds
        
        # Load bounds from JSON (may be overridden if calculate_bounds=True)
        self.bounds_min, self.bounds_max = self._load_bounds()
        
        if verbose:
            print(f"Loaded bounds from {json_path}:")
            print(f"  Min: {self.bounds_min}")
            print(f"  Max: {self.bounds_max}")
    
    def _load_bounds(self) -> Tuple[np.ndarray, np.ndarray]:
        """
        Load bounding box from VAT JSON metadata.
        
        Returns:
            Tuple of (bounds_min, bounds_max) as numpy arrays
        """
        with open(self.json_path, 'r') as f:
            json_data = json.load(f)
        
        # Handle both dict and list formats
        if isinstance(json_data, list) and len(json_data) > 0:
            data = json_data[0]
        else:
            data = json_data
        
        bounds_min = np.array([
            data.get('Bound Min X', -1.0),
            data.get('Bound Min Y', -1.0),
            data.get('Bound Min Z', -1.0),
        ], dtype=np.float32)
        
        bounds_max = np.array([
            data.get('Bound Max X', 1.0),
            data.get('Bound Max Y', 1.0),
            data.get('Bound Max Z', 1.0),
        ], dtype=np.float32)
        
        return bounds_min, bounds_max
    
    def _update_json_bounds(self, bounds_min: np.ndarray, bounds_max: np.ndarray) -> None:
        """
        Update the JSON metadata file with corrected bounds.
        
        Args:
            bounds_min: Array of [X, Y, Z] minimum values
            bounds_max: Array of [X, Y, Z] maximum values
        """
        try:
            # Read existing JSON
            with open(self.json_path, 'r') as f:
                json_data = json.load(f)
            
            # Handle both dict and list formats
            if isinstance(json_data, list) and len(json_data) > 0:
                data = json_data[0]
            else:
                data = json_data
            
            # Update bounds fields (XYZ only)
            data['Bound Min X'] = float(bounds_min[0])
            data['Bound Min Y'] = float(bounds_min[1])
            data['Bound Min Z'] = float(bounds_min[2])
            
            data['Bound Max X'] = float(bounds_max[0])
            data['Bound Max Y'] = float(bounds_max[1])
            data['Bound Max Z'] = float(bounds_max[2])
            
            # Write back to file with formatting
            with open(self.json_path, 'w') as f:
                if isinstance(json_data, list):
                    json.dump(json_data, f, indent=2)
                else:
                    json.dump(data, f, indent=2)
            
            if self.verbose:
                print(f"  Updated bounds in: {self.json_path}")
                
        except Exception as e:
            print(f"Warning: Could not update JSON bounds: {e}")
            if self.verbose:
                import traceback
                traceback.print_exc()
    
    def _load_exr_data(self) -> Tuple[np.ndarray, dict]:
        """
        Load EXR texture data.
        
        Returns:
            Tuple of (rgba_data, header) where rgba_data is shape (height, width, 4)
        """
        exr_file = OpenEXR.InputFile(self.exr_path)
        header = exr_file.header()
        
        # Get image dimensions
        dw = header['dataWindow']
        width = dw.max.x - dw.min.x + 1
        height = dw.max.y - dw.min.y + 1
        
        if self.verbose:
            print(f"EXR dimensions: {width}x{height}")
        
        # Read RGBA channels
        channels = ['R', 'G', 'B', 'A']
        channel_data = {}
        
        for channel in channels:
            if channel in header['channels']:
                channel_str = exr_file.channel(channel, Imath.PixelType(Imath.PixelType.FLOAT))
                channel_data[channel] = np.frombuffer(channel_str, dtype=np.float32)
        
        # Combine channels into RGBA array
        rgba_data = np.zeros((height, width, 4), dtype=np.float32)
        for i, channel in enumerate(channels):
            if channel in channel_data:
                rgba_data[:, :, i] = channel_data[channel].reshape(height, width)
        
        exr_file.close()
        
        if self.verbose:
            print(f"EXR data range: [{rgba_data.min():.6f}, {rgba_data.max():.6f}]")
        
        return rgba_data, header
    
    def convert_to_png(self, output_path: str) -> bool:
        """
        Convert EXR to normalized PNG.
        
        Normalization formula: (value - bound_min) / (bound_max - bound_min)
        This maps the HDR value range to [0, 1], which is then quantized to uint8 [0, 255].
        
        If calculate_bounds is True, actual bounds are computed from EXR data and
        the JSON file is updated with these corrected bounds.
        
        Args:
            output_path: Path for output PNG file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Load EXR data
            exr_data, header = self._load_exr_data()
            height, width, channels = exr_data.shape
            
            # Calculate actual bounds from EXR if requested
            if self.calculate_bounds:
                # Only calculate bounds for XYZ channels (not alpha)
                actual_min = np.min(exr_data[:, :, :3], axis=(0, 1))
                actual_max = np.max(exr_data[:, :, :3], axis=(0, 1))
                
                if self.verbose:
                    print(f"\nCalculated actual bounds from EXR data (XYZ only):")
                    print(f"  Actual Min: {actual_min}")
                    print(f"  Actual Max: {actual_max}")
                    print(f"  JSON Min:   {self.bounds_min}")
                    print(f"  JSON Max:   {self.bounds_max}")
                
                # Check if JSON bounds were wrong
                bounds_differ = not (np.allclose(actual_min, self.bounds_min, rtol=1e-3) and 
                                    np.allclose(actual_max, self.bounds_max, rtol=1e-3))
                
                if bounds_differ:
                    print(f"⚠️  WARNING: JSON bounds differ from actual EXR data!")
                    print(f"   This will cause incorrect normalization.")
                    
                    # Update to use actual bounds (XYZ only)
                    self.bounds_min = actual_min
                    self.bounds_max = actual_max
                    
                    # Update JSON file
                    self._update_json_bounds(actual_min, actual_max)
                    print(f"✓ Updated JSON file with corrected bounds")
                else:
                    if self.verbose:
                        print(f"✓ JSON bounds are correct")
            
            # Calculate normalization parameters (XYZ only, alpha stays unchanged)
            bound_range = self.bounds_max - self.bounds_min
            
            # Handle constant channels (range = 0) by setting them to mid-point (0.5)
            # This prevents division by zero and maps constant values to gray
            bound_range = np.where(bound_range == 0, 1.0, bound_range)
            
            # Normalize XYZ channels only
            normalized_xyz = np.where(
                bound_range == 1.0,
                0.5,
                (exr_data[:, :, :3] - self.bounds_min) / bound_range
            )
            
            # Combine normalized XYZ with unchanged alpha channel
            normalized_data = np.zeros_like(exr_data)
            normalized_data[:, :, :3] = normalized_xyz
            normalized_data[:, :, 3] = exr_data[:, :, 3]  # Keep alpha as-is
            
            if self.verbose:
                print(f"\nNormalization:")
                print(f"  Input range (XYZ): [{exr_data[:, :, :3].min():.6f}, {exr_data[:, :, :3].max():.6f}]")
                print(f"  Input range (A): [{exr_data[:, :, 3].min():.6f}, {exr_data[:, :, 3].max():.6f}]")
                print(f"  Normalized range (XYZ): [{normalized_data[:, :, :3].min():.6f}, {normalized_data[:, :, :3].max():.6f}]")
                print(f"  Normalized range (A): [{normalized_data[:, :, 3].min():.6f}, {normalized_data[:, :, 3].max():.6f}]")
            
            # Clamp to [0, 1] range (safety check for out-of-bounds values)
            normalized_data = np.clip(normalized_data, 0.0, 1.0)
            
            # Convert to uint8 with proper rounding
            uint8_data = np.around(normalized_data * 255.0).astype(np.uint8)
            
            if self.verbose:
                print(f"  uint8 range: [{uint8_data.min()}, {uint8_data.max()}]")
            
            # Convert to PIL Image and save
            image = Image.fromarray(uint8_data, 'RGBA')
            image.save(output_path)
            
            if self.verbose:
                print(f"\n✓ Saved PNG: {output_path}")
            
            return True
            
        except Exception as e:
            print(f"Error during PNG conversion: {e}")
            if self.verbose:
                import traceback
                traceback.print_exc()
            return False
    
    def convert_to_ktx(self, png_path: str, ktx_path: str) -> bool:
        """
        Convert PNG to KTX2 format using ktx CLI tool.
        
        Args:
            png_path: Path to input PNG file
            ktx_path: Path for output KTX2 file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Check if ktx tool is available
            result = subprocess.run(['which', 'ktx'], capture_output=True, text=True)
            if result.returncode != 0:
                print("Error: 'ktx' tool not found in PATH")
                print("Please install KTX-Software tools: https://github.com/KhronosGroup/KTX-Software")
                return False
            
            # Convert PNG to KTX2 with optimal compression
            ktx_cmd = [
                'ktx', 'create',
                '--format', 'R8G8B8A8_UNORM',
                '--zstd', '18',  # Maximum compression
                png_path,
                ktx_path
            ]
            
            if self.verbose:
                print(f"Running: {' '.join(ktx_cmd)}")
            
            result = subprocess.run(ktx_cmd, capture_output=True, text=True, check=True)
            
            if self.verbose:
                if result.stdout:
                    print(f"ktx stdout: {result.stdout}")
                if result.stderr:
                    print(f"ktx stderr: {result.stderr}")
            
            if self.verbose:
                print(f"Saved KTX2: {ktx_path}")
            
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"Error: ktx command failed with return code {e.returncode}")
            print(f"Command: {' '.join(e.cmd)}")
            if e.stdout:
                print(f"stdout: {e.stdout}")
            if e.stderr:
                print(f"stderr: {e.stderr}")
            return False
        except Exception as e:
            print(f"Error during KTX2 conversion: {e}")
            if self.verbose:
                import traceback
                traceback.print_exc()
            return False


def find_vat_files(vat_directory: str, verbose: bool = False) -> List[Tuple[str, str, str]]:
    """
    Find all VAT position EXR files and their corresponding data JSON in a directory.
    
    VAT naming convention:
        {asset_name}_pos.exr       -> Position data (HDR)
        {asset_name}_data.json     -> Metadata with bounds
    
    Args:
        vat_directory: Directory containing VAT files
        verbose: Enable verbose logging
        
    Returns:
        List of tuples: (exr_path, json_path, asset_name)
    """
    if not os.path.isdir(vat_directory):
        raise ValueError(f"Not a directory: {vat_directory}")
    
    # Find all *_pos.exr files
    pos_exr_pattern = os.path.join(vat_directory, "*_pos.exr")
    pos_exr_files = glob.glob(pos_exr_pattern)
    
    if not pos_exr_files:
        raise ValueError(f"No *_pos.exr files found in {vat_directory}")
    
    vat_files = []
    
    for exr_path in pos_exr_files:
        # Extract asset name from filename
        # e.g., "cube_vat_pos.exr" -> "cube_vat"
        basename = os.path.basename(exr_path)
        if not basename.endswith("_pos.exr"):
            continue
        
        asset_name = basename[:-8]  # Remove "_pos.exr"
        
        # Find corresponding JSON file
        json_path = os.path.join(vat_directory, f"{asset_name}_data.json")
        
        if not os.path.exists(json_path):
            if verbose:
                print(f"Warning: No matching JSON found for {basename}, expected {asset_name}_data.json")
            continue
        
        vat_files.append((exr_path, json_path, asset_name))
        
        if verbose:
            print(f"Found VAT asset: {asset_name}")
            print(f"  EXR: {basename}")
            print(f"  JSON: {os.path.basename(json_path)}")
    
    if not vat_files:
        raise ValueError(f"No valid VAT file pairs found in {vat_directory}")
    
    return vat_files


def main():
    """Main entry point for the converter."""
    parser = argparse.ArgumentParser(
        description='Convert VAT HDR EXR textures to normalized LDR format',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
VAT Naming Convention:
  {asset_name}_pos.exr       -> Position data (HDR)
  {asset_name}_data.json     -> Metadata with bounds
  {asset_name}_pos.png       -> Position data (LDR, output)
  {asset_name}_pos.ktx2      -> Position data (compressed, optional output)

Examples:
  # Convert to PNG (default)
  python3 vat_hdr_to_ldr.py /path/to/vat/directory

  # Convert to KTX2
  python3 vat_hdr_to_ldr.py /path/to/vat/directory --ktx

  # Verbose output
  python3 vat_hdr_to_ldr.py /path/to/vat/directory -v
        """
    )
    
    parser.add_argument('vat_directory', help='Directory containing VAT files (*_pos.exr and *_data.json)')
    parser.add_argument('--ktx', action='store_true',
                       help='Also output KTX2 format (requires ktx tool in PATH)')
    parser.add_argument('--calculate-bounds', action='store_true',
                       help='Calculate actual bounds from EXR data and update JSON file')
    parser.add_argument('--verbose', '-v', action='store_true', 
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    # Validate directory
    if not os.path.isdir(args.vat_directory):
        print(f"Error: Not a directory: {args.vat_directory}")
        sys.exit(1)
    
    # Find all VAT files in directory
    try:
        vat_files = find_vat_files(args.vat_directory, args.verbose)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
    
    if args.verbose:
        print(f"\nFound {len(vat_files)} VAT asset(s) to process\n")
    
    # Process each VAT asset
    success_count = 0
    failure_count = 0
    
    for exr_path, json_path, asset_name in vat_files:
        print(f"Processing: {asset_name}")
        print("=" * 60)
        
        # Generate output paths
        output_png = os.path.join(args.vat_directory, f"{asset_name}_pos.png")
        output_ktx = os.path.join(args.vat_directory, f"{asset_name}_pos.ktx2") if args.ktx else None
        
        try:
            # Create converter instance
            converter = VATHDRToLDRConverter(
                exr_path, 
                json_path, 
                args.verbose,
                calculate_bounds=args.calculate_bounds
            )
            
            # Convert to PNG
            if args.verbose:
                print(f"Converting {os.path.basename(exr_path)} to PNG...")
            
            success = converter.convert_to_png(output_png)
            
            if not success:
                print(f"✗ PNG conversion failed for {asset_name}")
                failure_count += 1
                continue
            
            print(f"✓ Created: {os.path.basename(output_png)}")
            
            # Convert to KTX2 if requested
            if args.ktx:
                if args.verbose:
                    print(f"\nConverting PNG to KTX2...")
                
                success = converter.convert_to_ktx(output_png, output_ktx)
                
                if not success:
                    print(f"✗ KTX2 conversion failed for {asset_name}")
                    failure_count += 1
                    continue
                
                print(f"✓ Created: {os.path.basename(output_ktx)}")
            
            success_count += 1
            print()
            
        except Exception as e:
            print(f"✗ Error processing {asset_name}: {e}")
            if args.verbose:
                import traceback
                traceback.print_exc()
            failure_count += 1
            print()
    
    # Summary
    print("=" * 60)
    print(f"Conversion Summary:")
    print(f"  Successful: {success_count}")
    print(f"  Failed: {failure_count}")
    print(f"  Total: {len(vat_files)}")
    
    if failure_count > 0:
        sys.exit(1)
    
    print("\n✓ All conversions complete!")
    sys.exit(0)


if __name__ == '__main__':
    main()
