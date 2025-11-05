"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import InventorySummaryCard from "@/components/primary/dashboard/InventorySummary/InventorySummaryCard";
import useOptimizedFetch from "@/hooks/use-optimized-fetch-clean";
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  PackageSearch,
  PackageOpen,
  ArchiveX,
} from "lucide-react";

const InventorySummaryGridOptimized = () => {
  const { data: session } = useSession();
  const [summaryData, setSummaryData] = useState({
    totalItems: 0,
    inventory: 0,
    outOfStock: 0,
    incoming: 0,
    outgoing: 0
  });

  const { data: usersData, isLoading: usersLoading } = useOptimizedFetch(
    session?.user ? '/api/Users' : null,
    {
      staleTime: 60000,
      cacheKey: 'dashboard-users',
    }
  );

  const { data: productsData, isLoading: productsLoading } = useOptimizedFetch(
    session?.user ? '/api/Products' : null,
    {
      staleTime: 30000,
      cacheKey: 'dashboard-products',
    }
  );

  const { data: transfersData, isLoading: transfersLoading } = useOptimizedFetch(
    session?.user ? '/api/transfers' : null,
    {
      staleTime: 30000,
      cacheKey: 'dashboard-transfers',
    }
  );

  const { data: stockAdjustmentsPending, isLoading: sarPendingLoading } = useOptimizedFetch(
    session?.user ? '/api/stock-adjustment-requests?status=pending' : null,
    { staleTime: 30000, cacheKey: 'dashboard-sar-pending' }
  );
  const { data: stockAdjustmentsApproved, isLoading: sarApprovedLoading } = useOptimizedFetch(
    session?.user ? '/api/stock-adjustment-requests?status=approved' : null,
    { staleTime: 30000, cacheKey: 'dashboard-sar-approved' }
  );

  const isLoading = usersLoading || productsLoading || transfersLoading || sarPendingLoading || sarApprovedLoading;

  useEffect(() => {
    if (!session?.user || isLoading || !usersData || !productsData || !transfersData || !stockAdjustmentsPending || !stockAdjustmentsApproved) {
      return;
    }

    const calculateSummary = () => {
      try {
        const allUsers = usersData.users || [];
        const currentUser = allUsers.find(user => user.email === session.user.email);
        const userRole = session.user.role;
        const userProjects = currentUser?.availableProjects || currentUser?.projects || [];
        const userProjectIds = userProjects.map(project => {
          if (typeof project === 'string') return project;
          return project._id || project.projectId || project.id;
        }).filter(Boolean);
        const products = productsData.products || [];
        const transfers = transfersData.transfers || [];
        const allSARs = [...(stockAdjustmentsPending.requests || []), ...(stockAdjustmentsApproved.requests || [])];
        const totalItems = products.length;
        const totalStockQuantity = products.reduce((sum, product) => sum + (parseInt(product.totalStocks) || 0), 0);
        const outOfStockProducts = products.filter(product => !product.totalStocks || product.totalStocks <= 0);

        const incomingTransfers = transfers.filter(transfer => {
          const toProjectStr = transfer.toProjectId?._id || transfer.toProjectId;
          const fromProjectStr = transfer.fromProjectId?._id || transfer.fromProjectId;
          return userProjectIds.some(projId => {
            const userProjStr = projId?._id || projId;
            return (userProjStr.toString() === toProjectStr.toString()) &&
              fromProjectStr !== 'EXTERNAL' &&
              (transfer.status === 'pending' || transfer.status === 'approved');
          });
        });
        const outgoingTransfers = transfers.filter(transfer => {
          const toProjectStr = transfer.toProjectId?._id || transfer.toProjectId;
          const fromProjectStr = transfer.fromProjectId?._id || transfer.fromProjectId;
          return userProjectIds.some(projId => {
            const userProjStr = projId?._id || projId;
            return (userProjStr.toString() === fromProjectStr.toString()) &&
              (toProjectStr === 'EXTERNAL' || toProjectStr !== userProjStr.toString()) &&
              (transfer.status === 'pending' || transfer.status === 'approved');
          });
        });
        const incomingTransferCount = incomingTransfers.reduce((sum, transfer) => sum + (parseInt(transfer.quantity) || 0), 0);
        const outgoingTransferCount = outgoingTransfers.reduce((sum, transfer) => sum + (parseInt(transfer.quantity) || 0), 0);

        let outgoingTransferCount = 0;
        if (userRole === 'admin') {
          outgoingTransferCount = transfers.filter(transfer => transfer.status !== 'completed')
            .reduce((sum, transfer) => sum + (parseInt(transfer.quantity) || 0), 0);
        } else if (userRole === 'manager') {
          outgoingTransferCount = transfers.filter(transfer => transfer.status !== 'approved' && transfer.fromProjectId && userProjectIds.includes(transfer.fromProjectId))
            .reduce((sum, transfer) => sum + (parseInt(transfer.quantity) || 0), 0);
        }
        let outgoingSARCount = 0;
        if (userRole === 'admin') {
          outgoingSARCount = allSARs.filter(sar => sar.status !== 'completed')
            .reduce((sum, sar) => sum + (parseInt(sar.stockOnHand) || 0), 0);
        } else if (userRole === 'manager') {
          outgoingSARCount = allSARs.filter(sar => sar.status !== 'approved' && sar.requestedBy === session.user.email)
            .reduce((sum, sar) => sum + (parseInt(sar.stockOnHand) || 0), 0);
        }
        let incomingSARCount = 0;
        if (userRole === 'admin') {
          incomingSARCount = allSARs.reduce((sum, sar) => sum + (parseInt(sar.stockOnHand) || 0), 0);
        } else if (userRole === 'manager') {
          incomingSARCount = allSARs.filter(sar => userProjectIds.includes(sar.projectId))
            .reduce((sum, sar) => sum + (parseInt(sar.stockOnHand) || 0), 0);
        }

        setSummaryData({
          totalItems,
          inventory: totalStockQuantity,
          outOfStock: outOfStockProducts.length,
          incoming: incomingTransferCount + incomingSARCount,
          outgoing: outgoingTransferCount + outgoingSARCount
        });
      } catch (error) {
        console.error("Error calculating summary:", error);
        setSummaryData({
          totalItems: 0,
          inventory: 0,
          outOfStock: 0,
          incoming: 0,
          outgoing: 0
        });
      }
    };
    calculateSummary();
  }, [session, isLoading, usersData, productsData, transfersData, stockAdjustmentsPending, stockAdjustmentsApproved]);

  const cardData = [
    {
      title: "Total Items",
      value: summaryData.totalItems, icon: PackageSearch,
      iconColor: "#4283DE",
      loading: isLoading
    },
    {
      title: "Inventory",
      value: summaryData.inventory, icon: PackageOpen,
      iconColor: "#007D51",
      loading: isLoading
    },
    {
      title: "Out of Stock",
      value: summaryData.outOfStock, icon: ArchiveX,
      iconColor: "#E25360",
      loading: isLoading
    },
    {
      title: "Incoming",
      value: summaryData.incoming,
      icon: ArrowLeftToLine,
      iconColor: "#E76500", loading: isLoading
    },
    {
      title: "Outgoing",
      value: summaryData.outgoing,
      icon: ArrowRightToLine,
      iconColor: "#895BBA",
      loading: isLoading
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {cardData.map((card, index) => (
        <InventorySummaryCard
          key={index}
          title={card.title}
          value={card.value}
          icon={card.icon}
          iconColor={card.iconColor}
          loading={card.loading}
        />
      ))}
    </div>
  );
};

export default InventorySummaryGridOptimized;
