import {
  HORIZON_ERROR_MESSAGES,
  DEFAULT_HORIZON_ERROR_MESSAGE,
  mapHorizonErrorCode,
  extractHorizonErrorCode,
  parseApiError,
  getErrorMessage,
} from '@/lib/utils/apiError';

describe('utils/apiError Horizon error mapping (#913)', () => {
  it('maps op_underfunded and op_no_trust to friendly localized messages', () => {
    expect(mapHorizonErrorCode('op_underfunded')).toBe(
      'Insufficient funds in wallet for this payment',
    );
    expect(mapHorizonErrorCode('op_no_trust')).toBe(
      'Trustline required for this asset before receiving funds',
    );
    expect(mapHorizonErrorCode('tx_bad_auth')).toBe(
      HORIZON_ERROR_MESSAGES.tx_bad_auth,
    );
  });

  it('returns the fallback message when an unknown Horizon code is passed', () => {
    expect(mapHorizonErrorCode('tx_unknown_custom_code')).toBe(
      DEFAULT_HORIZON_ERROR_MESSAGE,
    );
    expect(mapHorizonErrorCode(undefined, 'Custom fallback')).toBe('Custom fallback');
  });

  it('extracts operation result codes from Horizon extras.result_codes', () => {
    const horizonResponse = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          title: 'Transaction Failed',
          extras: {
            result_codes: {
              transaction: 'tx_failed',
              operations: ['op_success', 'op_underfunded'],
            },
          },
        },
      },
    };

    expect(extractHorizonErrorCode(horizonResponse)).toBe('op_underfunded');

    const parsed = parseApiError(horizonResponse);
    expect(parsed.code).toBe('op_underfunded');
    expect(parsed.message).toBe('Insufficient funds in wallet for this payment');
  });

  it('maps Horizon codes embedded in Error objects or direct payloads', () => {
    expect(getErrorMessage(new Error('Horizon rejected tx: op_no_trust'))).toBe(
      'Trustline required for this asset before receiving funds',
    );
  });
});
