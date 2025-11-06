# WordPress Integration Guide
## Podcast Club Landing Page

This guide provides multiple methods for integrating the Podcast Club landing page into WordPress. Choose the method that best fits your needs and technical expertise.

---

## Table of Contents
1. [Method 1: Custom HTML Page Template](#method-1-custom-html-page-template) ⭐ Recommended
2. [Method 2: Page Builder Integration](#method-2-page-builder-integration)
3. [Method 3: Full Custom Theme](#method-3-full-custom-theme)
4. [Method 4: Plugin-Based](#method-4-plugin-based)
5. [Form Integration with WordPress](#form-integration-with-wordpress)
6. [Troubleshooting](#troubleshooting)

---

## Method 1: Custom HTML Page Template
**Best for:** Standalone landing page, minimal WordPress integration
**Difficulty:** Easy
**Time:** 15-30 minutes

### Steps:

1. **Create a Custom Page Template**

   Create a new file in your theme folder:
   ```
   wp-content/themes/your-theme/template-podcast-landing.php
   ```

2. **Add the Template Header**

   ```php
   <?php
   /*
   Template Name: Podcast Club Landing Page
   */
   ?>
   ```

3. **Copy Your HTML**

   After the template header, paste your entire `index.html` content (or use `get_template_part()` to include it).

4. **Enqueue Styles and Scripts**

   Add to your theme's `functions.php`:

   ```php
   function podcast_club_landing_assets() {
       if (is_page_template('template-podcast-landing.php')) {
           // Dequeue default theme styles if needed
           wp_dequeue_style('your-theme-style');

           // Enqueue custom styles
           wp_enqueue_style(
               'podcast-club-styles',
               get_template_directory_uri() . '/assets/css/podcast-landing.css',
               array(),
               '1.0.0'
           );

           // Enqueue custom scripts
           wp_enqueue_script(
               'podcast-club-scripts',
               get_template_directory_uri() . '/assets/js/podcast-landing.js',
               array(),
               '1.0.0',
               true
           );
       }
   }
   add_action('wp_enqueue_scripts', 'podcast_club_landing_assets');
   ```

5. **Upload Assets**

   - Upload `styles.css` to `wp-content/themes/your-theme/assets/css/podcast-landing.css`
   - Upload `script.js` to `wp-content/themes/your-theme/assets/js/podcast-landing.js`
   - Upload images to `wp-content/themes/your-theme/assets/images/`

6. **Create Page in WordPress**

   - Go to Pages → Add New
   - Title: "Podcast Club"
   - Under "Page Attributes", select "Podcast Club Landing Page" template
   - Publish

### Full Template File Example:

```php
<?php
/*
Template Name: Podcast Club Landing Page
*/
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php wp_title('|', true, 'right'); ?><?php bloginfo('name'); ?></title>
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>

    <!-- Your HTML content here -->
    <!-- Or include it from a separate file: -->
    <?php get_template_part('template-parts/podcast-club-content'); ?>

    <?php wp_footer(); ?>
</body>
</html>
```

---

## Method 2: Page Builder Integration
**Best for:** Existing WordPress sites using Elementor, WPBakery, or Divi
**Difficulty:** Medium
**Time:** 30-60 minutes

### Using Elementor:

1. **Install Custom HTML Widget**
   - Already included in Elementor Pro

2. **Create New Page**
   - Pages → Add New
   - Click "Edit with Elementor"

3. **Add Custom HTML Section**
   - Add new section
   - Drag "HTML" widget into section
   - Paste your HTML code

4. **Add Custom CSS**
   - In Elementor, go to Page Settings → Custom CSS
   - Paste your `styles.css` content

5. **Add Custom JavaScript**
   - Use "Custom Code" feature (Elementor Pro) or install "Insert Headers and Footers" plugin
   - Add your `script.js` code to the page footer

### Using WPBakery (Visual Composer):

1. **Create New Page**
   - Pages → Add New
   - Click "WPBakery Page Builder"

2. **Add Raw HTML Element**
   - Click "+ Add Element"
   - Select "Raw HTML"
   - Paste your HTML

3. **Add Custom CSS/JS**
   - Use "Custom CSS/JS" plugin or add to theme's functions

### Using Divi:

1. **Create New Page**
   - Pages → Add New
   - Use Divi Builder

2. **Add Code Module**
   - Add new section → Add code module
   - Paste HTML content

3. **Add Custom CSS**
   - Page Settings → Advanced → Custom CSS

---

## Method 3: Full Custom Theme
**Best for:** Dedicated landing page site
**Difficulty:** Advanced
**Time:** 1-2 hours

### Create a Minimal WordPress Theme:

1. **Create Theme Folder**
   ```
   wp-content/themes/podcast-club-landing/
   ```

2. **Create Required Files**

   **style.css** (theme header):
   ```css
   /*
   Theme Name: Podcast Club Landing
   Theme URI: https://podcastclub.co.uk
   Description: Custom landing page for Podcast Club
   Version: 1.0
   Author: Your Name
   */

   /* Import your actual styles */
   @import url('assets/css/landing.css');
   ```

   **index.php**:
   ```php
   <?php get_header(); ?>
   <!-- Your landing page HTML -->
   <?php get_footer(); ?>
   ```

   **header.php**:
   ```php
   <!DOCTYPE html>
   <html <?php language_attributes(); ?>>
   <head>
       <meta charset="<?php bloginfo('charset'); ?>">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title><?php wp_title('|', true, 'right'); ?></title>
       <?php wp_head(); ?>
   </head>
   <body <?php body_class(); ?>>
   ```

   **footer.php**:
   ```php
       <?php wp_footer(); ?>
   </body>
   </html>
   ```

   **functions.php**:
   ```php
   <?php
   function podcast_club_enqueue_assets() {
       wp_enqueue_style('podcast-club-styles', get_template_directory_uri() . '/assets/css/landing.css', array(), '1.0.0');
       wp_enqueue_script('podcast-club-scripts', get_template_directory_uri() . '/assets/js/landing.js', array(), '1.0.0', true);
   }
   add_action('wp_enqueue_scripts', 'podcast_club_enqueue_assets');

   // Disable admin bar for cleaner landing page
   add_filter('show_admin_bar', '__return_false');
   ?>
   ```

3. **Activate Theme**
   - Go to Appearance → Themes
   - Activate "Podcast Club Landing"

---

## Method 4: Plugin-Based
**Best for:** Quick deployment without theme modification
**Difficulty:** Easy
**Time:** 15 minutes

### Using "Simple Custom CSS and JS" Plugin:

1. **Install Plugin**
   - Plugins → Add New
   - Search "Simple Custom CSS and JS"
   - Install and activate

2. **Add Custom Code**
   - Custom CSS and JS → Add Custom CSS
   - Paste your `styles.css`
   - Custom CSS and JS → Add Custom JS
   - Paste your `script.js`

3. **Add HTML**
   - Install "Insert HTML Snippet" or similar plugin
   - Create snippet with your HTML
   - Add shortcode to page

### Using "Code Snippets" Plugin:

1. **Install Plugin**
   - Plugins → Add New
   - Search "Code Snippets"
   - Install and activate

2. **Create Snippet**
   - Snippets → Add New
   - Add your custom CSS and JS enqueuing code
   - Set to run on specific pages

---

## Form Integration with WordPress

### Option A: WordPress AJAX (Recommended)

Add to your `functions.php`:

```php
function podcast_club_handle_signup() {
    check_ajax_referer('podcast_club_signup', 'nonce');

    $first_name = sanitize_text_field($_POST['first_name']);
    $email = sanitize_email($_POST['email']);

    // Validate
    if (empty($first_name) || empty($email) || !is_email($email)) {
        wp_send_json_error(['message' => 'Please fill in all fields correctly']);
        return;
    }

    // Store in database or send to email marketing service
    // Example: Save to custom table
    global $wpdb;
    $table_name = $wpdb->prefix . 'podcast_signups';

    $wpdb->insert($table_name, [
        'first_name' => $first_name,
        'email' => $email,
        'signup_date' => current_time('mysql')
    ]);

    // Or integrate with Mailchimp, ConvertKit, etc.

    wp_send_json_success(['message' => 'Thanks! We\'ll be in touch soon.']);
}
add_action('wp_ajax_podcast_club_signup', 'podcast_club_handle_signup');
add_action('wp_ajax_nopriv_podcast_club_signup', 'podcast_club_handle_signup');
```

Update your `script.js` to use WordPress AJAX:

```javascript
function handleFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const firstName = e.target.querySelector('input[type="text"]').value;
    const email = e.target.querySelector('input[type="email"]').value;

    // WordPress AJAX request
    fetch(ajaxurl || '/wp-admin/admin-ajax.php', {
        method: 'POST',
        body: new URLSearchParams({
            action: 'podcast_club_signup',
            nonce: '<?php echo wp_create_nonce("podcast_club_signup"); ?>',
            first_name: firstName,
            email: email
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showFormMessage(e.target, data.data.message, 'success');
            e.target.reset();
        } else {
            showFormMessage(e.target, data.data.message, 'error');
        }
    });
}
```

### Option B: Contact Form 7 Integration

1. Install Contact Form 7
2. Create form with email and name fields
3. Replace HTML form with CF7 shortcode:
   ```html
   <?php echo do_shortcode('[contact-form-7 id="123" title="Signup"]'); ?>
   ```

### Option C: Mailchimp Integration

1. Install "MC4WP: Mailchimp for WordPress"
2. Configure API key
3. Replace forms with Mailchimp form shortcode

---

## Assets Organization

### Recommended WordPress File Structure:

```
wp-content/
  themes/
    your-theme/
      assets/
        css/
          podcast-landing.css
        js/
          podcast-landing.js
        images/
          feature-listen.jpg
          feature-discuss.jpg
          ...
      template-podcast-landing.php
      functions.php
```

---

## Troubleshooting

### Issue: Styles Not Loading

**Solution:**
1. Check file paths in `wp_enqueue_style()`
2. Clear WordPress cache (if using caching plugin)
3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
4. Check browser console for 404 errors

### Issue: JavaScript Not Working

**Solution:**
1. Make sure scripts are enqueued correctly
2. Check for jQuery conflicts (use `jQuery` instead of `$`)
3. Ensure scripts are loaded in footer with `true` parameter
4. Check browser console for errors

### Issue: Forms Not Submitting

**Solution:**
1. Verify AJAX URL is correct
2. Check nonce validation
3. Ensure action hooks are properly registered
4. Test with Network tab in browser DevTools

### Issue: Images Not Displaying

**Solution:**
1. Verify image paths are correct for WordPress structure
2. Use `get_template_directory_uri()` for dynamic paths
3. Check file permissions (should be 644 for files, 755 for folders)
4. Update image URLs in HTML to use WordPress functions:
   ```php
   <img src="<?php echo get_template_directory_uri(); ?>/assets/images/feature-listen.jpg" alt="...">
   ```

### Issue: Page Builder Conflicts

**Solution:**
1. Use custom page template instead
2. Disable page builder on this specific page
3. Use "Raw HTML" or "Code" modules
4. Ensure custom CSS has higher specificity

---

## Performance Optimization

### 1. Minify Assets

```bash
# Using npm
npm install -g clean-css-cli uglify-js

# Minify CSS
cleancss -o podcast-landing.min.css podcast-landing.css

# Minify JS
uglifyjs podcast-landing.js -o podcast-landing.min.js
```

### 2. Use WordPress Optimization Plugins

- **WP Rocket** - Caching and minification
- **Autoptimize** - CSS/JS optimization
- **Smush** - Image optimization
- **Cloudflare** - CDN integration

### 3. Lazy Load Images

Add to your HTML:
```html
<img src="image.jpg" loading="lazy" alt="...">
```

---

## Security Considerations

1. **Sanitize Form Inputs**
   ```php
   $name = sanitize_text_field($_POST['name']);
   $email = sanitize_email($_POST['email']);
   ```

2. **Validate Data**
   ```php
   if (!is_email($email)) {
       wp_send_json_error(['message' => 'Invalid email']);
   }
   ```

3. **Use Nonces**
   ```php
   check_ajax_referer('podcast_club_signup', 'nonce');
   ```

4. **Escape Output**
   ```php
   echo esc_html($name);
   echo esc_url($url);
   ```

---

## Testing Checklist

- [ ] Page loads correctly in all major browsers
- [ ] Mobile responsive design works
- [ ] Forms submit successfully
- [ ] Images load properly
- [ ] Navigation smooth scrolls work
- [ ] Carousel functions correctly
- [ ] Contact information is correct
- [ ] SEO meta tags are present
- [ ] Page loads quickly (< 3 seconds)
- [ ] No console errors
- [ ] SSL certificate is active (HTTPS)

---

## Additional Resources

### WordPress Documentation
- [Theme Development](https://developer.wordpress.org/themes/)
- [Plugin Development](https://developer.wordpress.org/plugins/)
- [AJAX in WordPress](https://codex.wordpress.org/AJAX_in_Plugins)

### Tools
- [WordPress Theme Check](https://wordpress.org/plugins/theme-check/)
- [Query Monitor](https://wordpress.org/plugins/query-monitor/)
- [GTmetrix](https://gtmetrix.com/) - Performance testing

---

## Support

For issues specific to this implementation:
1. Check browser console for JavaScript errors
2. Check WordPress debug.log for PHP errors
3. Use browser Network tab to debug AJAX requests
4. Test with default WordPress theme to rule out conflicts

---

## Quick Start Summary

**Fastest method (5 minutes):**
1. Install "Simple Custom CSS and JS" plugin
2. Add CSS and JS through plugin
3. Create new page
4. Add HTML using HTML block
5. Publish

**Best practice method (30 minutes):**
1. Create custom page template in theme
2. Enqueue assets properly
3. Create WordPress page with template
4. Set up form handler
5. Test thoroughly

---

## Maintenance

### Regular Updates
- Keep WordPress core updated
- Update themes and plugins
- Monitor form submissions
- Check analytics
- Update content as needed

### Backup Strategy
- Use UpdraftPlus or similar backup plugin
- Backup before making changes
- Keep backups of custom code
- Version control with Git (recommended)

---

**Last Updated:** October 2025
**Version:** 1.0

For questions or issues, refer to the troubleshooting section or consult WordPress documentation.
