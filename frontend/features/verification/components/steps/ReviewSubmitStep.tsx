'use client';

import React, { useState, useCallback } from 'react';
import {
  CheckCircle2,
  Edit2,
  FileJson,
  ShieldCheck,
  Hash,
  FileText,
  Send,
  Loader2,
  Upload,
  AlertCircle,
  RotateCcw,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { useWizardStore, SubmissionResult } from '../../store/wizard.store';
import { isValidSHA256 } from '@/utils/crypto';
import { submitVerificationRequest } from '@/services/verificationService';

interface ReviewSubmitStepProps {
  onNavigate?: (step: number) => void;
}

function SectionHeader({
  icon,
  title,
  stepIndex,
  onNavigate,
}: {
  icon: React.ReactNode;
  title: string;
  stepIndex?: number;
  onNavigate?: (step: number) => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-blue-600">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
      </div>
      {stepIndex !== undefined && onNavigate && (
        <button
          type="button"
          onClick={() => onNavigate(stepIndex)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
        >
          <Edit2 className="w-3 h-3" />
          Edit
        </button>
      )}
    </div>
  );
}

function FieldRow({
  label,
  value,
  mono,
  missing,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  missing?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span
        className={`text-xs break-all ${mono ? 'font-mono' : ''} ${
          missing ? 'text-gray-400 italic' : 'text-gray-800 dark:text-gray-200'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function OverlaySpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm mx-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-gray-200 dark:border-gray-700" />
          <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
          <div className="absolute inset-2 w-16 h-16 rounded-full border-4 border-transparent border-t-green-500 animate-spin" style={{ animationDuration: '1.5s' }} />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Processing Transaction
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Please wait while we submit your verification request to the Stellar network.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Confirm the transaction in your Freighter wallet when prompted.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Waiting for blockchain confirmation...</span>
        </div>
      </div>
    </div>
  );
}

function SuccessState({
  result,
  onReset,
}: {
  result: SubmissionResult;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard API not available
    }
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      <div className="flex flex-col items-center text-center space-y-4 py-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Verification Submitted Successfully!
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
            Your verification request has been submitted to the Stellar network. 
            You can track the status using the details below.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-5 space-y-4">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Transaction Details</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Request ID</p>
              <p className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate">{result.requestId}</p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(result.requestId, 'requestId')}
              className="ml-2 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Copy Request ID"
            >
              {copied === 'requestId' ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Transaction Hash</p>
              <p className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate">{result.txHash}</p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(result.txHash, 'txHash')}
              className="ml-2 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Copy Transaction Hash"
            >
              {copied === 'txHash' ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>

          {result.certificateId && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Certificate ID</p>
                <p className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate">{result.certificateId}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(result.certificateId!, 'certificateId')}
                className="ml-2 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Copy Certificate ID"
              >
                {copied === 'certificateId' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
          )}

          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400">Submitted At</p>
            <p className="text-sm text-gray-800 dark:text-gray-200">
              {new Date(result.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={`https://testnet.steexp.com/tx/${result.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View on Explorer
        </a>
        <button
          type="button"
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Start New Verification
        </button>
      </div>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
  onReset,
}: {
  error: string;
  onRetry: () => void;
  onReset: () => void;
}) {
  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      <div className="flex flex-col items-center text-center space-y-4 py-6">
        <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Submission Failed
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
            {error}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}

export default function ReviewSubmitStep({ onNavigate }: ReviewSubmitStepProps) {
  const {
    formData,
    isSubmitting,
    submissionResult,
    submissionError,
    setIsSubmitting,
    setSubmissionResult,
    setSubmissionError,
    resetWizard,
  } = useWizardStore();

  const [confirmed, setConfirmed] = useState(false);
  const content = formData.content;
  const modeName = content?.encryptionEnabled ? 'SPV (Encrypted)' : 'Standard';
  const contentHashValid = isValidSHA256(content?.contentHash ?? '');
  const hasManifest = content?.manifest !== null && content?.manifest !== undefined;
  const canSubmit = contentHashValid && confirmed && !isSubmitting && !submissionResult;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const result = await submitVerificationRequest(
        content?.contentHash ?? '',
        content?.manifestHash ?? null,
        'GAAAAAAAAAAAAAAA'
      );

      setSubmissionResult({
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setSubmissionError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, content, setIsSubmitting, setSubmissionResult, setSubmissionError]);

  const handleRetry = useCallback(() => {
    setSubmissionError(null);
  }, [setSubmissionError]);

  const handleReset = useCallback(() => {
    resetWizard();
  }, [resetWizard]);

  if (submissionResult) {
    return <SuccessState result={submissionResult} onReset={handleReset} />;
  }

  if (submissionError) {
    return (
      <ErrorState error={submissionError} onRetry={handleRetry} onReset={handleReset} />
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4 space-y-3">
        <SectionHeader icon={<Upload className="w-4 h-4" />} title="Uploaded File" stepIndex={0} onNavigate={onNavigate} />
        {content?.file ? (
          <FieldRow label="File" value={`${content.file.name} (${(content.file.size / 1024).toFixed(1)} KB)`} />
        ) : (
          <p className="text-xs text-gray-400 italic">No file uploaded.</p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4">
        <SectionHeader icon={<FileText className="w-4 h-4" />} title="Verification Mode" />
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            content?.encryptionEnabled
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-100 text-blue-700'
          }`}
        >
          {content?.encryptionEnabled && <ShieldCheck className="w-3 h-3" />}
          {modeName}
        </span>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4 space-y-3">
        <SectionHeader icon={<Hash className="w-4 h-4" />} title="Content Hash" stepIndex={0} onNavigate={onNavigate} />
        {contentHashValid ? (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <p className="text-xs font-mono break-all text-green-800 dark:text-green-200">
              {content?.contentHash}
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-700">Valid hash required.</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4 space-y-3">
        <SectionHeader icon={<FileJson className="w-4 h-4" />} title="Manifest" stepIndex={1} onNavigate={onNavigate} />
        {hasManifest && content?.manifestHash ? (
          <FieldRow label="Manifest Hash" value={content.manifestHash} mono />
        ) : (
          <p className="text-xs text-gray-400 italic">No manifest attached.</p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-5 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={isSubmitting}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
          />
          <span className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
            I confirm that the information above is correct and I authorise the submission to the Stellar network.
          </span>
        </label>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
            canSubmit
              ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Record
            </>
          )}
        </button>
      </div>

      {isSubmitting && <OverlaySpinner />}
    </div>
  );
}
