import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import UploadMedia from '../UploadMedia';
import { useWizardStore } from '../../../store/wizard.store';

// ── Mocks ──────────────────────────────────────────────
jest.mock('@/utils/hashing', () => ({
  hashFile: jest.fn().mockResolvedValue('deadbeef'.repeat(8)),
}));

let dropzoneOnDrop: (files: File[]) => void = () => {};
jest.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop }: { onDrop: (files: File[]) => void }) => {
    dropzoneOnDrop = onDrop;
    return {
      getRootProps: () => ({}),
      getInputProps: () => ({}),
      isDragActive: false,
    };
  },
}));

const mockObjectURL = 'blob:mock-preview-url';
global.URL.createObjectURL = jest.fn(() => mockObjectURL);
global.URL.revokeObjectURL = jest.fn();

function createImageFile(name = 'photo.png'): File {
  return new File(['fake-image-bytes'], name, { type: 'image/png' });
}

describe('UploadMedia + wizard store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useWizardStore.getState().resetWizard();
    });
  });

  it('saves uploaded file metadata into the global wizard store', async () => {
    render(<UploadMedia />);

    await act(async () => {
      dropzoneOnDrop([createImageFile('certificate.png')]);
      // Let the async hashing promise resolve.
      await Promise.resolve();
      await Promise.resolve();
    });

    const content = useWizardStore.getState().formData.content;
    expect(content?.file).toEqual(
      expect.objectContaining({ name: 'certificate.png', previewUrl: mockObjectURL }),
    );
    expect(content?.contentHash).toBe('deadbeef'.repeat(8));
    expect(useWizardStore.getState().validation[0]).toBe(true);
  });

  it('restores the file preview from the store after the component remounts', async () => {
    const { unmount } = render(<UploadMedia />);

    await act(async () => {
      dropzoneOnDrop([createImageFile('certificate.png')]);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Simulate navigating away from and back to this wizard step.
    unmount();
    render(<UploadMedia />);

    const preview = await screen.findByAltText('certificate.png');
    expect(preview).toHaveAttribute('src', mockObjectURL);
  });
});
