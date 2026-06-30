# Architecture Decision Records (ADRs)

This directory records the significant architectural decisions made on the
BettaPay frontend. An ADR captures the **context** a decision was made in, the
**decision** itself, and the **consequences** that follow — so future
contributors can understand the "why" behind the code rather than reverse
engineering it.

## Format

Each ADR follows a lightweight template:

- **Title** — a short noun phrase describing the decision.
- **Status** — `Proposed`, `Accepted`, `Deprecated`, or `Superseded by ADR-NNN`.
- **Context** — the forces at play: requirements, constraints, alternatives.
- **Decision** — what we chose to do.
- **Consequences** — the resulting trade-offs, both positive and negative.

## Index

| ADR | Title | Status |
| --- | ----- | ------ |
| [001](001-state-management.md) | State management with Zustand | Accepted |
| [002](002-ui-primitives.md) | UI primitives with @base-ui/react | Accepted |
| [003](003-payment-infra.md) | Payment infrastructure on Stellar + Soroban | Accepted |
| [004](004-mock-auth.md) | Mock authentication for preview deployments | Accepted |
| [005](005-theming.md) | Theming with next-themes and CSS variables | Accepted |

## Adding a new ADR

1. Copy the structure of an existing ADR.
2. Number it with the next sequential integer (e.g. `006-...`).
3. Set the status to `Proposed` until the team agrees, then `Accepted`.
4. Never delete an ADR — if a decision is reversed, write a new ADR and mark the
   old one `Superseded by ADR-NNN`. The history is the value.
