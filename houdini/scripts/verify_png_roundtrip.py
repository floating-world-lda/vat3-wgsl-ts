#!/usr/bin/env python3
"""
Verify PNG Roundtrip

Verifies that a PNG generated from an EXR can be denormalized back to match
the original EXR values within quantization tolerance.

This tests the entire encode/decode pipeline:
1. EXR (float32) → normalize → PNG (uint8)
2. PNG (uint8) → denormalize → reconstructed float32
3. Compare reconstructed vs original EXR

Usage:
    python3 verify_png_roundtrip.py /path/to/asset_pos.exr /path/to/asset_pos.png /path/to/asset_data.json
    
    # With verbose output
    python3 verify_png_roundtrip.py /path/to/asset_pos.exr /path/to/asset_pos.png /path/to/asset_data.json -v
"""

import argparse
import json
import sys
import numpy as np
from PIL import Image
import OpenEXR
import Imath


class PNGRoundtripVerifier:
    """Verify that PNG can be denormalized back to match original EXR."""
    
    def __init__(self, exr_path: str, png_path: str, json_path: str, verbose: bool = False):
        """
        Initialize verifier.
        
        Args:
            exr_path: Path to original EXR file
            png_path: Path to converted PNG file
            json_path: Path to VAT JSON metadata with bounds
            verbose: Enable verbose logging
        """
        self.exr_path = exr_path
        self.png_path = png_path
        self.json_path = json_path
        self.verbose = verbose
        
        # Load bounds
        self.bounds_min, self.bounds_max = self._load_bounds()
        self.bounds_range = self.bounds_max - self.bounds_min
        
        # Calculate quantization error (8-bit = 1/255 of range per channel)
        self.max_quantization_error = np.max(self.bounds_range) / 255.0
        
        if verbose:
            print(f"Bounds Min: {self.bounds_min}")
            print(f"Bounds Max: {self.bounds_max}")
            print(f"Bounds Range: {self.bounds_range}")
            print(f"Max Quantization Error: {self.max_quantization_error:.6f}")
    
    def _load_bounds(self):
        """Load bounding box from JSON metadata."""
        with open(self.json_path, 'r') as f:
            json_data = json.load(f)
        
        if isinstance(json_data, list) and len(json_data) > 0:
            data = json_data[0]
        else:
            data = json_data
        
        bounds_min = np.array([
            data.get('Bound Min X', -1.0),
            data.get('Bound Min Y', -1.0),
            data.get('Bound Min Z', -1.0),
            data.get('Bound Min A', -1.0)
        ], dtype=np.float32)
        
        bounds_max = np.array([
            data.get('Bound Max X', 1.0),
            data.get('Bound Max Y', 1.0),
            data.get('Bound Max Z', 1.0),
            data.get('Bound Max A', 1.0)
        ], dtype=np.float32)
        
        return bounds_min, bounds_max
    
    def _load_exr(self):
        """Load EXR texture data."""
        exr_file = OpenEXR.InputFile(self.exr_path)
        header = exr_file.header()
        
        dw = header['dataWindow']
        width = dw.max.x - dw.min.x + 1
        height = dw.max.y - dw.min.y + 1
        
        channels = ['R', 'G', 'B', 'A']
        channel_data = {}
        
        for channel in channels:
            if channel in header['channels']:
                channel_str = exr_file.channel(channel, Imath.PixelType(Imath.PixelType.FLOAT))
                channel_data[channel] = np.frombuffer(channel_str, dtype=np.float32)
        
        rgba_data = np.zeros((height, width, 4), dtype=np.float32)
        for i, channel in enumerate(channels):
            if channel in channel_data:
                rgba_data[:, :, i] = channel_data[channel].reshape(height, width)
        
        exr_file.close()
        
        if self.verbose:
            print(f"\nEXR Data:")
            print(f"  Dimensions: {width}x{height}")
            print(f"  Value Range: [{rgba_data.min():.6f}, {rgba_data.max():.6f}]")
        
        return rgba_data
    
    def _load_png(self):
        """Load PNG texture data."""
        image = Image.open(self.png_path)
        png_data = np.array(image, dtype=np.uint8)
        
        if self.verbose:
            print(f"\nPNG Data:")
            print(f"  Dimensions: {png_data.shape[1]}x{png_data.shape[0]}")
            print(f"  Value Range: [{png_data.min()}, {png_data.max()}]")
        
        return png_data
    
    def _denormalize_png(self, png_data: np.ndarray) -> np.ndarray:
        """
        Denormalize PNG uint8 data back to float32 using bounds.
        
        This is the inverse of the normalization:
        normalized = (value - min) / (max - min)
        value = normalized * (max - min) + min
        
        Args:
            png_data: uint8 array from PNG
            
        Returns:
            float32 array denormalized to original bounds
        """
        # Convert uint8 [0, 255] to float [0, 1]
        normalized = png_data.astype(np.float32) / 255.0
        
        # Denormalize to original bounds
        denormalized = normalized * self.bounds_range + self.bounds_min
        
        if self.verbose:
            print(f"\nDenormalized Data:")
            print(f"  Value Range: [{denormalized.min():.6f}, {denormalized.max():.6f}]")
        
        return denormalized
    
    def verify(self) -> bool:
        """
        Verify that PNG denormalizes back to match EXR within tolerance.
        
        Returns:
            True if verification passes, False otherwise
        """
        print(f"\nVerifying PNG roundtrip:")
        print(f"  EXR: {self.exr_path}")
        print(f"  PNG: {self.png_path}")
        print(f"  JSON: {self.json_path}")
        print("=" * 80)
        
        # Load data
        exr_data = self._load_exr()
        png_data = self._load_png()
        
        # Verify dimensions match
        if exr_data.shape[:2] != png_data.shape[:2]:
            print(f"\n❌ FAILED: Dimension mismatch!")
            print(f"  EXR: {exr_data.shape[1]}x{exr_data.shape[0]}")
            print(f"  PNG: {png_data.shape[1]}x{png_data.shape[0]}")
            return False
        
        # Denormalize PNG back to float
        denormalized = self._denormalize_png(png_data)
        
        # Calculate per-pixel difference
        diff = np.abs(exr_data - denormalized)
        max_diff = np.max(diff)
        mean_diff = np.mean(diff)
        
        # Calculate per-channel statistics
        channel_names = ['R', 'G', 'B', 'A']
        channel_stats = []
        
        for i, name in enumerate(channel_names):
            channel_diff = diff[:, :, i]
            channel_max = np.max(channel_diff)
            channel_mean = np.mean(channel_diff)
            channel_stats.append({
                'name': name,
                'max': channel_max,
                'mean': channel_mean
            })
        
        # Set tolerance to 1.5x quantization error per channel
        # (allows for rounding errors)
        tolerance = self.max_quantization_error * 1.5
        
        print(f"\n--- VERIFICATION RESULTS ---")
        print(f"\nOverall Statistics:")
        print(f"  Max Difference: {max_diff:.6f}")
        print(f"  Mean Difference: {mean_diff:.6f}")
        print(f"  Tolerance: {tolerance:.6f}")
        
        print(f"\nPer-Channel Statistics:")
        for stat in channel_stats:
            status = "✓" if stat['max'] <= tolerance else "✗"
            print(f"  {stat['name']}: Max={stat['max']:.6f}, Mean={stat['mean']:.6f} {status}")
        
        # Find worst pixels
        if self.verbose or max_diff > tolerance:
            print(f"\nWorst 5 Pixels:")
            flat_diff = diff.reshape(-1, 4)
            flat_exr = exr_data.reshape(-1, 4)
            flat_denorm = denormalized.reshape(-1, 4)
            
            pixel_magnitudes = np.linalg.norm(flat_diff, axis=1)
            worst_indices = np.argsort(pixel_magnitudes)[-5:][::-1]
            
            height, width = exr_data.shape[:2]
            
            for idx in worst_indices:
                y = idx // width
                x = idx % width
                magnitude = pixel_magnitudes[idx]
                
                exr_pixel = flat_exr[idx]
                denorm_pixel = flat_denorm[idx]
                diff_pixel = flat_diff[idx]
                
                print(f"\n  Pixel ({x}, {y}):")
                print(f"    EXR:   ({exr_pixel[0]:8.4f}, {exr_pixel[1]:8.4f}, {exr_pixel[2]:8.4f}, {exr_pixel[3]:8.4f})")
                print(f"    Denorm: ({denorm_pixel[0]:8.4f}, {denorm_pixel[1]:8.4f}, {denorm_pixel[2]:8.4f}, {denorm_pixel[3]:8.4f})")
                print(f"    Δ:      ({diff_pixel[0]:8.4f}, {diff_pixel[1]:8.4f}, {diff_pixel[2]:8.4f}, {diff_pixel[3]:8.4f})")
                print(f"    |Δ|: {magnitude:.6f}")
        
        # Pass/Fail determination
        passed = max_diff <= tolerance
        
        print(f"\n{'=' * 80}")
        if passed:
            print(f"✅ VERIFICATION PASSED")
            print(f"   PNG successfully denormalizes back to EXR within tolerance")
            print(f"   Max error: {max_diff:.6f} (tolerance: {tolerance:.6f})")
        else:
            print(f"❌ VERIFICATION FAILED")
            print(f"   PNG does NOT denormalize correctly")
            print(f"   Max error: {max_diff:.6f} exceeds tolerance: {tolerance:.6f}")
            print(f"   Error ratio: {max_diff/tolerance:.2f}x tolerance")
        print(f"{'=' * 80}\n")
        
        return passed


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Verify PNG can be denormalized back to match original EXR',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument('exr_path', help='Path to original EXR file')
    parser.add_argument('png_path', help='Path to converted PNG file')
    parser.add_argument('json_path', help='Path to VAT JSON metadata')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    # Verify files exist
    import os
    for path, name in [(args.exr_path, 'EXR'), (args.png_path, 'PNG'), (args.json_path, 'JSON')]:
        if not os.path.exists(path):
            print(f"Error: {name} file not found: {path}")
            sys.exit(1)
    
    # Run verification
    verifier = PNGRoundtripVerifier(
        args.exr_path,
        args.png_path,
        args.json_path,
        args.verbose
    )
    
    passed = verifier.verify()
    
    sys.exit(0 if passed else 1)


if __name__ == '__main__':
    main()
