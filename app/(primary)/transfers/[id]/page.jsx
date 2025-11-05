'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { useSession } from 'next-auth/react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Loader2, ArrowLeft, Check, X } from 'lucide-react'

export default function TransferDetails({ params }) {
  const router = useRouter()
  const { id } = params
  const { data: session, status } = useSession()
  const [transfer, setTransfer] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (session) {
      fetchTransfer()
    }
  }, [session, id])

  const fetchTransfer = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/stock-management/${id}`, {
        cache: 'no-store'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch transfer')
      }
      
      const data = await response.json()
      setTransfer(data.transaction)
      
    } catch (error) {

      toast.error('Failed to fetch transfer details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/stock-management/approve/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to approve transfer')
      }
      
      toast.success('Transfer approved successfully')
      fetchTransfer() 
      
    } catch (error) {

      toast.error(error.message || 'Failed to approve transfer')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/stock-management/reject/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to reject transfer')
      }
      
      toast.success('Transfer rejected')
      fetchTransfer() 
      
    } catch (error) {

      toast.error(error.message || 'Failed to reject transfer')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status) => {
    switch(status?.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-800 bg-yellow-100 border-yellow-300">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-800 bg-green-100 border-green-300">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-800 bg-red-100 border-red-300">Rejected</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-blue-800 bg-blue-100 border-blue-300">Completed</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-800 bg-gray-100 border-gray-300">{status || 'Unknown'}</Badge>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      return format(date, 'PPpp');
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col w-full px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 mr-2 text-gray-500 animate-spin" />
          <span>Loading transfer details...</span>
        </div>
      </div>
    )
  }

  if (!transfer) {
    return (
      <div className="flex flex-col w-full px-4 py-6">
        <div title="Transfer Not Found" subtitle="The requested transfer could not be found" />
        <Button
          onClick={() => router.push('/transfers')}
          variant="outline"
          className="mt-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Transfers
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full px-4 py-6">
      <div title="Transfer Details" subtitle={`Transfer ID: ${transfer._id}`} />
      
      <div className="mb-4">
        <Button
          onClick={() => router.push('/transfers')}
          variant="outline"
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Transfers
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-2 text-lg font-medium">Transfer Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-semibold">Status:</span>
              <span>{getStatusBadge(transfer.status)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Type:</span>
              <span className="capitalize">{transfer.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Created:</span>
              <span>{formatDate(transfer.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Last Updated:</span>
              <span>{formatDate(transfer.updatedAt || transfer.createdAt)}</span>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <h3 className="mb-2 text-lg font-medium">Additional Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-semibold">Invoice Number:</span>
              <span>{transfer.invoiceNumber || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Supplier:</span>
              <span>{transfer.supplierName || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Created By:</span>
              <span>{transfer.createdBy || 'System'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Total Items:</span>
              <span>{transfer.items?.length || 0} items</span>
            </div>
          </div>
        </Card>
      </div>
      
      <Card className="mb-6 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Rack</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!transfer.items || transfer.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-4 text-center">
                  No items in this transfer
                </TableCell>
              </TableRow>
            ) : (
              transfer.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.productName || 'Unknown Product'}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.projectName || 'Unknown Project'}</TableCell>
                  <TableCell>{item.rackNumber || 'Unknown Rack'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      
      {transfer.status === 'pending' && (
        <div className="flex space-x-4">
          <Button
            onClick={handleApprove}
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Approve Transfer
          </Button>
          
          <Button
            onClick={handleReject}
            disabled={isProcessing}
            variant="destructive"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <X className="w-4 h-4 mr-2" />
            )}
            Reject Transfer
          </Button>
        </div>
      )}
    </div>
  )
}
