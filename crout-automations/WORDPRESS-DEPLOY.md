# Crout Automations Home Page — WordPress Deploy Guide

This guide walks you through building the Angular Elements bundle and publishing it to your WordPress theme so Elementor can reference it.

---

## Step 1 — Build the Elements Bundle

Inside the `crout-automations/` directory, run:

```bash
npm run build:elements
```

This compiles using the `elements` configuration in `angular.json`. When complete, your output will be at:

```
crout-automations/dist/crout-elements/
  └── main.js        ← single JS file, no hash, fully optimised
```

> `outputHashing` is set to `none` so the filename never changes — WordPress can always reference `main.js` with no cache-busting headaches.

---

## Step 2 — Copy the Bundle to Your WordPress Theme

Navigate to your WordPress installation and copy the built file into your active theme:

```bash
# From the repo root
cp crout-automations/dist/crout-elements/main.js \
   /path/to/wordpress/wp-content/themes/YOUR-THEME-NAME/crout-elements/main.js
```

Replace `YOUR-THEME-NAME` with your actual theme folder name (e.g. `crout-holdings`, `hello-elementor`, etc.).

Final path on server:
```
wp-content/
  themes/
    YOUR-THEME-NAME/
      crout-elements/
        main.js
```

> **FTP / cPanel users:** Upload `main.js` to the `crout-elements/` folder inside your theme via FTP client (FileZilla, WinSCP) or cPanel File Manager.

---

## Step 3 — Enqueue the Script in WordPress

Open your theme's `functions.php` and add the following snippet. This tells WordPress to load the Angular bundle on the correct page.

```php
/**
 * Enqueue Crout Automations Angular Elements bundle.
 * Loads only on the home page to keep other pages lean.
 */
function crout_enqueue_angular_elements() {
    if ( is_front_page() || is_page( 'home' ) ) {
        wp_enqueue_script(
            'crout-elements',
            get_template_directory_uri() . '/crout-elements/main.js',
            [],          // no dependencies
            '1.0.0',     // bump this version when you redeploy
            true         // load in footer
        );
    }
}
add_action( 'wp_enqueue_scripts', 'crout_enqueue_angular_elements' );
```

> If you want it available on **all pages** (e.g. the contact page also uses Angular components), remove the `if` condition and leave just `wp_enqueue_script(...)` inside the function.

---

## Step 4 — Reference the Elements in Elementor

Your Angular components are now registered as native Custom Elements. You can drop them anywhere in Elementor using an **HTML widget**.

### In Elementor Editor:
1. Open the page in **Elementor**.
2. In the left panel, search for **"HTML"** widget.
3. Drag it to the section where you want the Angular content to appear.
4. In the HTML widget content field, add the element tag:

```html
<!-- Full home page sequence -->
<ca-hero></ca-hero>
<ca-pain-point></ca-pain-point>
<ca-services-overview></ca-services-overview>
<ca-how-it-works></ca-how-it-works>
<ca-why-crout></ca-why-crout>
<ca-pricing></ca-pricing>
<ca-cta-banner></ca-cta-banner>
```

Or drop individual sections into specific Elementor sections:

```html
<!-- Hero section only -->
<ca-hero></ca-hero>
```

```html
<!-- Pricing section only -->
<ca-pricing></ca-pricing>
```

5. Click **Update** / **Publish**.
6. Preview the page — the Angular components will render inside the Elementor layout.

> **Tip:** You can wrap each `<ca-*>` tag in an Elementor Section/Container so Elementor's spacing and layout controls still apply around the Angular content.

---

## Step 5 — Disable Elementor's Default Styles Conflicting with Angular (Optional)

If Elementor's global CSS resets are clashing with your Angular component styles, add this to your theme's `functions.php`:

```php
// Disable Elementor frontend stylesheet on pages where Angular handles all styling
add_action( 'wp_enqueue_scripts', function() {
    if ( is_front_page() ) {
        wp_dequeue_style( 'elementor-frontend' );
    }
}, 20 );
```

> Use this **only** if the Angular components are covering 100% of page content. If you're mixing Elementor widgets and Angular elements on the same page, leave this out.

---

## Step 6 — Version & Redeploy Workflow

Every time you make changes to the Angular components:

```bash
# 1. Rebuild
npm run build:elements

# 2. Re-upload main.js to the same path in your theme

# 3. Bump the version in functions.php
#    '1.0.0' → '1.0.1' (or use a timestamp)
#    This forces browsers to fetch the fresh file instead of serving cache
```

Or automate it with a deployment script:

```bash
#!/bin/bash
# deploy-elements.sh
cd crout-automations
npm run build:elements
rsync -avz dist/crout-elements/main.js \
  user@your-server:/var/www/html/wp-content/themes/YOUR-THEME-NAME/crout-elements/main.js
echo "Deployed successfully."
```

---

## Available Custom Elements

| Tag | Component | Description |
|---|---|---|
| `<ca-hero>` | HeroComponent | Hero / above-fold section |
| `<ca-pain-point>` | PainPointComponent | Problem statement section |
| `<ca-services-overview>` | ServicesOverviewComponent | Services grid / overview |
| `<ca-how-it-works>` | HowItWorksComponent | Process / steps section |
| `<ca-why-crout>` | WhyCroutComponent | Value proposition section |
| `<ca-pricing>` | PricingComponent | Pricing cards section |
| `<ca-cta-banner>` | CtaBannerComponent | Call-to-action banner |

> `<ca-nav>` and `<ca-footer>` are **not** in this bundle. They live in `wordpress-theme/` and must be implemented at the WordPress theme level.

---

## Troubleshooting

**Elements not rendering?**
- Open browser DevTools → Console. If you see `Uncaught SyntaxError`, the `main.js` path in `functions.php` is wrong — double-check `get_template_directory_uri()`.
- Make sure the script is loading **after** the DOM element. The `true` parameter in `wp_enqueue_script()` places it in the footer — this is correct.

**Styles look wrong?**
- Elementor injects its own CSS resets. Check for `all: revert` or `box-sizing` conflicts in DevTools.
- Add `:host { all: initial; }` to your component SCSS files to isolate styles if needed — but note this only works inside Shadow DOM (not used here by default).

**Old version still showing after redeploy?**
- Bump the version string in `wp_enqueue_script()` and hard-refresh the browser (`Ctrl+Shift+R`).
- Clear any page caching plugin (WP Rocket, W3 Total Cache, LiteSpeed Cache) after each deploy.
