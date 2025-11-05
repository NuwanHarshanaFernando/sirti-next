# Product Import Column Structure

## Overview
The SIRTI Inventory System now supports importing products with an enhanced 12-column structure that provides better tracking of stock movements, project assignments, and included projects for stock management access control.

## Required Column Structure

| Column # | Column Name      | Description                           | Required | Data Type | Example        |
|----------|------------------|---------------------------------------|----------|-----------|----------------|
| 1        | SKU              | Unique product identifier            | Yes      | Text      | PROD001        |
| 2        | Item Type        | Product category                     | Yes      | Text      | Electronics    |
| 3        | Item Description | Product name/description             | Yes      | Text      | Laptop Computer|
| 4        | Serial No        | Product serial number                | No       | Text      | LT001          |
| 5        | Location         | Rack/storage location               | No       | Text      | RACK-A1        |
| 6        | UOM              | Unit of measurement                  | Yes      | Text      | Pcs            |
| 7        | QTY In           | Quantity received/added              | No       | Number    | 10             |
| 8        | QTY Out          | Quantity issued/removed              | No       | Number    | 2              |
| 9        | QTY Remaining    | Current stock quantity               | No       | Number    | 8              |
| 10       | Project          | Project name (not ID)                | No       | Text      | Main Office Project |
| 11       | Remarks          | Additional notes                     | No       | Text      | Initial stock  |
| 12       | Projects         | Included projects (comma-separated)  | No       | Text      | Project A, Project B |

## Important Notes

### Required Fields
- **SKU**: Must be unique across all products
- **Item Type**: Product category for classification
- **Item Description**: Clear product name
- **UOM**: Unit of measurement (Pcs, Kg, Meters, etc.)

### Included Projects (Column 12)
- The **Projects** column should contain comma-separated project names or project IDs
- Example: "Project A, Project B, PRJ001" or "Main Office Project, Warehouse Project"
- Project names are matched case-insensitively against existing projects in the system
- Project IDs are matched exactly against existing project IDs
- Only existing projects will be included - non-existent projects will be skipped with a warning
- These projects will be stored in the product's `includedProjects` field
- When users access stock management routes (in/out), they will only see these included projects in the dropdown
- This provides access control for which projects can manage stock for this product

### Project Validation
- The **Project** column should contain the project name (e.g., "Main Office Project"), not project ID
- Project names are matched case-insensitively against existing projects in the system
- If a project with the given name doesn't exist, a new project will be created automatically
- The new project will be assigned a unique project ID (e.g., PRJ001, PRJ002, etc.)
- Racks specified in the Location column will be assigned to the project (existing or newly created)

### Quantity Calculations
- **QTY Remaining** should equal (QTY In - QTY Out)
- The system will validate this calculation and reject rows where it doesn't match
- If QTY In and QTY Out are provided but QTY Remaining is blank, it will be calculated automatically
- **Stock transaction records** will be automatically created in the `stockTransactions` collection for:
  - QTY In transactions (if QTY In > 0)
  - QTY Out transactions (if QTY Out > 0)
- Each transaction includes product details, project name, rack location, and timestamps

### Location/Rack Assignment
- If a **Location** (rack) is specified, it will be created if it doesn't exist
- The rack will be automatically assigned to the specified project
- Stock quantity will be assigned to the rack within the project

## Sample Excel Structure

```
SKU      | Item Type  | Item Description | Serial No | Location | UOM | QTY In | QTY Out | QTY Remaining | Project             | Remarks      | Projects
---------|------------|------------------|-----------|----------|-----|--------|---------|---------------|---------------------|--------------|-------------------
PROD001  | Electronics| Laptop Computer  | LT001     | RACK-A1  | Pcs | 10     | 2       | 8             | Main Office Project | Initial stock| Project A, Project B
PROD002  | Office     | Wireless Mouse   | MS002     | RACK-B2  | Pcs | 50     | 5       | 45            | Warehouse Project   | Bulk purchase| Warehouse Project
PROD003  | Hardware   | Network Cable    |           | RACK-C1  | M   | 100    | 0       | 100           | Main Office Project | New installation| Main Office Project, IT Project
```

## Error Handling

The system provides detailed error messages for:
- Missing required fields
- Invalid or non-existent project names (note: projects will be auto-created if they don't exist)
- Quantity calculation mismatches
- Duplicate SKUs
- Invalid data types

## Stock Transaction Records

The import process automatically creates stock transaction records in the `stockTransactions` collection with the following structure:

```javascript
{
  productId: ObjectId,           // Reference to the product
  productSKU: String,           // Product SKU for easy reference
  productName: String,          // Product name for easy reference
  transactionType: String,      // "in" or "out"
  quantity: Number,             // Transaction quantity
  projectName: String,          // Project name (if specified)
  rackLocation: String,         // Rack location (if specified)
  remarks: String,              // Import remarks with context
  transactionDate: Date,        // When the transaction occurred
  createdAt: Date,             // Record creation timestamp
  updatedAt: Date              // Record update timestamp
}
```

This provides a complete audit trail of all stock movements during the import process.

## Generate Template

You can generate a template Excel file by running:
```bash
node scripts/generate-import-template.js
```

This will create a `product-import-template.xlsx` file with the correct structure and sample data.
