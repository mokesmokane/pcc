#!/usr/bin/env python3

import os
import json
import argparse
from pathlib import Path
from typing import List, Dict
import openai
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class ChapterGenerator:
    def __init__(self):
        # Initialize OpenAI
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def load_transcript(self, transcript_file: str) -> Dict:
        """Load transcript from JSON file."""
        with open(transcript_file, 'r') as f:
            data = json.load(f)

        # Handle different JSON structures
        if 'transcript' in data:
            return data['transcript']
        elif 'segments' in data:
            return {'segments': data['segments'], 'text': data.get('text', '')}
        else:
            return data

    def prepare_segments_for_gpt(self, segments: List[Dict], max_chars: int = 50000, sample_rate: float = 1.0) -> str:
        """
        Prepare segments text for GPT, with timestamps and length limit.

        Args:
            segments: List of transcript segments
            max_chars: Maximum characters to send to GPT
            sample_rate: Fraction of segments to include (1.0 = all, 0.5 = every other)
        """
        # Apply sampling if needed
        if sample_rate < 1.0:
            step = int(1 / sample_rate)
            segments = segments[::step]
            print(f"  Sampling every {step} segments (using {len(segments)} segments)")

        # First, try to fit everything
        full_text = []
        total_length = 0
        for seg in segments:
            line = f"[{seg['start']:.1f}-{seg['end']:.1f}] {seg['text']}\n"
            total_length += len(line)
            full_text.append(line)

        # If it fits, return everything
        if total_length <= max_chars:
            print(f"  Using full transcript ({total_length:,} chars, {len(segments)} segments)")
            return "".join(full_text)

        # Otherwise, sample evenly across the entire podcast
        print(f"  Transcript too long ({total_length:,} chars), sampling evenly...")

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

        print(f"  Sampled {len(sampled_indices)} segments for chapter analysis")
        return "".join(result)

    def build_chapters_prompt(self, segments_text: str, actual_duration_seconds: float, min_chapter_minutes: int = 5, max_chapters: int = 15) -> str:
        """
        Build the prompt for chapter generation.

        Args:
            segments_text: Prepared transcript text with timestamps
            min_chapter_minutes: Minimum minutes per chapter
            max_chapters: Maximum number of chapters to create
        """
        # Extract the last timestamp to know the full duration
        import re
        timestamps = re.findall(r'\[(\d+\.\d+)-\d+\.\d+\]', segments_text)

        if not timestamps:
            # Fallback if no timestamps found
            duration_seconds = 3000
            duration_minutes = 50
        else:
            # Get the last timestamp
            all_timestamps = re.findall(r'\[\d+\.\d+-(\d+\.\d+)\]', segments_text)
            duration_seconds = float(all_timestamps[-1]) if all_timestamps else float(timestamps[-1])
            duration_minutes = int(duration_seconds / 60)

        # Calculate ideal number of chapters
        min_chapters = max(3, int(duration_minutes / (min_chapter_minutes * 3)))
        ideal_chapters = min(max_chapters, max(min_chapters, int(duration_minutes / min_chapter_minutes)))

        return f"""
Analyze this podcast transcript and create meaningful chapters that cover the ENTIRE {duration_minutes}-minute episode.

Return a JSON object with this exact structure:
{{
  "chapters": [
    {{
      "title": "Introduction and Welcome",
      "start_seconds": 0,
      "end_seconds": 300,
      "summary": "Brief introduction to the podcast and today's topics"
    }},
    // more chapters...
  ]
}}

CRITICAL REQUIREMENTS:
- Create {ideal_chapters-2} to {ideal_chapters+2} chapters that span the FULL {duration_minutes} minutes
- Each chapter MUST be AT LEAST {min_chapter_minutes} minutes ({min_chapter_minutes * 60} seconds) long
- The first chapter MUST start at 0 seconds
- The last chapter MUST extend to approximately {int(duration_seconds)} seconds
- Chapters must be continuous with no gaps (each chapter starts where the previous ends)
- Chapter titles should be specific and descriptive (not generic like "Part 1")
- Include a 1-2 sentence summary for each chapter
- Base boundaries on natural topic transitions in the conversation

IMPORTANT: Even if you only see samples from the transcript, you must still create chapters
that cover the ENTIRE {duration_minutes}-minute duration. Use context clues to infer reasonable
topic breaks for parts you haven't seen.

Transcript with timestamps (may be sampled if long):
{segments_text}
"""

    def generate_chapters(
        self,
        segments: List[Dict],
        model: str = "gpt-4o-mini",
        temperature: float = 0.3,
        min_chapter_minutes: int = 5,
        max_chars: int = 50000,
        actual_duration_seconds: float = None
    ) -> List[Dict]:
        """
        Generate chapters from transcript segments.

        Args:
            segments: List of transcript segments with start, end, and text
            model: OpenAI model to use
            temperature: Temperature for generation (lower = more focused)
            min_chapter_minutes: Minimum minutes per chapter
            max_chars: Maximum characters to send to GPT

        Returns:
            List of chapters with title, start_seconds, end_seconds, and summary
        """
        print(f"\n📚 Generating chapters with {model}...")
        print(f"  Minimum chapter length: {min_chapter_minutes} minutes")

        # Prepare segments for GPT
        segments_text = self.prepare_segments_for_gpt(segments, max_chars)

        # Build prompt
        prompt = self.build_chapters_prompt(segments_text, min_chapter_minutes)

        try:
            response = self.openai_client.chat.completions.create(
                model=model,
                temperature=temperature,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at analyzing podcast transcripts and creating clear, meaningful chapters that help listeners navigate the content."
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
            chapters = result.get('chapters', [])

            print(f"  ✓ Generated {len(chapters)} chapters")

            # Validate chapters
            if chapters:
                first_start = chapters[0]['start_seconds']
                last_end = chapters[-1]['end_seconds']
                print(f"  Coverage: {first_start}s to {last_end}s ({last_end/60:.1f} minutes)")

            return chapters

        except Exception as e:
            print(f"  ❌ Error generating chapters: {str(e)}")
            return []

    def save_chapters(self, chapters: List[Dict], output_file: str) -> None:
        """Save chapters to JSON file."""
        with open(output_file, 'w') as f:
            json.dump(chapters, f, indent=2)
        print(f"\n✓ Saved {len(chapters)} chapters to {output_file}")

    def print_chapters(self, chapters: List[Dict]) -> None:
        """Print chapters in a readable format."""
        print("\n" + "="*60)
        print("GENERATED CHAPTERS")
        print("="*60)

        for i, chapter in enumerate(chapters, 1):
            start_min = chapter['start_seconds'] / 60
            end_min = chapter['end_seconds'] / 60
            duration_min = end_min - start_min

            print(f"\n{i}. {chapter['title']}")
            print(f"   Time: {start_min:.1f} - {end_min:.1f} min (duration: {duration_min:.1f} min)")
            if 'summary' in chapter:
                print(f"   Summary: {chapter['summary']}")

        print("\n" + "="*60)


def main():
    parser = argparse.ArgumentParser(description='Generate chapters from podcast transcript')
    parser.add_argument('transcript_file', help='Path to transcript JSON file')
    parser.add_argument('-o', '--output', help='Output file for chapters (default: chapters.json)')
    parser.add_argument('--model', default='gpt-4o-mini', help='OpenAI model to use (default: gpt-4o-mini)')
    parser.add_argument('--temperature', type=float, default=0.3, help='Temperature for generation (default: 0.3)')
    parser.add_argument('--min-minutes', type=int, default=5, help='Minimum minutes per chapter (default: 5)')
    parser.add_argument('--max-chars', type=int, default=50000, help='Max characters to send to GPT (default: 50000)')
    parser.add_argument('--sample-rate', type=float, default=1.0, help='Segment sampling rate, 1.0=all, 0.5=half (default: 1.0)')

    args = parser.parse_args()

    # Check for API key
    if not os.getenv("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY environment variable not set")
        print("Please set it in your .env file or environment")
        return 1

    # Set output file
    if args.output:
        output_file = args.output
    else:
        # Default: same directory as input, named chapters.json
        input_path = Path(args.transcript_file)
        output_file = input_path.parent / "chapters.json"

    # Process
    generator = ChapterGenerator()

    # Load transcript
    print(f"📖 Loading transcript from {args.transcript_file}")
    transcript = generator.load_transcript(args.transcript_file)

    if 'segments' not in transcript:
        print("Error: No segments found in transcript file")
        return 1

    segments = transcript['segments']
    print(f"  Loaded {len(segments)} segments")

    if segments:
        duration = segments[-1]['end']
        print(f"  Duration: {duration:.1f} seconds ({duration/60:.1f} minutes)")

    # Generate chapters
    chapters = generator.generate_chapters(
        segments,
        model=args.model,
        temperature=args.temperature,
        min_chapter_minutes=args.min_minutes,
        max_chars=args.max_chars
    )

    if not chapters:
        print("Failed to generate chapters")
        return 1

    # Save chapters
    generator.save_chapters(chapters, str(output_file))

    # Display chapters
    generator.print_chapters(chapters)

    return 0


if __name__ == "__main__":
    exit(main())