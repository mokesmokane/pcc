# Testing Guide - Podcast Club Landing Page

## Quick Test Checklist

Use this guide to verify everything is working correctly before deploying.

---

## 1. Visual Testing

### Desktop (1920x1080)
- [ ] Hero section displays correctly with badges
- [ ] All 4 feature cards are visible in a row
- [ ] Testimonials section has coral background
- [ ] Ethos section shows 6 cards in 3x2 grid
- [ ] Story section has two-column layout
- [ ] Footer has circular badges on both sides

### Tablet (768x1024)
- [ ] Navigation collapses to hamburger menu
- [ ] Feature cards stack into 2 columns
- [ ] Ethos cards display in 2 columns
- [ ] Story section remains two-column or stacks
- [ ] Forms remain usable

### Mobile (375x667)
- [ ] All text is readable
- [ ] Feature cards stack vertically
- [ ] Forms stack vertically
- [ ] Badges are visible or appropriately hidden
- [ ] Navigation hamburger menu works
- [ ] Images don't overflow

---

## 2. Functionality Testing

### Navigation
- [ ] Click each nav link - smooth scrolls to correct section
- [ ] Active link highlights correctly on scroll
- [ ] Mobile menu opens and closes
- [ ] Mobile menu closes when clicking a link
- [ ] Mobile menu closes when clicking outside

### Forms (Both Hero and Footer)
- [ ] Submit empty form - shows error message
- [ ] Submit with invalid email - shows error message
- [ ] Submit with valid data - shows success message
- [ ] Form clears after successful submission
- [ ] Enter key in input field submits form

### Testimonials Carousel
- [ ] Left arrow navigates backward
- [ ] Right arrow navigates forward
- [ ] Carousel wraps around (last to first, first to last)
- [ ] Smooth scrolling between testimonials
- [ ] Works on mobile

### Scroll Behavior
- [ ] Smooth scrolling when clicking nav links
- [ ] Header stays sticky on scroll
- [ ] Header shadow appears after scrolling down
- [ ] Active nav link updates based on scroll position

### Animations
- [ ] Yellow badge floats up and down
- [ ] Cards fade in when scrolling into view
- [ ] Hover effects on buttons work
- [ ] Hover effects on feature cards work

---

## 3. Content Verification

### Text Content
- [ ] All headings display correctly
- [ ] No "Lorem ipsum" placeholder text
- [ ] Email address is correct: hello@podcastclub.co.uk
- [ ] Launch date is correct: December 1, 2025
- [ ] Copyright year is correct: 2025

### Images
- [ ] All 4 feature images load
- [ ] All 6 ethos images load
- [ ] Story section image loads
- [ ] All 4 testimonial avatars load
- [ ] Images are appropriate for content
- [ ] No broken image icons

### Links
- [ ] All navigation links work
- [ ] Email link (if present) opens email client
- [ ] Logo link returns to top
- [ ] No broken external links

---

## 4. Browser Compatibility

Test in the following browsers:

### Desktop
- [ ] Chrome (latest version)
- [ ] Firefox (latest version)
- [ ] Safari (latest version)
- [ ] Edge (latest version)

### Mobile
- [ ] iOS Safari
- [ ] Chrome Mobile (Android)
- [ ] Samsung Internet

### Check For:
- Layout consistency
- Functionality works
- Fonts load correctly
- Colors display accurately
- No console errors

---

## 5. Performance Testing

### Page Load
- [ ] Page loads in < 3 seconds
- [ ] Images load progressively
- [ ] No layout shift during load
- [ ] Fonts load without flash

### Lighthouse Audit (Chrome DevTools)
Run Lighthouse audit and check:
- [ ] Performance score > 85
- [ ] Accessibility score > 90
- [ ] Best Practices score > 90
- [ ] SEO score > 85

### Run Lighthouse:
1. Open Chrome DevTools (F12)
2. Go to "Lighthouse" tab
3. Select "Desktop" or "Mobile"
4. Click "Generate report"

---

## 6. Accessibility Testing

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Focus indicators are visible
- [ ] Enter key submits forms
- [ ] Escape key closes mobile menu (if implemented)
- [ ] Arrow keys work in carousel

### Screen Reader Testing
Using Chrome + ChromeVox or Safari + VoiceOver:
- [ ] All images have alt text
- [ ] Form fields have labels
- [ ] Headings are hierarchical (h1 → h2 → h3)
- [ ] Buttons have descriptive text
- [ ] Links have descriptive text

### Color Contrast
- [ ] Text on coral background is readable
- [ ] Text on cream background is readable
- [ ] Button text is readable
- [ ] All text meets WCAG AA standards

---

## 7. Form Testing

### Valid Submissions
Test with these valid inputs:
- [ ] Name: "John Doe", Email: "john@example.com"
- [ ] Name: "Mary Jane", Email: "mary.jane@company.co.uk"
- [ ] Name: "Test User", Email: "test+user@domain.org"

### Invalid Submissions
Test these should show errors:
- [ ] Empty name field
- [ ] Empty email field
- [ ] Invalid email: "notanemail"
- [ ] Invalid email: "test@"
- [ ] Invalid email: "@example.com"

### Edge Cases
- [ ] Very long name (100+ characters)
- [ ] Special characters in name
- [ ] Multiple @ symbols in email
- [ ] Spaces in email

---

## 8. Responsive Breakpoints

Test at these specific widths:

### Desktop
- [ ] 1920px (Full HD)
- [ ] 1366px (Laptop)
- [ ] 1280px (Small laptop)

### Tablet
- [ ] 1024px (iPad landscape)
- [ ] 768px (iPad portrait)

### Mobile
- [ ] 414px (iPhone Plus)
- [ ] 375px (iPhone standard)
- [ ] 360px (Android standard)
- [ ] 320px (iPhone SE)

---

## 9. Console Check

Open browser console (F12) and check for:
- [ ] No JavaScript errors
- [ ] No 404 errors (missing files)
- [ ] No CORS errors
- [ ] No CSS errors
- [ ] Success message when form submitted: "Podcast Club website loaded successfully!"

---

## 10. Quick Browser Test

### Chrome DevTools Device Simulation
1. Open DevTools (F12)
2. Click device toggle (Ctrl+Shift+M)
3. Test these devices:
   - [ ] iPhone 12 Pro
   - [ ] iPad Air
   - [ ] Desktop 1920x1080

### Firefox Responsive Design Mode
1. Open Developer Tools (F12)
2. Click Responsive Design Mode (Ctrl+Shift+M)
3. Test various sizes

---

## 11. WordPress Integration Testing

If integrated with WordPress:

### Basic Checks
- [ ] Page template applies correctly
- [ ] CSS loads properly
- [ ] JavaScript loads properly
- [ ] Images load from correct paths
- [ ] Forms integrate with WordPress (if using WP AJAX)

### WordPress-Specific
- [ ] No conflicts with theme CSS
- [ ] No conflicts with plugin scripts
- [ ] Admin bar doesn't interfere (if visible)
- [ ] Permalink works correctly
- [ ] Page can be edited in WP admin

---

## 12. SEO Verification

### Meta Tags
- [ ] Title tag is present and descriptive
- [ ] Meta description is present (150-160 chars)
- [ ] Open Graph tags for social sharing
- [ ] Favicon appears in browser tab

### Content Structure
- [ ] One H1 tag per page
- [ ] Headings follow hierarchy (H1 → H2 → H3)
- [ ] All images have alt attributes
- [ ] Internal links use descriptive anchor text

### Technical SEO
- [ ] Page loads over HTTPS (when deployed)
- [ ] No broken links
- [ ] Sitemap includes page (if applicable)
- [ ] Robots.txt allows crawling

---

## 13. Security Checks

### Form Security
- [ ] Form validates input client-side
- [ ] Email validation prevents injection
- [ ] No sensitive data in HTML source
- [ ] HTTPS enforced (when deployed)

### Code Review
- [ ] No inline JavaScript
- [ ] No console.log statements in production
- [ ] No commented-out sensitive data
- [ ] External resources load over HTTPS

---

## 14. Cross-Device Testing

### Physical Device Testing (Recommended)
- [ ] iPhone (Safari)
- [ ] Android phone (Chrome)
- [ ] iPad (Safari)
- [ ] Desktop Mac (Safari, Chrome)
- [ ] Desktop PC (Chrome, Edge)

### Test Scenarios
1. **Visitor Journey**
   - Land on page
   - Scroll through sections
   - Fill out form
   - Verify confirmation

2. **Navigation Journey**
   - Click nav links
   - Scroll manually
   - Use back button
   - Test mobile menu

---

## 15. Final Pre-Launch Checklist

- [ ] All placeholder images replaced with real images
- [ ] All placeholder text updated
- [ ] Contact information is correct
- [ ] Launch date is correct
- [ ] Forms submit to correct endpoint
- [ ] Analytics tracking code added
- [ ] Favicon added
- [ ] Social meta tags added
- [ ] No console errors
- [ ] Performance optimized
- [ ] Backup created
- [ ] DNS configured (if custom domain)
- [ ] SSL certificate active

---

## Quick Test Command

For local testing, run a simple HTTP server:

```bash
# Using Python 3
cd website
python3 -m http.server 8000

# Using PHP
php -S localhost:8000

# Using Node.js
npx http-server -p 8000
```

Then open: http://localhost:8000

---

## Reporting Issues

If you find issues:

1. **Browser:** Note which browser and version
2. **Device:** Note device type and screen size
3. **Steps:** Document steps to reproduce
4. **Screenshot:** Take screenshot of issue
5. **Console:** Copy any console errors

---

## Testing Tools

### Recommended Tools
- **Chrome DevTools** - Built-in browser testing
- **Firefox Developer Tools** - Alternative browser testing
- **Lighthouse** - Performance and accessibility auditing
- **WAVE** - Accessibility testing (https://wave.webaim.org/)
- **GTmetrix** - Page speed testing (https://gtmetrix.com/)
- **BrowserStack** - Cross-browser testing (paid)

### Validation Tools
- **W3C HTML Validator** - https://validator.w3.org/
- **W3C CSS Validator** - https://jigsaw.w3.org/css-validator/
- **JSHint** - https://jshint.com/

---

## Success Criteria

Your landing page is ready when:

✅ All functionality works on all devices
✅ No console errors
✅ Page loads in < 3 seconds
✅ Lighthouse scores > 85
✅ Forms validate correctly
✅ All images load
✅ Content is accurate
✅ WordPress integration works (if applicable)

---

**Remember:** Test early, test often, and test on real devices!

*Last Updated: October 2025*
