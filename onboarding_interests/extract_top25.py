import os
import re

def extract_top_podcasts(file_path, count=25):
    """Extract top N podcast names from a chart file."""
    with open(file_path, 'r') as f:
        content = f.read()

    lines = content.strip().split('\n')
    podcasts = []
    i = 0

    # Look for the first "1" or "2" to determine format
    first_one_idx = None
    first_two_idx = None
    for idx, line in enumerate(lines):
        if line.strip() == '1':
            first_one_idx = idx
            break
        if line.strip() == '2' and first_two_idx is None:
            first_two_idx = idx

    if first_one_idx is not None:
        # Format: has explicit "1" rank
        i = first_one_idx
    elif first_two_idx is not None:
        # Format: no "1", first entry is after header, look backwards from "2"
        # The first podcast is after the header line (line 0) at line 1
        podcast_name = lines[1].strip()
        if podcast_name and not podcast_name.startswith('"'):
            podcasts.append(podcast_name)
        i = first_two_idx

    # Now extract podcasts starting from numbered ranks
    while i < len(lines) and len(podcasts) < count:
        line = lines[i].strip()
        if re.match(r'^\d+$', line):
            # Next line is the podcast name
            if i + 1 < len(lines):
                podcast_name = lines[i + 1].strip()
                if podcast_name and not podcast_name.startswith('"'):
                    podcasts.append(podcast_name)
        i += 1

    return podcasts[:count]

def main():
    folder = '/Users/mokes/projects/pcc_new/onboarding_interests'
    output_lines = []

    for filename in sorted(os.listdir(folder)):
        if filename.endswith('.txt') and filename != 'top25_all_categories.txt':
            category = filename.replace('.txt', '')
            file_path = os.path.join(folder, filename)

            podcasts = extract_top_podcasts(file_path, 25)

            output_lines.append(f"=== {category} ===")
            for i, podcast in enumerate(podcasts, 1):
                output_lines.append(f"{i}. {podcast}")
            output_lines.append("")

    # Write output
    output_path = os.path.join(folder, 'top25_all_categories.txt')
    with open(output_path, 'w') as f:
        f.write('\n'.join(output_lines))

    print(f"Saved to {output_path}")

if __name__ == '__main__':
    main()
