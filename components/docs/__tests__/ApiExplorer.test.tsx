import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiExplorer } from '../ApiExplorer';
import type { ExplorerEndpoint, ExplorerModel } from '@/lib/docs/openapi-explorer';

const endpoint: ExplorerEndpoint = {
  id: 'payments-create',
  method: 'POST',
  path: '/api/payments',
  title: 'Create a payment',
  description: 'Creates a payment.',
  tag: 'Payments',
  auth: true,
  rateLimit: '30 requests / minute.',
  pathParams: [],
  queryParams: [],
  headerParams: [],
  requestBody: [
    { name: 'amountUsdc', type: 'number', required: true, description: 'Amount in USDC.', example: '25' },
  ],
  requestExample: { amountUsdc: 25 },
  requestContentType: 'application/json',
  responseStatus: 201,
  responseSchema: [{ name: 'data', type: 'object', required: true, description: 'Created payment.' }],
  responseExample: { data: { id: 'pay_1' } },
  errors: [{ status: 401, code: 'UNAUTHORIZED', description: 'Missing JWT.' }],
};

const model: ExplorerModel = {
  title: 'BettaPay API',
  version: '1.0.0',
  description: 'Explorer model fixture.',
  baseUrl: 'https://api.example.com',
  securityScheme: 'bearerAuth',
  groups: [
    {
      id: 'payments',
      title: 'Payments',
      description: 'Payment operations.',
      endpoints: [endpoint],
    },
  ],
  endpoints: [endpoint],
};

describe('ApiExplorer', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('renders endpoints and metadata derived from the model', () => {
    render(<ApiExplorer model={model} />);

    expect(screen.getByRole('heading', { name: 'BettaPay API Explorer' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Payments' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create a payment' })).toBeInTheDocument();
    expect(screen.getByText('Auth required')).toBeInTheDocument();
    expect(screen.getByText(/30 requests/)).toBeInTheDocument();
  });

  it('treats missing API keys as a validation error for authenticated endpoints', async () => {
    render(<ApiExplorer model={model} />);

    fireEvent.click(screen.getByRole('button', { name: /Send request/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Add a dev API key/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('executes a try-it request with the configured key and shows the raw response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 201,
      statusText: 'Created',
      headers: new Headers({ 'content-type': 'application/json', 'x-request-id': 'req_1' }),
      text: jest.fn().mockResolvedValue('{"data":{"id":"pay_1"}}'),
    });

    render(<ApiExplorer model={model} />);

    const keyInput = screen.getByPlaceholderText('bp_test_...');
    fireEvent.change(keyInput, { target: { value: 'bp_test_secret' } });

    fireEvent.click(screen.getByRole('button', { name: /Send request/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.example.com/api/payments');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer bp_test_secret');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({ amountUsdc: 25 });

    expect(await screen.findByTestId('try-it-result-payments-create')).toHaveTextContent(
      '{"data":{"id":"pay_1"}}',
    );
    expect(screen.getByText('201 Created')).toBeInTheDocument();
    expect(screen.getByText(/x-request-id: req_1/)).toBeInTheDocument();
  });
});
