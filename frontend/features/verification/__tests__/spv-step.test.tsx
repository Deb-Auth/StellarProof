import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SPVStep from '../spv-step'; // Adjust path to your component
import { useVerificationStore } from '@/store/verificationStore'; // Adjust path to your Zustand store

// 1. Mock the Zustand store
jest.mock('@/store/verificationStore', () => ({
  useVerificationStore: jest.fn(),
}));

describe('SPVStep Component', () => {
  const mockSetPrivacyOption = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up the default mock return value for the Zustand store hook
    (useVerificationStore as unknown as jest.Mock).mockReturnValue({
      privacyOption: null, // Initial state
      setPrivacyOption: mockSetPrivacyOption,
    });
  });

  it('renders the SPV privacy options correctly', () => {
    render(<SPVStep />);
    
    // Adjust these queries based on your actual UI text/roles
    expect(screen.getByText(/Privacy Options/i)).toBeInTheDocument();
    
    // Assuming you have buttons or radio inputs for the options
    const publicOption = screen.getByRole('button', { name: /Public/i });
    const privateOption = screen.getByRole('button', { name: /Private/i });
    
    expect(publicOption).toBeInTheDocument();
    expect(privateOption).toBeInTheDocument();
  });

  it('updates the Zustand store when a privacy option is clicked', async () => {
    const user = userEvent.setup();
    render(<SPVStep />);

    // Find the option element to interact with
    const privateOption = screen.getByRole('button', { name: /Private/i });
    
    // Simulate the user click event
    await user.click(privateOption);

    // Verify the store action was called with the expected value
    // Adjust 'private' to whatever value your state actually expects
    expect(mockSetPrivacyOption).toHaveBeenCalledTimes(1);
    expect(mockSetPrivacyOption).toHaveBeenCalledWith('private');
  });

  it('displays the correct active state based on the store value', () => {
    // Override the mock for this specific test to simulate an already selected option
    (useVerificationStore as unknown as jest.Mock).mockReturnValue({
      privacyOption: 'private', 
      setPrivacyOption: mockSetPrivacyOption,
    });

    render(<SPVStep />);

    // Example assertion: Check if the selected button has a specific class or aria attribute
    // This depends heavily on how your UI library handles selected states
    const privateOption = screen.getByRole('button', { name: /Private/i });
    expect(privateOption).toHaveAttribute('aria-pressed', 'true');
  });
});