/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OnboardingPage from '../page';
import { apiClient } from '@/lib/api/axios';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

jest.mock('@/components/onboarding/Stepper', () => ({
  Stepper: () => <div data-testid="stepper" />,
}));

jest.mock('@/components/onboarding/StepBusinessInfo', () => ({
  StepBusinessInfo: ({ data, onChange }: any) => (
    <div>
      <input
        aria-label="Business name"
        value={data.businessName}
        onChange={(e) => onChange({ businessName: e.target.value })}
      />
    </div>
  ),
}));
jest.mock('@/components/onboarding/StepCurrency', () => ({ StepCurrency: () => <div>Currency Step</div> }));
jest.mock('@/components/onboarding/StepSettlement', () => ({ StepSettlement: () => <div>Settlement Step</div> }));
jest.mock('@/components/onboarding/StepWebhook', () => ({ StepWebhook: () => <div>Webhook Step</div> }));
jest.mock('@/components/onboarding/StepKyc', () => ({ StepKyc: () => <div>KYC Step</div> }));
jest.mock('@/components/onboarding/StepReview', () => ({ StepReview: () => <div>Review Step</div> }));

jest.mock('@/lib/hooks/useNotify', () => ({
  useNotify: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn() }),
}));

jest.mock('@/lib/store/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'm_1', role: 'merchant' } }),
}));

jest.mock('@/lib/api/axios', () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({
      data: {
        data: [{ name: 'Cowrie Integrated', code: 'COWRIE', enabled: true }],
        rates: [{ from: 'NGN', to: 'NGN', rate: 1 }],
      },
    }),
    patch: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

describe('Onboarding wizard auto-save and draft restoration (#935)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('auto-saves form state to localStorage when fields change', () => {
    render(<OnboardingPage />);

    const input = screen.getByLabelText('Business name');
    fireEvent.change(input, { target: { value: 'Lagos Fintech Ltd' } });

    const savedProgress = JSON.parse(localStorage.getItem('bettapay_onboarding_progress')!);
    const savedDraft = JSON.parse(localStorage.getItem('onboardingDraft')!);

    expect(savedProgress.data.businessName).toBe('Lagos Fintech Ltd');
    expect(savedDraft.data.businessName).toBe('Lagos Fintech Ltd');
  });

  it('prompts to resume or start fresh when onboardingDraft exists in localStorage', () => {
    localStorage.setItem(
      'onboardingDraft',
      JSON.stringify({
        step: 0,
        data: {
          businessName: 'Saved Draft Co',
          businessType: 'business',
          country: 'Nigeria',
          settlementCurrency: 'NGN',
          autoConvert: true,
          preferredAnchor: 'Cowry',
          autoSettle: true,
          webhookUrl: '',
        },
        savedAt: Date.now(),
      }),
    );

    render(<OnboardingPage />);

    expect(screen.getByText(/Resume onboarding\?/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Resume/i }));

    expect(screen.getByLabelText('Business name')).toHaveValue('Saved Draft Co');
  });

  it('clears saved draft from localStorage on Start fresh and on final submission', async () => {
    localStorage.setItem(
      'bettapay_onboarding_progress',
      JSON.stringify({
        step: 5,
        data: {
          businessName: 'Ready Merchant',
          businessType: 'business',
          country: 'Nigeria',
          settlementCurrency: 'NGN',
          autoConvert: true,
          preferredAnchor: 'Cowry',
          autoSettle: true,
          webhookUrl: '',
        },
        savedAt: Date.now(),
      }),
    );
    localStorage.setItem('onboardingDraft', localStorage.getItem('bettapay_onboarding_progress')!);

    render(<OnboardingPage />);

    fireEvent.click(screen.getByRole('button', { name: /Resume/i }));

    const finishBtn = await screen.findByRole('button', { name: /Finish setup/i });
    await waitFor(() => expect(finishBtn).not.toBeDisabled());

    fireEvent.click(finishBtn);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalled();
    });

    expect(localStorage.getItem('bettapay_onboarding_progress')).toBeNull();
    expect(localStorage.getItem('onboardingDraft')).toBeNull();
  });
});
