# Security Policy

## Supported Versions

Dreamcatcher is currently a prototype. Security fixes are applied to the `main`
branch.

## Reporting a Vulnerability

Do not open public issues for vulnerabilities, leaked credentials, or private
deployment details.

Report security concerns privately to the repository owner with:

- A concise description of the issue
- Reproduction steps or a proof of concept
- Impact and affected files/routes
- Whether any credentials or private data may have been exposed

## Secrets

Never commit `.env.local`, API keys, model provider tokens, personal access
tokens, browser session exports, or generated logs that may contain secrets.

Rotate any exposed key immediately, then remove it from git history before
making the repository public.
