import React, { useState, useEffect } from 'react'
import SecondaryInput from '@/components/shared/secondary-input'
import SecondarySelectWithCreate from '@/components/shared/secondary-select-with-create'
import { toast } from 'sonner'
import SecondaryMultiSelect from '@/components/shared/secondary-multi-select'
import { generateAndDownloadBarcode } from '@/lib/barcode-generator'

const GeneralInformation = ({
  productName,
  setProductName,
  productCode,
  setProductCode,
  productPrice,
  setProductPrice,
  productWeight,
  setProductWeight,
  productDimensions,
  setProductDimensions,
  productCategory,
  setProductCategory,
  includedProjects,
  setIncludedProjects,
  includedProjectsOptions = [],
  overwriteThreshold,
  setOverwriteThreshold,
  serialNo,
  setSerialNo,
  unit,
  setUnit,
  handleProductCodeScanned,
  isEditing = false,
  categoryOptions = [],
  setCategoryOptions = () => {},
  unitOptions = [],
  setUnitOptions = () => {}
}) => {
  useEffect(() => {
    if (unit && unitOptions && Array.isArray(unitOptions)) {
      const lowerUnit = unit.toLowerCase();
      const unitExists = unitOptions.some(
        (option) => option.value && option.value.toLowerCase() === lowerUnit
      );
      if (!unitExists) {
        const newUnitOption = {
          value: lowerUnit,
          label: unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase(),
        };
        setUnitOptions((prevOptions) => [...prevOptions, newUnitOption]);
      }
    }
  }, [unit, unitOptions, setUnitOptions]);

  const handleDownload = () => {
    if (!productCode || productCode.trim() === '') {
      toast.error('Product code is required to generate barcode');
      return;
    }
    try {
      generateAndDownloadBarcode(productCode, `barcode-${productCode}.jpg`);
      toast.success('Barcode downloaded successfully!');
    } catch (error) {
      console.error('Error downloading barcode:', error);
      toast.error('Failed to download barcode. Please try again.');
    }
  };

  const handleSparkles = async () => {
    let loadingToastId;
    try {
      loadingToastId = toast.loading('Generating unique product code...');
      const response = await fetch('/api/generate-product-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setProductCode(data.code);
        toast.dismiss(loadingToastId);
        toast.success(`Unique product code generated: ${data.code}`);
      } else {
        toast.dismiss(loadingToastId);
        toast.error('Failed to generate unique product code. Please try again.');
      }
    } catch (error) {
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
      }
      toast.error('Failed to generate unique product code. Please try again.');
    }
  };

  const readOnly = !isEditing;

  return (
    <div className="flex flex-col justify-between gap-5">
      <h2>General Information</h2>
      <div className="flex flex-col w-full gap-4">
        <div className="flex flex-row gap-4">
          <SecondaryInput
            label="Product Name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            disabled={readOnly}
          />
          <SecondaryInput
            label="Product Code"
            value={productCode}
            onChange={(e) => setProductCode(e.target.value)}
            showQrScanner={!readOnly}
            onScan={handleProductCodeScanned}
            showDownload={true}
            onDownload={handleDownload}
            showSparkles={!readOnly}
            onSparkles={handleSparkles}
            disabled={readOnly}
            className={readOnly ? 'opacity-60' : ''}
          />
        </div>
        <div className="flex flex-row gap-4">
          <SecondaryInput
            label="Product Price"
            value={productPrice}
            onChange={(e) => setProductPrice(e.target.value)}
            disabled={readOnly}
          />
          <SecondaryInput
            label="Product Weight"
            value={productWeight}
            onChange={(e) => setProductWeight(e.target.value)}
            disabled={readOnly}
          />
        </div>
        <div className="flex flex-row gap-4">
          <SecondaryInput
            label="Product Dimensions"
            value={productDimensions}
            onChange={(e) => setProductDimensions(e.target.value)}
            disabled={readOnly}
          />
          <SecondarySelectWithCreate
            label="Product Category"
            placeholder="Select or type category"
            value={productCategory}
            onValueChange={setProductCategory}
            options={categoryOptions}
            setOptions={setCategoryOptions}
            allowCreate={!readOnly}
            disabled={readOnly}
          />
        </div>
        <div className="flex flex-row gap-4">
          <SecondaryMultiSelect
            label="Included Projects"
            placeholder="Select projects to include"
            value={includedProjects}
            onValueChange={setIncludedProjects}
            options={includedProjectsOptions}
            disabled={readOnly}
          />
          <SecondaryInput
            label="Overwrite Threshold"
            value={overwriteThreshold}
            onChange={(e) => setOverwriteThreshold(e.target.value)}
            disabled={readOnly}
          />
        </div>
        <div className="flex flex-row gap-4">
          <SecondaryInput
            label="Serial No"
            value={serialNo}
            onChange={(e) => setSerialNo(e.target.value)}
            disabled={readOnly}
          />
        </div>
        <div className="flex flex-row gap-4">
          <SecondarySelectWithCreate
            label="Unit"
            placeholder="Select or type unit"
            value={unit}
            onValueChange={setUnit}
            options={unitOptions}
            setOptions={setUnitOptions}
            allowCreate={!readOnly}
            disabled={readOnly}
          />
        </div>
      </div>
    </div>
  );
};

export default GeneralInformation