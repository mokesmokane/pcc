#!/usr/bin/env python3

import os
import sys
import subprocess
import math
from pathlib import Path

def get_audio_duration(file_path):
    """Get the duration of the audio file in seconds."""
    cmd = [
        'ffprobe',
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        file_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return float(result.stdout.strip())

def split_audio(input_file, chunk_duration_seconds=600, overlap_seconds=3):
    """
    Split an audio file into chunks.

    Args:
        input_file: Path to the input audio file
        chunk_duration_seconds: Duration of each chunk in seconds (default: 600 = 10 minutes)
        overlap_seconds: Overlap between chunks in seconds (default: 3 seconds)
    """
    input_path = Path(input_file)
    if not input_path.exists():
        print(f"Error: File {input_file} does not exist")
        return []

    # Create output directory
    output_dir = input_path.parent / f"{input_path.stem}_chunks"
    output_dir.mkdir(exist_ok=True)

    # Get total duration
    total_duration = get_audio_duration(input_file)
    print(f"Total duration: {total_duration:.2f} seconds ({total_duration/60:.2f} minutes)")

    # Calculate number of chunks
    num_chunks = math.ceil(total_duration / chunk_duration_seconds)
    print(f"Will create approximately {num_chunks} chunks of {chunk_duration_seconds/60:.1f} minutes each")

    chunks = []

    for i in range(num_chunks):
        # Calculate start time
        if i == 0:
            start_time = 0
        else:
            # Start slightly before the end of the previous chunk for overlap
            start_time = i * chunk_duration_seconds - overlap_seconds

        # Calculate duration (including overlap for all but the last chunk)
        if i < num_chunks - 1:
            duration = chunk_duration_seconds + overlap_seconds
        else:
            # Last chunk: from start to end of file
            duration = total_duration - start_time

        # Skip if duration is too small
        if duration < 1:
            continue

        # Output filename
        output_file = output_dir / f"chunk_{i+1:03d}.mp3"

        print(f"Creating chunk {i+1}/{num_chunks}: {start_time:.1f}s to {start_time+duration:.1f}s")

        # FFmpeg command
        cmd = [
            'ffmpeg',
            '-i', str(input_file),
            '-ss', str(start_time),  # Seek to start time
            '-t', str(duration),     # Duration
            '-c:a', 'libmp3lame',     # Use MP3 codec
            '-b:a', '192k',           # Bitrate
            '-ar', '44100',           # Sample rate
            '-y',                     # Overwrite output files
            str(output_file)
        ]

        # Run FFmpeg
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error creating chunk {i+1}: {result.stderr}")
        else:
            chunk_info = {
                'file': str(output_file),
                'index': i,
                'start_offset_seconds': i * chunk_duration_seconds if i > 0 else 0,
                'duration_seconds': duration,
                'actual_start_time': start_time
            }
            chunks.append(chunk_info)
            print(f"  ✓ Saved to {output_file.name}")

    print(f"\n✓ Split complete! Created {len(chunks)} chunks in {output_dir}")

    # Save chunk metadata
    metadata_file = output_dir / "chunks_metadata.txt"
    with open(metadata_file, 'w') as f:
        f.write("Chunk Metadata\n")
        f.write("=" * 50 + "\n")
        f.write(f"Original file: {input_file}\n")
        f.write(f"Total duration: {total_duration:.2f} seconds\n")
        f.write(f"Chunk duration: {chunk_duration_seconds} seconds\n")
        f.write(f"Overlap: {overlap_seconds} seconds\n")
        f.write(f"Number of chunks: {len(chunks)}\n\n")

        for chunk in chunks:
            f.write(f"Chunk {chunk['index']+1:03d}:\n")
            f.write(f"  File: {Path(chunk['file']).name}\n")
            f.write(f"  Start time: {chunk['actual_start_time']:.2f}s\n")
            f.write(f"  Duration: {chunk['duration_seconds']:.2f}s\n")
            f.write(f"  Offset for reconstruction: {chunk['start_offset_seconds']:.2f}s\n\n")

    print(f"Metadata saved to {metadata_file}")

    return chunks

if __name__ == "__main__":
    # Your podcast file
    podcast_file = "/Users/mokes/projects/pcc_new/scripts/podcasts/default.mp3_ywr3ahjkcgo_1e21bb7e44ca33faac964752e07ab898_49864301.mp3"

    # Split into 10-minute chunks with 3-second overlap
    chunks = split_audio(
        podcast_file,
        chunk_duration_seconds=600,  # 10 minutes
        overlap_seconds=3
    )

    if chunks:
        print(f"\nSuccessfully created {len(chunks)} chunks")
        print("Next steps:")
        print("1. Send each chunk to Whisper API for transcription")
        print("2. Merge the transcripts (removing overlap duplicates)")
        print("3. Send to ChatGPT for chapter generation")