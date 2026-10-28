import { allEndpoints } from './endpoints';
import { DOCS_BASE_URL } from './navigation';
import type { Endpoint, HeaderRow, SchemaField } from './types';

// Bundled OpenAPI 3.1 document for the interactive API explorer. It is built
// from the same endpoint registry the written reference uses, so the explorer
// cannot drift from the published contract: editing `lib/docs/endpoints.ts`
// changes the OpenAPI document, the derived schemas and the explorer UI without
// touching a React component.

export type OpenApiHttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface OpenApiSchema {
  type?: string;
  format?: string;
  description?: string;
  example?: unknown;
  default?: unknown;
  nullable?: boolean;
  enum?: unknown[];
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  items?: OpenApiSchema;
  allOf?: OpenApiSchema[];
  $ref?: string;
  /** Human-friendly type label from the source registry (e.g. "string (uuid)"). */
  'x-type-label'?: string;
  [key: string]: unknown;
}

export interface OpenApiParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required?: boolean;
  description?: string;
  example?: unknown;
  schema: OpenApiSchema;
}

export interface OpenApiMediaType {
  schema?: OpenApiSchema;
  example?: unknown;
}

export interface OpenApiRequestBody {
  required?: boolean;
  content: Record<string, OpenApiMediaType>;
}

export interface OpenApiResponse {
  description: string;
  content?: Record<string, OpenApiMediaType>;
  'x-error-code'?: string;
}

export interface OpenApiOperation {
  operationId: string;
  summary: string;
  description?: string;
  tags?: string[];
  security?: Array<Record<string, string[]>>;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, OpenApiResponse>;
  'x-rate-limit'?: string;
  'x-auth-note'?: string;
}

export type OpenApiPathItem = Partial<Record<OpenApiHttpMethod, OpenApiOperation>>;

export interface OpenApiTag {
  name: string;
  description?: string;
}

export interface OpenApiDocument {
  openapi: '3.1.0';
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{ url: string; description?: string }>;
  tags: OpenApiTag[];
  paths: Record<string, OpenApiPathItem>;
  components: {
    securitySchemes: Record<string, { type: 'http'; scheme: 'bearer'; description?: string }>;
    schemas: Record<string, OpenApiSchema>;
  };
}

export const OPENAPI_TAGS: OpenApiTag[] = [
  { name: 'Authentication', description: 'Exchange provider credentials or a signed wallet challenge for a BettaPay JWT.' },
  { name: 'Merchants', description: 'Create, read and update merchant profiles.' },
  { name: 'Payments', description: 'Create payment links, list payments and advance their status.' },
  { name: 'Settlements', description: 'Queue settlements and apply bulk approval actions.' },
  { name: 'FX & Rates', description: 'Read live exchange rates and request conversion quotes.' },
];

const ERROR_SCHEMA: OpenApiSchema = {
  type: 'object',
  description: 'Standard error envelope.',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Stable machine-readable error code.', example: 'VALIDATION_ERROR' },
        message: { type: 'string', description: 'Human-readable explanation.', example: 'amountUsdc must be a positive number' },
        details: {
          type: 'array',
          description: 'Optional field-level validation issues.',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

function tagFor(endpoint: Endpoint): string {
  if (endpoint.id.startsWith('auth-')) return 'Authentication';
  if (endpoint.id.startsWith('merchants-')) return 'Merchants';
  if (endpoint.id.startsWith('payments-')) return 'Payments';
  if (endpoint.id.startsWith('settlements-')) return 'Settlements';
  if (endpoint.id.startsWith('fx-')) return 'FX & Rates';
  return 'General';
}

function scalarType(rawType: string): OpenApiSchema {
  const type = rawType.toLowerCase();

  if (type.includes('boolean')) return { type: 'boolean' };
  if (type.includes('integer')) return { type: 'integer' };
  if (type.includes('number')) return { type: 'number' };
  if (type.includes('array') || type.includes('[]')) return { type: 'array' };
  if (type.includes('object')) return { type: 'object' };

  const schema: OpenApiSchema = { type: 'string' };
  const enumValues = Array.from(rawType.matchAll(/'([^']+)'/g), (match) => match[1]);
  if (enumValues.length > 0) schema.enum = enumValues;
  return schema;
}

function coerceExample(value: string, schema: OpenApiSchema): unknown {
  const trimmed = value.trim();

  if (schema.type === 'number' || schema.type === 'integer') {
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }
  if (schema.type === 'boolean') {
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
  }
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function fieldToSchema(field: SchemaField): OpenApiSchema {
  const schema: OpenApiSchema = {
    description: field.description,
    'x-type-label': field.type,
  };

  if (field.children && field.children.length > 0) {
    schema.type = 'object';
    schema.properties = Object.fromEntries(
      field.children.map((child) => [child.name, fieldToSchema(child)]),
    );
    const required = field.children.filter((child) => child.required).map((child) => child.name);
    if (required.length > 0) schema.required = required;
  } else {
    const rawType = field.type.toLowerCase();
    const isArray = rawType.includes('[]') || rawType.includes('array');

    if (isArray) {
      schema.type = 'array';
      schema.items = scalarType(rawType.replace('[]', '').replace(/array\s*(of\s*)?/, ''));
    } else {
      Object.assign(schema, scalarType(field.type));
    }

    if (rawType.includes('null')) schema.nullable = true;
  }

  if (field.example !== undefined) {
    schema.example = coerceExample(field.example, schema);
  }

  return schema;
}

function fieldsToSchema(fields: SchemaField[]): OpenApiSchema {
  const properties = Object.fromEntries(fields.map((field) => [field.name, fieldToSchema(field)]));
  const required = fields.filter((field) => field.required).map((field) => field.name);

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

function parameterFromField(field: SchemaField, location: 'path' | 'query' | 'header'): OpenApiParameter {
  return {
    name: field.name,
    in: location,
    required: location === 'path' ? true : field.required,
    description: field.description,
    example: field.example,
    schema: fieldToSchema(field),
  };
}

function headerToParameter(header: HeaderRow): OpenApiParameter {
  return {
    name: header.name,
    in: 'header',
    required: header.required,
    description: header.description,
    schema: {
      type: 'string',
      example: header.value,
      'x-type-label': 'string',
    },
  };
}

function isAuthHeader(header: HeaderRow): boolean {
  return header.name.toLowerCase() === 'authorization' || header.name.toLowerCase() === 'content-type';
}

function operationFromEndpoint(endpoint: Endpoint): OpenApiOperation {
  const parameters: OpenApiParameter[] = [
    ...(endpoint.pathParams ?? []).map((field) => parameterFromField(field, 'path')),
    ...(endpoint.queryParams ?? []).map((field) => parameterFromField(field, 'query')),
    ...(endpoint.requestHeaders ?? [])
      .filter((header) => !isAuthHeader(header))
      .map(headerToParameter),
  ];

  const requestSchema = fieldsToSchema(endpoint.requestBody ?? []);
  const hasRequestBody =
    (endpoint.requestBody?.length ?? 0) > 0 || endpoint.requestExample !== undefined;

  const requestBody: OpenApiRequestBody | undefined = hasRequestBody
    ? {
        required: endpoint.requestBody?.some((field) => field.required) ?? false,
        content: {
          'application/json': {
            schema: requestSchema,
            ...(endpoint.requestExample !== undefined ? { example: endpoint.requestExample } : {}),
          },
        },
      }
    : undefined;

  const responses: Record<string, OpenApiResponse> = {
    [String(endpoint.responseStatus)]: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: fieldsToSchema(endpoint.responseSchema ?? []),
          example: endpoint.responseExample,
        },
      },
    },
  };

  for (const error of endpoint.errors) {
    const key = String(error.status);
    if (!responses[key]) {
      responses[key] = {
        description: error.description,
        'x-error-code': error.code,
        content: {
          'application/json': { schema: ERROR_SCHEMA },
        },
      };
    }
  }

  return {
    operationId: endpoint.id,
    summary: endpoint.title,
    description: endpoint.description,
    tags: [tagFor(endpoint)],
    security: endpoint.auth ? [{ bearerAuth: [] }] : [],
    ...(parameters.length > 0 ? { parameters } : {}),
    ...(requestBody ? { requestBody } : {}),
    responses,
    ...(endpoint.rateLimit ? { 'x-rate-limit': endpoint.rateLimit } : {}),
    ...(endpoint.authNote ? { 'x-auth-note': endpoint.authNote } : {}),
  };
}

function toOpenApiPath(path: string): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

/** Build an OpenAPI document from the endpoint registry. */
export function buildOpenApiDocument(endpoints: Endpoint[]): OpenApiDocument {
  const paths: Record<string, OpenApiPathItem> = {};

  for (const endpoint of endpoints) {
    const path = toOpenApiPath(endpoint.path);
    const pathItem = paths[path] ?? {};
    pathItem[endpoint.method.toLowerCase() as OpenApiHttpMethod] = operationFromEndpoint(endpoint);
    paths[path] = pathItem;
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'BettaPay API',
      version: '1.0.0',
      description:
        'Accept USDC on Stellar, settle to fiat, register merchants and read live FX rates. This bundled document powers the interactive API explorer.',
    },
    servers: [{ url: DOCS_BASE_URL, description: 'BettaPay gateway' }],
    tags: OPENAPI_TAGS,
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'BettaPay JWT (or a dev API key) sent as `Authorization: Bearer <token>`.',
        },
      },
      schemas: {},
    },
  };
}

/** The bundled OpenAPI document that drives `/docs/api`. */
export const openApiDocument: OpenApiDocument = buildOpenApiDocument(allEndpoints);
