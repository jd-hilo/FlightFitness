# RepDB free exercise bundle

Vendored from [RepDB free tier](https://github.com/sergei-argutin/exercise-dataset) / [repdb.co](https://repdb.co).

- `exercises.json` — English locale snapshot (~400 exercises)
- `images/flat/*.webp` — consistent 512px flat illustrations
- `LICENSE.md` / `ATTRIBUTION.md` — free-tier terms

**Attribution required in-app:** “Exercise data by RepDB (repdb.co)” (shown on Elite).

After replacing images, regenerate the Metro require map:

```bash
npm run gen:repdb-images
```

Flight palette recolor (black bg · gray mannequin · gold accents) — originals kept in `images/flat-original/`:

```bash
# needs Pillow, e.g. python3 -m venv /tmp/ff-img-venv && /tmp/ff-img-venv/bin/pip install pillow
/tmp/ff-img-venv/bin/python scripts/recolor-repdb-flight.py
```

Do not include `upgrade-samples/` (evaluation-only; not licensed for production).
