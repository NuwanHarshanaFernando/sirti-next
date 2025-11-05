"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import InventorySummaryCard from "@/components/primary/dashboard/InventorySummary/InventorySummaryCard";
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  PackageSearch,
  PackageOpen,
  ArchiveX,
} from "lucide-react";

const InventorySummaryGrid = () => {
  const { data: session } = useSession();
  const [summaryData, setSummaryData] = useState({
    totalItems: 0,
    inventory: 0,
    outOfStock: 0,
    incoming: 0,
    outgoing: 0
  });
  const [newNotificationsCount, setNewNotificationsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventorySummary();
    fetchNewNotificationsCount();
  }, [session]);

  const fetchInventorySummary = async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const allUsersResponse = await fetch('/api/Users');
      const allUsersData = allUsersResponse.ok ? await allUsersResponse.json() : { users: [] };
      const currentUser = allUsersData.users?.find(user => user.email === session.user.email);
      const userRole = session.user.role;
      const userProjects = currentUser?.availableProjects || currentUser?.projects || [];
      const userProjectIds = userProjects.map(project => {
        if (typeof project === 'string') return project;
        return project._id || project.projectId || project.id;
      }).filter(Boolean);

      const productsResponse = await fetch('/api/Products');
      const productsResult = productsResponse.ok ? await productsResponse.json() : { products: [] };
      const products = productsResult.products || [];
      const transfersResponse = await fetch('/api/transfers');
      const transfersResult = transfersResponse.ok ? await transfersResponse.json() : { transfers: [] };
      const transfers = transfersResult.transfers || [];
      const sarPendingRes = await fetch('/api/stock-adjustment-requests?status=pending');
      const sarApprovedRes = await fetch('/api/stock-adjustment-requests?status=approved');
      const sarPending = sarPendingRes.ok ? (await sarPendingRes.json()).requests : [];
      const sarApproved = sarApprovedRes.ok ? (await sarApprovedRes.json()).requests : [];
      const allSARs = [...sarPending, ...sarApproved];
      const totalItems = products.length;
      const totalStockQuantity = products.reduce((sum, product) => sum + (parseInt(product.totalStocks) || 0), 0);
      const inventory = totalStockQuantity;
      const outOfStockProducts = products.filter(product => !product.totalStocks || product.totalStocks <= 0);
      const outOfStock = outOfStockProducts.length;

      let incomingTransferCount = 0;
      let notificationCount = 0;
      if (userRole === 'admin') {
        incomingTransferCount = transfers.filter(transfer => transfer.status === 'pending').length;
        notificationCount = incomingTransferCount;
      } else if (userRole === 'manager' || userRole === 'keeper') {
        incomingTransferCount = transfers.filter(transfer => {
          const toProjectStr = transfer.toProjectId?._id || transfer.toProjectId;
          return userProjectIds.some(projId => {
            const userProjStr = projId?._id || projId;
            return userProjStr.toString() === toProjectStr.toString();
          }) && transfer.status === 'approved';
        }).length;
        notificationCount = incomingTransferCount;
      }
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
      const outgoingTransferCount = outgoingTransfers.reduce((sum, transfer) => sum + (parseInt(transfer.quantity) || 0), 0);

      let outgoingSARCount = 0;
      if (userRole === 'admin') {
        outgoingSARCount = allSARs.filter(sar => sar.status !== 'completed')
          .reduce((sum, sar) => sum + (parseInt(sar.stockOnHand) || 0), 0);
      } else if (userRole === 'manager') {
        outgoingSARCount = allSARs.filter(sar => userProjectIds.includes(sar.projectId))
          .reduce((sum, sar) => sum + (parseInt(sar.stockOnHand) || 0), 0);
      }

      setSummaryData({
        totalItems,
        inventory,
        outOfStock,
        incoming: incomingTransferCount,
        outgoing: outgoingTransferCount + outgoingSARCount
      });
      setNewNotificationsCount(notificationCount);

    } catch (error) {
      console.error("Error fetching inventory summary:", error);
      setSummaryData({
        totalItems: 0,
        inventory: 0,
        outOfStock: 0,
        incoming: 0,
        outgoing: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNewNotificationsCount = async () => {
    if (!session?.user) {
      return;
    }

    try {
      const transferResponse = await fetch('/api/transfers');
      const transferData = transferResponse.ok ? await transferResponse.json() : { transfers: [] };
      const allUsersResponse = await fetch('/api/Users');
      const allUsersData = allUsersResponse.ok ? await allUsersResponse.json() : { users: [] };
      const currentUser = allUsersData.users?.find(user => user.email === session.user.email);
      const userProjects = currentUser?.availableProjects || currentUser?.projects || [];
      const userProjectIds = userProjects.map(project => {
        if (typeof project === 'string') return project;
        return project._id || project.projectId || project.id;
      }).filter(Boolean);
      let relevantNotifications = 0;
      const transfers = transferData.transfers || [];

      transfers.forEach(transfer => {
        if (session?.user?.role === 'admin' && transfer.status === 'pending') {
          relevantNotifications++;
        }
        if (session?.user?.role === 'manager' && transfer.status === 'approved') {
          const toProjectStr = transfer.toProjectId?._id || transfer.toProjectId;
          const isDestinationProject = userProjectIds.some(projId => {
            const userProjStr = projId?._id || projId;
            return userProjStr.toString() === toProjectStr.toString();
          });
          if (isDestinationProject) {
            relevantNotifications++;
          }
        }
      });

      setNewNotificationsCount(relevantNotifications);
    } catch (error) {
      console.error("Error fetching new notifications count:", error);
      setNewNotificationsCount(0);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-between gap-5">
        <h2>Inventory Summary</h2>
        <div className="flex flex-row justify-between gap-4">
          {[1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="flex-1 h-24 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between gap-5">
      <h2>Inventory Summary</h2>
      <div className="flex flex-row justify-between gap-4">
        <InventorySummaryCard
          title={"Total Items"}
          update={0}
          value={summaryData.totalItems}
          icon={<PackageSearch />}
          fillcolor={"#4283DE"}
          bgcolor={"#4283DE1A"}
        />
        <InventorySummaryCard
          title={"Inventory"}
          update={0}
          value={summaryData.inventory}
          icon={<PackageOpen />}
          fillcolor={"#F9AD01"}
          bgcolor={"#F9AD011A"}
        />
        <InventorySummaryCard
          title={"Out of Stock"}
          update={0}
          value={summaryData.outOfStock}
          icon={<ArchiveX />}
          fillcolor={"#E25360"}
          bgcolor={"#F9AD011A"}
        />

        <InventorySummaryCard
          title={"Outgoing"}
          update={0}
          value={summaryData.outgoing}
          icon={<ArrowRightToLine />}
          fillcolor={"#895BBA"}
          bgcolor={"#895BBA1A"}
        />
        <InventorySummaryCard
          title={"Incoming"}
          update={newNotificationsCount}
          value={summaryData.incoming}
          icon={<ArrowLeftToLine />}
          fillcolor={"#E76500"}
          bgcolor={"#E765001A"}
        />
      </div>
    </div>
  );
};

export default InventorySummaryGrid;
