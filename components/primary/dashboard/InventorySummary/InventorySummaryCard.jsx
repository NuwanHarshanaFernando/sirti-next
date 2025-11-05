import React from "react";
import { BellRing } from "lucide-react";

const InventorySummaryCard = ({
  title,
  update,
  value,
  icon,
  fillcolor,
  bgcolor,
}) => {
  const formatNumber = (num) => {
    if (typeof num === 'number') {
      return num.toLocaleString();
    }
    const parsed = parseFloat(num);
    if (!isNaN(parsed)) {
      return parsed.toLocaleString();
    }
    return num;
  };

  return (
    <>
      <div 
        className="flex flex-col items-center justify-center w-full h-full gap-2 p-4 rounded-lg aspect-square"
        style={{ boxShadow: '0px 0px 10px 0px #0000000A' }}
      >
        <div
          className="p-2 text-lg font-semibold rounded-full"
          style={{ backgroundColor: bgcolor }}
        >
          {React.cloneElement(icon, { stroke: fillcolor })}
        </div>
        <p className="text-black/65">{title}</p>
        <p className="font-semibold">{formatNumber(value)}</p>
        {update > 0 && (
          <div className="flex flex-row items-center justify-around gap-1 px-3 py-1 rounded-full bg-amalfitanAzure">
            {React.cloneElement(<BellRing />, {
              stroke: "white",
              width: "12px",
              height: "12px",
              strokeWidth: "3px",
            })}
            <span className="text-white ">{update} {update === 1 ? 'Update' : 'Updates'}</span>
          </div>
        )}
      </div>
    </>
  );
};

export default InventorySummaryCard;
