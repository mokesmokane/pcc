import os
import re
import json
import time
import urllib.request
import urllib.parse
import sys

def search_itunes(podcast_name, retries=3):
    """Search iTunes for a podcast and return the feed URL."""
    for attempt in range(retries):
        try:
            query = urllib.parse.urlencode({
                'term': podcast_name,
                'media': 'podcast',
                'limit': 1
            })
            url = f"https://itunes.apple.com/search?{query}"

            with urllib.request.urlopen(url, timeout=15) as response:
                data = json.loads(response.read().decode())

            if data.get('resultCount', 0) > 0:
                result = data['results'][0]
                return {
                    'name': result.get('collectionName', podcast_name),
                    'feed_url': result.get('feedUrl', ''),
                    'itunes_id': result.get('collectionId', ''),
                    'artwork': result.get('artworkUrl600', '')
                }
            return None
        except Exception as e:
            if '429' in str(e):
                wait = (attempt + 1) * 6
                print(f"    Rate limited, waiting {wait}s...")
                sys.stdout.flush()
                time.sleep(wait)
            elif '403' in str(e):
                wait = (attempt + 1) * 6
                print(f"    403 error, waiting {wait}s...")
                sys.stdout.flush()
                time.sleep(wait)
            else:
                print(f"    Error: {e}")
                sys.stdout.flush()
                return None
    return None

def save_results(results, folder):
    """Save current results to files."""
    output_json = os.path.join(folder, 'podcasts_with_feeds.json')
    with open(output_json, 'w') as f:
        json.dump(results, f, indent=2)

    output_txt = os.path.join(folder, 'podcasts_with_feeds.txt')
    with open(output_txt, 'w') as f:
        for category, podcasts in results.items():
            f.write(f"=== {category} ===\n")
            for i, p in enumerate(podcasts, 1):
                f.write(f"{i}. {p['original_name']}\n")
                f.write(f"   RSS: {p.get('feed_url', 'NOT FOUND')}\n")
            f.write("\n")

def main():
    folder = '/Users/mokes/projects/pcc_new/onboarding_interests'
    input_file = os.path.join(folder, 'top25_all_categories.txt')
    output_json = os.path.join(folder, 'podcasts_with_feeds.json')

    with open(input_file, 'r') as f:
        content = f.read()

    # Load existing results to resume
    results = {}
    if os.path.exists(output_json):
        with open(output_json, 'r') as f:
            results = json.load(f)
        print(f"Resuming from existing file with {len(results)} categories")
        sys.stdout.flush()

    current_category = None
    total = 0
    found = 0
    skipped = 0

    for line in content.split('\n'):
        line = line.strip()
        if not line:
            continue

        match = re.match(r'^=== (.+) ===$', line)
        if match:
            current_category = match.group(1)
            # Only create new list if category doesn't exist
            if current_category not in results:
                results[current_category] = []
            print(f"\n{'='*50}")
            print(f"{current_category}")
            print(f"{'='*50}")
            sys.stdout.flush()
            continue

        match = re.match(r'^\d+\. (.+)$', line)
        if match and current_category:
            podcast_name = match.group(1)
            total += 1

            # Check if we already have this podcast with a feed_url
            existing = next((p for p in results[current_category] if p.get('original_name') == podcast_name), None)
            if existing and existing.get('feed_url'):
                skipped += 1
                print(f"[{total}] {podcast_name[:50]}... (cached)")
                sys.stdout.flush()
                continue

            print(f"[{total}] {podcast_name[:50]}...")
            sys.stdout.flush()

            info = search_itunes(podcast_name)
            if info and info.get('feed_url'):
                found += 1
                # Remove old entry if exists (retry case)
                results[current_category] = [p for p in results[current_category] if p.get('original_name') != podcast_name]
                results[current_category].append({
                    'original_name': podcast_name,
                    'itunes_name': info['name'],
                    'feed_url': info['feed_url'],
                    'itunes_id': info['itunes_id'],
                    'artwork': info['artwork']
                })
                print(f"    ✓ {info['feed_url'][:70]}")
            else:
                # Only add if not already there
                if not existing:
                    results[current_category].append({
                        'original_name': podcast_name,
                        'feed_url': '',
                        'error': 'Not found'
                    })
                print(f"    ✗ Not found")
            sys.stdout.flush()

            # Save after each podcast
            save_results(results, folder)

            time.sleep(1.5)  # Longer delay to avoid rate limiting

    print(f"\n\nDone! Found {found} new feeds, skipped {skipped} cached")
    print(f"Saved to {folder}/podcasts_with_feeds.json")
    print(f"Saved to {folder}/podcasts_with_feeds.txt")

if __name__ == '__main__':
    main()
