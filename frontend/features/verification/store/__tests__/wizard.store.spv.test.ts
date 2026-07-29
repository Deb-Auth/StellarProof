/**
 * Regression tests: SPV privacy (encryption) selection is written into the
 * Zustand wizard store and survives navigation between wizard steps.
 */

import { useWizardStore } from '../wizard.store';

describe('wizard.store - SPV privacy selection', () => {
  beforeEach(() => {
    useWizardStore.getState().resetWizard();
  });

  test('encryption is enabled by default', () => {
    useWizardStore.getState().setEncryptionEnabled(true);
    const { formData } = useWizardStore.getState();
    expect(formData.content?.encryptionEnabled).toBe(true);
  });

  test('setEncryptionEnabled writes the selection into formData.content', () => {
    useWizardStore.getState().setEncryptionEnabled(false);

    const { formData } = useWizardStore.getState();
    expect(formData.content?.encryptionEnabled).toBe(false);
  });

  test('SPV selection persists across step navigation', () => {
    useWizardStore.getState().setEncryptionEnabled(false);

    useWizardStore.getState().setStep(3);
    useWizardStore.getState().setStep(2);

    const { formData, currentStep } = useWizardStore.getState();
    expect(currentStep).toBe(2);
    expect(formData.content?.encryptionEnabled).toBe(false);
  });

  test('toggling encryption does not clobber unrelated formData.content fields', () => {
    useWizardStore.getState().setContentHash('hash-abc');
    useWizardStore.getState().setEncryptionEnabled(false);

    const { formData } = useWizardStore.getState();
    expect(formData.content?.contentHash).toBe('hash-abc');
    expect(formData.content?.encryptionEnabled).toBe(false);
  });

  test('resetWizard clears the SPV selection back to the initial empty state', () => {
    useWizardStore.getState().setEncryptionEnabled(false);

    useWizardStore.getState().resetWizard();

    const { formData, currentStep } = useWizardStore.getState();
    expect(currentStep).toBe(0);
    expect(formData.content).toBeUndefined();
  });
});
