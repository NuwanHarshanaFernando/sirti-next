import React from 'react'
import { ImagePlaceholder } from '@/components/icons/icons'
import { toast } from "sonner";

const ProductImage = ({ selectedImage, setSelectedImage, disabled = false }) => {
  const handleImageChange = async (e) => {
    if (disabled) return;
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target.result;
        if (base64String.startsWith('data:image/')) {
          setSelectedImage(base64String);
        } else {
          toast.error('Failed to process image. Please try again.');
        }
      };
      reader.onerror = () => {
        toast.error('Failed to read image file. Please try again.');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full gap-5">
      <h2>Product Image</h2>
      <div className="flex flex-col flex-1 w-full">
        <label
          htmlFor="product-image-upload"
          className={`bg-[#F9F9F9] h-full flex flex-col gap-2 rounded-lg items-center justify-center ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-[#F0F0F0]'} transition-colors relative overflow-hidden`}
        >
          {selectedImage ? (
            <>
              <img
                src={selectedImage}
                alt="Product preview"
                className="absolute inset-0 object-cover w-full h-full rounded-lg"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity bg-black rounded-lg opacity-0 hover:opacity-30">
                <ImagePlaceholder className="text-white h-14 w-14" />
                <span className="!font-light text-white">
                  {disabled ? 'Image locked' : 'Click to change image'}
                </span>
              </div>
            </>
          ) : (
            <>
              <ImagePlaceholder className="h-14 w-14" />
              <span className="!font-light text-[#AEAEAE]">
                {disabled ? 'Image editing disabled' : 'Upload Product Images (Max: 5mb)'}
              </span>
            </>
          )}
        </label>
        <input
          id="product-image-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

export default ProductImage