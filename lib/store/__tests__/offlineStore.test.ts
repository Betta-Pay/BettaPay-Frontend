import { useOfflineStore } from '../offlineStore';

describe('useOfflineStore', () => {
  beforeEach(() => {
    useOfflineStore.setState({
      isOnline: true,
      isApiReachable: true,
      dismissed: false,
    });
  });

  it('starts online with a reachable API and no dismissed banner', () => {
    expect(useOfflineStore.getState()).toMatchObject({
      isOnline: true,
      isApiReachable: true,
      dismissed: false,
    });
  });

  it('updates online state and clears dismissal when going offline', () => {
    useOfflineStore.getState().dismiss();
    useOfflineStore.getState().setIsOnline(false);

    expect(useOfflineStore.getState()).toMatchObject({
      isOnline: false,
      dismissed: false,
    });

    useOfflineStore.getState().setIsOnline(true);
    expect(useOfflineStore.getState().isOnline).toBe(true);
  });

  it('preserves dismissal when online state does not transition offline', () => {
    useOfflineStore.getState().dismiss();
    useOfflineStore.getState().setIsOnline(true);

    expect(useOfflineStore.getState()).toMatchObject({
      isOnline: true,
      dismissed: true,
    });
  });

  it('updates API reachability and clears dismissal when the API becomes unreachable', () => {
    useOfflineStore.getState().dismiss();
    useOfflineStore.getState().setIsApiReachable(false);

    expect(useOfflineStore.getState()).toMatchObject({
      isApiReachable: false,
      dismissed: false,
    });

    useOfflineStore.getState().setIsApiReachable(true);
    expect(useOfflineStore.getState().isApiReachable).toBe(true);
  });

  it('sets dismissed when the banner is dismissed', () => {
    useOfflineStore.getState().dismiss();

    expect(useOfflineStore.getState().dismissed).toBe(true);
  });
});
