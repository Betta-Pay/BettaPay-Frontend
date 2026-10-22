import React from 'react';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminSettingsPage from '../page';
import { DEFAULT_SETTINGS } from '@/lib/settings/schema';

const notify = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock('@/lib/hooks/useNotify', () => ({ useNotify: () => notify }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children, ...r }: any) => <a href={href} {...r}>{children}</a> }));

type Snapshot = Record<string, Record<string, unknown>>;
let server: Snapshot;
let patchStatus = 200;
const patches: Array<{ url: string; headers: Record<string, string> }> = [];

function freshServer(): Snapshot {
  return Object.fromEntries(
    Object.entries(DEFAULT_SETTINGS).map(([k, v]) => [k, { ...v, version: 0, updatedAt: null }]),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  window.sessionStorage.clear();
  window.localStorage.clear();
  server = freshServer();
  patchStatus = 200;
  patches.length = 0;
  global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
    const ok = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response;
    if (url === '/api/admin/settings/history') return ok({ data: [] });
    if (url === '/api/admin/settings') return ok({ data: server });
    if (init?.method === 'PATCH') {
      patches.push({ url, headers: (init.headers ?? {}) as Record<string, string> });
      if (patchStatus !== 200) return ok({ error: 'Simulated failure while saving' }, patchStatus);
      const section = url.split('/').pop()!;
      server[section] = { ...JSON.parse(init.body as string), version: 1, updatedAt: new Date().toISOString() };
      return ok({ data: server[section] });
    }
    return ok({});
  }) as unknown as typeof fetch;
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdminSettingsPage />
    </QueryClientProvider>,
  );
}

const fees = () => screen.findByTestId('settings-fees');

describe('AdminSettingsPage platform configuration', () => {
  it('shows server truth and saves a section', async () => {
    renderPage();
    const card = within(await fees());
    const input = card.getByLabelText(/default fee/i);
    expect(input).toHaveValue(100);
    await userEvent.clear(input);
    await userEvent.type(input, '150');
    await userEvent.click(card.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Fee configuration saved'));
    expect(server.fees.defaultBps).toBe(150);
    await waitFor(() => expect(card.getByLabelText(/default fee/i)).toHaveValue(150));
  });

  it('optimistic update that fails rolls back to the server value and shows an error toast', async () => {
    patchStatus = 500;
    renderPage();
    const card = within(await fees());
    const input = card.getByLabelText(/default fee/i);
    await userEvent.clear(input);
    await userEvent.type(input, '175');
    await userEvent.click(card.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(notify.error).toHaveBeenCalledWith(expect.stringContaining("Couldn't save fee configuration")));
    expect(notify.error.mock.calls[0][0]).toContain('previous value was restored');
    expect(notify.success).not.toHaveBeenCalled();
    // Server never changed, and the page reflects that after the refetch.
    expect(server.fees.defaultBps).toBe(100);
    await waitFor(() => expect(card.getByText('Unsaved changes')).toBeInTheDocument());
    await userEvent.click(card.getByRole('button', { name: 'Reset' }));
    expect(card.getByLabelText(/default fee/i)).toHaveValue(100);
  });

  it('sends the simulate-failure header only when the dev checkbox is ticked', async () => {
    renderPage();
    await userEvent.click(await screen.findByLabelText(/simulate failure on next save/i));
    const card = within(await fees());
    await userEvent.clear(card.getByLabelText(/default fee/i));
    await userEvent.type(card.getByLabelText(/default fee/i), '120');
    await userEvent.click(card.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0].headers['x-simulate-failure']).toBe('1');
  });

  it('shows field errors and does not call the server for invalid input', async () => {
    renderPage();
    const card = within(await fees());
    await userEvent.clear(card.getByLabelText(/default fee/i));
    await userEvent.type(card.getByLabelText(/default fee/i), '20000');
    await userEvent.click(card.getByRole('button', { name: 'Save' }));
    expect(card.getByText('Max is 10,000 bps.')).toBeInTheDocument();
    expect(patches).toHaveLength(0);
  });

  it('persists dirty state per section across a reload and notes the restore', async () => {
    const first = renderPage();
    const card = within(await fees());
    await userEvent.clear(card.getByLabelText(/default fee/i));
    await userEvent.type(card.getByLabelText(/default fee/i), '222');
    await waitFor(() => expect(window.sessionStorage.getItem('bp:admin:settings:draft:fees')).toContain('222'));
    first.unmount();

    renderPage();
    const again = within(await fees());
    await waitFor(() => expect(again.getByLabelText(/default fee/i)).toHaveValue(222));
    expect(again.getByText(/unsaved changes restored/i)).toBeInTheDocument();
    // Other sections are untouched.
    expect(window.sessionStorage.getItem('bp:admin:settings:draft:authPolicy')).toBeNull();
  });

  it('blocks navigation while dirty and allows it once clean', async () => {
    renderPage();
    const card = within(await fees());
    const event = () => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; };
    expect(event()).toBe(false);

    await userEvent.type(card.getByLabelText(/default fee/i), '1');
    await waitFor(() => expect(event()).toBe(true));

    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    const link = document.createElement('a');
    link.href = '/overview';
    document.body.appendChild(link);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(click);
    expect(confirm).toHaveBeenCalled();
    expect(click.defaultPrevented).toBe(true);

    await userEvent.click(card.getByRole('button', { name: 'Reset' }));
    await waitFor(() => expect(event()).toBe(false));
    link.remove();
  });

  it('asks for confirmation before saving a maintenance change', async () => {
    renderPage();
    const card = within(await screen.findByTestId('settings-maintenance'));
    await userEvent.click(card.getByRole('switch', { name: 'Maintenance mode' }));
    await userEvent.click(card.getByRole('button', { name: 'Save' }));
    expect(patches).toHaveLength(0);
    await userEvent.click(card.getByRole('button', { name: /confirm and save/i }));
    await waitFor(() => expect(patches).toHaveLength(1));
    expect(server.maintenance.enabled).toBe(true);
  });
});
