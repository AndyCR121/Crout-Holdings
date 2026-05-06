# Crout Automations — WordPress Deploy Guide

This guide covers building each Angular Elements bundle, organising them into
page-specific subfolders inside your WordPress theme, and wiring everything up
through `functions.php` so Elementor can reference them.

---

## Folder Structure Convention

Each Angular project (one per page) builds to its own subfolder under
`crout-elements/` inside your active theme. This keeps bundles isolated and
lets WordPress load only what each page actually needs.

```
wp-content/
  themes/
    extendable/                        ← your active theme
      functions.php
      crout-elements/
        home-page/
          main.js
          styles.css                   (if present)
        contact-page/
          main.js
        about-page/
          main.js
        services-page/
          main.js
```

> **Why Extendable?** Extendable is a minimal base theme built for Elementor
> with a clean `functions.php` that's safe to extend. It won't conflict with
> your Angular components the way opinionated themes can.

---

## Step 1 — Build the Elements Bundle

Inside the Angular project directory, run:

```bash
npm run build:elements
```

This uses the `elements` configuration in `angular.json`. Output lands at:

```
dist/crout-elements/
  main.js        ← single JS file, no hash, fully optimised
  styles.css     ← only present if global styles were extracted
```

> `outputHashing: none` means the filename never changes — no cache-busting
> headaches when referencing it from WordPress.

---

## Step 2 — Copy the Bundle to Your Theme

Copy the entire output folder into the matching subfolder in your theme:

```bash
# Home page example
cp -r dist/crout-elements/* \
   /path/to/wordpress/wp-content/themes/extendable/crout-elements/home-page/
```

**FTP / cPanel users:**
1. Open your FTP client or cPanel File Manager.
2. Navigate to `wp-content/themes/extendable/`.
3. Create a folder `crout-elements/` if it doesn't exist.
4. Inside it, create a subfolder per page: `home-page/`, `contact-page/`, etc.
5. Upload `main.js` (and `styles.css` if present) into the matching subfolder.

---

## Step 3 — Enqueue Scripts in functions.php

Open `wp-content/themes/extendable/functions.php` and add the following block.
It maps each WordPress page to its Angular bundle using a clean, scalable
pattern — one `wp_enqueue_script()` call per page, loaded only when needed.

```php
/**
 * Crout Automations — Angular Elements loader.
 *
 * Each Angular project builds to its own subfolder:
 *   crout-elements/
 *     home-page/     → loaded on the front page
 *     contact-page/  → loaded on the "Contact" page
 *     about-page/    → loaded on the "About" page
 *     services-page/ → loaded on the "Services" page
 *
 * To add a new page:
 *   1. Build the new Angular project: npm run build:elements
 *   2. Upload dist/crout-elements/* to crout-elements/<page-name>/
 *   3. Add a new elseif block below with is_page( 'your-page-slug' )
 *   4. Bump the version string when you redeploy.
 */
function crout_enqueue_angular_elements() {

    $base = get_template_directory_uri() . '/crout-elements/';

    // ── Home Page ────────────────────────────────────────────────────────────
    if ( is_front_page() || is_page( 'home' ) ) {

        wp_enqueue_script(
            'crout-elements-home',
            $base . 'home-page/main.js',
            [],       // no dependencies
            '1.0.0',  // bump on every redeploy
            true      // load in footer — required for Custom Elements
        );

        // Uncomment if home-page/styles.css exists in your dist output
        // wp_enqueue_style(
        //     'crout-elements-home-styles',
        //     $base . 'home-page/styles.css',
        //     [], '1.0.0'
        // );

    // ── Contact Page ─────────────────────────────────────────────────────────
    } elseif ( is_page( 'contact-us' ) || is_page( 'contact' ) ) {

        wp_enqueue_script(
            'crout-elements-contact',
            $base . 'contact-page/main.js',
            [], '1.0.0', true
        );

    // ── About Page ───────────────────────────────────────────────────────────
    } elseif ( is_page( 'about' ) || is_page( 'about-us' ) ) {

        wp_enqueue_script(
            'crout-elements-about',
            $base . 'about-page/main.js',
            [], '1.0.0', true
        );

    // ── Services Page ────────────────────────────────────────────────────────
    } elseif ( is_page( 'services' ) ) {

        wp_enqueue_script(
            'crout-elements-services',
            $base . 'services-page/main.js',
            [], '1.0.0', true
        );

    }

    // ── Load on ALL pages (shared elements used site-wide) ───────────────────
    // Uncomment this block only if you have components used on every page,
    // e.g. a shared banner or cookie notice Angular component.
    //
    // wp_enqueue_script(
    //     'crout-elements-global',
    //     $base . 'global/main.js',
    //     [], '1.0.0', true
    // );

}
add_action( 'wp_enqueue_scripts', 'crout_enqueue_angular_elements' );
```

### How the page slugs work

`is_page()` matches against the page **slug** set in WordPress
(Dashboard → Pages → Edit → Permalink). If your contact page URL is
`/contact-us`, use `is_page( 'contact-us' )`. You can also pass the page **ID**
for reliability:

```php
} elseif ( is_page( 42 ) ) {   // page ID from WP dashboard
```

---

## Step 4 — Add the Elements in Elementor

With the script enqueued, your Angular components are registered as native
Custom Elements and available anywhere on that page.

### In the Elementor Editor:

1. Open the page in **Elementor** (Dashboard → Pages → Edit with Elementor).
2. In the left widget panel, type **"HTML"** in the search box.
3. Drag the **HTML** widget into any section or container on the canvas.
4. Click the widget to open its settings.
5. In the **HTML Code** field, paste the element tag(s) you want:

```html
<!-- Drop the full home page sequence in one HTML widget -->
<ca-hero></ca-hero>
<ca-pain-point></ca-pain-point>
<ca-services-overview></ca-services-overview>
<ca-how-it-works></ca-how-it-works>
<ca-why-crout></ca-why-crout>
<ca-pricing></ca-pricing>
<ca-cta-banner></ca-cta-banner>
```

Or use **one HTML widget per section** for granular Elementor layout control:

```
Elementor Section 1
  └── HTML widget → <ca-hero></ca-hero>

Elementor Section 2
  └── HTML widget → <ca-pain-point></ca-pain-point>

Elementor Section 3
  └── HTML widget → <ca-services-overview></ca-services-overview>
```

6. Click **Update** (bottom of the left panel).
7. Click the **eye icon** to preview — Angular components will render live.

> **Tip:** Wrapping each `<ca-*>` in its own Elementor Section lets you control
> the spacing, background, and padding around each Angular component from the
> Elementor canvas without touching Angular code.

> **Note:** The Elementor editor preview may show a blank box for the Angular
> widget — this is normal. The components render correctly on the **live** /
> **preview** page because that's where `main.js` is actually loaded.

---

## Step 5 — Disable Elementor CSS Conflicts (Optional)

If Elementor's global styles are clashing with your Angular component styles,
add this below your enqueue function in `functions.php`:

```php
// Remove Elementor's frontend stylesheet on pages fully owned by Angular.
// Only use this if Angular covers 100% of the page content.
add_action( 'wp_enqueue_scripts', function() {
    if ( is_front_page() ) {
        wp_dequeue_style( 'elementor-frontend' );
    }
}, 20 );
```

---

## Step 6 — Redeploy Workflow

Every time you update an Angular component and want it live:

```bash
# 1. Rebuild
cd crout-automations
npm run build:elements

# 2. Re-upload main.js to the matching subfolder in your theme
#    e.g. crout-elements/home-page/main.js

# 3. Bump the version in functions.php
#    '1.0.0' → '1.0.1'  (forces browsers to fetch the new file)

# 4. Clear your WordPress cache plugin
#    WP Rocket: Dashboard → WP Rocket → Clear Cache
#    LiteSpeed: Dashboard → LiteSpeed Cache → Purge All
#    W3 Total Cache: Performance → Purge All Caches
```

### Automated deploy script

```bash
#!/bin/bash
# deploy-elements.sh — run from repo root after building
# Usage: bash deploy-elements.sh home-page

PAGE=${1:-home-page}
REMOTE_USER=user
REMOTE_HOST=your-server.com
REMOTE_PATH=/var/www/html/wp-content/themes/extendable/crout-elements

rsync -avz \
  crout-automations/dist/crout-elements/ \
  $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/$PAGE/

echo "✓ Deployed $PAGE to $REMOTE_HOST"
```

Run it as:
```bash
bash deploy-elements.sh home-page
bash deploy-elements.sh contact-page
```

---

## Available Custom Elements — Home Page

| Tag | Component | Description |
|---|---|---|
| `<ca-hero>` | HeroComponent | Hero / above-fold section |
| `<ca-pain-point>` | PainPointComponent | Problem statement section |
| `<ca-services-overview>` | ServicesOverviewComponent | Services grid / overview |
| `<ca-how-it-works>` | HowItWorksComponent | Process / steps section |
| `<ca-why-crout>` | WhyCroutComponent | Value proposition section |
| `<ca-pricing>` | PricingComponent | Pricing cards section |
| `<ca-cta-banner>` | CtaBannerComponent | Call-to-action banner |

> `<ca-nav>` and `<ca-footer>` are **not** in this bundle — they live in
> `wordpress-theme/` and are handled by the WordPress theme layer.

---

## Troubleshooting

**Components show as blank in Elementor editor?**
Normal — the editor doesn't load `main.js`. Use the **Preview** button or visit
the live page to see Angular components rendered.

**Elements not rendering on the live page?**
- Open DevTools → Console. A `SyntaxError` or `404` means the `main.js` path
  in `functions.php` is wrong. Double-check the slug used in `is_page()` and
  the subfolder name under `crout-elements/`.
- Confirm `true` is the last argument in `wp_enqueue_script()` — this puts the
  script in the footer, which is required for Custom Elements to work.

**Styles look broken?**
- Check DevTools for `box-sizing` or CSS reset conflicts from Elementor.
- To fully isolate a component's styles, add `:host { all: initial; box-sizing: border-box; }` 
  at the top of that component's `.scss` file.

**Old version still showing after redeploy?**
- Bump the version string in `wp_enqueue_script()` and do a hard refresh
  (`Ctrl + Shift + R`).
- Purge your WordPress cache plugin after every deploy.

**Wrong page loading the wrong bundle?**
- `is_page()` matches on slug, not title. Check the slug in
  WordPress Dashboard → Pages → Edit → Permalink field (below the title).
