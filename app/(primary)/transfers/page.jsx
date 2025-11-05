'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import TransferTable from '@/components/primary/transfers/TransferTable'
import { useSession } from 'next-auth/react'
import Calendar23 from '@/components/calendar-23'
import PrimaryBreadcrumb from '@/components/primary/transfers/PrimaryBreadcrumb'

export default function TransfersPage() {
  const { data: session, status } = useSession()
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    from: null,
    to: null,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredOrders, setFilteredOrders] = useState([])
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    skip: 0,
    hasMore: false,
  })

  useEffect(() => {
    if (session) {
      fetchTransfers()
    }
  }, [session, pagination.skip])

  useEffect(() => {
    if (orders.length > 0) {
      applyFilters()
    } else {
      setFilteredOrders([])
    }
  }, [orders, searchTerm, dateRange])

  const fetchTransfers = async () => {

    setIsLoading(true)
    try {
      const response = await fetch(`/api/stock-management?limit=${pagination.limit}&skip=${pagination.skip}`, {
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch transfers')
      }

      const data = await response.json()

      setOrders(prev => {
        if (pagination.skip === 0) {
          return data.transactions || []
        } else {
          return [...prev, ...(data.transactions || [])]
        }
      })

      setPagination({
        total: data.total || 0,
        limit: data.limit || pagination.limit,
        skip: data.skip || pagination.skip,
        hasMore: data.hasMore || false,
      })

    } catch (error) {

      toast.error('Failed to fetch transfers')
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...orders]

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(order => {
        if (order._id && order._id.toString().toLowerCase().includes(searchLower)) {
          return true
        }
        if (order.invoiceNumber && order.invoiceNumber.toLowerCase().includes(searchLower)) {
          return true
        }

        if (order.supplierName && order.supplierName.toLowerCase().includes(searchLower)) {
          return true
        }

        if (order.status && order.status.toLowerCase().includes(searchLower)) {
          return true
        }

        if (order.type && order.type.toLowerCase().includes(searchLower)) {
          return true
        }

        if (order.productName && order.productName.toLowerCase().includes(searchLower)) {
          return true
        }

        if (order.projectName && order.projectName.toLowerCase().includes(searchLower)) {
          return true
        }

        if (order.items && Array.isArray(order.items)) {
          const itemMatch = order.items.some(item =>
            (item.productName && item.productName.toLowerCase().includes(searchLower)) ||
            (item.projectName && item.projectName.toLowerCase().includes(searchLower))
          );
          if (itemMatch) {
            return true;
          }
        }

        if (order.transactionId && order.transactionId.toLowerCase().includes(searchLower)) {
          return true
        }

        return false
      })
    }

    if (dateRange.from || dateRange.to) {

      filtered = filtered.filter(order => {
        const orderDate = new Date(order.updatedAt || order.createdAt)

        if (isNaN(orderDate.getTime())) {

          return false
        }

        if (dateRange.from && dateRange.to) {
          const from = new Date(dateRange.from)
          const to = new Date(dateRange.to)
          to.setHours(23, 59, 59, 999)
          const inRange = orderDate >= from && orderDate <= to

          return inRange
        }

        if (dateRange.from) {
          const from = new Date(dateRange.from)
          return orderDate >= from
        }

        if (dateRange.to) {
          const to = new Date(dateRange.to)
          to.setHours(23, 59, 59, 999)
          return orderDate <= to
        }

        return true
      })

    }

    setFilteredOrders(filtered)
  }

  const loadMore = () => {
    if (pagination.hasMore) {
      setPagination(prev => ({
        ...prev,
        skip: prev.skip + prev.limit
      }))
    }
  }

  const resetFilters = () => {
    setSearchTerm('')
    setDateRange({ from: null, to: null })
    setFilteredOrders(orders)
  }

  return (
    <div className="flex flex-col w-full gap-6 px-4">
      <div className="layout-header">
        <h1>Transfers</h1>
        <PrimaryBreadcrumb />
      </div>
      <div>
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <Input
              placeholder="Search by ID, invoice, supplier, status, type, product, or project"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10"
            />
          </div>

          <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
            <Calendar23
              mode="range"
              dateRange={{
                from: dateRange.from,
                to: dateRange.to,
              }}
              onDateRangeChange={(range) => {
                setDateRange({
                  from: range?.from || null,
                  to: range?.to || null,
                })
              }}
              placeholder="Filter By DATES"
            />
            <Button
              variant="secondaryOutline"
              size="secondary"
              onClick={resetFilters}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      <TransferTable
        transfers={filteredOrders}
        isLoading={isLoading}
        onLoadMore={loadMore}
        hasMore={pagination.hasMore}
        totalCount={pagination.total}
        session={session}
      />
    </div>
  )
}