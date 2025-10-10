"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Database, CheckCircle, AlertCircle, HardDrive } from 'lucide-react'

interface StorageStatusProps {
  className?: string
}

export function StorageStatus({ className }: StorageStatusProps) {
  const [storageInfo, setStorageInfo] = useState<{
    isSupported: boolean
    quota: number | null
    usage: number | null
    available: number | null
    status: 'checking' | 'available' | 'error'
  }>({
    isSupported: false,
    quota: null,
    usage: null,
    available: null,
    status: 'checking'
  })

  useEffect(() => {
    checkStorageStatus()
  }, [])

  const checkStorageStatus = async () => {
    try {
      // Check if IndexedDB is supported
      if (!('indexedDB' in window)) {
        setStorageInfo({
          isSupported: false,
          quota: null,
          usage: null,
          available: null,
          status: 'error'
        })
        return
      }

      // Check storage quota (if available)
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        setStorageInfo({
          isSupported: true,
          quota: estimate.quota || null,
          usage: estimate.usage || null,
          available: estimate.quota && estimate.usage ? estimate.quota - estimate.usage : null,
          status: 'available'
        })
      } else {
        setStorageInfo({
          isSupported: true,
          quota: null,
          usage: null,
          available: null,
          status: 'available'
        })
      }
    } catch (error) {
      console.error('Error checking storage status:', error)
      setStorageInfo(prev => ({ ...prev, status: 'error' }))
    }
  }

  const formatBytes = (bytes: number | null): string => {
    if (bytes === null) return 'Unknown'
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = () => {
    switch (storageInfo.status) {
      case 'checking':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusBadge = () => {
    switch (storageInfo.status) {
      case 'checking':
        return <Badge variant="secondary">Checking...</Badge>
      case 'available':
        return <Badge variant="default" className="bg-green-500">Available</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Browser Storage Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">IndexedDB Support:</span>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {getStatusBadge()}
          </div>
        </div>

        {storageInfo.isSupported && storageInfo.status === 'available' && (
          <>
            {storageInfo.quota && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Storage Quota:</span>
                  <span className="font-mono">{formatBytes(storageInfo.quota)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Used:</span>
                  <span className="font-mono">{formatBytes(storageInfo.usage)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Available:</span>
                  <span className="font-mono">{formatBytes(storageInfo.available)}</span>
                </div>
              </div>
            )}
            
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Your work hours data is stored locally in your browser using IndexedDB. 
                This means your data persists between sessions and is private to your device.
              </p>
            </div>
          </>
        )}

        {!storageInfo.isSupported && (
          <div className="pt-2 border-t">
            <p className="text-xs text-destructive">
              IndexedDB is not supported in this browser. Data will not persist between sessions.
            </p>
          </div>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          onClick={checkStorageStatus}
          className="w-full"
        >
          <Database className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  )
}
