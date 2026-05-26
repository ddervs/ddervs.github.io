# Personal website

Source for [ddervs.github.io](https://ddervs.github.io). Jekyll site, deployed via GitHub Pages.

## Running locally

Requires Ruby `3.4.9` (see [`.ruby-version`](.ruby-version)). With [rbenv](https://github.com/rbenv/rbenv):

```bash
rbenv install              # picks up .ruby-version
bundle install
bundle exec jekyll serve
```

Then open <http://127.0.0.1:4000>. For a one-off build with no watch:

```bash
bundle exec jekyll build
```

## Authoring

### New post

Create `_posts/YYYY-MM-DD-title.md` with front matter:

```yaml
---
layout: post
title: A nice title
date: 2026-05-25 09:00:00
author: ddervs
short_description: One-sentence excerpt shown on the blog index.
---
```

### Math

MathJax 2.7.5 is loaded site-wide. Inline: `$x = 1$`. Display: `$$ ... $$` on its own line.

### Code blocks

Fenced blocks with a language tag are syntax-highlighted by Rouge:

````markdown
```python
def hello():
    print("hi")
```
````

A bare ` ``` ` block stays monospaced with no token colours.

### Drop cap

The first letter of a paragraph can be rendered as a magazine drop cap. It is **opt-in** — add the kramdown attribute on the line below the paragraph:

```markdown
In life it seems as if it's always tough to make the right decision...
{:.lede}
```

Off by default because some posts open with a `$\newcommand$` MathJax preamble — auto-applying the drop cap would render a giant `$`.

### Disabling comments on a single post

Add `comments: false` to that post's front matter. To disable site-wide, blank the `disqus.shortname` in [`_config.yml`](_config.yml).

## Theme

Light / dark toggle lives at the bottom of the sidebar. The choice is persisted in `localStorage`; first-time visitors follow the OS `prefers-color-scheme`.

To retint the site, edit the CSS variables under `:root` (light) and `[data-mode="dark"]` (dark) in [`_sass/_styles.scss`](_sass/_styles.scss). The `--tok-*` variables drive syntax-highlight colours and shift with the mode automatically. Fonts come from Google Fonts and are pulled in by [`_includes/head.html`](_includes/head.html).

## Layout

| Path | What |
| --- | --- |
| `_posts/` | Blog posts |
| `_layouts/` | Page chrome (`default.html`, `post.html`) |
| `_includes/` | Head, nav, footer, social icons |
| `_sass/_styles.scss` | All theme styles (palette, typography, layout) |
| `css/main.scss` | SCSS entrypoint — just imports `_styles` |
| `css/syntax.css` | Rouge token styling — references theme vars |
| `_config.yml` | Site settings, nav order, socials, Disqus |

## Baseurl note

`baseurl` is `""` for the deployed site. If you ever rehost under a subpath, set `baseurl: "/subpath"` in `_config.yml` and run the dev server with `bundle exec jekyll serve --baseurl ""` — otherwise local links will 404.
