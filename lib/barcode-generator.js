import JsBarcode from 'jsbarcode';

/**
 * Generates a barcode image and downloads it as JPG
 * @param {string} value - The value to encode in the barcode (product code/ID)
 * @param {string} filename - Optional filename (defaults to "barcode-{value}")
 * @param {Object} options - Optional configuration options
 */
export const generateAndDownloadBarcode = (value, filename = null, options = {}) => {
    if (!value || value.trim() === '') {
        throw new Error('Value is required for barcode generation');
    }

    const defaultOptions = {
        format: 'CODE128',
        width: 4,
        height: 150,
        displayValue: true,
        fontSize: 20,
        textAlign: 'center',
        textPosition: 'bottom',
        background: '#ffffff',
        lineColor: '#000000',
        margin: 10,
        ...options
    };

    const canvas = document.createElement('canvas');
    try {
        JsBarcode(canvas, value, defaultOptions);

        const barcodeWidth = canvas.width;
        const barcodeHeight = canvas.height;
        const finalCanvas = document.createElement('canvas');
        const baseTargetWidth = Math.max(barcodeWidth, 400);
        const spacing = 10;
        const ctx = finalCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        const drawAndDownload = (logoImg = null) => {
            let aspectCoeffK = 0; // No logo, so set to 0

            const m = defaultOptions.margin;
            const minWidthOverlap = Math.ceil((2 * (barcodeHeight + (2 * m) + (2 * (aspectCoeffK > 0 ? spacing : 0)))) / (1 - (4 * aspectCoeffK || 0.000001)));
            const minWidthHorizontal = barcodeWidth + (2 * m);

            const targetWidth = Math.max(baseTargetWidth, minWidthOverlap, minWidthHorizontal);
            const targetHeight = Math.round(targetWidth / 2);

            let logoTargetWidth = 0;
            let logoTargetHeight = 0;

            finalCanvas.width = targetWidth;
            finalCanvas.height = targetHeight;

            ctx.fillStyle = defaultOptions.background;
            ctx.fillRect(0, 0, targetWidth, targetHeight);

            const x = Math.round((targetWidth - barcodeWidth) / 2);
            const y = Math.round((targetHeight - barcodeHeight) / 2);
            ctx.drawImage(canvas, x, y);

            // Draw text instead of logo, positioned just above the barcode
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 20px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Sirti MENA for Projects', targetWidth / 2, y - 5);

            finalCanvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename || `barcode-${value}.jpg`;

                document.body.appendChild(link);
                link.click();

                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 'image/jpeg', 1.0);
        };

        // No logo loading, directly call drawAndDownload
        drawAndDownload(null);

    } catch (error) {
        console.error('Error generating barcode:', error);
        throw new Error(`Failed to generate barcode: ${error.message}`);
    }
};

/**
 * Generates a barcode as base64 data URL
 * @param {string} value - The value to encode in the barcode
 * @param {Object} options - Optional configuration options
 * @returns {Promise<string>} Base64 data URL of the barcode image
 */
export const generateBarcodeBase64 = (value, options = {}) => {
    return new Promise((resolve, reject) => {
        if (!value || value.trim() === '') {
            reject(new Error('Value is required for barcode generation'));
            return;
        }
        const defaultOptions = {
            format: 'CODE128',
            width: 4,
            height: 150,
            displayValue: true,
            fontSize: 20,
            textAlign: 'center',
            textPosition: 'bottom',
            background: '#ffffff',
            lineColor: '#000000',
            margin: 10,
            ...options
        };
        const canvas = document.createElement('canvas');
        try {
            JsBarcode(canvas, value, defaultOptions);

        const finalCanvas = document.createElement('canvas');
        const barcodeWidth = canvas.width;
        const barcodeHeight = canvas.height;
        const baseTargetWidth = Math.max(barcodeWidth, 400);
        const spacing = 10;
        const ctx = finalCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        const drawAndResolve = (logoImg = null) => {
            let aspectCoeffK = 0; // No logo, so set to 0

            const m = defaultOptions.margin;
            const minWidthOverlap = Math.ceil((2 * (barcodeHeight + (2 * m) + (2 * (aspectCoeffK > 0 ? spacing : 0)))) / (1 - (4 * aspectCoeffK || 0.000001)));
            const minWidthHorizontal = barcodeWidth + (2 * m);

            const targetWidth = Math.max(baseTargetWidth, minWidthOverlap, minWidthHorizontal);
            const targetHeight = Math.round(targetWidth / 2);

            let logoTargetWidth = 0;
            let logoTargetHeight = 0;

            finalCanvas.width = targetWidth;
            finalCanvas.height = targetHeight;
            ctx.fillStyle = defaultOptions.background;
            ctx.fillRect(0, 0, targetWidth, targetHeight);

            const x = Math.round((targetWidth - barcodeWidth) / 2);
            const y = Math.round((targetHeight - barcodeHeight) / 2);
            ctx.drawImage(canvas, x, y);

            // Draw text instead of logo, positioned just above the barcode
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 20px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Sirti MENA for Projects', targetWidth / 2, y - 5);

            const dataURL = finalCanvas.toDataURL('image/jpeg', 1.0);
            resolve(dataURL);
        };

        // No logo loading, directly call drawAndResolve
        drawAndResolve(null);

        } catch (error) {
            console.error('Error generating barcode:', error);
            reject(new Error(`Failed to generate barcode: ${error.message}`));
        }
    });
};
