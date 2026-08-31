import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { manifestSchema, ManifestFormData } from '../schemas/manifest.schema';

export const ManifestGeneratorForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ManifestFormData>({
    resolver: zodResolver(manifestSchema),
  });

  const onSubmit = (data: ManifestFormData) => {
    console.log('Validated Manifest Data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <label>Title</label>
        <input {...register('title')} />
        {errors.title && <span className="text-red-500 text-sm">{errors.title.message}</span>}
      </div>

      <div>
        <label>Description</label>
        <textarea {...register('description')} />
        {errors.description && <span className="text-red-500 text-sm">{errors.description.message}</span>}
      </div>

      <div>
        <label>Version</label>
        <input {...register('version')} placeholder="1.0.0" />
        {errors.version && <span className="text-red-500 text-sm">{errors.version.message}</span>}
      </div>

      <div>
        <label>Author</label>
        <input {...register('author')} />
        {errors.author && <span className="text-red-500 text-sm">{errors.author.message}</span>}
      </div>

      <button type="submit">Generate Manifest</button>
    </form>
  );
};