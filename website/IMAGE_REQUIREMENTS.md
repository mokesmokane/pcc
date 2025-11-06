# Image Requirements for Podcast Club Website

This document outlines all the images needed for the Podcast Club landing page and provides guidance on sourcing them.

## Required Images

### Feature Section (4 images)
**Location:** `assets/images/`

1. **feature-listen.jpg** (250x250px minimum)
   - Description: Young person wearing headphones, casual setting
   - Style: Bright, modern, energetic
   - Subject: Person listening to audio content, relaxed pose
   - Suggested search: "person listening headphones", "young adult headphones casual"

2. **feature-discuss.jpg** (250x250px minimum)
   - Description: Group of people having discussion at a table
   - Style: Social, engaging, diverse group
   - Subject: 3-4 people talking over coffee/drinks
   - Suggested search: "people discussing coffee shop", "friends conversation table"

3. **feature-grow.jpg** (250x250px minimum)
   - Description: Abstract colorful doorway or portal
   - Style: Vibrant, mysterious, gradient colors (pink/purple/orange)
   - Subject: Open door leading to bright/colorful space
   - Suggested search: "colorful doorway abstract", "gradient door portal", "neon hallway"

4. **feature-together.jpg** (250x250px minimum)
   - Description: Person with binoculars or looking into distance
   - Style: Black and white or monochromatic
   - Subject: Person engaged in focused observation
   - Suggested search: "person binoculars", "looking forward binoculars", "exploration concept"

### Ethos Section (6 images)
**Location:** `assets/images/`

5. **ethos-dialog.jpg** (300x250px minimum)
   - Description: Two people in conversation outdoors
   - Style: Natural, candid, park or outdoor setting
   - Subject: Dialogue between people in casual environment
   - Suggested search: "people talking outdoor park", "conversation nature"

6. **ethos-synchronicity.jpg** (300x250px minimum)
   - Description: Group of people in synchronized activity
   - Style: Black and white, vintage or modern
   - Subject: People doing something together in unison
   - Suggested search: "group people together black white", "team synchronicity"

7. **ethos-discovery.jpg** (300x250px minimum)
   - Description: Landscape with horizon, blue sky
   - Style: Inspiring, open, peaceful
   - Subject: Ocean, mountains, or expansive sky view
   - Suggested search: "blue sky horizon", "peaceful landscape discovery", "ocean horizon"

8. **ethos-challenge.jpg** (300x250px minimum)
   - Description: Scene from The Office or similar sitcom showing "challenge accepted"
   - Style: TV show still or similar confrontational but humorous moment
   - Subject: Person accepting challenge or confrontational meeting
   - Suggested search: "business meeting challenge", "office confrontation", "debate discussion"
   - Note: Use royalty-free alternative to avoid copyright issues

9. **ethos-growth.jpg** (300x250px minimum)
   - Description: Scene showing expansion or growth concept
   - Style: Similar to TV still showing "It's time to expand!"
   - Subject: Person gesturing about growth/expansion
   - Suggested search: "personal growth concept", "expansion gesture", "motivational speaker"
   - Note: Use royalty-free alternative to avoid copyright issues

10. **ethos-fun.jpg** (300x250px minimum)
    - Description: People celebrating at party or festival
    - Style: Festive, colorful, joyful
    - Subject: Group having fun, celebration with decorations
    - Suggested search: "people celebrating party", "festival celebration friends", "joyful gathering"

### Story Section (1 image)
**Location:** `assets/images/`

11. **story-image.jpg** (600x600px minimum)
    - Description: People at outdoor event or gathering
    - Style: Community, social, summer festival vibe
    - Subject: Group of happy people at outdoor event (music festival, picnic, etc.)
    - Suggested search: "outdoor community gathering", "summer festival crowd", "people socializing outdoor event"

### Testimonials Section (4 images)
**Location:** `assets/images/`

12-15. **avatar-1.jpg through avatar-4.jpg** (100x100px minimum)
    - Description: Diverse headshots/portraits
    - Style: Professional yet friendly
    - Subject: Individual portraits, different genders/ethnicities
    - Suggested search: "person portrait headshot", "professional headshot diverse"

## Recommended Stock Photo Sources

### Free Sources
- **Unsplash** (https://unsplash.com/) - High-quality, free images
- **Pexels** (https://www.pexels.com/) - Free stock photos and videos
- **Pixabay** (https://pixabay.com/) - Free images and illustrations
- **StockSnap.io** (https://stocksnap.io/) - Beautiful free stock photos

### Paid Sources (Higher Quality)
- **Shutterstock** - Extensive library with licensing
- **Adobe Stock** - Professional stock photography
- **iStock** - High-quality images at various price points

## Image Specifications

### Technical Requirements
- **Format:** JPG or WebP preferred
- **Minimum Resolution:**
  - Feature cards: 500x500px
  - Ethos cards: 600x500px
  - Story section: 1200x1200px
  - Avatars: 200x200px
- **File Size:** Optimize to under 200KB each
- **Aspect Ratios:**
  - Feature images: 1:1 (square)
  - Ethos images: 6:5 (slightly landscape)
  - Story image: 1:1 (square)
  - Avatars: 1:1 (circular crop)

### Style Guidelines
- **Color Palette:** Warm tones that complement coral (#E85D54) and cream (#FAF7F2)
- **Mood:** Friendly, approachable, community-focused
- **People:** Diverse, aged 25-45, casual professional attire
- **Lighting:** Natural, bright, not overly edited

## Quick Setup Script

Once you have downloaded your images, place them in the `assets/images/` folder and run this check:

```bash
ls -la assets/images/
```

Expected file list:
- feature-listen.jpg
- feature-discuss.jpg
- feature-grow.jpg
- feature-together.jpg
- ethos-dialog.jpg
- ethos-synchronicity.jpg
- ethos-discovery.jpg
- ethos-challenge.jpg
- ethos-growth.jpg
- ethos-fun.jpg
- story-image.jpg
- avatar-1.jpg
- avatar-2.jpg
- avatar-3.jpg
- avatar-4.jpg

## Placeholder Images (Temporary)

For initial testing, you can use placeholder services:
- https://placeholder.com/
- https://via.placeholder.com/
- https://picsum.photos/

Example URLs:
- Feature images: `https://picsum.photos/500/500?random=1`
- Ethos images: `https://picsum.photos/600/500?random=2`
- Avatars: `https://i.pravatar.cc/200?img=1`

## Image Optimization

Before uploading, optimize all images:

### Using Command Line Tools
```bash
# Install imagemagick (if not already installed)
brew install imagemagick

# Optimize and resize images
mogrify -resize 1000x1000\> -quality 85 assets/images/*.jpg
```

### Using Online Tools
- **TinyPNG** (https://tinypng.com/) - Compress PNG and JPG
- **Squoosh** (https://squoosh.app/) - Google's image optimizer
- **ImageOptim** (https://imageoptim.com/) - Mac app for optimization

## License Compliance

Ensure all images are:
- Royalty-free or properly licensed
- Attribution provided if required
- Commercial use permitted
- Model releases obtained for identifiable people

## Notes
- All TV show stills (The Office, etc.) should be replaced with similar but royalty-free alternatives
- Maintain consistent style across all images
- Test images on both desktop and mobile to ensure they look good at all sizes
