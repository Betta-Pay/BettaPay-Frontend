import {
  useRateAlertStore,
  RATE_ALERT_STORAGE_KEY,
  RATE_ALERT_STORAGE_VERSION,
  rateAlertSchema,
  persistedRateAlertStateSchema,
  parsePersistedRateAlertStorage,
  sanitizeRateAlerts,
} from '../rateAlertStore';

describe('Rate Alert Store (Persistence & Triggers)', () => {
  beforeEach(() => {
    localStorage.clear();
    useRateAlertStore.getState().clearAllAlerts();
  });

  it('adds an alert and persists it in the store with schema version', () => {
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

    const raw = localStorage.getItem(RATE_ALERT_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw!);
    expect(persisted.version).toBe(RATE_ALERT_STORAGE_VERSION);
    expect(persisted.state.alerts).toHaveLength(1);
    expect(persistedRateAlertStateSchema.safeParse(persisted.state).success).toBe(true);
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

  it('rehydrates valid alerts from localStorage across browser refreshes', async () => {
    const persistedPayload = {
      state: {
        alerts: [
          {
            id: 'alert-persisted-1',
            pair: 'USDC/KES',
            condition: 'below',
            target: 130.5,
            enabled: true,
            recurrence: 'recurring',
            channels: ['in_app', 'email'],
          },
        ],
      },
      version: RATE_ALERT_STORAGE_VERSION,
    };

    localStorage.setItem(RATE_ALERT_STORAGE_KEY, JSON.stringify(persistedPayload));
    await useRateAlertStore.persist.rehydrate();

    const alerts = useRateAlertStore.getState().alerts;
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      id: 'alert-persisted-1',
      pair: 'USDC/KES',
      condition: 'below',
      target: 130.5,
      enabled: true,
      recurrence: 'recurring',
      channels: ['in_app', 'email'],
    });
  });

  it('discards corrupted JSON in localStorage gracefully without throwing', async () => {
    useRateAlertStore.getState().addAlert({
      pair: 'USDC/NGN',
      condition: 'above',
      target: 1600,
    });
    expect(useRateAlertStore.getState().alerts).toHaveLength(1);

    localStorage.setItem(RATE_ALERT_STORAGE_KEY, '{not-valid-json');
    await expect(useRateAlertStore.persist.rehydrate()).resolves.not.toThrow();

    expect(useRateAlertStore.getState().alerts).toEqual([]);
  });

  it('filters out schema-invalid alert records during hydration while preserving valid ones', async () => {
    const mixedPayload = {
      state: {
        alerts: [
          {
            id: 'valid-alert-1',
            pair: 'USDC/GHS',
            condition: 'above',
            target: 15.2,
            enabled: true,
          },
          {
            id: '',
            pair: 'USDC/GHS',
            condition: 'sideways',
            target: -10,
            enabled: 'yes',
          },
        ],
      },
      version: 0,
    };

    localStorage.setItem(RATE_ALERT_STORAGE_KEY, JSON.stringify(mixedPayload));
    await useRateAlertStore.persist.rehydrate();

    const alerts = useRateAlertStore.getState().alerts;
    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toBe('valid-alert-1');
    expect(alerts[0].recurrence).toBe('once');
    expect(alerts[0].channels).toEqual(['in_app']);
  });

  it('validates individual alert schemas and storage envelopes via helper functions', () => {
    expect(
      rateAlertSchema.safeParse({
        id: 'a1',
        pair: 'USDC/NGN',
        condition: 'above',
        target: 1550,
        enabled: true,
      }).success,
    ).toBe(true);

    expect(
      rateAlertSchema.safeParse({
        id: 'a2',
        pair: 'USDC/NGN',
        condition: 'above',
        target: -100,
        enabled: true,
      }).success,
    ).toBe(false);

    expect(sanitizeRateAlerts('not-an-array')).toEqual([]);
    expect(parsePersistedRateAlertStorage(null)).toBeNull();
    expect(parsePersistedRateAlertStorage('{{{')).toEqual({
      state: { alerts: [] },
      version: RATE_ALERT_STORAGE_VERSION,
    });
  });
});
