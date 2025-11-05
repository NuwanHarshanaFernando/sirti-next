"use client";
import React from "react";

const ProjectStockTransferRequestTable = ({ productId, session }) => {
  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <h3 className="text-lg font-semibold text-green-800 mb-2">
        🧪 Simple Transfer Table Test
      </h3>
      <p className="text-green-600">
        This is a simplified version to test if the component imports correctly.
      </p>
      <div className="mt-4 text-sm text-gray-600">
        <p>Product ID: {productId || "N/A"}</p>
        <p>Session: {session ? "Available" : "Not available"}</p>
      </div>
    </div>
  );
};

export default ProjectStockTransferRequestTable;
