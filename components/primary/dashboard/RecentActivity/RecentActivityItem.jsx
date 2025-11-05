import React from "react";
import { FolderDot, CircleCheck, TruckElectric, BadgePercent, XCircle, Package, UserPlus, Settings } from "lucide-react";

const RecentActivityItem = ({ activities = [], iconMap = {} }) => {
  const defaultIconMap = {
    stockRequest: {
      icon: FolderDot,
      bgColor: "bg-andreaBlue/10",
      iconColor: "stroke-andreaBlue"
    },
    stockApproval: {
      icon: CircleCheck,
      bgColor: "bg-pictureBookGreen/10",
      iconColor: "stroke-pictureBookGreen"
    },
    stockRejection: {
      icon: XCircle,
      bgColor: "bg-red-500/10",
      iconColor: "stroke-red-500"
    },
    stockTransfer: {
      icon: TruckElectric,
      bgColor: "bg-lustyLavender/10",
      iconColor: "stroke-lustyLavender"
    },
    stockIncrement: {
      icon: BadgePercent,
      bgColor: "bg-aphrodisiac/10",
      iconColor: "stroke-aphrodisiac"
    },
    productUpdate: {
      icon: Package,
      bgColor: "bg-purple-500/10",
      iconColor: "stroke-purple-500"
    },
    userCreation: {
      icon: UserPlus,
      bgColor: "bg-green-500/10",
      iconColor: "stroke-green-500"
    },
    projectUpdate: {
      icon: Settings,
      bgColor: "bg-orange-500/10",
      iconColor: "stroke-orange-500"
    },
    systemActivity: {
      icon: Settings,
      bgColor: "bg-gray-500/10",
      iconColor: "stroke-gray-500"
    },
  };

  const finalIconMap = { ...defaultIconMap, ...iconMap };

  const formatTimestamp = (timestamp) => {
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    return timestamp;
  };

  return (
    <>
      {activities.map((activity) => {
        const iconConfig = finalIconMap[activity.type] || finalIconMap.stockRequest;
        const IconComponent = iconConfig.icon;
        return (
          <div key={activity.id} className="flex flex-row items-center justify-between px-3 py-2 rounded-lg gap-02" style={{ boxShadow: '0px 0px 5px 0px #0000000D' }}>
            <div className="flex flex-row items-center gap-2">
              <div className={`p-2.5 w-10 h-10 flex flex-row justify-center items-center rounded-full ${iconConfig.bgColor}`}>
                <IconComponent className={iconConfig.iconColor} />
              </div>
              <div className="flex flex-row items-center gap-1 !text-base">
                {activity.actor && (
                  <span className="text-nowrap !text-base">{activity.actor}</span>
                )}
                <span className="!text-base">{activity.description}</span>
                {activity.item && (
                  <span className="font-medium truncate w-[350px] !text-base">{activity.item.name || activity.item}</span>
                )}
              </div>
            </div>
            <div className="text-sm text-black/50">
              <p>{formatTimestamp(activity.timestamp)}</p>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default RecentActivityItem;
