import jsPDF from "jspdf";
import logoImageData from "@/imageDataLogo";
// Make sure jsPDF is available and properly imported
if (!jsPDF) {
  console.error("jsPDF library is not available!");
}

export const generateStockManagementPDF = async (data) => {
  const {
    type,
    transactionId,
    invoiceNumber,
    supplierName,
    date,
    items,
    createdBy,
    message,
  } = data;

  // TODO: Replace with your actual logo base64 data URL
  // Convert your logo to base64 using: https://www.base64-image.de/
  // Example: const logoImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';

  // Dynamically import jsPDF
  const { default: jsPDF } = await import("jspdf");

  // Create new PDF document
  const doc = new jsPDF();
  // Add logo/image with proper aspect ratio
  if (logoImageData) {
    try {
      // Use proper dimensions to maintain aspect ratio (width: 50, height: 20)
      doc.addImage(logoImageData, "PNG", 15, 10, 50, 20);
    } catch (error) {
      console.error("Failed to load logo:", error);
      // Fallback to placeholder
      doc.setDrawColor(200, 200, 200);
      doc.rect(15, 10, 50, 20);
      doc.setFontSize(8);
      doc.text("LOGO", 35, 22);
    }
  } else {
    // Placeholder when no logo is provided
    doc.setDrawColor(200, 200, 200);
    doc.rect(15, 10, 50, 20);
    doc.setFontSize(8);
    doc.text("LOGO", 35, 22);
  }

  // Set title below logo
  const title = type === "in" ? "GOODS RECEIVED NOTE" : "DELIVERY NOTE";
  doc.setFontSize(16);
  doc.text(title, 15, 40);

  // Date & Customer/Supplier
  doc.setFontSize(10);
  doc.text("Date :", 15, 58);
  doc.text(
    date
      ? new Date(date).toLocaleDateString()
      : new Date().toLocaleDateString(),
    25,
    58
  );

  // PO No. & Project (or Transaction ID & Project for delivery notices)
  if (type === "out" && transactionId) {
    doc.text("DN NO :", 15, 50);
    doc.text(transactionId, 29, 50);
  } else {
    doc.text("PO NO :", 15, 50);
    doc.text(invoiceNumber || "N/A", 29, 50);
  }

  if (type !== "in") {
    const projectName =
      data.projectName ||
      (items.length > 0 ? items[0].projectName || "N/A" : "N/A");
    doc.text("Project :", 150, 50);
    doc.text(projectName, 165, 50);

    doc.text(type === "in" ? "Supplier :" : "Person :", 150, 58);
    doc.text(supplierName || "N/A", 165, 58);
  } else {
    doc.text(type === "in" ? "Supplier :" : "Person :", 150, 50);
    doc.text(supplierName || "N/A", 165, 50);
    
    // Add GRN NO field below Supplier
    doc.text("GRN NO :", 150, 58);
    doc.text(transactionId, 168, 58);
  }
  // Table Headers
  doc.setFillColor(220);
  doc.rect(15, 78, 180, 10, "F"); // table header background - moved down from 70 to 78
  doc.setTextColor(0);

  let columns = {};

  // Remove Available column and expand SKU/Code column for all types
  doc.text("Item", 17, 85); // moved down from 77 to 85
  doc.text("Goods", 27, 85); // Centered in the goods column
  doc.text("SKU / Code", 100, 85); // SKU column starts at 100
  doc.text("Unit", 150, 85);
  doc.text("Quantity", 170, 85);
  columns = {
    item: { x: 17, width: 15 },
    goods: { x: 27, width: 73 },
  // SKU spans from x=100 up to unit.x=150, so width=50
  sku: { x: 100, width: 50 },
    unit: { x: 150, width: 20 },
    quantity: { x: 170, width: 25 },
  };

  // Table column widths and positions - with Available column for Stock In/GRN and wider SKU/Code column

  // Function to intelligently wrap text, especially for technical specifications
  const wrapTextIntelligently = (text, maxWidth) => {
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";

    for (let word of words) {
      const testLine = currentLine + (currentLine ? " " : "") + word;
      const testWidth = doc.getTextWidth(testLine);

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        // If current line has content, push it and start new line
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Single word is too long, force break it
          currentLine = word;
        }

        // If even single word is too long, force break it
        while (
          doc.getTextWidth(currentLine) > maxWidth &&
          currentLine.length > 1
        ) {
          // Find a good break point (prefer after punctuation)
          let breakPoint = currentLine.length - 1;
          const punctuation = [",", "/", "(", ")", "-", "."];

          for (
            let i = Math.floor(currentLine.length * 0.8);
            i > Math.floor(currentLine.length * 0.3);
            i--
          ) {
            if (punctuation.includes(currentLine[i])) {
              breakPoint = i + 1;
              break;
            }
          }

          lines.push(currentLine.substring(0, breakPoint));
          currentLine = currentLine.substring(breakPoint);
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  };

  // Hard wrap with no dependency on spaces/hyphens: break as soon as width would overflow
  const wrapTextHard = (text, maxWidth) => {
    const s = String(text || "");
    if (s.length === 0) return [""];
    const lines = [];
    let current = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      const test = current + ch;
      if (doc.getTextWidth(test) <= maxWidth) {
        current = test;
      } else {
        if (current.length > 0) {
          lines.push(current);
          current = ch;
        } else {
          // Single glyph wider than column (rare): put it alone
          lines.push(ch);
          current = "";
        }
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  // Function to calculate row height based on content
  const calculateRowHeight = (item) => {
    const productName = item.productName || "Unknown Product";
    const productCode = item.productCode || "N//A"; // Specifically use productId as requested

    // Use intelligent text wrapping instead of splitTextToSize
    const goodsLines = wrapTextIntelligently(
      productName,
      columns.goods.width - 4
    );
  // Use hard wrap for SKU so long strings break even without spaces/hyphens
  const skuLines = wrapTextHard(productCode, columns.sku.width - 4);

    // Calculate the maximum number of lines needed
  const maxLines = Math.max(goodsLines.length, skuLines.length, 1);

  // Each line needs approximately 6 units of height, minimum 14 units for row
  return Math.max(maxLines * 6 + 4, 14); // +4 for padding
  };

  // Function to add a new page if needed
  const checkPageBreak = (currentY, neededHeight) => {
    const pageHeight = doc.internal.pageSize.height;
    const bottomMargin = 40; // Space for signature section

    if (currentY + neededHeight > pageHeight - bottomMargin) {
      doc.addPage();
      return 20; // New page starting Y position
    }
    return currentY;
  };

  // Table Rows with dynamic height calculation
  let currentY = 88; // moved down from 80 to 88 to accommodate GRN NO field

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const rowHeight = calculateRowHeight(item);

    // Check if we need a new page
    currentY = checkPageBreak(currentY, rowHeight);

    // Draw row border
    doc.rect(15, currentY, 180, rowHeight); // Add vertical lines for column separation
    doc.line(columns.goods.x, currentY, columns.goods.x, currentY + rowHeight);
    doc.line(columns.sku.x, currentY, columns.sku.x, currentY + rowHeight);
    doc.line(columns.unit.x, currentY, columns.unit.x, currentY + rowHeight);
    doc.line(columns.quantity.x, currentY, columns.quantity.x, currentY + rowHeight);

    // Item number
    doc.text((index + 1).toString(), columns.item.x + 3, currentY + 7);

    // Product name with intelligent text wrapping
    const productNameValue = item.productName || "Unknown Product";
    // Ensure we're passing a string
    const productName =
      typeof productNameValue === "object"
        ? String(productNameValue)
        : String(productNameValue);
    const goodsLines = wrapTextIntelligently(
      productName,
      columns.goods.width - 4
    );
    for (let i = 0; i < goodsLines.length; i++) {
      doc.text(goodsLines[i], columns.goods.x + 2, currentY + 7 + i * 6);
    }

    // SKU/Code with intelligent text wrapping - specifically using productId as requested
    const productCode = item.productCode || "N//A"; // Only using productId as specified
    // Ensure we're passing a string to doc.text by using String() conversion
  const skuLines = wrapTextHard(productCode, columns.sku.width - 4);
    for (let i = 0; i < skuLines.length; i++) {
      doc.text(skuLines[i], columns.sku.x + 2, currentY + 7 + i * 6);
    }

    // Unit (usually short, no wrapping needed)
    // Try all possible unit field variations including nested objects
    let unitValue = "EA"; // Default to EA if nothing else is found

    // Check all possible unit fields in order of preference
    if (item.product && item.product.unit) unitValue = item.product.unit;
    else if (item.product && item.product.measuringUnit)
      unitValue = item.product.measuringUnit;
    else if (item.product && item.product.unitOfMeasure)
      unitValue = item.product.unitOfMeasure;
    else if (item.unit) unitValue = item.unit;
    else if (item.measuringUnit) unitValue = item.measuringUnit;
    else if (item.uom) unitValue = item.uom;
    else if (item.unitOfMeasure) unitValue = item.unitOfMeasure;
    else if (item.unitType) unitValue = item.unitType;
    // Ensure we're passing a string to doc.text
    doc.text(
      typeof unitValue === "object" ? String(unitValue) : String(unitValue),
      columns.unit.x + 2,
      currentY + 7
    );

    // Quantity - safely convert to string
    const quantityValue = item.quantity || 0;
    doc.text(String(quantityValue), columns.quantity.x + 2, currentY + 7);

    // Removed Available column from rows

    // Move to next row
    currentY += rowHeight;
  }

  // Signature Section - dynamically positioned after table content
  const signatureStartY = currentY + 20;

  // Check if signature section needs a new page
  const finalY = checkPageBreak(signatureStartY, 60); // 60 units needed for signature section

  doc.text("RECEIVED BY", 150, finalY);

  doc.text("SIGNATURE :", 115, finalY + 25);
  doc.line(140, finalY + 25, 200, finalY + 25);

  doc.text("NAME :", 115, finalY + 35);
  doc.line(140, finalY + 35, 200, finalY + 35);

  doc.text("Mobile No.:", 115, finalY + 45);
  doc.line(140, finalY + 45, 200, finalY + 45);

  doc.text("QID :", 115, finalY + 55);
  doc.line(140, finalY + 55, 200, finalY + 55);

  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  if (message) {
    try {
      doc.setFontSize(8);
      const maxWidth = pageWidth - 30; 
      const label = "Additional Message: ";
      const msgText = typeof message === "string" ? message : String(message);
      const wrapped = doc.splitTextToSize(label + msgText, maxWidth);
      const lineHeight = 4;
      const totalHeight = wrapped.length * lineHeight;
      const startY = Math.max(20, pageHeight - 12 - totalHeight);
      doc.text(wrapped, 15, startY);
    } catch (e) {
      doc.text(`Message: ${String(message)}`.slice(0, 200), 15, pageHeight - 18);
    }
  }

  doc.setFontSize(8);
  if (createdBy) {
    doc.text(
      `Created By: ${createdBy} | Generated on: ${new Date().toLocaleString()}`,
      15,
      pageHeight - 10
    );
  } else {
    doc.text(
      `Generated on: ${new Date().toLocaleString()}`,
      15,
      pageHeight - 10
    );
  }

  // Generate filename
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .split("T")[0];
  let filename;

  filename = `${transactionId}.pdf`;

  // Download the PDF
  doc.save(filename);

  return filename;
};

// New function to generate PDF buffer for API response
export const generateStockManagementPDFBuffer = async (data) => {
  const {
    type,
    transactionId,
    invoiceNumber,
    supplierName,
    date,
    items,
    createdBy,
    message,
  } = data;

  // Initialize PDF document
  const doc = new jsPDF();

  // Set up the document dimensions
  const pageWidth = doc.internal.pageSize.width;
  // pageHeight already declared above

  // Optional: Add logo space (using dummy placeholder for now)
  // In production, you should use an actual logo base64 string
  const logoWidth = 50;
  const logoHeight = 13;
  const logoX = 15;
  const logoY = 15;

  // Reserve space for logo
  doc.addImage(logoImageData, "PNG", 15, 10, 50, 20);

  // Document title (DELIVERY NOTE or GOODS RECEIVED NOTE)
  doc.setFontSize(16);
  doc.text(type === "in" ? "GOODS RECEIVED NOTE" : "DELIVERY NOTE", 15, 40);

  // Order information section
  doc.setFontSize(10);

  // PO NO section
  doc.text(type === "in" ? "PO NO :" : "DN NO :", 15, 50);

  // Date section
  doc.text("Date :", 15, 58);
  doc.text(
    date
      ? new Date(date).toLocaleDateString()
      : new Date().toLocaleDateString(),
    25,
    58
  );

  // PO/DN value: use invoiceNumber for IN, transactionId for OUT
  const poOrDnValue = type === "in" ? (invoiceNumber || "N/A") : (transactionId || "N/A");
  doc.text(poOrDnValue, 29, 50);
  // Receiver section

  if (type !== "in") {
    doc.text("Project :", 150, 50);
    // Get project name from provided projectName or fallback to first item's projectName
    const projectName = data.projectName || (Array.isArray(items) && items[0]?.projectName) || "N/A";
    doc.text(projectName, 165, 50);

    doc.text(type === "in" ? "Supplier :" : "Person :", 150, 58);
    doc.text(supplierName || createdBy || "N/A", 165, 58);
    
  } else {
    doc.text(type === "in" ? "Supplier :" : "Person :", 150, 50);
    doc.text(supplierName || createdBy || "N/A", 165, 50);
    
    // Add GRN NO field below Supplier for stock in
    doc.text("GRN NO :", 150, 58);
    doc.text(transactionId, 168, 58);
  }


  // Table header background
  doc.setFillColor(220);
  doc.rect(15, 78, 180, 10, "F"); // moved down from 70 to 78

  // Table headers (no Available, expanded SKU)
  doc.text("Item", 17, 85); // moved down from 77 to 85
  doc.text("Goods", 27, 85);
  doc.text("SKU / Code", 100, 85);
  doc.text("Unit", 150, 85);
  doc.text("Quantity", 170, 85);

  // Table columns config (expanded SKU)
  const columns = {
    item: { x: 17, width: 15 },
    goods: { x: 27, width: 73 },
  sku: { x: 100, width: 50 },
    unit: { x: 150, width: 20 },
    quantity: { x: 170, width: 25 },
  };

  // Helper for wrapping text
  const wrapTextIntelligently = (text, maxWidth) => {
    const words = String(text).split(" ");
    const lines = [];
    let currentLine = "";
    for (let word of words) {
      const testLine = currentLine + (currentLine ? " " : "") + word;
      const testWidth = doc.getTextWidth(testLine);
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = word;
        }
        while (doc.getTextWidth(currentLine) > maxWidth && currentLine.length > 1) {
          let breakPoint = currentLine.length - 1;
          const punctuation = [",", "/", "(", ")", "-", "."];
          for (let i = Math.floor(currentLine.length * 0.8); i > Math.floor(currentLine.length * 0.3); i--) {
            if (punctuation.includes(currentLine[i])) {
              breakPoint = i + 1;
              break;
            }
          }
          lines.push(currentLine.substring(0, breakPoint));
          currentLine = currentLine.substring(breakPoint);
        }
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Hard wrap for continuous strings without spaces/hyphens
  const wrapTextHard = (text, maxWidth) => {
    const s = String(text || "");
    if (!s.length) return [""];
    const lines = [];
    let current = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      const test = current + ch;
      if (doc.getTextWidth(test) <= maxWidth) {
        current = test;
      } else {
        if (current) {
          lines.push(current);
          current = ch;
        } else {
          lines.push(ch);
          current = "";
        }
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  // Calculate row height based on content
  const calculateRowHeight = (item) => {
    const productName = item.productName || "Unknown Product";
    const productCode = item.sku || "N//A";
    const goodsLines = wrapTextIntelligently(productName, columns.goods.width - 4);
  const skuLines = wrapTextHard(productCode, columns.sku.width - 4);
  const maxLines = Math.max(goodsLines.length, skuLines.length, 1);
  return Math.max(maxLines * 6 + 4, 14);
  };

  // Draw table rows dynamically
  let currentY = 88; // moved down from 80 to 88 to accommodate GRN NO field
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const rowHeight = calculateRowHeight(item);
    // Draw row border
    doc.rect(15, currentY, 180, rowHeight);
    doc.line(columns.goods.x, currentY, columns.goods.x, currentY + rowHeight);
    doc.line(columns.sku.x, currentY, columns.sku.x, currentY + rowHeight);
    doc.line(columns.unit.x, currentY, columns.unit.x, currentY + rowHeight);
    doc.line(columns.quantity.x, currentY, columns.quantity.x, currentY + rowHeight);

    // Item number
    doc.text((index + 1).toString(), columns.item.x + 3, currentY + 7);
    // Product name
    const productNameValue = item.productName || "Unknown Product";
    const productName = typeof productNameValue === "object" ? String(productNameValue) : String(productNameValue);
    const goodsLines = wrapTextIntelligently(productName, columns.goods.width - 4);
    for (let i = 0; i < goodsLines.length; i++) {
      doc.text(goodsLines[i], columns.goods.x + 2, currentY + 7 + i * 6);
    }
    // SKU/Code
    const productCode = item.sku || "N//A";
  const skuLines = wrapTextHard(productCode, columns.sku.width - 4);
    for (let i = 0; i < skuLines.length; i++) {
      doc.text(skuLines[i], columns.sku.x + 2, currentY + 7 + i * 6);
    }
    // Unit
    let unitValue = "EA";
    if (item.product && item.product.unit) unitValue = item.product.unit;
    else if (item.product && item.product.measuringUnit) unitValue = item.product.measuringUnit;
    else if (item.product && item.product.unitOfMeasure) unitValue = item.product.unitOfMeasure;
    else if (item.unit) unitValue = item.unit;
    else if (item.measuringUnit) unitValue = item.measuringUnit;
    else if (item.uom) unitValue = item.uom;
    else if (item.unitOfMeasure) unitValue = item.unitOfMeasure;
    else if (item.unitType) unitValue = item.unitType;
    doc.text(typeof unitValue === "object" ? String(unitValue) : String(unitValue), columns.unit.x + 2, currentY + 7);
    // Quantity
    const quantityValue = item.quantity || 0;
    doc.text(String(quantityValue), columns.quantity.x + 2, currentY + 7);
    // Move to next row
    currentY += rowHeight;
  }

  // Signature Section - dynamically positioned after table content
  const signatureStartY = currentY + 20;
  // Check if signature section needs a new page (like in generateStockManagementPDF)
  const pageHeight = doc.internal.pageSize.height;
  const bottomMargin = 40;
  let finalY = signatureStartY;
  if (signatureStartY + 60 > pageHeight - bottomMargin) {
    doc.addPage();
    finalY = 20;
  }
  doc.text("RECEIVED BY", 150, finalY);
  doc.text("SIGNATURE :", 115, finalY + 25);
  doc.line(140, finalY + 25, 200, finalY + 25);
  doc.text("NAME :", 115, finalY + 35);
  doc.line(140, finalY + 35, 200, finalY + 35);
  doc.text("Mobile No.:", 115, finalY + 45);
  doc.line(140, finalY + 45, 200, finalY + 45);
  doc.text("QID :", 115, finalY + 55);
  doc.line(140, finalY + 55, 200, finalY + 55);

  const pageWidth2 = doc.internal.pageSize.width;
  if (message) {
    try {
      doc.setFontSize(8);
      const maxWidth = pageWidth2 - 30;
      const wrapped = doc.splitTextToSize(`Additional Message: ${String(message)}`, maxWidth);
      const lineHeight = 4;
      const totalHeight = wrapped.length * lineHeight;
      const startY = Math.max(20, pageHeight - 12 - totalHeight);
      doc.text(wrapped, 15, startY);
    } catch (e) {
      doc.text(`Message: ${String(message)}`.slice(0, 200), 15, pageHeight - 18);
    }
  }

  doc.setFontSize(8);
  doc.text(
    `Created By: ${createdBy || "Unknown"} | Generated on: ${new Date().toLocaleDateString()}, ${new Date().toLocaleTimeString()}`,
    15,
    pageHeight - 10
  );

  const pdfTimestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .split("T")[0];
  const pdfFilename = `${transactionId}.pdf`;

  // Create a proper PDF buffer for download
  try {
    // Using 'arraybuffer' output for binary data
    const pdfBuffer = doc.output("arraybuffer");

    if (!pdfBuffer || pdfBuffer.byteLength === 0) {
      throw new Error("Generated PDF buffer is empty");
    }

    return { pdfBuffer, filename: pdfFilename };
  } catch (error) {
    console.error("Error generating PDF buffer:", error);
    throw error;
  }

  // Generate filename
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .split("T")[0];
  let filename;

  if (type === "out" && transactionId) {
    filename = `delivery-note-${timestamp}-${transactionId}.pdf`;
  } else {
    filename = `${
      type === "in" ? "goods-received" : "delivery-note"
    }-${timestamp}-${invoiceNumber || "report"}.pdf`;
  }

  // Create a proper PDF buffer for download
  try {
    // Generate PDF in formats that are more browser-compatible
    const pdfBuffer = doc.output("arraybuffer"); // Keep this for API usage
    const pdfBlob = doc.output("blob"); // Add blob format for browser downloads
    const pdfDataUri = doc.output("datauristring"); // Add data URI for direct browser opening

    if (!pdfBuffer || pdfBuffer.byteLength === 0) {
      throw new Error("Generated PDF buffer is empty");
    }

    return {
      pdfBuffer,
      pdfBlob,
      pdfDataUri,
      filename,
    };
  } catch (error) {
    console.error("Error generating PDF buffer:", error);
    throw error;
  }
};
