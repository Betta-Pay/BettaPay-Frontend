import type { HttpMethod, SchemaField } from './types';
import type {
  OpenApiDocument,
  OpenApiMediaType,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiSchema,
} from './openapi';

// Derives a serialisable view model for the interactive API explorer from an
// OpenAPI document. Everything the explorer renders — endpoint groups,
// parameters, schemas, request examples, auth and rate-limit notes — comes from
// the document, so schema changes never require editing a React component.

export interface ExplorerEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  tag: string;
  auth: boolean;
  authNote?: string;
  rateLimit?: string;
  pathParams: SchemaField[];
  queryParams: SchemaField[];
  headerParams: SchemaField[];
  requestBody: SchemaField[];
  requestExample?: unknown;
  requestContentType: string;
  responseStatus: number;
  responseSchema: SchemaField[];
  responseExample?: unknown;
  errors: Array<{ status: number; code: string; description: string }>;
}

export interface ExplorerGroup {
  id: string;
  title: string;
  description?: string;
  endpoints: ExplorerEndpoint[];
}

export interface ExplorerModel {
  title: string;
  version: string;
  description: string;
  baseUrl: string;
  securityScheme: string;
  groups: ExplorerGroup[];
  endpoints: ExplorerEndpoint[];
}

const HTTP_METHODS: Array<{ key: Lowercase<HttpMethod>; method: HttpMethod }> = [
  { key: 'get', method: 'GET' },
  { key: 'post', method: 'POST' },
  { key: 'put', method: 'PUT' },
  { key: 'patch', method: 'PATCH' },
  { key: 'delete', method: 'DELETE' },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function resolveSchema(schema: OpenApiSchema | undefined, doc: OpenApiDocument): OpenApiSchema {
  if (!schema) return {};
  let current = schema;
  const seen = new Set<string>();

  while (current.$ref && !seen.has(current.$ref)) {
    seen.add(current.$ref);
    const ref = current.$ref;
    if (!ref.startsWith('#/components/schemas/')) break;
    const name = ref.slice('#/components/schemas/'.length);
    current = doc.components.schemas[name] ?? {};
  }

  if (current.allOf && current.allOf.length > 0) {
    const merged: OpenApiSchema = { type: 'object', properties: {}, required: [] };
    for (const part of current.allOf) {
      const resolved = resolveSchema(part, doc);
      Object.assign(merged.properties ?? {}, resolved.properties ?? {});
      const required = new Set([...(merged.required ?? []), ...(resolved.required ?? [])]);
      merged.required = Array.from(required);
      if (resolved.description && !merged.description) merged.description = resolved.description;
    }
    return { ...current, ...merged };
  }

  return current;
}

function schemaExample(schema: OpenApiSchema, doc: OpenApiDocument): unknown {
  const resolved = resolveSchema(schema, doc);

  if (resolved.example !== undefined) return resolved.example;
  if (resolved.default !== undefined) return resolved.default;
  if (resolved.enum && resolved.enum.length > 0) return resolved.enum[0];

  switch (resolved.type) {
    case 'object': {
      const example: Record<string, unknown> = {};
      for (const [name, child] of Object.entries(resolved.properties ?? {})) {
        example[name] = schemaExample(child, doc);
      }
      return example;
    }
    case 'array':
      return resolved.items ? [schemaExample(resolved.items, doc)] : [];
    case 'integer':
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'null':
      return null;
    case 'string':
    default:
      if (resolved.format === 'date-time') return '2026-01-01T00:00:00.000Z';
      if (resolved.format === 'uuid') return '00000000-0000-4000-8000-000000000000';
      if (resolved.format === 'email') return 'user@example.com';
      return resolved.example ?? 'string';
  }
}

function displayExample(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function typeLabel(schema: OpenApiSchema, doc: OpenApiDocument): string {
  const resolved = resolveSchema(schema, doc);
  if (resolved['x-type-label']) return resolved['x-type-label'];

  if (resolved.enum && resolved.enum.length > 0) {
    return resolved.enum.map((value) => `'${String(value)}'`).join(' | ');
  }

  if (resolved.type === 'array') {
    const itemLabel = resolved.items ? typeLabel(resolved.items, doc) : 'unknown';
    return `${itemLabel}[]`;
  }

  const base = resolved.type ?? 'object';
  return resolved.nullable ? `${base} | null` : base;
}

function schemaChildren(schema: OpenApiSchema, doc: OpenApiDocument): SchemaField[] {
  const resolved = resolveSchema(schema, doc);

  if (resolved.properties) {
    return fieldsFromObject(resolved, doc);
  }

  if (resolved.type === 'array' && resolved.items) {
    const items = resolveSchema(resolved.items, doc);
    if (items.properties) return fieldsFromObject(items, doc);
  }

  return [];
}

function fieldFromSchema(
  name: string,
  schema: OpenApiSchema,
  required: boolean,
  doc: OpenApiDocument,
): SchemaField {
  const resolved = resolveSchema(schema, doc);
  const example = displayExample(
    resolved.example !== undefined ? resolved.example : schemaExample(resolved, doc),
  );

  const field: SchemaField = {
    name,
    type: typeLabel(resolved, doc),
    required,
    description: resolved.description ?? '',
    ...(example !== undefined ? { example } : {}),
  };

  const children = schemaChildren(resolved, doc);
  if (children.length > 0) field.children = children;

  return field;
}

function fieldsFromObject(schema: OpenApiSchema, doc: OpenApiDocument): SchemaField[] {
  const resolved = resolveSchema(schema, doc);
  const required = new Set(resolved.required ?? []);

  return Object.entries(resolved.properties ?? {}).map(([name, child]) =>
    fieldFromSchema(name, child, required.has(name), doc),
  );
}

function parameterToField(parameter: OpenApiParameter, doc: OpenApiDocument): SchemaField {
  const schema = resolveSchema(parameter.schema, doc);
  const example = displayExample(
    parameter.example !== undefined ? parameter.example : schemaExample(schema, doc),
  );

  return {
    name: parameter.name,
    type: typeLabel(schema, doc),
    required: parameter.required ?? parameter.in === 'path',
    description: parameter.description ?? schema.description ?? '',
    ...(example !== undefined ? { example } : {}),
  };
}

function firstMediaType(
  content: Record<string, OpenApiMediaType> | undefined,
  preferred = 'application/json',
): { contentType: string; media?: OpenApiMediaType } {
  if (!content) return { contentType: preferred };
  const key = content[preferred] ? preferred : Object.keys(content)[0];
  if (!key) return { contentType: preferred };
  return { contentType: key, media: content[key] };
}

function requestExample(
  operation: OpenApiOperation,
  doc: OpenApiDocument,
): { example?: unknown; contentType: string; schema?: OpenApiSchema } {
  const { contentType, media } = firstMediaType(operation.requestBody?.content);
  if (!media) return { contentType };
  if (media.example !== undefined) return { example: media.example, contentType, schema: media.schema };
  if (!media.schema) return { contentType };
  return { example: schemaExample(media.schema, doc), contentType, schema: media.schema };
}

function successResponse(operation: OpenApiOperation): {
  status: number;
  description: string;
  media?: OpenApiMediaType;
  contentType: string;
} {
  const entries = Object.entries(operation.responses);
  const success = entries.find(([status]) => /^2\d\d$/.test(status)) ?? entries[0];
  if (!success) return { status: 200, description: 'Successful response', contentType: 'application/json' };

  const [status, response] = success;
  const { contentType, media } = firstMediaType(response.content);
  return {
    status: Number(status),
    description: response.description,
    media,
    contentType,
  };
}

function endpointFromOperation(
  path: string,
  method: HttpMethod,
  operation: OpenApiOperation,
  doc: OpenApiDocument,
): ExplorerEndpoint {
  const parameters = (operation.parameters ?? []).map((parameter) => ({
    ...parameter,
    schema: resolveSchema(parameter.schema, doc),
  }));

  const response = successResponse(operation);
  const request = requestExample(operation, doc);
  const responseSchema = response.media?.schema;

  const responseExampleValue =
    response.media?.example !== undefined
      ? response.media.example
      : responseSchema
        ? schemaExample(responseSchema, doc)
        : undefined;

  const errors = Object.entries(operation.responses)
    .filter(([status]) => !/^2\d\d$/.test(status))
    .map(([status, value]) => ({
      status: Number(status),
      code: value['x-error-code'] ?? value.description.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
      description: value.description,
    }));

  return {
    id: operation.operationId ?? slugify(`${method}-${path}`),
    method,
    path,
    title: operation.summary,
    description: operation.description ?? '',
    tag: operation.tags?.[0] ?? 'General',
    auth: (operation.security?.length ?? 0) > 0,
    ...(operation['x-auth-note'] ? { authNote: operation['x-auth-note'] } : {}),
    ...(operation['x-rate-limit'] ? { rateLimit: operation['x-rate-limit'] } : {}),
    pathParams: parameters.filter((p) => p.in === 'path').map((p) => parameterToField(p, doc)),
    queryParams: parameters.filter((p) => p.in === 'query').map((p) => parameterToField(p, doc)),
    headerParams: parameters.filter((p) => p.in === 'header').map((p) => parameterToField(p, doc)),
    requestBody: request.schema ? fieldsFromObject(request.schema, doc) : [],
    ...(request.example !== undefined ? { requestExample: request.example } : {}),
    requestContentType: request.contentType,
    responseStatus: response.status,
    responseSchema: responseSchema ? fieldsFromObject(responseSchema, doc) : [],
    ...(responseExampleValue !== undefined ? { responseExample: responseExampleValue } : {}),
    errors,
  };
}

/** Turn an OpenAPI document into the explorer's serialisable view model. */
export function buildExplorerModel(doc: OpenApiDocument): ExplorerModel {
  const endpoints: ExplorerEndpoint[] = [];

  for (const [path, pathItem] of Object.entries(doc.paths)) {
    for (const { key, method } of HTTP_METHODS) {
      const operation = pathItem[key];
      if (operation) endpoints.push(endpointFromOperation(path, method, operation, doc));
    }
  }

  const groupMap = new Map<string, ExplorerGroup>();
  for (const tag of doc.tags) {
    groupMap.set(tag.name, {
      id: slugify(tag.name),
      title: tag.name,
      ...(tag.description ? { description: tag.description } : {}),
      endpoints: [],
    });
  }

  for (const endpoint of endpoints) {
    let group = groupMap.get(endpoint.tag);
    if (!group) {
      group = { id: slugify(endpoint.tag), title: endpoint.tag, endpoints: [] };
      groupMap.set(endpoint.tag, group);
    }
    group.endpoints.push(endpoint);
  }

  const securityScheme = Object.keys(doc.components.securitySchemes)[0] ?? 'bearerAuth';

  return {
    title: doc.info.title,
    version: doc.info.version,
    description: doc.info.description,
    baseUrl: doc.servers[0]?.url ?? '',
    securityScheme,
    groups: Array.from(groupMap.values()).filter((group) => group.endpoints.length > 0),
    endpoints,
  };
}
