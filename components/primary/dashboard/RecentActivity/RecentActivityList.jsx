"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import RecentActivityItem from "@/components/primary/dashboard/RecentActivity/RecentActivityItem";

const RecentActivityList = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchRecentActivitiesFromReports();
  }, [session]);

  const fetchRecentActivitiesFromReports = async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch("/api/activities");
      if (!response.ok) {
        throw new Error("Failed to fetch activities");
      }
      const data = await response.json();
      
      const usersResponse = await fetch("/api/Users");
      const usersResult = usersResponse.ok ? await usersResponse.json() : { users: [] };
      const userMap = {};
      const usersData = usersResult.users || [];
      usersData.forEach(user => {
        if (user._id) userMap[user._id] = user.name || user.email || 'Unknown User';
        if (user.email) userMap[user.email] = user.name || user.email || 'Unknown User';
      });
      if (data.success && Array.isArray(data.activities)) {
        
        const processedActivities = await Promise.all(data.activities.map(async (activity) => {
          const actor = userMap[activity.userId] || userMap[activity.userEmail] || activity.userName || 'Unknown User';
          
          
          let itemName = activity.entityName || 'Unknown Item';
          let transactionType = null;
          if (activity.entityId && (activity.entityType === 'order' || activity.type === 'stock_management')) {
            try {
              const transactionResponse = await fetch(`/api/stock-management?id=${activity.entityId}`);
              if (transactionResponse.ok) {
                const transactionData = await transactionResponse.json();

                if (transactionData.transactions && transactionData.transactions.length > 0) {
                  // Find the specific transaction that matches the activity's entityId
                  const matchingTransaction = transactionData.transactions.find(
                    transaction => transaction._id === activity.entityId
                  );
                  
                  if (matchingTransaction) {
                    transactionType = matchingTransaction.type;
                    if (matchingTransaction.invoiceNumber) {
                      itemName = matchingTransaction.invoiceNumber;
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error fetching transaction data:', error);
            }
          }
          
          return {
            id: activity._id || `activity-${Date.now()}-${Math.random()}`,
            type: getActivityType(activity),
            actor,
            description: generateActivityDescription(activity, transactionType),
            item: itemName,
            timestamp: new Date(activity.timestamp),
            rawData: activity,
            entityId:activity.entityId
          };
        }));
        const recentActivities = processedActivities
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 10);
        setActivities(recentActivities);
      }
    } catch (error) {
      console.error('Error fetching recent activities from reports:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const getActivityType = (activity) => {
    if (activity.action?.includes("Transfer") || activity.entityType === "Transfer") {
      return "stockTransfer";
    } else if (activity.action?.includes("Approved")) {
      return "stockApproval";
    } else if (activity.action?.includes("Request")) {
      return "stockRequest";
    } else if (activity.type === "product_update" || activity.entityType === "product") {
      return "productUpdate";
    } else {
      return "systemActivity";
    }
  };

  const generateActivityDescription = (activity, transactionType = null) => {
    const action = activity.action;
    
    if (action?.includes("Transfer")) {
      return "transferred";
    } else if (action?.includes("Approved")) {
      return "approved request for";
    } else if (action?.includes("Request")) {
      return "created request for";
    } else if (action?.includes("Adjusted") || action?.includes("Incremented") || action?.includes("Decremented")) {
      return "adjusted stock for";
    } else if (activity.type === "product_update") {
      return "updated";
    } else if (activity.type === "stock_management" || activity.entityType === "order") {
      if (action === "stock_in") {
        return transactionType === 'in' ? "created stock in for GRN-" : "created stock in for";
      } else if (action === "stock_out") {
        return transactionType === 'out' ? "created stock out for DN-" : "created stock out for";
      }
    } else {
      return action?.toLowerCase() || "performed action on";
    }
  };  
  

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <h2>Recent Activity</h2>
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5 pb-10">
      <h2>Recent Activity</h2>
      <div className="flex flex-col gap-3">
        {activities.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">No recent activities found.</p>
          </div>
        ) : (
          <RecentActivityItem activities={activities} />
        )}
      </div>
      <p 
        className="text-center transition-colors cursor-pointer text-amalfitanAzure"
        onClick={() => router.push('/reports')}
      >
        View all activities
      </p>
    </div>
  );
};

export default RecentActivityList;
