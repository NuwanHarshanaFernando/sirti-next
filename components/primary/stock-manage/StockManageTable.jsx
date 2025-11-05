import React, { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { toast } from "sonner";
import { generateStockManagementPDF } from "@/lib/pdf-generator";
import { useRouter } from "next/navigation";

const StockManageTable = ({
  type = "in",
  session,
  invoiceNumber,
  supplierName,
  date,
  isOrderMode = false,
  selectedProjectId = null,
  projects = [],
}) => {
  const router = useRouter();
  const [rows, setRows] = useState([
    {
      id: 1,
      product: "",
      productId: "",
      quantity: "",
      project: "",
      projectId: "",
      rackId: "",
    },
  ]);

  const [products, setProducts] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [racks, setRacks] = useState({});
  const [isLoading, setIsLoading] = useState(false);


  const [rowSearchQueries, setRowSearchQueries] = useState({});
  const [rowSearchResults, setRowSearchResults] = useState({});


  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingRacks, setLoadingRacks] = useState({});


  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);


  useEffect(() => {
    const searchTimers = {};

    Object.entries(rowSearchQueries).forEach(([rowId, query]) => {
      if (query.trim()) {


        const progressiveDelay = Math.max(300, 500 - query.length * 30);

        searchTimers[rowId] = setTimeout(() => {
          searchProducts(query, rowId);
        }, progressiveDelay);
      } else {
        setRowSearchResults((prev) => ({
          ...prev,
          [rowId]: [],
        }));
      }
    });

    return () => {
      Object.values(searchTimers).forEach((timer) => clearTimeout(timer));
    };
  }, [rowSearchQueries]);

  const searchProducts = async (query, rowId) => {
    if (!query.trim()) {
      setRowSearchResults((prev) => ({
        ...prev,
        [rowId]: [],
      }));
      return;
    }

    setLoadingProducts(true);
    try {

      const [productsResponse, inventoryResponse] = await Promise.all([
        fetch(`/api/Products?search=${encodeURIComponent(query)}&limit=20`, {
          cache: "no-store",
        }),
        fetch(`/api/Inventory?search=${encodeURIComponent(query)}&limit=20`, {
          cache: "no-store",
        }),
      ]);

      const productsData = await productsResponse.json();
      const inventoryData = await inventoryResponse.json();


      const inventoryMap = {};
      if (inventoryData.inventory) {
        inventoryData.inventory.forEach((item) => {
          inventoryMap[item._id] = item;
        });
      }


      const mergedProducts = (productsData.products || []).map((product) => {
        const inventoryItem = inventoryMap[product._id] || {};


        const projectStocks =
          product.projectStocks || inventoryItem.projectStocks || [];

        return {
          ...product,
          projectStocks,
          rackStocks: inventoryItem.rackStocks || product.rackStocks || [],
          totalStock: inventoryItem.totalStock || 0,
        };
      });

      setRowSearchResults((prev) => ({
        ...prev,
        [rowId]: mergedProducts,
      }));
    } catch (error) {
      toast.error("Failed to search products");
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchProducts = async () => {


    setLoadingProducts(true);
    try {
      const [productsResponse, inventoryResponse] = await Promise.all([
        fetch("/api/Products", { cache: "no-store" }),
        fetch("/api/Inventory", { cache: "no-store" }),
      ]);

      const productsData = await productsResponse.json();
      const inventoryData = await inventoryResponse.json();


      const inventoryMap = {};
      if (inventoryData.inventory) {
        inventoryData.inventory.forEach((item) => {
          inventoryMap[item._id] = item;
        });
      }


      const mergedProducts = (productsData.products || []).map((product) => {
        const inventoryItem = inventoryMap[product._id] || {};


        const projectStocks =
          product.projectStocks || inventoryItem.projectStocks || [];

        return {
          ...product,
          projectStocks,
          rackStocks: inventoryItem.rackStocks || product.rackStocks || [],
          totalStock: inventoryItem.totalStock || 0,
        };
      });

      setProducts(mergedProducts);
    } catch (error) {
      toast.error("Failed to fetch products");
    } finally {
      setLoadingProducts(false);
    }
  };
  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch("/api/Projects");
      if (response.ok) {
        const data = await response.json();
        setAllProjects(data.projects || []);
      }
    } catch (error) {
      toast.error("Failed to fetch projects");
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchRacksForProject = async (projectId) => {
    if (!projectId) return;


    setLoadingRacks((prev) => ({ ...prev, [projectId]: true }));

    try {
      const response = await fetch(`/api/Racks?projectId=${projectId}`);

      if (response.ok) {
        const data = await response.json();
        setRacks((prev) => ({
          ...prev,
          [projectId]: data.racks || [],
        }));
      }
    } catch (error) {
      toast.error("Failed to fetch racks for project");
    } finally {
      setLoadingRacks((prev) => ({ ...prev, [projectId]: false }));
    }
  };

  const addNewRow = () => {
    const newRow = {
      id: rows.length + 1,
      product: "",
      productId: "",
      quantity: "",
      project: "",
      projectId: "",
      rackId: "",
    };
    setRows([...rows, newRow]);
  };

  const updateRow = (rowId, field, value) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row
      )
    );
  };

  const handleProductChange = (rowId, productId, productName) => {
    updateRow(rowId, "productId", productId);
    updateRow(rowId, "product", productName);
    updateRow(rowId, "projectId", "");
    updateRow(rowId, "project", "");
    updateRow(rowId, "rackId", "");
  };

  const handleProjectChange = (rowId, projectId, projectName) => {
    updateRow(rowId, "projectId", projectId);
    updateRow(rowId, "project", projectName);
    updateRow(rowId, "rackId", "");

    if (projectId) {

      fetchRacksForProject(projectId);
    }
  };


  const getProjectsForProduct = (productId, rowId) => {
    if (!productId) return [];


    const selectedProduct = (rowSearchResults[rowId] || []).find(
      (p) => p._id === productId
    );

    if (!selectedProduct) {
      return [];
    }

    const productIncludedProjects = selectedProduct.includedProjects || [];
    const lobbyProjects = (allProjects || []).filter(p => p.isLobby && (
      (p.lobbyOwner && p.lobbyOwner.toString && p.lobbyOwner.toString() === (session?.user?.id || '').toString()) ||
      (typeof p.lobbyOwner === 'string' && p.lobbyOwner === (session?.user?.id || ''))
    ));

    if (productIncludedProjects.length === 0) {
      // No included projects: allow user's Lobby as a fallback
      return lobbyProjects;
    }



    if (session?.user?.role === 'admin' || session?.user?.role === 'keeper') {

      const adminProjects = [];
      const uniqueProjectIds = new Set();

      productIncludedProjects.forEach((productProject) => {
        const productProjectId = productProject._id || productProject.id || productProject;

        if (!uniqueProjectIds.has(productProjectId.toString())) {

          const fullProject = allProjects.find(
            (p) => p._id.toString() === productProjectId.toString()
          );

          if (fullProject) {
            adminProjects.push(fullProject);
            uniqueProjectIds.add(productProjectId.toString());
          } else {

            if (productProject.projectName || productProject.name) {
              adminProjects.push({
                _id: productProjectId,
                projectName: productProject.projectName || productProject.name,
                name: productProject.projectName || productProject.name,
                description: productProject.description || ''
              });
              uniqueProjectIds.add(productProjectId.toString());
            }
          }
        }
      });

      // Ensure Lobby is available even for admin/keeper
      const existingIds = new Set(adminProjects.map(p => (p._id && p._id.toString) ? p._id.toString() : String(p._id)));
      lobbyProjects.forEach(lp => {
        const id = (lp._id && lp._id.toString) ? lp._id.toString() : String(lp._id);
        if (!existingIds.has(id)) {
          adminProjects.push(lp);
          existingIds.add(id);
        }
      });
      return adminProjects;
    } else {
      const userProjects = session?.user?.projects || session?.user?.availableProjects || [];

      if (userProjects.length === 0) {
        // If user has no projects assigned, still allow Lobby selection
        return lobbyProjects;
      }


      const intersectionProjects = [];
      const uniqueProjectIds = new Set();

      productIncludedProjects.forEach((productProject) => {
        const productProjectId = productProject._id || productProject.id || productProject;


        const userHasProject = userProjects.some(userProject => {
          const userProjectId = userProject._id || userProject.id || userProject;
          return userProjectId.toString() === productProjectId.toString();
        });

        if (userHasProject && !uniqueProjectIds.has(productProjectId.toString())) {

          const fullProject = allProjects.find(
            (p) => p._id.toString() === productProjectId.toString()
          );

          if (fullProject) {
            intersectionProjects.push(fullProject);
            uniqueProjectIds.add(productProjectId.toString());
          } else {

            if (productProject.projectName || productProject.name) {
              intersectionProjects.push({
                _id: productProjectId,
                projectName: productProject.projectName || productProject.name,
                name: productProject.projectName || productProject.name,
                description: productProject.description || ''
              });
              uniqueProjectIds.add(productProjectId.toString());
            }
          }
        }
      });

      // Ensure Lobby is available even if not in intersection
      if (lobbyProjects.length > 0) {
        lobbyProjects.forEach(lp => {
          const id = (lp._id && lp._id.toString) ? lp._id.toString() : (lp._id || '').toString();
          if (!uniqueProjectIds.has(id)) {
            intersectionProjects.push(lp);
            uniqueProjectIds.add(id);
          }
        });
      }
      return intersectionProjects;
    }
  };

  const getProductStockInRack = (rackId, productId) => {
    if (!rackId || !productId) return 0;

    let rack = null;
    Object.values(racks).forEach((projectRacks) => {
      const foundRack = projectRacks.find((r) => r._id === rackId);
      if (foundRack) rack = foundRack;
    });

    if (!rack || !rack.products || !Array.isArray(rack.products)) {
      return 0;
    }


    const productInRack = rack.products.find((p) => {
      if (!p.product) return false;


      if (typeof p.product === "string") {
        return p.product === productId;
      } else if (p.product._id) {
        return p.product._id.toString() === productId.toString();
      } else if (typeof p.product === "object") {
        return p.product.toString() === productId.toString();
      }
      return false;
    });

    return productInRack ? productInRack.stock || 0 : 0;
  };

  const handleSubmit = async () => {

    const validRows = rows.filter(
      (row) => row.productId && row.quantity && row.projectId && row.rackId
    );

    if (validRows.length === 0) {
      toast.error("Please fill in all required fields for at least one row");
      return;
    }

    setIsLoading(true);

    try {

      const enrichedItems = validRows.map((row) => {
        const product = (rowSearchResults[row.id] || []).find(
          (p) => p._id === row.productId
        );
        const project = projects.find((p) => p._id === row.projectId);
        const rackList = racks[row.projectId] || [];
        const rack = rackList.find((r) => r._id === row.rackId);

        return {
          productId: row.productId,
          productName: product?.productName || "Unknown Product",
          productCode: product?.productId || "N/A",
          unit: product?.unit || "N/A",
          quantity: parseInt(row.quantity),
          projectId: row.projectId,
          projectName: project?.projectName || "Unknown Project",
          rackId: row.rackId,
          rackNumber: rack?.rackNumber || "Unknown Rack",
          available: getProductStockInRack(row.rackId, row.productId),
        };
      });
      const stockRecord = {
        type,
        invoiceNumber: selectedProjectId
          ?
          projects.find((p) => p.value === selectedProjectId)?.label ||
          selectedProjectId
          : invoiceNumber,
        supplierName,
        date: date || new Date(),
        message: message.trim() || null,
        items: validRows.map((row) => ({
          productId: row.productId,
          quantity: parseInt(row.quantity),
          projectId: row.projectId,
          rackId: row.rackId,
        })),
        createdBy: session?.user?.id || session?.user?.email,
        createdAt: new Date(),
        isOrderMode: isOrderMode,
        selectedProjectId: selectedProjectId || null,
      };


      const response = await fetch("/api/stock-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stockRecord),
      });

      if (response.ok) {
        const responseData = await response.json();

        if (isOrderMode) {
          toast.success(
            "Order created successfully and sent to Keeper for approval"
          );
        } else {
          toast.success(
            `QTY ${type === "in" ? "IN" : "OUT"} recorded successfully`
          );
        }

        if (!isOrderMode) {
          try {
            const pdfData = {
              type,
              transactionId: responseData.transaction?.transactionId,
              invoiceNumber: selectedProjectId
                ?
                projects.find((p) => p.value === selectedProjectId)?.label ||
                selectedProjectId
                : invoiceNumber,
              supplierName,
              date: date || new Date(),
              items: enrichedItems,
              createdBy:
                session?.user?.name || session?.user?.email || "Unknown User",
              projectName: selectedProjectId
                ? projects.find((p) => p.value === selectedProjectId)?.label
                : null,
              message: (message || "").trim(),
            };

            await generateStockManagementPDF(pdfData);
          } catch (pdfError) {

          }
        }


        setRows([
          {
            id: 1,
            product: "",
            productId: "",
            quantity: "",
            project: "",
            projectId: "",
            rackId: "",
          },
        ]);
        setRowSearchQueries({});
        setRowSearchResults({});
        setMessage("");

        setTimeout(() => {
          router.push("/inventory");
        }, 2000);
      } else {
        const error = await response.json();
        toast.error(
          error.message ||
          `Failed to ${isOrderMode ? "create order" : `record stock ${type}`}`
        );
      }
    } catch (error) {
      toast.error("Failed to submit stock record");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col w-full gap-5">
        <div
          className="!rounded-xl bg-white p-4"
          style={{ boxShadow: "0px 0px 10px 0px #0000000A" }}
        >
          <div>
            <div className="!border-black/6 flex w-full items-center justify-between border-b-2 bg-white px-4 py-2">
              <div className="1/4">Product</div>
              <div className="1/4">Quantity</div>
              <div className="1/4">Project</div>
              <div className="1/4">Rack</div>
              <div>Action</div>
            </div>
          </div>
          <div>
            {rows.map((row, index) => (
              <div
                key={row.id}
                className="flex items-center justify-between w-full gap-2 px-4"
              >
                <div className="w-[calc(25%-12px)] max-w-[300px] py-2">
                  <Combobox
                    options={(rowSearchResults[row.id] || []).map(
                      (product) => ({
                        value: product._id,
                        label: `${product.productName || "Unknown Product"} (${product.code || "No Code"
                          })${product.serialNumber ? ` - ${product.serialNumber}` : ''}`,
                      })
                    )}
                    value={rows.find((r) => r.id === row.id)?.productId || ""}
                    onValueChange={(value) => {
                      const selectedProduct = (
                        rowSearchResults[row.id] || []
                      ).find((p) => p._id === value);
                      handleProductChange(
                        row.id,
                        value,
                        selectedProduct?.productName
                      );
                    }}
                    placeholder="Search for products..."
                    searchPlaceholder="Type to search products..."
                    className="w-full"
                    loading={loadingProducts}
                    emptyText={
                      rowSearchQueries[row.id] || ""
                        ? "No products found"
                        : "Start typing to search products"
                    }
                    onSearchChange={(value) => {

                      setTimeout(() => {
                        setRowSearchQueries((prev) => ({
                          ...prev,
                          [row.id]: value,
                        }));
                      }, 50);
                    }}
                  />
                </div>
                <div className="w-[calc(25%-12px)] py-2 ">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Enter quantity"
                    value={rows.find((r) => r.id === row.id)?.quantity || ""}
                    onChange={(e) => {

                      const value = e.target.value;
                      if (value === "" || parseInt(value) >= 1) {
                        updateRow(row.id, "quantity", value);
                      }
                    }}
                    className="h-10 px-3 font-normal border-2 border-black/10 text-black/50 placeholder:uppercase"
                  />
                </div>
                <div className="w-[calc(25%-12px)] py-2 ">
                  <Combobox
                    options={(() => {

                      const productId = rows.find(
                        (r) => r.id === row.id
                      )?.productId;
                      const availableProjects = getProjectsForProduct(
                        productId,
                        row.id
                      );


                      if (productId) {
                        const selectedProduct = (
                          rowSearchResults[row.id] || []
                        ).find((p) => p._id === productId);

                      }

                      return availableProjects.map((project) => {
                        const isLobby = project.isLobby;
                        const baseLabel = project.projectName || project.name;
                        const label = isLobby ? `${baseLabel} • Lobby` : baseLabel;
                        return {
                          value: project._id,
                          label,
                        };
                      });
                    })()}
                    value={rows.find((r) => r.id === row.id)?.projectId || ""}
                    onValueChange={(value) => {

                      setTimeout(() => {
                        const availableProjects = getProjectsForProduct(
                          rows.find((r) => r.id === row.id)?.productId
                        );
                        const selectedProject = availableProjects.find(
                          (p) => p._id === value
                        );
                        handleProjectChange(
                          row.id,
                          value,
                          selectedProject?.projectName || selectedProject?.name
                        );
                      }, 100);
                    }}
                    placeholder={
                      rows.find((r) => r.id === row.id)?.productId
                        ? "Select Project"
                        : "Select Product First"
                    }
                    className="w-full"
                    disabled={!rows.find((r) => r.id === row.id)?.productId}
                    loading={loadingProjects}
                    searchDebounce={300}
                  />
                </div>
                <div className="w-[calc(25%-12px)] py-2 relative">
                  <Combobox
                    options={(() => {
                      const rowData = rows.find((r) => r.id === row.id);
                      const projectId = rowData?.projectId;
                      const productId = rowData?.productId;
                      const projectRacks = racks[projectId] || [];

                      // Include all racks, compute current stock per rack, then sort desc by stock
                      const racksWithStock = projectRacks.map((rack) => {
                        const currentStock = getProductStockInRack(rack._id, productId);
                        return { rack, currentStock };
                      });

                      racksWithStock.sort((a, b) => {
                        const diff = (b.currentStock || 0) - (a.currentStock || 0);
                        if (diff !== 0) return diff;
                        // Tie-breaker: alphabetical by rack number
                        const aNum = a.rack?.rackNumber || "";
                        const bNum = b.rack?.rackNumber || "";
                        return String(aNum).localeCompare(String(bNum));
                      });

                      return racksWithStock.map(({ rack, currentStock }) => {
                        const lobbyBadge = rack.isLobbyRack ? ' • Lobby' : '';
                        return {
                          value: rack._id,
                          label: `${rack.rackNumber || "Unknown Rack"} (${currentStock})${lobbyBadge}`,
                        };
                      });
                    })()}
                    value={rows.find((r) => r.id === row.id)?.rackId || ""}
                    onValueChange={(value) => {

                      setTimeout(() => {
                        updateRow(row.id, "rackId", value);
                      }, 150);
                    }}
                    placeholder={
                      rows.find((r) => r.id === row.id)?.projectId
                        ? "Select Rack"
                        : "Select Project First"
                    }
                    className="w-full"
                    disabled={!rows.find((r) => r.id === row.id)?.projectId}
                    loading={
                      loadingRacks[
                      rows.find((r) => r.id === row.id)?.projectId
                      ] || false
                    }
                    searchDebounce={250}
                  />
                  {/* Do not show the 'No racks with stock available' message */}
                </div>
                <div className="flex justify-end py-2">
                  {index === rows.length - 1 ? (
                    <Button
                      variant="secondary"
                      className="w-[40px] h-[40px]"
                      size="secondary"
                      onClick={addNewRow}
                    >
                      +
                    </Button>
                  ) : (
                    <div className="w-[46px] h-[40px]"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="message" className="block mb-2 text-sm font-medium text-gray-700">
            Additional Message (Optional)
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter any additional message or notes..."
            className="w-full h-24 p-3 border-2 rounded-md border-black/10 resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={500}
          ></textarea>
        </div>
        <Button
          variant="secondary"
          size="secondary"
          className="w-full"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center justify-center w-full">
              <svg class="mr-3 -ml-1 size-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span className="sr-only">Processing...</span>
            </span>
          ) : (
            isOrderMode ? "Create Order" : (type === "in" ? "Create GRN" : "Create Delivery Notice")
          )}
        </Button>
      </div>
    </div>
  );
};

export default StockManageTable;
