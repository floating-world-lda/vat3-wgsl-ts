#!/usr/bin/env python3
"""
Compare Houdini-exported vertex positions with GLB base mesh + EXR VAT deltas.

This script auto-discovers all necessary files in two directories:
1. Houdini export directory: .npy, _metadata.json, per-frame CSVs
2. VAT directory: .exr, _data.json, .glb base mesh

It validates frame/vertex counts across datasets and compares results.

Usage:
    python compare_houdini_to_exr.py --houdini-dir /path/to/houdini_export --vat-dir /path/to/vat_data
    python compare_houdini_to_exr.py --houdini-dir /path/to/houdini_export --vat-dir /path/to/vat_data --frame 5 --tol 1e-3
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

import numpy as np

try:
    from pygltflib import GLTF2
except ImportError:
    print("Error: pygltflib not installed. Install with: pip install pygltflib")
    sys.exit(1)

try:
    import OpenEXR
    import Imath
except ImportError:
    print("Error: OpenEXR not installed. Install with: pip install OpenEXR Imath")
    sys.exit(1)


class EXRExtractor:
    """Extract position deltas from EXR VAT texture."""
    
    def __init__(self, exr_path: str, json_path: str):
        self.exr_path = exr_path
        self.json_path = json_path
        self.metadata = self._load_metadata()
        self.frame_count = self.metadata.get("Frame Count", 0)
        self.vertex_count = self.metadata.get("Vertex Count", 0)
        self.bounds_min = np.array([
            self.metadata.get("Bound Min X", 0.0),
            self.metadata.get("Bound Min Y", 0.0),
            self.metadata.get("Bound Min Z", 0.0)
        ])
        self.bounds_max = np.array([
            self.metadata.get("Bound Max X", 0.0),
            self.metadata.get("Bound Max Y", 0.0),
            self.metadata.get("Bound Max Z", 0.0)
        ])
        self.use_hdr = self.metadata.get("Use HDR Textures", 1)

    def _load_metadata(self) -> Dict:
        try:
            with open(self.json_path, 'r') as f:
                data = json.load(f)
            if isinstance(data, list):
                return data[0]
            return data
        except Exception as e:
            raise RuntimeError(f"Failed to load metadata: {e}")

    def read_exr(self) -> np.ndarray:
        """Read EXR texture and return RGBA array."""
        exr = OpenEXR.InputFile(self.exr_path)
        header = exr.header()
        dw = header['dataWindow']
        width = dw.max.x - dw.min.x + 1
        height = dw.max.y - dw.min.y + 1
        pt = Imath.PixelType(Imath.PixelType.FLOAT)
        r = np.frombuffer(exr.channel('R', pt), dtype=np.float32).reshape(height, width)
        g = np.frombuffer(exr.channel('G', pt), dtype=np.float32).reshape(height, width)
        b = np.frombuffer(exr.channel('B', pt), dtype=np.float32).reshape(height, width)
        a = np.frombuffer(exr.channel('A', pt), dtype=np.float32).reshape(height, width)
        rgba = np.stack([r, g, b, a], axis=2)
        exr.close()
        return rgba

    def denormalize(self, norm: np.ndarray) -> np.ndarray:
        """Denormalize LDR positions using bounds from metadata."""
        rng = self.bounds_max - self.bounds_min
        return norm * rng + self.bounds_min

    def extract_positions(self, texture: np.ndarray) -> np.ndarray:
        """Extract positions from texture, applying denormalization if needed."""
        positions = texture[:, :, :3]
        if not self.use_hdr:
            positions = self.denormalize(positions)
        return positions


def find_vat_files(directory: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Find EXR position texture, JSON metadata, and GLB base mesh in VAT directory.
    
    Returns:
        (exr_path, json_path, glb_path) tuple, or (None, None, None) if not found
    """
    dir_path = Path(directory)
    if not dir_path.exists():
        return None, None, None
    
    exr_files = list(dir_path.glob("*_pos.exr")) + list(dir_path.glob("*position*.exr")) + list(dir_path.glob("*.exr"))
    json_files = list(dir_path.glob("*_data.json")) + list(dir_path.glob("*metadata*.json")) + list(dir_path.glob("*.json"))
    glb_files = list(dir_path.glob("*.glb"))
    
    exr_path = exr_files[0] if exr_files else None
    json_path = json_files[0] if json_files else None
    glb_path = glb_files[0] if glb_files else None
    
    return (str(exr_path) if exr_path else None, 
            str(json_path) if json_path else None,
            str(glb_path) if glb_path else None)


def find_houdini_files(directory: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Find Houdini .npy and metadata JSON in export directory.
    
    Returns:
        (npy_path, metadata_path) tuple
    """
    dir_path = Path(directory)
    if not dir_path.exists():
        return None, None
    
    npy_files = list(dir_path.glob("*.npy"))
    json_files = list(dir_path.glob("*_metadata.json"))
    
    npy_path = npy_files[0] if npy_files else None
    metadata_path = json_files[0] if json_files else None
    
    return (str(npy_path) if npy_path else None,
            str(metadata_path) if metadata_path else None)


def load_glb_positions(glb_path: str) -> np.ndarray:
    """
    Load base mesh vertex positions from GLB file.
    
    Returns:
        Vertex positions (N, 3)
    """
    gltf = GLTF2().load(glb_path)
    
    # Get the first mesh's primitive positions
    if not gltf.meshes or not gltf.meshes[0].primitives:
        raise RuntimeError("GLB file contains no mesh data")
    
    primitive = gltf.meshes[0].primitives[0]
    pos_accessor_idx = primitive.attributes.POSITION
    
    if pos_accessor_idx is None:
        raise RuntimeError("GLB mesh has no POSITION attribute")
    
    accessor = gltf.accessors[pos_accessor_idx]
    buffer_view = gltf.bufferViews[accessor.bufferView]
    buffer = gltf.buffers[buffer_view.buffer]
    
    # Get binary data
    data = gltf.get_data_from_buffer_uri(buffer.uri) if buffer.uri else gltf.binary_blob()
    
    # Extract positions
    offset = buffer_view.byteOffset or 0
    if accessor.byteOffset:
        offset += accessor.byteOffset
    
    positions = np.frombuffer(
        data[offset:offset + buffer_view.byteLength],
        dtype=np.float32,
        count=accessor.count * 3
    ).reshape(-1, 3)
    
    return positions


def load_npy_positions(npy_path: str) -> np.ndarray:
    """Load positions from .npy file. Returns shape (frames, vertices, 3)."""
    data = np.load(npy_path, allow_pickle=False)
    if data.ndim == 2 and data.shape[1] == 3:
        data = data[np.newaxis, ...]  # Add frame dimension
    if data.ndim != 3 or data.shape[2] != 3:
        raise RuntimeError(f"Invalid shape: {data.shape}")
    return data


def analyze_extra_vertices(base_pos: np.ndarray, vat_metadata: Dict, ref_count: int) -> Dict[str, Any]:
    """
    Analyze extra vertices in GLB beyond the reference count.
    Only checks if they match VAT metadata bounding box corners.
    
    Args:
        base_pos: GLB base mesh positions (M, 3)
        vat_metadata: VAT JSON metadata containing bounding box info
        ref_count: Number of vertices in reference dataset (Houdini/VAT)
    
    Returns:
        Analysis dict with findings about extra vertices
    """
    glb_count = base_pos.shape[0]
    extra_count = glb_count - ref_count
    
    if extra_count <= 0:
        return {'has_extra_vertices': False}
    
    extra_verts = base_pos[ref_count:]
    
    analysis = {
        'has_extra_vertices': True,
        'extra_vertices_count': int(extra_count),
        'extra_vertices_start_idx': int(ref_count),
        'glb_vertex_count': int(glb_count),
        'reference_vertex_count': int(ref_count)
    }
    
    # Extract bounding box corners from VAT metadata
    vat_bbox_min = np.array([
        vat_metadata.get('Bound Min X', 0.0),
        vat_metadata.get('Bound Min Y', 0.0),
        vat_metadata.get('Bound Min Z', 0.0)
    ])
    vat_bbox_max = np.array([
        vat_metadata.get('Bound Max X', 0.0),
        vat_metadata.get('Bound Max Y', 0.0),
        vat_metadata.get('Bound Max Z', 0.0)
    ])
    
    # Generate expected 8 bounding box corners from VAT metadata
    expected_bbox_corners = np.array([
        [vat_bbox_min[0], vat_bbox_min[1], vat_bbox_min[2]],
        [vat_bbox_max[0], vat_bbox_min[1], vat_bbox_min[2]],
        [vat_bbox_min[0], vat_bbox_max[1], vat_bbox_min[2]],
        [vat_bbox_max[0], vat_bbox_max[1], vat_bbox_min[2]],
        [vat_bbox_min[0], vat_bbox_min[1], vat_bbox_max[2]],
        [vat_bbox_max[0], vat_bbox_min[1], vat_bbox_max[2]],
        [vat_bbox_min[0], vat_bbox_max[1], vat_bbox_max[2]],
        [vat_bbox_max[0], vat_bbox_max[1], vat_bbox_max[2]],
    ])
    
    # Check each extra vertex against bbox corners
    bbox_matches = []
    for i, vert in enumerate(extra_verts):
        dists_to_corners = np.linalg.norm(expected_bbox_corners - vert, axis=1)
        min_dist = np.min(dists_to_corners)
        closest_corner = np.argmin(dists_to_corners)
        is_bbox = min_dist < 0.001  # 1mm tolerance
        
        bbox_matches.append({
            'glb_idx': int(ref_count + i),
            'position': vert.tolist(),
            'closest_corner_idx': int(closest_corner),
            'distance': float(min_dist),
            'is_bbox_corner': bool(is_bbox)
        })
    
    bbox_corner_count = sum(1 for m in bbox_matches if m['is_bbox_corner'])
    
    analysis['bbox_analysis'] = {
        'vat_bbox_min': vat_bbox_min.tolist(),
        'vat_bbox_max': vat_bbox_max.tolist(),
        'matches_found': bbox_corner_count,
        'extra_vertices': bbox_matches
    }
    
    # Determine if all extra vertices are bbox corners
    if bbox_corner_count == extra_count:
        analysis['pattern'] = 'bbox_corners'
        analysis['all_match_bbox'] = True
        if extra_count == 6:
            analysis['message'] = f"✓ All {extra_count} extra GLB vertices are bbox corners (vertices {ref_count}-{glb_count-1}). This is expected."
        else:
            analysis['message'] = f"✓ All {extra_count} extra GLB vertices are bbox corners (vertices {ref_count}-{glb_count-1})."
    else:
        analysis['pattern'] = 'unknown'
        analysis['all_match_bbox'] = False
        analysis['message'] = f"⚠ Only {bbox_corner_count}/{extra_count} extra vertices match bbox corners. Pattern unclear."
    
    return analysis


def validate_datasets(houdini_metadata: Dict, vat_metadata: Dict, 
                     houdini_shape: tuple, exr_shape: tuple, 
                     base_vertex_count: int, 
                     base_pos: np.ndarray = None) -> Dict[str, Any]:
    """
    Validate that Houdini and VAT datasets are compatible.
    If GLB has extra vertices, performs bbox analysis but allows comparison to continue.
    
    Returns:
        Dict with validation results, warnings, and optional extra vertex analysis
    """
    validation = {
        'status': 'success',
        'warnings': [],
        'errors': [],
        'can_compare': True
    }
    
    # Extract frame counts
    houdini_frame_count = houdini_metadata.get('total_frames', houdini_shape[0])
    vat_frame_count = vat_metadata.get('Frame Count', exr_shape[0])
    
    # Extract vertex counts
    houdini_vertex_count = houdini_metadata.get('vertex_count', houdini_shape[1])
    vat_vertex_count = vat_metadata.get('Vertex Count', exr_shape[1])
    
    # Validate frame counts
    if houdini_frame_count != vat_frame_count:
        validation['warnings'].append(
            f"Frame count mismatch: Houdini={houdini_frame_count}, VAT={vat_frame_count}"
        )
    
    # Check if Houdini and VAT match (critical for comparison)
    if houdini_vertex_count != vat_vertex_count:
        validation['errors'].append(
            f"Critical: Houdini and VAT vertex counts don't match: Houdini={houdini_vertex_count}, VAT={vat_vertex_count}"
        )
        validation['status'] = 'error'
        validation['can_compare'] = False
    
    # Check if GLB has extra vertices (common pattern with bbox corners)
    if base_vertex_count != houdini_vertex_count and validation['can_compare']:
        validation['warnings'].append(
            f"GLB vertex count differs: GLB={base_vertex_count}, Houdini/VAT={houdini_vertex_count}"
        )
        
        # Analyze extra GLB vertices if present
        if base_pos is not None and base_vertex_count > houdini_vertex_count:
            print('\nAnalyzing extra GLB vertices...', file=sys.stderr)
            analysis = analyze_extra_vertices(base_pos, vat_metadata, houdini_vertex_count)
            validation['extra_vertex_analysis'] = analysis
            
            if analysis.get('all_match_bbox'):
                print(f"  {analysis['message']}", file=sys.stderr)
                print(f"  → Comparison will proceed using first {houdini_vertex_count} vertices only", file=sys.stderr)
            else:
                print(f"  {analysis['message']}", file=sys.stderr)
                print(f"  → Comparison will proceed but results may be unreliable", file=sys.stderr)
    
    # Check frame range alignment
    houdini_start = houdini_metadata.get('frame_start', 1)
    if houdini_start != 1:
        validation['warnings'].append(
            f"Houdini frame_start={houdini_start} (expected 1)"
        )
    
    validation['frame_count'] = min(houdini_frame_count, vat_frame_count)
    validation['vertex_count'] = houdini_vertex_count
    
    return validation


def find_metadata(npy_path: str) -> Optional[str]:
    """Find companion metadata JSON for .npy file."""
    dirpath = os.path.dirname(npy_path) or '.'
    stem = os.path.basename(npy_path)
    
    if stem.endswith('.npy'):
        base = stem[:-4]
        # Handle naming: base.npy -> base_metadata.json or base.0001.npy -> base.0001_metadata.json
        frame_match = re.match(r'(.+)\.(\d{4})$', base)
        candidates = []
        if frame_match:
            prefix, frame_no = frame_match.groups()
            candidates = [f"{prefix}.{frame_no}_metadata.json", f"{prefix}_metadata.json"]
        else:
            candidates = [f"{base}_metadata.json"]
        
        for c in candidates:
            path = os.path.join(dirpath, c)
            if os.path.exists(path):
                return path
    
    return None


def get_frame_count(npy_data: np.ndarray, metadata_path: Optional[str]) -> int:
    """Get frame count from numpy array or metadata."""
    if metadata_path:
        try:
            with open(metadata_path) as f:
                m = json.load(f)
            if isinstance(m, dict):
                md = m.get('metadata', m)
                for key in ['total_frames', 'frame_count']:
                    if key in md:
                        return int(md[key])
        except Exception:
            pass
    return npy_data.shape[0]


def compare_positions(houdini_pos: np.ndarray, base_pos: np.ndarray, exr_delta: np.ndarray, tol: float) -> Dict[str, Any]:
    """
    Compare Houdini ground truth with GLB base + EXR delta reconstruction.
    Tests multiple operations to determine correct integration method.
    
    Args:
        houdini_pos: Ground truth positions from Houdini (N, 3)
        base_pos: Base mesh positions from GLB (N, 3)
        exr_delta: Position deltas from EXR (N, 3)
        tol: Distance tolerance in meters
    
    Returns:
        Comparison report dict with operation results and per-vertex errors
    """
    N = houdini_pos.shape[0]
    M_base = base_pos.shape[0]
    M_delta = exr_delta.shape[0]
    
    report = {
        'houdini_count': int(N),
        'glb_base_count': int(M_base),
        'exr_delta_count': int(M_delta),
        'vertex_count_match': (N == M_base == M_delta)
    }
    
    if not (N == M_base == M_delta):
        report['status'] = 'error'
        report['message'] = f'Vertex count mismatch: Houdini={N}, GLB={M_base}, EXR={M_delta}'
        return report
    
    # Test different integration operations
    operations = {
        'base + delta': base_pos + exr_delta,
        'base - delta': base_pos - exr_delta,
        'delta only': exr_delta,
        'base only': base_pos,
    }
    
    best_op = None
    best_error = float('inf')
    op_results = {}
    best_per_vertex_errors = None
    
    for op_name, reconstructed in operations.items():
        diffs = reconstructed - houdini_pos
        dists = np.linalg.norm(diffs, axis=1)
        
        rms = float(np.sqrt(np.mean(dists**2)))
        max_err = float(np.max(dists))
        mean_err = float(np.mean(dists))
        num_above_tol = int(np.sum(dists > tol))
        pct_above_tol = float(100.0 * num_above_tol / N)
        
        op_results[op_name] = {
            'mean_error': mean_err,
            'rms_error': rms,
            'max_error': max_err,
            'min_error': float(np.min(dists)),
            'num_above_tol': num_above_tol,
            'percent_above_tol': pct_above_tol
        }
        
        if rms < best_error:
            best_error = rms
            best_op = op_name
            best_per_vertex_errors = dists
    
    report['status'] = 'success'
    report['operations_tested'] = op_results
    report['best_operation'] = best_op
    report['best_rms_error'] = best_error
    report['per_vertex_errors'] = best_per_vertex_errors  # For CSV output
    
    # Determine match quality based on best operation
    best_result = op_results[best_op]
    if best_result['max_error'] < tol:
        report['match_quality'] = 'perfect'
    elif best_result['percent_above_tol'] < 1.0:
        report['match_quality'] = 'excellent'
    elif best_result['percent_above_tol'] < 5.0:
        report['match_quality'] = 'good'
    else:
        report['match_quality'] = 'poor'
    
    return report


def find_metadata(npy_path: str) -> Optional[str]:
    """Find companion metadata JSON for .npy file."""
    dirpath = os.path.dirname(npy_path) or '.'
    stem = os.path.basename(npy_path)
    
    if stem.endswith('.npy'):
        base = stem[:-4]
        # Handle naming: base.npy -> base_metadata.json or base.0001.npy -> base.0001_metadata.json
        frame_match = re.match(r'(.+)\.(\d{4})$', base)
        candidates = []
        if frame_match:
            prefix, frame_no = frame_match.groups()
            candidates = [f"{prefix}.{frame_no}_metadata.json", f"{prefix}_metadata.json"]
        else:
            candidates = [f"{base}_metadata.json"]
        
        for c in candidates:
            path = os.path.join(dirpath, c)
            if os.path.exists(path):
                return path
    
    return None


def get_frame_count(npy_data: np.ndarray, metadata_path: Optional[str]) -> int:
    """Get frame count from numpy array or metadata."""
    if metadata_path:
        try:
            with open(metadata_path) as f:
                m = json.load(f)
            if isinstance(m, dict):
                md = m.get('metadata', m)
                for key in ['total_frames', 'frame_count']:
                    if key in md:
                        return int(md[key])
        except Exception:
            pass
    return npy_data.shape[0]


def write_comparison_csv(output_dir: str, base_name: str, frame_num: int, 
                        houdini_pos: np.ndarray, base_pos: np.ndarray, 
                        exr_delta: np.ndarray, errors: np.ndarray):
    """
    Write per-frame comparison CSV with vertex-level detail.
    
    CSV columns: idx, houdini_x, houdini_y, houdini_z, base_x, base_y, base_z, 
                 delta_x, delta_y, delta_z, error_distance
    """
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    n = houdini_pos.shape[0]
    
    csv_path = Path(output_dir) / f"{base_name}_compare.{frame_num:04d}.csv"
    
    # Build CSV data
    idx = np.arange(n, dtype=np.int32)
    data = np.column_stack((
        idx,
        houdini_pos,
        base_pos,
        exr_delta,
        errors
    ))
    
    header = 'idx,houdini_x,houdini_y,houdini_z,base_x,base_y,base_z,delta_x,delta_y,delta_z,error'
    fmt = ['%04d'] + ['%.6f'] * 10
    
    np.savetxt(str(csv_path), data, delimiter=',', header=header, comments='', fmt=fmt)


def write_exr_debug_files(output_dir: str, base_name: str, positions: np.ndarray, frame_start: int = 1):
    """
    Write extracted EXR positions as debug files (JSON, .npy, per-frame CSV).
    """
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    
    # Write .npy
    npy_path = out / f"{base_name}_exr_extracted.npy"
    np.save(str(npy_path), positions)
    print(f'  Debug: Saved EXR positions to {npy_path}', file=sys.stderr)
    
    # Write per-frame CSVs
    for fi in range(positions.shape[0]):
        frame_num = frame_start + fi
        frame_pos = positions[fi]
        n = frame_pos.shape[0]
        
        csv_path = out / f"{base_name}_exr_extracted.{frame_num:04d}.csv"
        idx = np.arange(n, dtype=np.int32)
        rows = np.column_stack((idx, frame_pos))
        header = 'idx,x,y,z'
        fmt = ('%04d', '%.6f', '%.6f', '%.6f')
        np.savetxt(str(csv_path), rows, delimiter=',', header=header, comments='', fmt=fmt)
    
    print(f'  Debug: Saved {positions.shape[0]} EXR CSV files', file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(
        description='Compare Houdini ground truth vs GLB base + EXR deltas (outputs JSON + per-frame CSV)'
    )
    parser.add_argument('--houdini-dir', required=True, help='Directory containing Houdini .npy and metadata')
    parser.add_argument('--vat-dir', required=True, help='Directory containing EXR, JSON, and GLB files')
    parser.add_argument('--output-dir', default='/tmp/compare_houdini_exr_results', 
                       help='Output directory for results (default: /tmp/compare_houdini_exr_results)')
    parser.add_argument('--frame', type=int, help='Compare single frame (1-based); default: all frames')
    parser.add_argument('--tol', type=float, default=1e-4, help='Tolerance in meters (default: 1e-4)')
    parser.add_argument('--write-exr-debug', action='store_true', help='Write extracted EXR data to debug files')
    parser.add_argument('--prefix', default='comparison', help='Filename prefix for outputs (default: comparison)')
    
    args = parser.parse_args()
    
    # Find Houdini files
    print('Finding Houdini export files...', file=sys.stderr)
    houdini_npy, houdini_metadata_path = find_houdini_files(args.houdini_dir)
    
    if not houdini_npy:
        print(f"Error: Could not find .npy file in {args.houdini_dir}", file=sys.stderr)
        sys.exit(1)
    
    print(f'  NPY: {houdini_npy}', file=sys.stderr)
    if houdini_metadata_path:
        print(f'  Metadata: {houdini_metadata_path}', file=sys.stderr)
    
    # Find VAT files
    print('Finding VAT files...', file=sys.stderr)
    exr_path, json_path, glb_path = find_vat_files(args.vat_dir)
    
    if not exr_path or not json_path or not glb_path:
        print(f"Error: Missing required files in {args.vat_dir}", file=sys.stderr)
        print(f"  Found EXR: {exr_path or 'None'}", file=sys.stderr)
        print(f"  Found JSON: {json_path or 'None'}", file=sys.stderr)
        print(f"  Found GLB: {glb_path or 'None'}", file=sys.stderr)
        sys.exit(1)
    
    print(f'  EXR: {exr_path}', file=sys.stderr)
    print(f'  JSON: {json_path}', file=sys.stderr)
    print(f'  GLB: {glb_path}', file=sys.stderr)
    
    # Load Houdini metadata
    houdini_metadata = {}
    if houdini_metadata_path:
        with open(houdini_metadata_path, 'r') as f:
            data = json.load(f)
            houdini_metadata = data.get('metadata', data)
    
    # Extract EXR positions
    print('\nExtracting EXR positions...', file=sys.stderr)
    extractor = EXRExtractor(exr_path, json_path)
    tex = extractor.read_exr()
    exr_positions = extractor.extract_positions(tex)
    print(f'  Extracted shape: {exr_positions.shape}', file=sys.stderr)
    
    # Load GLB base mesh
    print('Loading GLB base mesh...', file=sys.stderr)
    base_pos = load_glb_positions(glb_path)
    print(f'  Base mesh vertices: {base_pos.shape[0]}', file=sys.stderr)
    
    # Load Houdini ground truth
    print('Loading Houdini ground truth...', file=sys.stderr)
    houdini_all = load_npy_positions(houdini_npy)
    print(f'  Shape: {houdini_all.shape}', file=sys.stderr)
    
    # Validate datasets
    print('\nValidating datasets...', file=sys.stderr)
    validation = validate_datasets(
        houdini_metadata,
        extractor.metadata,
        houdini_all.shape,
        exr_positions.shape,
        base_pos.shape[0],
        base_pos=base_pos
    )
    
    if not validation['can_compare']:
        print('ERROR: Cannot proceed with comparison:', file=sys.stderr)
        for err in validation['errors']:
            print(f'  - {err}', file=sys.stderr)
        
        # Write error report
        error_report = {
            'status': 'validation_error',
            'validation': validation,
            'houdini_dir': args.houdini_dir,
            'vat_dir': args.vat_dir
        }
        summary_path = Path(args.output_dir) / f"{args.prefix}_validation_error.json"
        Path(args.output_dir).mkdir(parents=True, exist_ok=True)
        with open(summary_path, 'w') as f:
            json.dump(error_report, f, indent=2)
        print(f'\nError report saved to: {summary_path}', file=sys.stderr)
        sys.exit(1)
    
    if validation['warnings']:
        print('Validation warnings:', file=sys.stderr)
        for warn in validation['warnings']:
            print(f'  - {warn}', file=sys.stderr)
    
    print(f"  Frame count: {validation['frame_count']}", file=sys.stderr)
    print(f"  Vertex count (for comparison): {validation['vertex_count']}", file=sys.stderr)
    
    # Use only the reference vertex count for comparison (excludes extra GLB vertices)
    ref_vertex_count = validation['vertex_count']
    base_pos_for_comparison = base_pos[:ref_vertex_count]
    
    # Optionally write debug files
    if args.write_exr_debug:
        print('\nWriting EXR debug files...', file=sys.stderr)
        write_exr_debug_files(args.output_dir, args.prefix, exr_positions)
    
    # Determine frames to compare
    frame_count = validation['frame_count']
    if args.frame is not None:
        if args.frame < 1 or args.frame > frame_count:
            print(f'Frame {args.frame} out of range (1-{frame_count})', file=sys.stderr)
            sys.exit(1)
        frame_indices = [args.frame - 1]
    else:
        frame_indices = list(range(frame_count))
    
    # Build report
    report = {
        'houdini_dir': args.houdini_dir,
        'houdini_npy': houdini_npy,
        'vat_dir': args.vat_dir,
        'exr_file': exr_path,
        'json_file': json_path,
        'glb_file': glb_path,
        'tolerance': args.tol,
        'validation': {
            'frame_count': validation['frame_count'],
            'vertex_count': validation['vertex_count'],
            'warnings': validation['warnings']
        },
        'frames_analyzed': []
    }
    
    # Compare each frame
    print('\nComparing frames...', file=sys.stderr)
    for fi in frame_indices:
        frame_num = fi + 1
        print(f'\nFrame {frame_num}:', file=sys.stderr)
        
        if fi >= houdini_all.shape[0]:
            print(f'  Houdini data missing frame {frame_num}', file=sys.stderr)
            continue
        
        if fi >= exr_positions.shape[0]:
            print(f'  EXR data missing frame {frame_num}', file=sys.stderr)
            continue
        
        result = compare_positions(houdini_all[fi], base_pos_for_comparison, exr_positions[fi], args.tol)
        result['frame'] = frame_num
        
        # Print summary
        if result['status'] == 'error':
            print(f"  ERROR: {result['message']}", file=sys.stderr)
        else:
            print(f"  Best operation: {result['best_operation']}", file=sys.stderr)
            print(f"  Match quality: {result['match_quality']}", file=sys.stderr)
            best_op = result['operations_tested'][result['best_operation']]
            print(f"  RMS error: {best_op['rms_error']:.6g}m, Max: {best_op['max_error']:.6g}m", file=sys.stderr)
            print(f"  Above tolerance: {best_op['num_above_tol']} ({best_op['percent_above_tol']:.2f}%)", file=sys.stderr)
            
            # Write per-frame comparison CSV
            write_comparison_csv(
                args.output_dir,
                args.prefix,
                frame_num,
                houdini_all[fi],
                base_pos_for_comparison,
                exr_positions[fi],
                result['per_vertex_errors']
            )
        
        # Remove per_vertex_errors from JSON output (too large)
        if 'per_vertex_errors' in result:
            del result['per_vertex_errors']
        
        report['frames_analyzed'].append(result)
    
    # Write JSON summary
    summary_path = Path(args.output_dir) / f"{args.prefix}_summary.json"
    Path(args.output_dir).mkdir(parents=True, exist_ok=True)
    with open(summary_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f'\n{"="*60}', file=sys.stderr)
    print(f'Comparison complete!', file=sys.stderr)
    print(f'  Summary JSON: {summary_path}', file=sys.stderr)
    print(f'  Per-frame CSVs: {args.output_dir}/{args.prefix}_compare.NNNN.csv', file=sys.stderr)
    if args.write_exr_debug:
        print(f'  EXR debug files: {args.output_dir}/{args.prefix}_exr_extracted.*', file=sys.stderr)


if __name__ == '__main__':
    main()
