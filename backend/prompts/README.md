# Prompts — Local Only (not committed to git)

This folder contains AI prompt templates used by the backend's `FoundryService`.
It is listed in `.gitignore` and stays on your local machine only.

## Folder layout

```
prompts/
  prod/    ← active prompts used by the live cron runs
  dev/     ← prompts for local experimentation / iteration
```

## Switching environments

Set `PROMPT_ENV` in `backend/.env`:

```
PROMPT_ENV=dev   # load from prompts/dev/  (default)
PROMPT_ENV=prod  # load from prompts/prod/
```

You can also override the base directory entirely with `PROMPT_DIR` (absolute path).

## Placeholder syntax

Prompt files are plain Markdown. Dynamic values are injected by the code using
`{{VARIABLE}}` placeholders. Available variables are documented at the top of
each file.
