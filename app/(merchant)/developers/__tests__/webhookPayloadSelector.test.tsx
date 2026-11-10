import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WebhookTester } from '@/components/developers/WebhookTester';

const mockNotifySuccess = jest.fn();
const mockNotifyError = jest.fn();

jest.mock('@/lib/hooks/useNotify', () => ({
  useNotify: () => ({
    success: mockNotifySuccess,
    error: mockNotifyError,
    info: jest.fn(),
  }),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: React.PropsWithChildren<{ value?: string; onValueChange?: (v: string) => void }>) => (
    <select
      aria-label="Event Type"
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => <>{children}</>,
  SelectItem: ({ value, children }: React.PropsWithChildren<{ value?: string }>) => (
    <option value={value}>{children}</option>
  ),
}));

describe('WebhookTester mock event payload selector & JSON editor (#928)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: jest.fn().mockResolvedValue(JSON.stringify({ ok: true })),
    }) as jest.Mock;
  });

  it('populates sample JSON for payment.succeeded, payment.failed, settlement.completed, and kyb.approved and sends customized JSON', async () => {
    render(<WebhookTester initialEndpointUrl="https://example.com/webhooks" />);

    const eventSelect = screen.getByLabelText('Event Type');
    const payloadEditor = screen.getByLabelText('Webhook payload JSON') as HTMLTextAreaElement;

    // Switch to payment.succeeded
    fireEvent.change(eventSelect, { target: { value: 'payment.succeeded' } });
    expect(payloadEditor.value).toContain('"type": "payment.succeeded"');

    // Switch to payment.failed
    fireEvent.change(eventSelect, { target: { value: 'payment.failed' } });
    expect(payloadEditor.value).toContain('"type": "payment.failed"');

    // Switch to kyb.approved
    fireEvent.change(eventSelect, { target: { value: 'kyb.approved' } });
    expect(payloadEditor.value).toContain('"type": "kyb.approved"');

    // Customize JSON payload and dispatch
    const customJson = JSON.stringify({
      id: 'evt_custom_999',
      type: 'kyb.approved',
      data: { merchant_id: 'merch_custom_42', status: 'approved' },
    });
    fireEvent.change(payloadEditor, { target: { value: customJson } });

    fireEvent.click(screen.getByRole('button', { name: /Send Test Event/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      id: 'evt_custom_999',
      type: 'kyb.approved',
      data: { merchant_id: 'merch_custom_42', status: 'approved' },
    });
  });
});
