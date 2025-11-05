import React from "react";

const AdminLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold">Admin Panel</h1>
          <nav className="mt-2">
            <a
              href="/admin/stock-requests"
              className="text-blue-600 hover:text-blue-800 mr-4"
            >
              Stock Requests
            </a>
          </nav>
        </div>
      </div>
      <main>{children}</main>
    </div>
  );
};

export default AdminLayout;
