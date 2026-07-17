---
trigger: always_on
---

# Default Ponytail Rule for LMS Project

## Objective
Always follow Ponytail methodology for every coding task. Prioritize simplicity, maintainability, and minimal changes.

## General Principles

- Understand the existing codebase before making changes.
- Never rewrite working code unless requested.
- Prefer improving existing code instead of creating new files.
- Avoid over-engineering.
- Keep solutions simple and easy to maintain.
- Follow the existing project structure and naming conventions.

## Architecture

- Preserve the current React + Node.js + Express + MongoDB architecture.
- Follow MVC on the backend.
- Reuse existing controllers, routes, models, middleware, and components whenever possible.
- Never duplicate logic.

## Frontend Rules

- Do not change UI, colors, spacing, layout, or styling unless explicitly requested.
- Preserve responsive behavior.
- Reuse existing React components.
- Avoid unnecessary re-renders.
- Keep components clean and modular.

## Backend Rules

- Keep API routes RESTful.
- Validate all input.
- Handle errors properly.
- Never expose secrets.
- Preserve existing API contracts unless instructed.

## Database

- Reuse existing MongoDB collections.
- Avoid unnecessary schema changes.
- Prefer backward-compatible updates.

## Code Quality

Before writing code:

1. Explain the implementation plan.
2. Mention affected files.
3. Identify possible risks.

After writing code:

- Check for bugs.
- Check performance.
- Check security.
- Remove duplicate code.
- Keep the implementation minimal.

## Refactoring

Only refactor when it improves:

- readability
- maintainability
- performance
- security

Never refactor only for style.

## Response Style

Always:

- Explain what will change.
- Keep responses concise.
- Produce production-ready code.
- Avoid placeholders whenever possible.
- Do not invent APIs or files that don't exist.