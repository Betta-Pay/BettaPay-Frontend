import { useRateAlertStore } from '../rateAlertStore';

describe('Rate Alert Store (Persistence & Triggers)', () => {
  beforeEach(() => {
    localStorage.clear();
    useRateAlertStore.getState().clearAllAlerts();
  });

  it('adds an alert and persists it in the store', () => {
    useRateAlertStore.getState().addAlert({
      pair: 'USDC/NGN',
      condition: 'above',
      target: 1600,
    });

    const alerts = useRateAlertStore.getState().alerts;
    expect(alerts).toHaveLength(1);
    expect(alerts[0].pair).toBe('USDC/NGN');
    expect(alerts[0].condition).toBe('above');
    expect(alerts[0].target).toBe(1600);
    expect(alerts[0].enabled).toBe(true);
    expect(alerts[0].triggered).toBe(false);
  });

  it('toggles an alert and resets triggered status on re-enable', () => {
    useRateAlertStore.getState().addAlert({
      pair: 'USDC/NGN',
      condition: 'above',
      target: 1600,
      recurrence: 'recurring',
    });

    const alertId = useRateAlertStore.getState().alerts[0].id;
    useRateAlertStore.getState().markAlertTriggered(alertId);
    expect(useRateAlertStore.getState().alerts[0].triggered).toBe(true);
    // Recurring alerts stay enabled after triggering (once alerts deactivate per #469)
    expect(useRateAlertStore.getState().alerts[0].enabled).toBe(true);

    // Disable
    useRateAlertStore.getState().toggleAlert(alertId);
    expect(useRateAlertStore.getState().alerts[0].enabled).toBe(false);

    // Re-enable (should reset triggered)
    useRateAlertStore.getState().toggleAlert(alertId);
    expect(useRateAlertStore.getState().alerts[0].enabled).toBe(true);
    expect(useRateAlertStore.getState().alerts[0].triggered).toBe(false);
  });

  it('deletes an alert completely', () => {
    useRateAlertStore.getState().addAlert({
      pair: 'USDC/NGN',
      condition: 'above',
      target: 1600,
    });

    const alertId = useRateAlertStore.getState().alerts[0].id;
    useRateAlertStore.getState().deleteAlert(alertId);

    expect(useRateAlertStore.getState().alerts).toHaveLength(0);
  });

  it('marks alert as triggered with timestamp', () => {
    useRateAlertStore.getState().addAlert({
      pair: 'USDC/NGN',
      condition: 'above',
      target: 1600,
    });

    const alertId = useRateAlertStore.getState().alerts[0].id;
    useRateAlertStore.getState().markAlertTriggered(alertId);

    const alert = useRateAlertStore.getState().alerts[0];
    expect(alert.triggered).toBe(true);
    expect(alert.triggeredAt).toBeDefined();
  });
});
