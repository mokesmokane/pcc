#!/usr/bin/env python3

import os
import json
import sys
from pathlib import Path
from typing import List, Dict
from supabase import create_client, Client
from dotenv import load_dotenv
import argparse

# Load environment variables
load_dotenv()

class ChapterUploader:
    def __init__(self):
        # Initialize Supabase
        self.supabase: Client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )

    def load_chapters(self, chapters_file: str) -> List[Dict]:
        """Load chapters from JSON file."""
        with open(chapters_file, 'r') as f:
            return json.load(f)

    def upload_chapters(self, episode_id: str, chapters: List[Dict]) -> List[Dict]:
        """
        Upload chapters to Supabase chapters table.
        """
        print(f"\n📤 Uploading {len(chapters)} chapters to Supabase...")
        print(f"   Episode ID: {episode_id}")

        # Prepare chapter records for the chapters table
        chapter_records = []

        for chapter in chapters:
            # Create a chapter record
            chapter_records.append({
                'episode_id': episode_id,
                'title': chapter['title'],
                'start_seconds': chapter['start_seconds'],
                'end_seconds': chapter['end_seconds'],
                'description': chapter.get('summary', '')  # Using description field for summary
            })

        # Upload to Supabase
        if chapter_records:
            try:
                result = self.supabase.table('chapters').insert(chapter_records).execute()
                print(f"✓ Successfully uploaded {len(chapter_records)} chapters")
                return result.data
            except Exception as e:
                print(f"❌ Failed to upload chapters: {str(e)}")
                return []

        return []

    def check_existing_chapters(self, episode_id: str) -> List[Dict]:
        """Check if chapters already exist for this episode."""
        try:
            result = self.supabase.table('chapters')\
                .select("*")\
                .eq('episode_id', episode_id)\
                .execute()
            return result.data
        except Exception as e:
            print(f"Error checking existing chapters: {str(e)}")
            return []

    def delete_existing_chapters(self, episode_id: str) -> bool:
        """Delete existing chapters for this episode."""
        try:
            result = self.supabase.table('chapters')\
                .delete()\
                .eq('episode_id', episode_id)\
                .execute()

            deleted_count = len(result.data) if result.data else 0
            if deleted_count > 0:
                print(f"  Deleted {deleted_count} existing chapters")
            return True
        except Exception as e:
            print(f"Error deleting existing chapters: {str(e)}")
            return False

    def process(self, episode_id: str, chapters_file: str, replace: bool = False):
        """
        Main process to upload chapters.

        Args:
            episode_id: UUID of the episode
            chapters_file: Path to chapters JSON file
            replace: Whether to replace existing chapters
        """
        # Load chapters
        print(f"📖 Loading chapters from {chapters_file}")
        chapters = self.load_chapters(chapters_file)
        print(f"   Found {len(chapters)} chapters")

        # Display chapters
        print("\nChapters to upload:")
        for i, chapter in enumerate(chapters, 1):
            duration = (chapter['end_seconds'] - chapter['start_seconds']) / 60
            print(f"  {i}. {chapter['title']} ({duration:.1f} min)")

        # Check for existing chapters
        existing = self.check_existing_chapters(episode_id)
        if existing:
            print(f"\n⚠️  Found {len(existing)} existing chapter markers")
            if replace:
                print("   Replacing existing chapters...")
                self.delete_existing_chapters(episode_id)
            else:
                response = input("   Replace existing chapters? (y/n): ")
                if response.lower() == 'y':
                    self.delete_existing_chapters(episode_id)
                else:
                    print("   Skipping upload to preserve existing chapters")
                    return

        # Upload new chapters
        uploaded = self.upload_chapters(episode_id, chapters)

        if uploaded:
            print(f"\n✅ Successfully uploaded {len(uploaded)} chapters to Supabase")
            print(f"   Episode ID: {episode_id}")
        else:
            print("\n❌ Failed to upload chapters")


def main():
    parser = argparse.ArgumentParser(description='Upload podcast chapters to Supabase')
    parser.add_argument('episode_id', help='Episode UUID in Supabase')
    parser.add_argument('chapters_file', help='Path to chapters JSON file')
    parser.add_argument('--replace', action='store_true', help='Replace existing chapters without asking')

    args = parser.parse_args()

    # Check for required environment variables
    required_env = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    missing = [var for var in required_env if not os.getenv(var)]

    if missing:
        print(f"Error: Missing environment variables: {', '.join(missing)}")
        print("Please set them in your .env file or environment")
        return 1

    # Process
    uploader = ChapterUploader()
    uploader.process(args.episode_id, args.chapters_file, args.replace)

    return 0


if __name__ == "__main__":
    exit(main())