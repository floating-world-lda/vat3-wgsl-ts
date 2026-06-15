#!/usr/bin/env python3
"""
Houdini exporter wrapper that writes JSON, binary (.npy) and per-frame CSVs.

This file is intended to be run inside Houdini's Python environment.
Usage: import and call `export_selected_node(output_dir, frame_start, frame_end, save_format, csv_dir)`
or construct `HoudiniVertexExporter` and call `save_compact_binary(..., write_csv=True)`.
"""

import hou
import json
import os
import numpy as np
from pathlib import Path


class HoudiniVertexExporter:
    def __init__(self, geo_node, output_dir, frame_start=1, frame_end=100):
        self.geo_node = geo_node
        self.output_dir = Path(output_dir)
        self.frame_start = frame_start
        self.frame_end = frame_end
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.vertex_count = 0
        self.bounds_min = None
        self.bounds_max = None

    def get_vertex_positions(self, geo):
        positions = []
        for point in geo.points():
            pos = point.position()
            positions.append([pos[0], pos[1], pos[2]])
        return np.array(positions, dtype=np.float32)

    def export_frame(self, frame_num):
        hou.setFrame(frame_num)
        try:
            node_cat = self.geo_node.type().category().name()
        except Exception:
            node_cat = None
        try:
            if node_cat == 'Sop':
                geo = self.geo_node.geometry()
            else:
                display = None
                try:
                    display = self.geo_node.displayNode()
                except Exception:
                    display = None
                if display is None:
                    children = [n for n in self.geo_node.children() if n.type().category().name() == 'Sop']
                    display = children[0] if children else None
                if display is None:
                    raise RuntimeError(f'No SOP/display node found under {self.geo_node.path()}')
                geo = display.geometry()
        except Exception as e:
            raise RuntimeError(f'Failed to obtain geometry: {e}')

        positions = self.get_vertex_positions(geo)
        if self.vertex_count == 0:
            self.vertex_count = len(positions)
        elif self.vertex_count != len(positions):
            print(f'Warning: vertex count changed at frame {frame_num}')

        bounds_min = np.min(positions, axis=0).tolist()
        bounds_max = np.max(positions, axis=0).tolist()

        if self.bounds_min is None:
            self.bounds_min = bounds_min
            self.bounds_max = bounds_max
        else:
            self.bounds_min = [min(a, b) for a, b in zip(self.bounds_min, bounds_min)]
            self.bounds_max = [max(a, b) for a, b in zip(self.bounds_max, bounds_max)]

        return {
            'frame': frame_num,
            'vertex_count': len(positions),
            'positions': positions.tolist(),
            'bounds_min': bounds_min,
            'bounds_max': bounds_max
        }

    def export_all_frames(self, verbose=True):
        frames = []
        for f in range(self.frame_start, self.frame_end + 1):
            if verbose:
                print(f'Exporting frame {f}')
            frames.append(self.export_frame(f))
        metadata = {
            'node_path': self.geo_node.path(),
            'frame_start': self.frame_start,
            'frame_end': self.frame_end,
            'total_frames': len(frames),
            'vertex_count': self.vertex_count,
            'bounds_min': self.bounds_min,
            'bounds_max': self.bounds_max,
        }
        return {'metadata': metadata, 'frames': frames}

    def save_json(self, data, filename='vertex_export.json'):
        """
        Save full data to JSON file.
        
        Args:
            data: Data dict with metadata and frames
            filename: Output filename
        """
        out = self.output_dir / filename
        with open(out, 'w') as f:
            json.dump(data, f, indent=2)
        print(f'Saved JSON to: {out}')
        return out

    def save_compact_binary(self, data, filename_prefix='vertex_export', csv_dir=None, single_frame=False):
        """
        Save positions as binary (.npy) and CSV formats.
        Always exports both formats now.
        
        Args:
            data: Export data dict with metadata and frames
            filename_prefix: Base filename (e.g., 'sphere')
            csv_dir: Optional CSV directory (default: output_dir)
            single_frame: If True, include frame number in filenames
        """
        # Determine frame info for naming
        frame_count = len(data['frames'])
        is_single = single_frame or frame_count == 1
        
        # Save metadata
        if is_single:
            frame_num = data['frames'][0]['frame']
            metadata_path = self.output_dir / f"{filename_prefix}.{frame_num:04d}_metadata.json"
        else:
            metadata_path = self.output_dir / f"{filename_prefix}_metadata.json"
        
        with open(metadata_path, 'w') as f:
            json.dump(data['metadata'], f, indent=2)
        print(f'Saved metadata to: {metadata_path}')
        
        # Save positions as numpy
        positions_array = np.array([frame['positions'] for frame in data['frames']], dtype=np.float32)
        
        if is_single:
            frame_num = data['frames'][0]['frame']
            positions_path = self.output_dir / f"{filename_prefix}.{frame_num:04d}.npy"
        else:
            positions_path = self.output_dir / f"{filename_prefix}.npy"
        
        np.save(positions_path, positions_array)
        print(f'Saved positions to: {positions_path}')
        
        # Always write CSVs now
        csv_out = Path(csv_dir) if csv_dir else self.output_dir
        csv_out.mkdir(parents=True, exist_ok=True)
        
        for fi in range(frame_count):
            p = positions_array[fi]
            n = p.shape[0]
            frame_num = data['frames'][fi]['frame']
            
            # CSV format: idx,x,y,z (one row per vertex)
            csv_path = csv_out / f"{filename_prefix}.{frame_num:04d}.csv"
            header = 'idx,x,y,z'
            idx = np.arange(n, dtype=np.int32)
            rows = np.column_stack((idx, p))
            fmt = ('%04d', '%.6f', '%.6f', '%.6f')
            np.savetxt(str(csv_path), rows, delimiter=',', header=header, comments='', fmt=fmt)
        
        print(f'Wrote {frame_count} CSV file(s) to: {csv_out}')


def export_selected_node(output_dir, frame_start=1, frame_end=100, save_format='both', csv_dir=None, frame=None, filename_prefix='vertex_export'):
    """
    Export the currently selected geometry node.
    
    Args:
        output_dir: Directory to write output files
        frame_start: First frame to export (ignored if frame is specified)
        frame_end: Last frame to export (ignored if frame is specified)
        save_format: "json", "binary", or "both"
        csv_dir: Directory for CSV files (default: same as output_dir)
        frame: Optional single frame number to export (overrides range)
        filename_prefix: Base filename (default: 'vertex_export')
    """
    selected_nodes = hou.selectedNodes()
    if not selected_nodes:
        print('No node selected')
        return
    geo_node = selected_nodes[0]
    
    # If single frame specified, adjust range
    single_frame_mode = frame is not None
    if single_frame_mode:
        frame_start = frame
        frame_end = frame
    
    exporter = HoudiniVertexExporter(geo_node, output_dir, frame_start, frame_end)
    data = exporter.export_all_frames(verbose=True)
    
    if save_format in ('json', 'both'):
        exporter.save_json(data, filename=f"{filename_prefix}.json" if not single_frame_mode else f"{filename_prefix}.{frame:04d}.json")
    
    if save_format in ('binary', 'both'):
        exporter.save_compact_binary(data, filename_prefix=filename_prefix, csv_dir=csv_dir, single_frame=single_frame_mode)
