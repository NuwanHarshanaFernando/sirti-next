/**
 * Generate Excel Template for Product Import
 * This script generates a template Excel file with the correct column structure
 * for importing products into the SIRTI inventory system.
 */

const XLSX = require('xlsx');
const path = require('path');

// Define the column headers
const headers = [
  'SKU',
  'Item Type', 
  'Item Description',
  'Serial No',
  'Location',
  'UOM',
  'QTY In',
  'QTY Out', 
  'QTY Remaining',
  'Project',
  'Remarks'
];

// Define sample data
const sampleData = [
  headers, // Header row
  [
    'PROD001',
    'Electronics',
    'Laptop Computer',
    'LT001',
    'RACK-A1',
    'Pcs',
    '10',
    '2',
    '8',
    'Safety',
    'Initial stock import'
  ],
  [
    'PROD002',
    'Office Supplies',
    'Wireless Mouse',
    'MS002',
    'RACK-B2',
    'Pcs',
    '50',
    '5',
    '45',
    'QAF',
    'Bulk purchase'
  ],
  [
    'PROD003',
    'Hardware',
    'Network Cable Cat6',
    '',
    'RACK-C1',
    'Meters',
    '100',
    '0',
    '100',
    'Safety',
    'New installation'
  ]
];

// Create workbook and worksheet
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet(sampleData);

// Add some styling and comments
worksheet['!cols'] = [
  { width: 15 }, // SKU
  { width: 20 }, // Item Type
  { width: 30 }, // Item Description
  { width: 15 }, // Serial No
  { width: 15 }, // Location
  { width: 10 }, // UOM
  { width: 10 }, // QTY In
  { width: 10 }, // QTY Out
  { width: 15 }, // QTY Remaining
  { width: 25 }, // Project
  { width: 20 }  // Remarks
];

// Add the worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Product Import Template');

// Generate the file
const outputPath = path.join(__dirname, '..', 'product-import-template.xlsx');
XLSX.writeFile(workbook, outputPath);



