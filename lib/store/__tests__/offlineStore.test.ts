import { useOfflineStore } from '../offlineStore';

const initialState = {
  isOnline: true,
  isApiReachable: true,
  dismissed: false,
};

describe('useOfflineStore', () => {
  beforeEach(() => {
    useOfflineStore.setState(initialState);
  });

  afterEach(() => {
    useOfflineStore.setState(initialState);
  });

  it('starts online, API-reachable, and not dismissed', () => {
    expect(useOfflineStore.getState()).toMatchObject(initialState);
  });

  it('resets to the initial snapshot between tests', () => {
    useOfflineStore.setState({ isOnline: false, isApiReachable: false, dismissed: true });
    useOfflineStore.setState(initialState);

    expect(useOfflineStore.getState()).toMatchObject(initialState);
  });

  it('clears a dismissed banner when connectivity transitions offline', () => {
    useOfflineStore.getState().dismiss();
    useOfflineStore.getState().setIsOnline(false);

    expect(useOfflineStore.getState()).toMatchObject({ isOnline: false, dismissed: false });
  });

  it('preserves dismissal when online state does not transition offline', () => {
    useOfflineStore.getState().dismiss();
    useOfflineStore.getState().setIsOnline(true);

    expect(useOfflineStore.getState()).toMatchObject({ isOnline: true, dismissed: true });
  });

  it('keeps a dismissal while the device stays offline and restores online state', () => {
    useOfflineStore.setState({ isOnline: false, dismissed: true });

    useOfflineStore.getState().setIsOnline(false);
    expect(useOfflineStore.getState().dismissed).toBe(true);

    useOfflineStore.getState().setIsOnline(true);
    expect(useOfflineStore.getState()).toMatchObject({ isOnline: true, dismissed: true });
  });

  it('clears a dismissed banner on the next online-to-offline transition', () => {
    useOfflineStore.getState().dismiss();
    useOfflineStore.getState().setIsOnline(false);
    useOfflineStore.getState().dismiss();
    useOfflineStore.getState().setIsOnline(true);
    useOfflineStore.getState().setIsOnline(false);

    expect(useOfflineStore.getState().dismissed).toBe(false);
  });

  it('clears dismissal when the API becomes unreachable', () => {
    useOfflineStore.getState().dismiss();
    useOfflineStore.getState().setIsApiReachable(false);

    expect(useOfflineStore.getState()).toMatchObject({ isApiReachable: false, dismissed: false });
  });

  it('preserves dismissal while the API stays unreachable and when it recovers', () => {
    useOfflineStore.setState({ isApiReachable: false, dismissed: true });

    useOfflineStore.getState().setIsApiReachable(false);
    expect(useOfflineStore.getState().dismissed).toBe(true);

    useOfflineStore.getState().setIsApiReachable(true);
    expect(useOfflineStore.getState()).toMatchObject({ isApiReachable: true, dismissed: true });
  });

  it('sets dismissed when the banner is dismissed', () => {
    useOfflineStore.getState().dismiss();

    expect(useOfflineStore.getState().dismissed).toBe(true);
  });
});
