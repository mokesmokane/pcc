-- Insert chapters for episode ff1f6c13-8910-4d13-bb43-290f6e3bc54f
-- Delete existing chapters for this episode first
DELETE FROM public.chapters WHERE episode_id = 'ff1f6c13-8910-4d13-bb43-290f6e3bc54f';

-- Insert new chapters
INSERT INTO public.chapters (episode_id, title, start_seconds, end_seconds, description)
VALUES
  ('ff1f6c13-8910-4d13-bb43-290f6e3bc54f', 'Cold Open & Setup', 0, 444, 'Trevor''s riff on deathbed honesty, show intro, and the week''s vibe.'),
  ('ff1f6c13-8910-4d13-bb43-290f6e3bc54f', 'Real Estate Shake-Up', 444, 778, 'The NAR commission ruling, why 6% never made sense, and what changes for buyers/sellers.'),
  ('ff1f6c13-8910-4d13-bb43-290f6e3bc54f', 'Housing, Millennials & Quality', 778, 1322, 'Why new builds can be worse, Gen Z''s calculus on ownership, and the ''house made of sneakers'' bit.'),
  ('ff1f6c13-8910-4d13-bb43-290f6e3bc54f', 'Conspiracies 101: Boeing & DEI', 1322, 1650, 'Picking apart lazy conspiracy logic, contradictions about ''they''re taking jobs'' vs ''they''re lazy''.'),
  ('ff1f6c13-8910-4d13-bb43-290f6e3bc54f', 'Whistleblowers & Paranoia', 1650, 2070, 'The Boeing whistleblower discourse, how racism fuels beliefs, and the tongue-in-cheek child-labor rant.'),
  ('ff1f6c13-8910-4d13-bb43-290f6e3bc54f', 'The Kate Photo Saga', 2070, 2465, 'UK royal optics, Photoshop backlash, and palace PR vs public trust.'),
  ('ff1f6c13-8910-4d13-bb43-290f6e3bc54f', 'The Trust Recession', 2465, 2760, 'How institutions lost credibility, social media''s role, and why shared reality is collapsing.'),
  ('ff1f6c13-8910-4d13-bb43-290f6e3bc54f', 'AI Anxiety & The Horseshoe', 2760, NULL, 'Jobs vs speed with AI, why both the ultra-rich and the struggling see conspiracies, and the sign-off.');