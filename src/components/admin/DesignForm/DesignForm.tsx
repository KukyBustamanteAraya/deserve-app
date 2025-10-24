'use client';

import { memo } from 'react';
import type { DesignFormProps } from './types';
import { useDesignForm } from './useDesignForm';
import FormHeader from './FormHeader';
import BasicInfoSection from './BasicInfoSection';
import ClassificationSection from './ClassificationSection';
import SettingsSection from './SettingsSection';
import DesignImagesManager from './DesignImagesManager';
import FormActions from './FormActions';

const DesignForm = memo(function DesignForm({ design, mode }: DesignFormProps) {
  const {
    formData,
    designImages,
    sports,
    products,
    loading,
    errors,
    updateFormData,
    toggleStyleTag,
    addColor,
    removeColor,
    getProductsForSport,
    addDesignImage,
    updateDesignImage,
    removeDesignImage,
    handleFileChange,
    handleSubmit,
  } = useDesignForm(design, mode);

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6">
      <FormHeader mode={mode} />

      <BasicInfoSection formData={formData} errors={errors} onUpdate={updateFormData} />

      <ClassificationSection
        styleTags={formData.style_tags}
        colorScheme={formData.color_scheme}
        onToggleStyleTag={toggleStyleTag}
        onAddColor={addColor}
        onRemoveColor={removeColor}
      />

      <SettingsSection formData={formData} onUpdate={updateFormData} />

      <DesignImagesManager
        designImages={designImages}
        sports={sports}
        products={products}
        errors={errors}
        onAddImage={addDesignImage}
        onUpdateImage={updateDesignImage}
        onRemoveImage={removeDesignImage}
        onFileChange={handleFileChange}
        getProductsForSport={getProductsForSport}
      />

      <FormActions loading={loading} mode={mode} />
    </form>
  );
});

export default DesignForm;
