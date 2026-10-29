# matsuyhit.github.io

Personal site of Hitoshi Matsuyama (松山 仁). Plain HTML, CSS and ES modules — no build step, no dependencies.

## Run locally

ES modules don't load from `file://`, so serve the folder:

```sh
python3 -m http.server 8765
# open http://localhost:8765  (add ?lang=ja for Japanese)
```

## Layout

```
index.html             all content (both languages)
favicon.svg
assets/css/style.css   design tokens (light/dark) → components → sections → demos
assets/js/main.js      language/theme, nav, reveal, publication filter, copy, YouTube facades
assets/js/dancer.js    procedural 3D waltz figure (ballroom sensor-fusion demo)
assets/js/demos.js     IRIS Fig. 3 re-creation (bilingual strings inside)
assets/img/            photos, DocuDebug figure/poster (from the project page), og.png
```

## Editing content

- **Bilingual text** lives side by side in `index.html`:
  `<span lang="en">Work</span><span lang="ja">研究事例</span>`.
  Only the active language is shown. Japanese text that should *always* show
  (e.g. Japanese paper titles) uses `lang="ja-JP"` instead of `lang="ja"`.
- **Translated attributes** (placeholder, aria-label) use
  `data-i18n-attr="placeholder" data-en-placeholder="…" data-ja-placeholder="…"`.
- **Adding a paper**: copy an `<li class="pub">` block in the Publications section.
  Set `data-type` (`conference`, `journal`, `workshop`, `domestic` — space-separated)
  and `data-year`. Filter counts, year grouping and “Cite” update automatically.
- **IRIS demo strings** are the `IRIS` object in `assets/js/demos.js`.
- **Email** is stored reversed + base64 in `data-e` on the contact button and only
  assembled on click. To change it:
  `python3 -c "import base64;print(base64.b64encode('you@example.com'[::-1].encode()).decode())"`
