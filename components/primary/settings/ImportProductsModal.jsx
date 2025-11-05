"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle } from "lucide-react";
import * as XLSX from 'xlsx';
import { toast } from "sonner";

const ImportProductsModal = ({ isOpen, onClose, onImportComplete, onImportStarted }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [importStatus, setImportStatus] = useState({
    success: 0,
    errors: 0,
    details: []
  });
  const [showResults, setShowResults] = useState(false);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        '.xlsx',
        '.xls'
      ];
      
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.toLowerCase().endsWith('.xlsx') && !selectedFile.name.toLowerCase().endsWith('.xls')) {
        toast.error('Please select a valid Excel file (.xlsx or .xls)');
        return;
      }

      setFile(selectedFile);
      previewFile(selectedFile);
    }
  };

  const previewFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        
        setPreview(jsonData.slice(0, 6));
      } catch (error) {
        toast.error('Error reading Excel file. Please make sure it\'s a valid Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const validateRow = (row, rowIndex) => {
    const errors = [];
    
    
    if (!row[0] || !row[0].toString().trim()) {
      errors.push(`Row ${rowIndex + 2}: SKU is required`);
    }
    if (!row[2] || !row[2].toString().trim()) {
      errors.push(`Row ${rowIndex + 2}: Item Description (Product Name) is required`);
    }
    if (!row[1] || !row[1].toString().trim()) {
      errors.push(`Row ${rowIndex + 2}: Item Type (Product Category) is required`);
    }
    if (!row[5] || !row[5].toString().trim()) {
      errors.push(`Row ${rowIndex + 2}: UOM (Unit) is required`);
    }
    
    
    if (row[6] !== undefined && row[6] !== null && row[6] !== '') {
      const qtyIn = parseInt(row[6]);
      if (isNaN(qtyIn) || qtyIn < 0) {
        errors.push(`Row ${rowIndex + 2}: QTY In must be a valid number >= 0`);
      }
    }
    
    
    if (row[7] !== undefined && row[7] !== null && row[7] !== '') {
      const qtyOut = parseInt(row[7]);
      if (isNaN(qtyOut) || qtyOut < 0) {
        errors.push(`Row ${rowIndex + 2}: QTY Out must be a valid number >= 0`);
      }
    }
    
    
    if (row[8] !== undefined && row[8] !== null && row[8] !== '') {
      const qtyRemaining = parseInt(row[8]);
      if (isNaN(qtyRemaining) || qtyRemaining < 0) {
        errors.push(`Row ${rowIndex + 2}: QTY Remaining must be a valid number >= 0`);
      }
    }
    
    
    const qtyIn = parseInt(row[6]) || 0;
    const qtyOut = parseInt(row[7]) || 0;
    const qtyRemaining = parseInt(row[8]) || 0;
    const calculatedRemaining = qtyIn - qtyOut;
    
    if (row[6] !== undefined && row[7] !== undefined && row[8] !== undefined) {
      if (qtyRemaining !== calculatedRemaining) {
        errors.push(`Row ${rowIndex + 2}: QTY Remaining (${qtyRemaining}) does not match calculated quantity (QTY In: ${qtyIn} - QTY Out: ${qtyOut} = ${calculatedRemaining})`);
      }
    }
    
    
    if (row[9] && row[9].toString().trim()) {
      
      
    }
    
    return errors;
  };

  const processImport = async () => {
    if (!file) return;

    setLoading(true);
    setImportStatus({ success: 0, errors: 0, details: [] });
    
    
    if (onImportStarted) {
      onImportStarted();
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          
          const dataRows = jsonData.slice(1);
          let successCount = 0;
          let errorCount = 0;
          const details = [];

          for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            
            
            if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
              continue;
            }

            
            const validationErrors = validateRow(row, i);
            if (validationErrors.length > 0) {
              errorCount++;
              details.push(...validationErrors);
              continue;
            }

            
            const productData = {
              productId: row[0]?.toString().trim(), 
              category: row[1]?.toString().trim(), 
              productName: row[2]?.toString().trim(), 
              serialNumber: row[3]?.toString().trim() || '', 
              assignedRack: row[4]?.toString().trim() || '', 
              unit: row[5]?.toString().trim(), 
              qtyIn: parseInt(row[6]) || 0, 
              qtyOut: parseInt(row[7]) || 0, 
              qtyRemaining: parseInt(row[8]) || 0, 
              projectName: row[9]?.toString().trim() || '', 
              remarks: row[10]?.toString().trim() || '', 
              
              stockQuantity: (parseInt(row[6]) || 0) - (parseInt(row[7]) || 0),
              
              price: 0,
              lowStockThreshold: 10,
              productImage: '',
              weight: 0,
              dimensions: '',
              description: ''
            };            try {
              
              const response = await fetch('/api/Products/import', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(productData),
              });

              const result = await response.json();

              if (response.ok) {
                successCount++;
                const successMessage = `✅ Row ${i + 2}: ${productData.productName} imported successfully`;
                
                const extraInfo = [];
                if (productData.projectName) {
                  extraInfo.push(`Project: ${productData.projectName}`);
                }
                if (productData.assignedRack) {
                  extraInfo.push(`Rack: ${productData.assignedRack}`);
                }
                if (typeof productData.stockQuantity === 'number') {
                  extraInfo.push(`Stock: ${productData.stockQuantity} (In: ${productData.qtyIn}, Out: ${productData.qtyOut})`);
                }
                if (result.transactionInfo) {
                  if (result.transactionInfo.transactionsCreated > 0) {
                    extraInfo.push(`Transactions: ${result.transactionInfo.transactionsCreated} created`);
                  }
                  if (Array.isArray(result.transactionInfo.details) && result.transactionInfo.details.length > 0) {
                    extraInfo.push(`Transaction Details: ${result.transactionInfo.details.map(t => `${t.type} ${t.qty}`).join('; ')}`);
                  }
                }
                if (result.includedProjectsStatus && result.includedProjectsStatus !== 'No included projects') {
                  extraInfo.push(`Included Projects: ${result.includedProjectsStatus}`);
                }
                if (productData.projectName) {
                  extraInfo.push(`Project: ${productData.projectName}`);
                }
                if (productData.remarks) {
                  extraInfo.push(`Remarks: ${productData.remarks}`);
                }
                details.push(extraInfo.length > 0
                  ? `${successMessage} (${extraInfo.join(', ')})`
                  : successMessage);
              } else {
                errorCount++;
                details.push(`❌ Row ${i + 2}: ${result.error || 'Import failed'}`);
              }
            } catch (error) {
              errorCount++;
              details.push(`❌ Row ${i + 2}: Network error - ${error.message}`);
            }
          }

          setImportStatus({
            success: successCount,
            errors: errorCount,
            details
          });
          setShowResults(true);

          if (successCount > 0 && onImportComplete) {
            
            setTimeout(() => {
              onImportComplete();
            }, 1000);
          } else if (onImportComplete) {
            onImportComplete();
          }

        } catch (error) {
          setImportStatus({
            success: 0,
            errors: 1,
            details: [`Error processing Excel file: ${error.message}`]
          });
          setShowResults(true);
          
          if (onImportComplete) {
            onImportComplete();
          }
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      setImportStatus({
        success: 0,
        errors: 1,
        details: [`Import failed: ${error.message}`]
      });
      setShowResults(true);
      
      if (onImportComplete) {
        onImportComplete();
      }
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setPreview(null);
    setShowResults(false);
    setImportStatus({ success: 0, errors: 0, details: [] });
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <FileSpreadsheet className="w-5 h-5" />
            Import Products from Excel
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {!showResults ? (
          <>
              <div className="mb-6">
                <h3 className="mb-2 font-medium">Expected Excel Format:</h3>
                <div className="p-3 text-sm border rounded bg-gray-50">
                  <div className="grid grid-cols-11 gap-2 mb-1 font-medium">
                    <span>SKU</span>
                    <span>Item Type</span>
                    <span>Item Description</span>
                    <span>Serial No</span>
                    <span>Location</span>
                    <span>UOM</span>
                    <span>QTY In</span>
                    <span>QTY Out</span>
                    <span>QTY Remaining</span>
                    <span>Project</span>
                    <span>Remarks</span>
                  </div>
                  <div className="grid grid-cols-11 gap-2 text-xs text-gray-600">
                    <span>Product Code</span>
                    <span>Category</span>
                    <span>Product Name</span>
                    <span>Serial Number</span>
                    <span>Assigned Rack</span>
                    <span>Unit</span>
                    <span>Stock In</span>
                    <span>Stock Out</span>
                    <span>Current Stock</span>
                    <span>Project Name</span>
                    <span>Notes</span>
                  </div>
                </div>
                <div className="p-2 mt-2 text-sm text-blue-600 border border-blue-200 rounded bg-blue-50">
                  <p className="font-medium">Important Notes:</p>
                  <ul className="mt-1 ml-5 list-disc">
                    <li className="font-medium text-red-600">The Project column should contain the project name (e.g., "Main Office Project"), not project ID.</li>
                    <li className="font-medium text-green-600">Products will automatically be assigned to the project specified in the Project column for filtering access.</li>
                    <li>Project names are case-insensitive - the system will find existing projects regardless of letter case.</li>
                    <li>If the project name doesn't exist, a new project will be created automatically with that name.</li>
                    <li>If you specify a Rack in the Location column, it will be created and assigned to the project.</li>
                    <li>Stock quantity will be calculated as (QTY In - QTY Out) and assigned to the specified rack.</li>
                    <li>QTY Remaining should match the calculated stock quantity for verification purposes.</li>
                    <li className="font-medium text-green-600">Stock transaction records will be automatically created for QTY In and QTY Out values.</li>
                  </ul>
                </div>
              </div>

            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium">
                Select Excel File (.xlsx or .xls)
              </label>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
                {file && (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    {file.name}
                  </span>
                )}
              </div>
            </div>

            {preview && (
              <div className="mb-4">
                <h3 className="mb-2 font-medium">File Preview (First 5 rows):</h3>
                <div className="overflow-x-auto border rounded">
                  <table className="w-full text-sm">
                    <tbody>
                      {preview.map((row, index) => (
                        <tr key={index} className={index === 0 ? 'bg-gray-50 font-medium' : ''}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="p-2 border-b border-r whitespace-nowrap">
                              {cell || ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={processImport}
                disabled={!file || loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import Products
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <div>
            <div className="mb-4">
              <h3 className="flex items-center gap-2 mb-2 font-medium">
                <AlertCircle className="w-5 h-5" />
                Import Results
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 border border-green-200 rounded bg-green-50">
                  <div className="font-medium text-green-800">
                    ✅ Successful: {importStatus.success}
                  </div>
                </div>
                <div className="p-3 border border-red-200 rounded bg-red-50">
                  <div className="font-medium text-red-800">
                    ❌ Errors: {importStatus.errors}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="mb-2 font-medium">Details:</h4>
              <div className="p-3 overflow-y-auto border rounded bg-gray-50 max-h-60">
                {importStatus.details.map((detail, index) => (
                  <div key={index} className="mb-1 text-sm">
                    {detail}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={resetModal}
              >
                Import Another File
              </Button>
              <Button onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportProductsModal;
