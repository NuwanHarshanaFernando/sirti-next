import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArchiveRestore } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { useRouter } from "next/navigation";

const RecentItemCard = ({ itemName, price, stockQuantity, stockStatus, imageSrc, productId }) => {
  const router = useRouter();
  const quantity = parseInt(stockQuantity?.toString().replace(/,/g, '') || '0');
  const isOutOfStock = quantity === 0;
  const isLowStock = quantity > 0 && quantity < 20;
  
  return (
    <div>
      <div
        className="flex flex-col justify-center w-full gap-2 p-2 rounded-xl"
        style={{ boxShadow: "0px 0px 10px 0px #0000000A" }}
      >
        <div className="relative flex items-center justify-center w-full h-32 rounded-xl bg-black/2">
          <Image
            className="object-contain p-2"
            src={imageSrc || '/images/placeholder-image.png'}
            alt={itemName || 'Product image'}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
            onError={(e) => {
              e.currentTarget.src = '/images/placeholder-image.png';
            }}
          />
        </div>
        <div className="flex flex-row flex-wrap items-center justify-between gap-1">
          <p className="font-medium truncate text-start">{itemName}</p>
          <div className={`flex flex-row items-center justify-center gap-1 px-2 text-xs rounded-md ${
            isOutOfStock 
              ? 'bg-accentOrange/20' 
              : isLowStock
              ? 'bg-lemonChrome/20'
              : 'bg-peppermintToad/20'
          }`}>
            <ArchiveRestore className={`w-3.5 ${
              isOutOfStock 
                ? 'stroke-accentOrange' 
                : isLowStock
                ? 'stroke-lemonChrome'
                : 'stroke-peppermintToad'
            }`} />
            <span className={`font-medium text-nowrap leading-0 mt-0.5 !text-[11px] ${
              isOutOfStock 
                ? 'text-accentOrange' 
                : isLowStock
                ? 'text-lemonChrome'
                : 'text-peppermintToad'
            }`}>
              {isOutOfStock ? 'Out of Stock' : `${formatNumber(quantity)} ${stockStatus}`}
            </span>
          </div>
        </div>
        <Button className="w-full stock-btn" onClick={() => router.push(`/inventory/manage-inventory/${productId}`)}>Update Stock</Button>
        <Button className="w-full stock-btn" variant={"outline"} onClick={() => router.push(`/inventory/manage-inventory/${productId}`)}>
          Transfer Stock
        </Button>
      </div>
    </div>
  );
};

export default RecentItemCard;
