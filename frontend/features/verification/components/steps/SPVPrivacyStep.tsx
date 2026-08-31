// frontend/features/verification/components/steps/SPVPrivacyStep.tsx

import React from 'react';

export const SPVPrivacyStep = ({ formData, setFormData }) => {
  const handlePrivacyToggle = (mode: 'public' | 'kms') => {
    if (mode === 'public') {
      // 🎯 Fix: Explicitly clear KMS specific settings when switching to Public
      setFormData((prev) => ({
        ...prev,
        privacyMode: 'public',
        kmsProvider: '', 
        kmsKeyId: '',
        kmsRegion: '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        privacyMode: 'kms',
      }));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Example Toggle UI */}
      <label>
        <input 
          type="radio" 
          name="privacyMode" 
          value="public" 
          checked={formData.privacyMode === 'public'}
          onChange={() => handlePrivacyToggle('public')} 
        />
        Public
      </label>
      <label>
        <input 
          type="radio" 
          name="privacyMode" 
          value="kms" 
          checked={formData.privacyMode === 'kms'}
          onChange={() => handlePrivacyToggle('kms')} 
        />
        KMS
      </label>

      {/* KMS Settings conditionally rendered */}
      {formData.privacyMode === 'kms' && (
        <div className="kms-settings">
          {/* KMS Inputs here */}
        </div>
      )}
    </div>
  );
};
