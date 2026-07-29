/**
 * Regression tests: Manifest Generator data is written into the Zustand
 * wizard store and survives navigation between wizard steps.
 */

import { useWizardStore } from '../wizard.store';
import type { ManifestData } from '../../types/wizard.types';

const sampleManifest: ManifestData = {
  content: '{"title":"Sample"}',
  format: 'json',
  fileName: 'manifest.json',
  fileSize: 19,
};

describe('wizard.store - manifest data', () => {
  beforeEach(() => {
    useWizardStore.getState().resetWizard();
  });

  test('setManifest writes the manifest and its hash into formData.content', () => {
    useWizardStore.getState().setManifest(sampleManifest, 'hash-123');

    const { formData } = useWizardStore.getState();
    expect(formData.content?.manifest).toEqual(sampleManifest);
    expect(formData.content?.manifestHash).toBe('hash-123');
  });

  test('manifest data persists across step navigation', () => {
    useWizardStore.getState().setManifest(sampleManifest, 'hash-123');

    useWizardStore.getState().setStep(3);
    useWizardStore.getState().setStep(1);

    const { formData, currentStep } = useWizardStore.getState();
    expect(currentStep).toBe(1);
    expect(formData.content?.manifest).toEqual(sampleManifest);
    expect(formData.content?.manifestHash).toBe('hash-123');
  });

  test('clearing the manifest resets manifest fields without touching the rest of formData', () => {
    useWizardStore.getState().setEncryptionEnabled(false);
    useWizardStore.getState().setManifest(sampleManifest, 'hash-123');

    useWizardStore.getState().setManifest(null, null);

    const { formData } = useWizardStore.getState();
    expect(formData.content?.manifest).toBeNull();
    expect(formData.content?.manifestHash).toBeNull();
    expect(formData.content?.encryptionEnabled).toBe(false);
  });

  test('resetWizard clears manifest data back to the initial empty state', () => {
    useWizardStore.getState().setManifest(sampleManifest, 'hash-123');

    useWizardStore.getState().resetWizard();

    const { formData, currentStep } = useWizardStore.getState();
    expect(currentStep).toBe(0);
    expect(formData.content).toBeUndefined();
  });
});
