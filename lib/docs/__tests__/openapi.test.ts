import { allEndpoints } from '@/lib/docs/endpoints';
import {
  buildOpenApiDocument,
  openApiDocument,
  type OpenApiDocument,
  type OpenApiOperation,
} from '@/lib/docs/openapi';
import { buildExplorerModel } from '@/lib/docs/openapi-explorer';

function countOperations(doc: OpenApiDocument): number {
  return Object.values(doc.paths).reduce(
    (total, pathItem) => total + Object.values(pathItem).filter(Boolean).length,
    0,
  );
}

function cloneDocument(doc: OpenApiDocument): OpenApiDocument {
  return JSON.parse(JSON.stringify(doc)) as OpenApiDocument;
}

describe('bundled OpenAPI document', () => {
  it('exposes exactly one operation per registered endpoint', () => {
    expect(countOperations(openApiDocument)).toBe(allEndpoints.length);

    const operationIds = Object.values(openApiDocument.paths).flatMap((pathItem) =>
      Object.values(pathItem)
        .filter((operation): operation is OpenApiOperation => Boolean(operation))
        .map((operation) => operation.operationId),
    );

    expect(new Set(operationIds).size).toBe(allEndpoints.length);
    expect(operationIds.sort()).toEqual(allEndpoints.map((endpoint) => endpoint.id).sort());
  });

  it('uses OpenAPI path templating and documents every response', () => {
    for (const path of Object.keys(openApiDocument.paths)) {
      expect(path).not.toContain(':');

      for (const operation of Object.values(openApiDocument.paths[path])) {
        expect(operation?.responses && Object.keys(operation.responses).length).toBeGreaterThan(0);
        expect(operation?.tags?.length).toBeGreaterThan(0);
        expect(operation?.summary).toBeTruthy();
      }
    }
  });

  it('marks authenticated operations with the bearer scheme', () => {
    const authenticated = allEndpoints.filter((endpoint) => endpoint.auth);
    expect(authenticated.length).toBeGreaterThan(0);

    for (const endpoint of authenticated) {
      const operation = Object.values(openApiDocument.paths)
        .flatMap((pathItem) => Object.values(pathItem))
        .find((candidate) => candidate?.operationId === endpoint.id);

      expect(operation?.security).toEqual([{ bearerAuth: [] }]);
    }
  });

  it('is regenerated from the endpoint registry', () => {
    const rebuilt = buildOpenApiDocument(allEndpoints);
    expect(rebuilt).toEqual(openApiDocument);
  });
});

describe('explorer model', () => {
  const model = buildExplorerModel(openApiDocument);

  it('derives every endpoint from the document', () => {
    expect(model.endpoints).toHaveLength(allEndpoints.length);
    expect(model.endpoints.map((endpoint) => endpoint.id).sort()).toEqual(
      allEndpoints.map((endpoint) => endpoint.id).sort(),
    );
    expect(model.groups.flatMap((group) => group.endpoints)).toHaveLength(allEndpoints.length);
  });

  it('resolves path and query parameters with schema-derived examples', () => {
    const getPayment = model.endpoints.find((endpoint) => endpoint.id === 'payments-get');

    expect(getPayment?.path).toBe('/api/payments/{id}');
    expect(getPayment?.pathParams).toEqual([
      expect.objectContaining({ name: 'id', required: true, example: '9b2f...' }),
    ]);

    const listPayments = model.endpoints.find((endpoint) => endpoint.id === 'payments-list');
    expect(listPayments?.queryParams.map((param) => param.name)).toEqual(['status', 'limit']);
  });

  it('uses the operation example when present and otherwise generates one from the schema', () => {
    const createPayment = model.endpoints.find((endpoint) => endpoint.id === 'payments-create');
    expect(createPayment?.requestExample).toEqual({
      amountUsdc: 25.0,
      currency: 'USDC',
      source: 'checkout',
    });

    const doc = cloneDocument(openApiDocument);
    const operation = doc.paths['/api/merchants/{id}'].patch!;
    delete operation.requestBody?.content['application/json'].example;
    operation.requestBody!.content['application/json'].schema = {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'Acme Global', description: 'New display name.' },
      },
    };

    const patched = buildExplorerModel(doc);
    const updateMerchant = patched.endpoints.find((endpoint) => endpoint.id === 'merchants-update');
    expect(updateMerchant?.requestExample).toEqual({ name: 'Acme Global' });
  });

  it('reflects schema changes without component edits', () => {
    const doc = cloneDocument(openApiDocument);
    const responseSchema =
      doc.paths['/api/payments/{id}'].get!.responses['200'].content!['application/json'].schema!;
    const dataSchema = responseSchema.properties!.data;
    dataSchema.properties!.receiptUrl = {
      type: 'string',
      description: 'Added to the OpenAPI document only.',
    };

    const patched = buildExplorerModel(doc);
    const getPayment = patched.endpoints.find((endpoint) => endpoint.id === 'payments-get');
    const dataField = getPayment?.responseSchema.find((field) => field.name === 'data');

    expect(dataField?.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'receiptUrl',
          description: 'Added to the OpenAPI document only.',
        }),
      ]),
    );
  });

  it('resolves local $ref schemas', () => {
    const doc = cloneDocument(openApiDocument);
    doc.components.schemas.Merchant = {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', description: 'Merchant id.' },
        name: { type: 'string', description: 'Merchant name.' },
      },
    };
    doc.paths['/api/merchants/{id}'].get!.responses['200'].content!['application/json'].schema = {
      $ref: '#/components/schemas/Merchant',
    };

    const patched = buildExplorerModel(doc);
    const getMerchant = patched.endpoints.find((endpoint) => endpoint.id === 'merchants-get');

    expect(getMerchant?.responseSchema).toEqual([
      expect.objectContaining({ name: 'id', required: true }),
      expect.objectContaining({ name: 'name', required: false }),
    ]);
  });

  it('derives error cases, rate limits and auth notes from the operation', () => {
    const createPayment = model.endpoints.find((endpoint) => endpoint.id === 'payments-create');

    expect(createPayment?.auth).toBe(true);
    expect(createPayment?.rateLimit).toContain('30 requests');
    expect(createPayment?.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 401, code: 'UNAUTHORIZED' }),
        expect.objectContaining({ status: 409, code: 'IDEMPOTENCY_CONFLICT' }),
      ]),
    );
  });
});
