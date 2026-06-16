# Crout Automations — WordPress Drop-In Guide

This guide explains how to replace Elementor sections with Angular Elements
(native Web Components compiled from this project).

---

## Step 1: Build the Angular Elements Bundle

```bash
cd crout-automations
npm install
npm run build:elements
```

This outputs a single JS file to:
```
crout-automations/dist/crout-elements/main.js
```

---

## Step 2: Upload to WordPress

Upload `main.js` to your WordPress media library or theme folder:
```
wp-content/themes/your-theme/js/crout-elements.js
```

---

## Step 3: Enqueue in functions.php

Add this to your active theme's `functions.php`:

```php
<?php
/**
 * Enqueue Crout Automations Angular Elements bundle.
 * Defers loading so it doesn't block the page render.
 */
function crout_enqueue_angular_elements() {
    wp_enqueue_script(
        'crout-elements',
        get_template_directory_uri() . '/js/crout-elements.js',
        [],           // no dependencies
        '1.0.0',      // bump this when you rebuild
        [
            'strategy'  => 'defer',   // non-blocking
            'in_footer' => true
        ]
    );
}
add_action( 'wp_enqueue_scripts', 'crout_enqueue_angular_elements' );
```

> **Note:** WordPress 6.3+ supports the `strategy` key in `wp_enqueue_script`.
> For older versions, use the `script_loader_tag` filter to add `defer` manually.

---

## Step 4: Use Custom Elements in Elementor (or any page template)

Once the script is enqueued, every custom element tag is available
anywhere in WordPress — Elementor, Gutenberg, page templates, or PHP.

### Option A: Elementor HTML Widget

1. Open Elementor editor
2. Drag in an **HTML** widget
3. Paste the element tag:

```html
<!-- Full page in order -->
<ca-nav></ca-nav>
<ca-hero></ca-hero>
<ca-pain-point></ca-pain-point>
<ca-services-overview></ca-services-overview>
<ca-how-it-works></ca-how-it-works>
<ca-why-crout></ca-why-crout>
<ca-pricing></ca-pricing>
<ca-cta-banner></ca-cta-banner>
<ca-footer></ca-footer>
```

Or drop individual sections into existing Elementor sections:
```html
<!-- Replace just the pricing section -->
<ca-pricing></ca-pricing>
```

### Option B: PHP Page Template

Create a custom page template (`page-automations.php`) in your theme:

```php
<?php
/**
 * Template Name: Crout Automations Page
 */
get_header();
?>

<ca-nav></ca-nav>
<main id="main-content">
    <ca-hero></ca-hero>
    <ca-pain-point></ca-pain-point>
    <ca-services-overview></ca-services-overview>
    <ca-how-it-works></ca-how-it-works>
    <ca-why-crout></ca-why-crout>
    <ca-pricing></ca-pricing>
    <ca-cta-banner></ca-cta-banner>
</main>
<ca-footer></ca-footer>

<?php get_footer(); ?>
```

Then assign this template to your page in the WordPress editor under
**Page Attributes → Template → Crout Automations Page**.

### Option C: Gutenberg Custom HTML Block

1. Add a **Custom HTML** block
2. Paste any `<ca-*>` tag
3. Publish — it renders on the front end automatically

---

## Step 5: Wire Up the n8n Contact Webhook

In `src/app/services/webhook.service.ts`, replace the placeholder URL
with your live n8n Production Webhook URL:

```typescript
private readonly WEBHOOK_URL = 'https://YOUR-N8N-INSTANCE/webhook/crout-contact';
```

Rebuild after changing:
```bash
npm run build:elements
```

### Recommended n8n Workflow for Contact Submissions

```
[Webhook] → [Set node: format data]
           → [Send Email: info@crout-holdings.com]
           → [WhatsApp: notify you on phone]
           → [Notion: log to CRM database]  (optional)
           → [Respond to Webhook: {"success": true}]
```

---

## Step 6: Disable Conflicting Elementor Sections

For any section replaced by a `<ca-*>` element:
1. Select the Elementor section
2. **Right-click → Hide** (or delete it)
3. The Angular Element fills the same position

---

## Rebuilding After Changes

```bash
# After any component/style changes:
npm run build:elements

# Then re-upload dist/crout-elements/main.js to WordPress
# Bump the version in functions.php to bust browser cache:
# '1.0.0' → '1.0.1'
```

---

## Browser Support

Custom Elements v1 is supported in all modern browsers (Chrome, Firefox,
Safari, Edge). No polyfills required for 2024+ target audience.

| Browser       | Support |
|---------------|---------|
| Chrome 67+    | ✅ Native |
| Firefox 63+   | ✅ Native |
| Safari 10.1+  | ✅ Native |
| Edge 79+      | ✅ Native |
| IE 11         | ❌ Not supported |

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Element renders blank | Check browser console for JS errors; ensure `main.js` loaded |
| Styles not applying | SCSS is bundled inside the JS; no separate CSS file needed |
| Form submission fails | Verify n8n webhook URL is correct and the workflow is **active** |
| Nav transparent on non-hero pages | Expected — it turns frosted glass on scroll past 40px |
| CORS error on webhook | Add your WordPress domain to n8n's allowed origins in Settings |
