import React from "react";

/**
 * StatusBadge - A reusable badge for status/label display.
 * @param {string} text - The main text to display inside the badge.
 * @param {string} className - Additional Tailwind classes for color and style.
 * @param {object} style - Inline style for custom background/text color.
 * @param {React.ReactNode} children - Optional children for custom content (e.g., label + value).
 */
const StatusBadge = ({ text, className = "", style = {}, children }) => {
  return (
    <div
      className={`flex flex-row justify-center items-center px-2 py-0.5 !text-[15px] rounded-md ${className}`}
      style={style}
    >
      {children ? children : <p>{text}</p>}
    </div>
  );
};

export default StatusBadge;
