import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SPVPrivacyStep from '../SPVPrivacyStep';
import { useWizardStore } from '../../../store/wizard.store';

describe('SPVPrivacyStep', () => {
  beforeEach(() => {
    // Reset store state before each test
    useWizardStore.setState({
      formData: {
        content: {
          file: null,
          contentHash: null,
          hashProgress: 0,
          isHashing: false,
          manifest: null,
          manifestHash: null,
          encryptionEnabled: true,
          spvResult: null,
        },
      },
      validation: {},
    });
  });

  it('renders correctly with default state (KMS Encrypted = true)', () => {
    render(<SPVPrivacyStep />);

    // Verify option cards exist
    const publicCard = screen.getByRole('radio', { name: /Public Registry/i });
    const encryptedCard = screen.getByRole('radio', { name: /KMS Encrypted/i });

    expect(publicCard).toBeInTheDocument();
    expect(encryptedCard).toBeInTheDocument();

    // Verify correct aria-checked states based on initial state
    expect(publicCard).toHaveAttribute('aria-checked', 'false');
    expect(encryptedCard).toHaveAttribute('aria-checked', 'true');

    // Verify success banner is shown
    expect(screen.getByText(/Safe Provenance Active/i)).toBeInTheDocument();
  });

  it('toggles to public registry when clicking public card', async () => {
    const user = userEvent.setup();
    render(<SPVPrivacyStep />);

    const publicCard = screen.getByRole('radio', { name: /Public Registry/i });
    const encryptedCard = screen.getByRole('radio', { name: /KMS Encrypted/i });

    // Click on public card
    await user.click(publicCard);

    // Verify aria-checked updates
    expect(publicCard).toHaveAttribute('aria-checked', 'true');
    expect(encryptedCard).toHaveAttribute('aria-checked', 'false');

    // Verify store state is updated
    expect(useWizardStore.getState().formData.content?.encryptionEnabled).toBe(false);

    // Verify warning callout shows up instead of success alert
    expect(screen.getByText(/Plaintext Storage Warning/i)).toBeInTheDocument();
    expect(screen.queryByText(/Safe Provenance Active/i)).not.toBeInTheDocument();
  });

  it('toggles using the switch component', async () => {
    const user = userEvent.setup();
    render(<SPVPrivacyStep />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    // Toggle off (changes to public)
    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(useWizardStore.getState().formData.content?.encryptionEnabled).toBe(false);

    // Toggle back on (changes to encrypted)
    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(useWizardStore.getState().formData.content?.encryptionEnabled).toBe(true);
  });
});
