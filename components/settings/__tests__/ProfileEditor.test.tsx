import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  ProfileEditor,
  MAX_AVATAR_BYTES,
  validateAvatarFileSize,
  validateAvatarAspectRatio,
} from '../ProfileEditor';

describe('ProfileEditor — Avatar file size & aspect ratio validation (#896)', () => {
  it('validates file size against the 2MB limit', () => {
    expect(validateAvatarFileSize(1024 * 500)).toEqual({ valid: true });
    expect(validateAvatarFileSize(MAX_AVATAR_BYTES)).toEqual({ valid: true });

    const oversized = validateAvatarFileSize(6 * 1024 * 1024);
    expect(oversized.valid).toBe(false);
    expect(oversized.error).toMatch(/2MB maximum limit/i);
  });

  it('validates image aspect ratio is roughly 1:1', () => {
    expect(validateAvatarAspectRatio(512, 512)).toEqual({ valid: true });
    expect(validateAvatarAspectRatio(500, 480)).toEqual({ valid: true });

    const rectangular = validateAvatarAspectRatio(1200, 400);
    expect(rectangular.valid).toBe(false);
    expect(rectangular.error).toMatch(/not square \(1:1\)/i);
  });

  it('rejects a 6MB avatar upload with an immediate error alert and keeps Save disabled', async () => {
    const { container } = render(
      <ProfileEditor
        initialData={null}
        isLoading={false}
        onSubmit={jest.fn()}
      />,
    );

    const fileInput = container.querySelector('#logo-upload') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const largeFile = new File(['x'], 'banner.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/2MB maximum limit/i),
    );
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
  });
});
