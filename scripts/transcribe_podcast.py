#!/usr/bin/env python3

import os
import json
import time
from pathlib import Path
from typing import List, Dict, Any
import openai
from openai import OpenAI
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class PodcastTranscriber:
    def __init__(self):
        # Initialize OpenAI
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        # Initialize Supabase
        self.supabase: Client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )

    def transcribe_chunk(self, audio_file_path: str, chunk_index: int) -> Dict[str, Any]:
        """
        Transcribe a single audio chunk using Whisper API.

        Returns:
            Dict containing transcript text and segments with timestamps
        """
        print(f"Transcribing chunk {chunk_index + 1}: {Path(audio_file_path).name}")

        try:
            with open(audio_file_path, "rb") as audio_file:
                # Use verbose_json to get timestamps
                response = self.openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="verbose_json",
                    language="en"  # Change if needed
                )

            # Extract segments with timestamps
            segments = []
            if hasattr(response, 'segments'):
                for seg in response.segments:
                    segments.append({
                        "start": seg.start,
                        "end": seg.end,
                        "text": seg.text.strip()
                    })

            return {
                "text": response.text,
                "segments": segments,
                "language": getattr(response, 'language', 'en'),
                "duration": getattr(response, 'duration', None)
            }

        except Exception as e:
            print(f"Error transcribing chunk {chunk_index}: {str(e)}")
            raise

    def merge_transcripts(self, chunks_data: List[Dict], overlap_seconds: float = 3.0) -> Dict[str, Any]:
        """
        Merge transcripts from multiple chunks, removing overlaps.

        Args:
            chunks_data: List of dictionaries containing chunk transcripts and metadata
            overlap_seconds: Overlap duration to remove from chunk boundaries

        Returns:
            Merged transcript with adjusted timestamps
        """
        print("\nMerging transcripts and removing overlaps...")

        merged_segments = []
        merged_text = []

        for i, chunk_data in enumerate(chunks_data):
            chunk_offset = chunk_data['start_offset_seconds']
            segments = chunk_data['transcript']['segments']

            for seg in segments:
                # Adjust segment timestamps based on chunk offset
                adjusted_start = seg['start'] + chunk_offset
                adjusted_end = seg['end'] + chunk_offset

                # For chunks after the first, skip segments that fall in the overlap region
                if i > 0:
                    # Skip segments that start before the overlap boundary
                    if seg['start'] < overlap_seconds:
                        continue

                merged_segments.append({
                    "start": adjusted_start,
                    "end": adjusted_end,
                    "text": seg['text']
                })

        # Sort segments by start time
        merged_segments.sort(key=lambda x: x['start'])

        # Build merged text
        merged_text = " ".join([seg['text'] for seg in merged_segments])

        return {
            "text": merged_text,
            "segments": merged_segments
        }

    def save_to_supabase(self, episode_id: str, transcript_data: Dict) -> List[Dict]:
        """
        Save transcript segments to Supabase database.

        Returns:
            The created segment records
        """
        print("\nSaving transcript segments to Supabase...")

        # Prepare segment records for batch insert
        segment_records = []
        for seg in transcript_data['segments']:
            segment_records.append({
                'episode_id': episode_id,
                'start_seconds': seg['start'],
                'end_seconds': seg['end'],
                'text': seg['text']
            })

        # Batch insert segments
        if segment_records:
            result = self.supabase.table('transcript_segments').insert(segment_records).execute()
            print(f"✓ Saved {len(segment_records)} segments to Supabase")
            return result.data

        return []

    def generate_chapters(self, transcript_data: Dict) -> List[Dict]:
        """
        Use GPT to generate chapters from the transcript.

        Returns:
            List of chapters with titles and timestamps
        """
        print("\nGenerating chapters with GPT...")

        # Prepare segments for GPT
        segments_text = self._prepare_segments_for_gpt(transcript_data['segments'])

        prompt = self._build_chapters_prompt(segments_text)

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0.2,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at analyzing podcast transcripts and creating clear, helpful chapters."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            result = json.loads(content)
            return result.get('chapters', [])

        except Exception as e:
            print(f"Error generating chapters: {str(e)}")
            return []

    def _prepare_segments_for_gpt(self, segments: List[Dict], max_chars: int = 50000) -> str:
        """
        Prepare segments text for GPT, with timestamps and length limit.
        Uses smart sampling to cover the entire podcast if it exceeds max_chars.
        """
        # First, try to fit everything
        full_text = []
        total_length = 0
        for seg in segments:
            line = f"[{seg['start']:.1f}-{seg['end']:.1f}] {seg['text']}\n"
            total_length += len(line)
            full_text.append(line)

        # If it fits, return everything
        if total_length <= max_chars:
            return "".join(full_text)

        # Otherwise, sample evenly across the entire podcast
        print(f"  Transcript too long ({total_length} chars), sampling evenly...")

        # Calculate how many segments we can include
        avg_line_length = total_length / len(segments)
        segments_to_include = int(max_chars / avg_line_length)

        # Sample evenly throughout the podcast
        step = len(segments) / segments_to_include
        sampled_indices = [int(i * step) for i in range(segments_to_include)]

        result = []
        result.append(f"[NOTE: Sampled {segments_to_include} of {len(segments)} segments evenly across the podcast]\n\n")

        for idx in sampled_indices:
            if idx < len(segments):
                seg = segments[idx]
                line = f"[{seg['start']:.1f}-{seg['end']:.1f}] {seg['text']}\n"
                result.append(line)

        return "".join(result)

    def _build_chapters_prompt(self, segments_text: str) -> str:
        """
        Build the prompt for chapter generation.
        """
        # Extract the last timestamp to know the full duration
        import re
        timestamps = re.findall(r'\[(\d+\.\d+)-\d+\.\d+\]', segments_text)
        last_timestamp = float(timestamps[-1]) if timestamps else 3000
        duration_minutes = int(last_timestamp / 60)

        return f"""
Analyze this podcast transcript and create meaningful chapters that cover the ENTIRE {duration_minutes}-minute episode.

Return a JSON object with this exact structure:
{{
  "chapters": [
    {{
      "title": "Introduction and Welcome",
      "start_seconds": 0,
      "end_seconds": 180,
      "summary": "Brief introduction to the podcast and today's topics"
    }},
    // more chapters...
  ]
}}

IMPORTANT Guidelines:
- Create 8-15 chapters that span the FULL {duration_minutes} minutes of content
- Each chapter should be AT LEAST 5 minutes (300 seconds) long
- The first chapter should start at 0 seconds
- The last chapter should extend to approximately {int(last_timestamp)} seconds
- Chapter titles should be clear and descriptive
- Timestamps should not overlap
- Include a brief summary for each chapter
- Base boundaries on natural topic transitions
- Even if you only see samples from the transcript, infer reasonable chapter breaks for the entire duration

Transcript with timestamps (may be sampled if long):
{segments_text}
"""

    def save_chapters_locally(self, chapters: List[Dict], output_path: Path) -> None:
        """
        Save chapters to a local file since we don't have a chapters table.
        """
        if not chapters:
            print("No chapters to save")
            return

        chapters_file = output_path / "chapters.json"
        with open(chapters_file, 'w') as f:
            json.dump(chapters, f, indent=2)

        print(f"✓ Saved {len(chapters)} chapters to {chapters_file.name}")

    def process_podcast(self, episode_id: str, chunks_dir: str, overlap_seconds: float = 3.0):
        """
        Main method to process a podcast: transcribe chunks, merge, generate chapters, and save.

        Args:
            episode_id: UUID of the episode in the database
            chunks_dir: Directory containing the audio chunks
            overlap_seconds: Overlap between chunks in seconds
        """
        chunks_path = Path(chunks_dir)

        # Find all chunk files
        chunk_files = sorted(chunks_path.glob("chunk_*.mp3"))
        if not chunk_files:
            raise ValueError(f"No chunk files found in {chunks_dir}")

        print(f"Found {len(chunk_files)} chunks to process")

        # Read metadata if available
        metadata_file = chunks_path / "chunks_metadata.txt"
        chunk_duration = 600  # Default 10 minutes

        # Transcribe each chunk
        chunks_data = []
        for i, chunk_file in enumerate(chunk_files):
            print(f"\n--- Processing chunk {i+1}/{len(chunk_files)} ---")

            # Calculate start offset (considering overlap)
            start_offset = i * chunk_duration if i == 0 else i * chunk_duration - overlap_seconds

            # Transcribe
            transcript = self.transcribe_chunk(str(chunk_file), i)

            chunks_data.append({
                'file': str(chunk_file),
                'index': i,
                'start_offset_seconds': start_offset,
                'transcript': transcript
            })

            # Small delay to avoid rate limits
            if i < len(chunk_files) - 1:
                time.sleep(1)

        # Merge transcripts
        merged_transcript = self.merge_transcripts(chunks_data, overlap_seconds)

        # FIRST: Save everything locally before any database operations
        print("\n📁 Saving transcript data locally...")

        # Save merged transcript locally
        output_file = chunks_path / "transcript_full.json"
        with open(output_file, 'w') as f:
            json.dump({
                'episode_id': episode_id,
                'transcript': merged_transcript,
                'chunks_processed': len(chunks_data),
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
            }, f, indent=2)
        print(f"✓ Saved full transcript to: {output_file}")

        # Generate chapters
        chapters = self.generate_chapters(merged_transcript)
        if chapters:
            self.save_chapters_locally(chapters, chunks_path)

        # Save individual chunk transcripts for reference
        chunks_file = chunks_path / "chunk_transcripts.json"
        with open(chunks_file, 'w') as f:
            json.dump({
                'episode_id': episode_id,
                'chunks': chunks_data,
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
            }, f, indent=2)
        print(f"✓ Saved chunk transcripts to: {chunks_file}")

        # NOW: Try to save to Supabase
        segment_records = []
        try:
            print("\n💾 Attempting to save to Supabase...")
            segment_records = self.save_to_supabase(episode_id, merged_transcript)
            print(f"✓ Successfully saved {len(segment_records)} segments to Supabase")
        except Exception as e:
            print(f"⚠️  Failed to save to Supabase: {str(e)}")
            print("✓ But don't worry - all data is safely saved locally!")

        # Update the local file with database status
        with open(output_file, 'r') as f:
            data = json.load(f)
        data['chapters'] = chapters
        data['segments_saved_to_db'] = len(segment_records)
        data['db_save_successful'] = len(segment_records) > 0
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2)

        print(f"\n✓ Complete! Transcript and chapters saved.")
        print(f"  - Episode ID: {episode_id}")
        print(f"  - Local transcript segments: {len(merged_transcript['segments'])}")
        print(f"  - Segments in database: {len(segment_records)}")
        print(f"  - Chapters created: {len(chapters)}")
        print(f"  - Local files: {output_file.name}, {chunks_file.name}")

        return {
            'episode_id': episode_id,
            'segments_count': len(segment_records),
            'chapters_count': len(chapters)
        }

def main():
    # Check for required environment variables
    required_env = ["OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    missing = [var for var in required_env if not os.getenv(var)]

    if missing:
        print(f"Error: Missing environment variables: {', '.join(missing)}")
        print("Please create a .env file with these variables or set them in your environment")
        return

    # Initialize transcriber
    transcriber = PodcastTranscriber()

    # Process the podcast
    # Generate a UUID for this episode
    import uuid
    episode_id = str(uuid.uuid4())
    print(f"Using episode ID: {episode_id}")

    chunks_dir = "/Users/mokes/projects/pcc_new/scripts/podcasts/default.mp3_ywr3ahjkcgo_1e21bb7e44ca33faac964752e07ab898_49864301_chunks"

    try:
        result = transcriber.process_podcast(
            episode_id=episode_id,
            chunks_dir=chunks_dir,
            overlap_seconds=3.0
        )
        print(f"\n🎉 Success! Processed podcast with episode ID: {episode_id}")

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        raise

if __name__ == "__main__":
    main()