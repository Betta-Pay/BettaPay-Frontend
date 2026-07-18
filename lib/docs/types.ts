// Shared types for the API documentation system (`/docs`).
//
// Everything the docs render — the sidebar tree, breadcrumbs, the table of
// contents, endpoint blocks, schema tables and generated code samples — is
// derived from these typed structures so the surface is described in exactly
// one place and never drifts between the navigation and the content.

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** Languages we auto-generate request examples for. */
export type SampleLanguage = 'curl' | 'node-fetch' | 'node-axios' | 'python' | 'react';

// ─── Navigation ────────────────────────────────────────────────────────────

/** A single leaf in the sidebar / a section anchor on the page. */
export interface NavItem {
  /** Stable id, also used as the section's DOM `id` and anchor hash. */
  id: string;
  /** Human label shown in the sidebar, TOC and breadcrumbs. */
  title: string;
}

/** A top-level collapsible group in the sidebar (e.g. "API Reference"). */
export interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

/**
 * One row in a request/response schema table. `children` renders nested/indented
 * fields (e.g. the shape of an object property or array element).
 */
export interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: string;
  children?: SchemaField[];
}

/** A request header row (Field / Value / Required / Description). */
export interface HeaderRow {
  name: string;
  value: string;
  required: boolean;
  description: string;
}

/** A documented error case for an endpoint. */
export interface ErrorCase {
  status: number;
  code: string;
  description: string;
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

export interface Endpoint {
  /** Stable id used as the endpoint's anchor within its section. */
  id: string;
  title: string;
  description: string;
  method: HttpMethod;
  /** Path relative to the base URL, e.g. `/api/payments/:id`. */
  path: string;
  /** Whether the route sits behind `fastify.authenticate` (JWT required). */
  auth: boolean;
  authNote?: string;
  requestHeaders?: HeaderRow[];
  pathParams?: SchemaField[];
  queryParams?: SchemaField[];
  requestBody?: SchemaField[];
  /** Example request payload — also drives the generated code samples. */
  requestExample?: Record<string, unknown>;
  /** Successful HTTP status returned by the route. */
  responseStatus: number;
  responseSchema?: SchemaField[];
  /** Example success body (already wrapped in the `{ data }` envelope). */
  responseExample: unknown;
  errors: ErrorCase[];
  rateLimit?: string;
}
