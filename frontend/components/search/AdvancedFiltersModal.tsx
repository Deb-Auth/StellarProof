"use client";

import { useState } from "react";
import { Calendar, RotateCcw, ShieldCheck, User } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { cn } from "@/utils/cn";

/* ------------------------------------------------------------------ */
/*                              Types                                  */
/* ------------------------------------------------------------------ */

export type SpvPrivacyStatus = "all" | "public" | "private" | "restricted";

export type SearchFileType =
  | "all"
  | "pdf"
  | "image"
  | "video"
  | "document"
  | "archive"
  | "other";

export interface AdvancedFilters {
  dateFrom: string;
  dateTo: string;
  privacyStatus: SpvPrivacyStatus;
  fileType: SearchFileType;
  creator: string;
}

export interface AdvancedFiltersModalProps {
  open: boolean;
  onClose: () => void;
  filters: AdvancedFilters;
  onApply: (filters: AdvancedFilters) => void;
}

/* ------------------------------------------------------------------ */
/*                           Constants                                 */
/* ------------------------------------------------------------------ */

export const DEFAULT_ADVANCED_FILTERS: AdvancedFilters = {
  dateFrom: "",
  dateTo: "",
  privacyStatus: "all",
  fileType: "all",
  creator: "",
};

const PRIVACY_OPTIONS: { value: SpvPrivacyStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "restricted", label: "Restricted" },
];

const FILE_TYPE_OPTIONS: { value: SearchFileType; label: string }[] = [
  { value: "all", label: "All file types" },
  { value: "pdf", label: "PDF" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
  { value: "archive", label: "Archive" },
  { value: "other", label: "Other" },
];

/* ------------------------------------------------------------------ */
/*                           Helpers                                   */
/* ------------------------------------------------------------------ */

export function hasActiveAdvancedFilters(f: AdvancedFilters): boolean {
  return (
    f.dateFrom !== "" ||
    f.dateTo !== "" ||
    f.privacyStatus !== "all" ||
    f.fileType !== "all" ||
    f.creator.trim() !== ""
  );
}

/* ------------------------------------------------------------------ */
/*                        Sub-components                               */
/* ------------------------------------------------------------------ */

interface DateFieldProps {
  id: string;
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (v: string) => void;
}

function DateField({ id, label, value, min, max, onChange }: DateFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-gray-400">
        {label}
      </label>
      <div className="relative">
        <Calendar
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          id={id}
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "pl-8 pr-3 py-2 text-sm rounded-lg border w-full",
            "bg-darkblue-dark text-gray-100",
            "border-white/10",
            "focus:outline-none focus:ring-2 focus:ring-primary/60",
            "transition-colors"
          )}
        />
      </div>
    </div>
  );
}

interface ChipGroupProps<T extends string> {
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

function ChipGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
}: ChipGroupProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-gray-400">{legend}</span>
      <div className="flex flex-wrap gap-2" role="group" aria-label={legend}>
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={selected}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 select-none",
                selected
                  ? "bg-primary/20 border-primary text-primary ring-1 ring-primary"
                  : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                     AdvancedFiltersModal                            */
/* ------------------------------------------------------------------ */

export function AdvancedFiltersModal({
  open,
  onClose,
  filters,
  onApply,
}: AdvancedFiltersModalProps) {
  const [draft, setDraft] = useState<AdvancedFilters>(filters);

  // Re-sync the draft to the incoming filters whenever the modal transitions
  // from closed to open, so each open starts from the current applied state.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(filters);
  }

  const update = <K extends keyof AdvancedFilters>(
    key: K,
    value: AdvancedFilters[K]
  ) => setDraft((d) => ({ ...d, [key]: value }));

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleReset = () => setDraft(DEFAULT_ADVANCED_FILTERS);

  const handleCancel = () => {
    setDraft(filters);
    onClose();
  };

  const active = hasActiveAdvancedFilters(draft);

  return (
    <Modal open={open} onClose={handleCancel} size="lg">
      <ModalHeader>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-white">
            Advanced Filters
          </h2>
          {active && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset
            </button>
          )}
        </div>
      </ModalHeader>

      <ModalBody className="space-y-5">
        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <DateField
            id="advanced-filter-date-from"
            label="Date from"
            value={draft.dateFrom}
            max={draft.dateTo || undefined}
            onChange={(v) => update("dateFrom", v)}
          />
          <DateField
            id="advanced-filter-date-to"
            label="Date to"
            value={draft.dateTo}
            min={draft.dateFrom || undefined}
            onChange={(v) => update("dateTo", v)}
          />
        </div>

        {/* SPV privacy status */}
        <ChipGroup
          legend="SPV privacy status"
          options={PRIVACY_OPTIONS}
          value={draft.privacyStatus}
          onChange={(v) => update("privacyStatus", v)}
        />

        {/* File type */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="advanced-filter-file-type"
            className="text-xs font-medium text-gray-400"
          >
            File type
          </label>
          <select
            id="advanced-filter-file-type"
            value={draft.fileType}
            onChange={(e) =>
              update("fileType", e.target.value as SearchFileType)
            }
            className={cn(
              "px-3 py-2 text-sm rounded-lg border w-full",
              "bg-darkblue-dark text-gray-100",
              "border-white/10",
              "focus:outline-none focus:ring-2 focus:ring-primary/60",
              "transition-colors"
            )}
          >
            {FILE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Creator */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="advanced-filter-creator"
            className="text-xs font-medium text-gray-400"
          >
            Creator
          </label>
          <div className="relative">
            <User
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="advanced-filter-creator"
              type="text"
              value={draft.creator}
              onChange={(e) => update("creator", e.target.value)}
              placeholder="Wallet address or username…"
              className={cn(
                "pl-8 pr-3 py-2 text-sm rounded-lg border w-full",
                "bg-darkblue-dark text-gray-100",
                "placeholder-gray-500",
                "border-white/10",
                "focus:outline-none focus:ring-2 focus:ring-primary/60",
                "transition-colors"
              )}
            />
          </div>
        </div>

        {draft.privacyStatus !== "all" && (
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Only {draft.privacyStatus} SPV entries will be shown.
          </p>
        )}
      </ModalBody>

      <ModalFooter>
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors shadow-button-glow"
        >
          Apply Filters
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default AdvancedFiltersModal;
