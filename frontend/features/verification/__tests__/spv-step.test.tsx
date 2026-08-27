import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SPVPrivacyStep from '../components/steps/SPVPrivacyStep'; 
import { useWizardStore } from '../store/wizard.store'; 

// 1. Mock the specific Wizard Zustand store
jest.mock('../store/wizard.store', () => ({
  useWizardStore: jest.fn(),
}));

describe('SPVPrivacyStep Component', () => {
  const mockSetEncryptionEnabled = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default store mock state (KMS Encrypted / true by default)
    (useWizardStore as unknown as jest.Mock).mockReturnValue({
      formData: {
        content: {
          encryptionEnabled: true,
        }
      },
      setEncryptionEnabled: mockSetEncryptionEnabled,
    });
  });

  it('renders the SPV privacy options correctly', () => {
    render(<SPVPrivacyStep />);
    
    expect(screen.getByText(/Privacy Options/i)).toBeInTheDocument();
    
    const publicOption = screen.getByText('Public');
    const privateOption = screen.getByText('KMS Encrypted');
    
    expect(publicOption).toBeInTheDocument();
    expect(privateOption).toBeInTheDocument();
  });

  it('calls setEncryptionEnabled with false when Public is clicked', async () => {
    const user = userEvent.setup();
    render(<SPVPrivacyStep />);

    // Grab the interactive element (the div holding the Public option)
    const publicOptionContainer = screen.getByText('Public').closest('div[role="button"]');
    
    await user.click(publicOptionContainer!);

    expect(mockSetEncryptionEnabled).toHaveBeenCalledTimes(1);
    expect(mockSetEncryptionEnabled).toHaveBeenCalledWith(false);
  });

  it('displays the correct active styling based on store boolean', () => {
    // Override mock to test the Public (false) active state
    (useWizardStore as unknown as jest.Mock).mockReturnValue({
      formData: {
        content: {
          encryptionEnabled: false,
        }
      },
      setEncryptionEnabled: mockSetEncryptionEnabled,
    });

    render(<SPVPrivacyStep />);

    const publicOptionContainer = screen.getByText('Public').closest('div[role="button"]');
    
    // Check if the Tailwind active classes applied correctly
    expect(publicOptionContainer).toHaveClass('bg-blue-50');
    expect(publicOptionContainer).toHaveClass('border-blue-500');
  });
});