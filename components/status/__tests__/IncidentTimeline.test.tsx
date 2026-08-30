import { act, render, screen } from '@testing-library/react';

import { deriveIncidents, type StatusComponent } from '@/lib/status/data';
import { IncidentTimeline } from '../IncidentTimeline';

/**
 * The regression this guards: incident times used to be fixed strings, so an
 * incident labelled "2 minutes ago" was still labelled that months later. The
 * timeline is now derived from the live health snapshot and every timestamp is
 * a real ISO string that advances on its own.
 */

const NOW = Date.parse('2026-08-25T12:00:00.000Z');

const degradedComponent = (checkedAt: string): StatusComponent => ({
  id: 'sep24',
  name: 'SEP-24 Anchor',
  status: 'degraded',
  latencyMs: 4200,
  checkedAt,
  errorMessage: 'Anchor is responding slowly.',
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('IncidentTimeline relative times', () => {
  it('advances the relative label as time passes', () => {
    const probedAt = new Date(NOW - 50 * 60_000).toISOString();
    render(<IncidentTimeline incidents={deriveIncidents([degradedComponent(probedAt)])} />);

    expect(screen.getAllByText('50 minutes ago').length).toBeGreaterThan(0);

    // Ten minutes later, without a reload, the same timestamp reads differently.
    act(() => {
      jest.advanceTimersByTime(10 * 60_000);
    });

    expect(screen.queryByText('50 minutes ago')).not.toBeInTheDocument();
    expect(screen.getAllByText('1 hour ago').length).toBeGreaterThan(0);
  });

  it('ticks within a single minute boundary', () => {
    const probedAt = new Date(NOW - 50 * 60_000).toISOString();
    render(<IncidentTimeline incidents={deriveIncidents([degradedComponent(probedAt)])} />);
    expect(screen.getAllByText('50 minutes ago').length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(screen.getAllByText('51 minutes ago').length).toBeGreaterThan(0);
  });

  it('renders a machine-readable timestamp alongside the label', () => {
    const probedAt = new Date(NOW - 50 * 60_000).toISOString();
    const incidents = deriveIncidents([degradedComponent(probedAt)]);
    render(<IncidentTimeline incidents={incidents} />);

    const stamp = incidents[0].updates[0].timestamp;
    const times = document.querySelectorAll(`time[datetime="${stamp}"]`);
    expect(times.length).toBeGreaterThan(0);
  });

  it('renders the "No Incidents" state when every service is healthy', () => {
    render(<IncidentTimeline incidents={[]} />);
    expect(screen.getByText('No Incidents')).toBeInTheDocument();
  });

  it('says "time unknown" rather than inventing a time', () => {
    const [incident] = deriveIncidents([degradedComponent(NOW.toString())]);
    const broken = {
      ...incident,
      createdAt: '',
      resolvedAt: null,
      updates: [{ ...incident.updates[0], timestamp: '' }],
    };

    render(<IncidentTimeline incidents={[broken]} />);
    expect(screen.getAllByText('time unknown').length).toBeGreaterThan(0);
  });
});
