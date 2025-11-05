import React from "react";
import NotificationsLayout from "@/components/layouts/notifications-layout";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const serializeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => serializeObject(item));
  }
  
  if (typeof obj === 'object') {
    if (obj._id) {
      return {
        ...Object.keys(obj).reduce((acc, key) => {
          if (key === '_id') {
            acc[key] = obj[key].toString();
          } else if (key !== 'buffer' && key !== 'toJSON' && key !== '__v') {
            acc[key] = serializeObject(obj[key]);
          }
          return acc;
        }, {})
      };
    }
    
    return Object.keys(obj).reduce((acc, key) => {
      if (key !== 'buffer' && key !== 'toJSON' && key !== '__v') {
        acc[key] = serializeObject(obj[key]);
      }
      return acc;
    }, {});
  }
  
  return obj;
};

const page = async () => {
  const session = await getServerSession(authOptions);
  
  const serializedSession = serializeObject(session);
  
  return (
    <div className="flex flex-col w-full">
      <NotificationsLayout session={serializedSession} />
    </div>
  );
};

export default page;