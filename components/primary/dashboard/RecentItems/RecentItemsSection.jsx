"use client";
import React, { useState, useEffect } from "react";
import RecentItemsCard from "@/components/primary/dashboard/RecentItems/RecentItemCard";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const RecentItemsSection = () => {
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (response.ok) {
          const data = await response.json();
          setRecentItems(data.recentItems);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        // Fallback to hardcoded data if API fails
        setRecentItems([
          {
            itemName: "RYOBI Drill Nut Remover",
            price: "1,499.65",
            stockQuantity: "100",
            stockStatus: "in Stock",
            imageSrc: "/images/drill.png"
          },
          {
            itemName: "Grass Remover",
            price: "2,299.65",
            stockQuantity: "100",
            stockStatus: "in Stock",
            imageSrc: "/images/grass.png"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <h2>Recent Items</h2>
        <div className="flex flex-row gap-4">
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="animate-pulse bg-gray-200 rounded-lg h-48 flex-1"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
      <div className="flex flex-col gap-5">
        <h2>Recent Items</h2>
        <Carousel
          opts={{
            align: "start",
            slidesToScroll: 1,
          }}
        >
        <CarouselContent>
            {recentItems.map((item, index) => (
              <CarouselItem key={index} className="basis-[25%]">
                <RecentItemsCard 
                  itemName={item.itemName}
                  price={item.price}
                  stockQuantity={item.stockQuantity}
                  stockStatus={item.stockStatus}
                  imageSrc={item.imageSrc}
                  productId={item.productId || item._id}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselNext />
          <CarouselPrevious />
        </Carousel>
      </div>
  );
};

export default RecentItemsSection;
