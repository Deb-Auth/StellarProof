"use client";

import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useTheme } from "@/app/context/ThemeContext";

interface ManifestFormState {
  title: string;
  creator: string;
  description: string;
  issuer: string;
}

export function ManifestGeneratorStep() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ManifestFormState>({
    defaultValues: {
      title: "",
      creator: "",
      description: "",
      issuer: "",
    },
  });

  const onSubmit: SubmitHandler<ManifestFormState> = async (data) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Form Data Submitted:", data);
    // In a real implementation, you would proceed to the next step of the wizard here.
  };

  // Reusable Tailwind CSS classes for form elements
  const labelClass = `block text-sm font-semibold mb-2 ${
    isDark ? "text-white" : "text-gray-900"
  }`;
  const inputBase = `w-full px-4 py-2 rounded-md border transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent`;
  const inputNormal = isDark
    ? "border-gray-600 bg-gray-700 text-white placeholder-gray-400"
    : "border-gray-300 bg-white text-gray-900 placeholder-gray-500";
  const inputError = "border-red-500";

  return (
    <div
      className={`rounded-lg shadow-lg p-8 ${
        isDark ? "bg-gray-800" : "bg-white"
      }`}
    >
      <div className="mb-8">
        <h2
          className={`text-2xl font-bold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Generate Manifest
        </h2>
        <p className={isDark ? "text-gray-400" : "text-gray-600"}>
          Enter the metadata for the digital asset. This information will be
          part of the verifiable certificate.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className={labelClass}>
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            {...register("title", { required: "Title is required" })}
            placeholder="e.g., Digital Artwork 'Sunrise'"
            className={`${inputBase} ${errors.title ? inputError : inputNormal}`}
            aria-invalid={errors.title ? "true" : "false"}
          />
          {errors.title && (
            <p role="alert" className="text-red-500 text-sm mt-1">
              {errors.title.message}
            </p>
          )}
        </div>

        {/* Creator */}
        <div>
          <label htmlFor="creator" className={labelClass}>
            Creator <span className="text-red-500">*</span>
          </label>
          <input
            id="creator"
            type="text"
            {...register("creator", { required: "Creator is required" })}
            placeholder="e.g., Jane Doe"
            className={`${inputBase} ${errors.creator ? inputError : inputNormal}`}
            aria-invalid={errors.creator ? "true" : "false"}
          />
          {errors.creator && (
            <p role="alert" className="text-red-500 text-sm mt-1">
              {errors.creator.message}
            </p>
          )}
        </div>

        {/* Issuer */}
        <div>
          <label htmlFor="issuer" className={labelClass}>
            Issuer
          </label>
          <input
            id="issuer"
            type="text"
            {...register("issuer")}
            placeholder="e.g., Art Gallery Inc. (optional)"
            className={`${inputBase} ${inputNormal}`}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className={labelClass}>
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            {...register("description", {
              required: "Description is required",
              minLength: {
                value: 10,
                message: "Description must be at least 10 characters",
              },
            })}
            rows={4}
            placeholder="A detailed description of the asset..."
            className={`${inputBase} resize-none ${
              errors.description ? inputError : inputNormal
            }`}
            aria-invalid={errors.description ? "true" : "false"}
          />
          {errors.description && (
            <p role="alert" className="text-red-500 text-sm mt-1">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`py-2 px-6 rounded-md font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
              isSubmitting
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Generating...</span>
              </>
            ) : (
              "Generate & Proceed"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}