import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';
import { useWizardStore } from '../../store/wizard.store';
import clsx from 'clsx';

const SPVPrivacyStep = () => {
  const { formData, setEncryptionEnabled } = useWizardStore();
  
  // Default to true as defined in your defaultContent store configuration
  const isEncrypted = formData.content?.encryptionEnabled ?? true;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">Privacy Options</h2>
        <p className="text-sm text-gray-500">
          Select how your verification data is handled on the Stellar network.
        </p>
      </div>

      <Tooltip.Provider delayDuration={200}>
        <div className="flex flex-col gap-4 sm:flex-row">
          
          {/* Public Option (Encryption Disabled) */}
          <div 
            role="button"
            tabIndex={0}
            onClick={() => setEncryptionEnabled(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEncryptionEnabled(false)}
            className={clsx(
              "relative flex flex-1 cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-all hover:border-blue-500 hover:bg-blue-50/50",
              !isEncrypted ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-200"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">Public</span>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button type="button" className="text-gray-400 hover:text-gray-600 focus:outline-none">
                    <Info className="h-4 w-4" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="z-50 max-w-xs rounded-md bg-gray-900 px-3 py-2 text-sm text-white shadow-md animate-in fade-in zoom-in-95"
                    sideOffset={5}
                  >
                    Data is stored plainly on the ledger. Best for standard verifications where transparency is preferred.
                    <Tooltip.Arrow className="fill-gray-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
            <p className="text-sm text-gray-500">Standard transparent verification</p>
          </div>

          {/* KMS Encrypted Option (Encryption Enabled) */}
          <div 
            role="button"
            tabIndex={0}
            onClick={() => setEncryptionEnabled(true)}
            onKeyDown={(e) => e.key === 'Enter' && setEncryptionEnabled(true)}
            className={clsx(
              "relative flex flex-1 cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-all hover:border-blue-500 hover:bg-blue-50/50",
              isEncrypted ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-200"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">KMS Encrypted</span>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button type="button" className="text-gray-400 hover:text-gray-600 focus:outline-none">
                    <Info className="h-4 w-4" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="z-50 max-w-xs rounded-md bg-gray-900 px-3 py-2 text-sm text-white shadow-md animate-in fade-in zoom-in-95"
                    sideOffset={5}
                  >
                    Payloads are secured via Key Management Service before broadcasting. Required for sensitive transit permits.
                    <Tooltip.Arrow className="fill-gray-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
            <p className="text-sm text-gray-500">Maximum security for sensitive data</p>
          </div>

        </div>
      </Tooltip.Provider>
    </div>
  );
};

export default SPVPrivacyStep;