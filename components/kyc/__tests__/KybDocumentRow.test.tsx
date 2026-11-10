import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KybDocumentRow } from '../KybDocumentRow';
import { useUploadKybDocument } from '@/lib/kyc/api';

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
  type: 'certificate_of_incorporation' as const,
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
    (useUploadKybDocument as jest.Mock).mockReturnValue({
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
    (useUploadKybDocument as jest.Mock).mockReturnValue({
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

  it('blocks upload and displays inline validation error when an unsupported file format is selected', () => {
    const mockUpload = jest.fn();
    (useUploadKybDocument as jest.Mock).mockReturnValue({
      upload: mockUpload,
      isUploading: false,
      progress: 0,
      error: null,
    });

    render(
      <KybDocumentRow
        merchantId="m1"
        meta={defaultMeta}
        document={null}
      />
    );

    const fileInput = screen.getByTestId('kyb-file-input-certificate_of_incorporation');
    const invalidFile = new File(['archive-bytes'], 'documents.zip', {
      type: 'application/zip',
    });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(mockUpload).not.toHaveBeenCalled();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/Unsupported file format/i);
    expect(alert).toHaveTextContent(/\.pdf, \.png, or \.jpg/i);
  });

  it('blocks drag-and-drop of unsupported files and clears inline error when a valid PDF is uploaded', async () => {
    const mockUpload = jest.fn().mockResolvedValue({});
    (useUploadKybDocument as jest.Mock).mockReturnValue({
      upload: mockUpload,
      isUploading: false,
      progress: 0,
      error: null,
    });

    render(
      <KybDocumentRow
        merchantId="m1"
        meta={defaultMeta}
        document={null}
      />
    );

    const fileInput = screen.getByTestId('kyb-file-input-certificate_of_incorporation');
    const badExe = new File(['binary'], 'installer.exe', {
      type: 'application/x-msdownload',
    });

    fireEvent.drop(fileInput.closest('div')!.parentElement!, {
      dataTransfer: { files: [badExe] },
    });

    expect(mockUpload).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/Unsupported file format/i);

    const validPdf = new File(['%PDF-1.4'], 'incorporation.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(fileInput, { target: { files: [validPdf] } });

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
