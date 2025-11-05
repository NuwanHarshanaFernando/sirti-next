import React from "react";

const ApprovalSheetLable = ({ 
  label,
  value,
  icon: Icon,
  iconColor,
  className
}) => {
  return (
    <div className={`flex flex-row items-center gap-2 ${className}`}>
      <div 
        className="flex flex-col items-center justify-center rounded-full w-9 h-9 aspect-square"
        style={{ backgroundColor: `${iconColor}10` }}
      >
        <Icon 
          className="w-[18px] h-[18px]" 
          style={{ stroke: iconColor }}
        />
      </div>
      <div className="flex flex-row">
        <p className="font-medium">
          {label}
          <span className="!text-base text-[#898989] font-normal ml-1">
            {value}
          </span>
        </p>
      </div>
    </div>
  );
};

export default ApprovalSheetLable;
