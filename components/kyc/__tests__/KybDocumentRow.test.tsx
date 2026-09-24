import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KybDocumentRow } from '../KybDocumentRow';

jest.mock('@/lib/kyc/api', () => ({
  useUploadKybDocument: jest.fn(() => ({
    upload: jest.fn(),
    isUploading: false,
    progress: 0,
    error: null,
  })),
}));

jest.mock('@/lib/kyc/validation', () => ({
  fileInputAccept: () => '.pdf,.jpg,.jpeg,.png',
  formatBytes: (bytes: number) => `${bytes} B`,
  isImageMime: (type: string) => type.startsWith('image/'),
  validateKybFile: jest.fn(() => null),
}));

jest.mock('../KybStatusBadge', () => ({
  KybDocStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

const defaultMeta = {
  type: 'certificate' as const,
  label: 'Certificate of Incorporation',
  hint: 'Upload your certificate',
  required: true,
};

describe('KybDocumentRow', () => {
  it('renders the document label', () => {
    render(
      <KybDocumentRow
        merchantId="m1"
        meta={defaultMeta}
        document={null}
      />
    );
    expect(screen.getByText('Certificate of Incorporation')).toBeInTheDocument();
  });

  it('shows server error when upload fails', async () => {
    const mockUpload = jest.fn().mockRejectedValue(new Error('Payload Too Large'));
    const { useUploadKybDocument } = require('@/lib/kyc/api');
    useUploadKybDocument.mockReturnValue({
      upload: mockUpload,
      isUploading: false,
      progress: 0,
      error: 'Payload Too Large',
    });

    render(
      <KybDocumentRow
        merchantId="m1"
        meta={defaultMeta}
        document={null}
      />
    );

    expect(screen.getByText('Payload Too Large')).toBeInTheDocument();
  });

  it('shows upload progress when uploading', () => {
    const { useUploadKybDocument } = require('@/lib/kyc/api');
    useUploadKybDocument.mockReturnValue({
      upload: jest.fn(),
      isUploading: true,
      progress: 50,
      error: null,
    });

    render(
      <KybDocumentRow
        merchantId="m1"
        meta={defaultMeta}
        document={null}
      />
    );

    expect(screen.getByText(/Uploading/)).toBeInTheDocument();
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it('shows upload button when no document exists', () => {
    render(
      <KybDocumentRow
        merchantId="m1"
        meta={defaultMeta}
        document={null}
      />
    );

    expect(screen.getByText('Upload')).toBeInTheDocument();
  });
});
