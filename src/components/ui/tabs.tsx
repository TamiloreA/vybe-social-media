"use client"

import { ReactNode, createContext, useContext, useState } from 'react'

interface TabsProps {
  children: ReactNode
  defaultValue: string
}

interface TabsContextValue {
  value: string
  setValue: (val: string) => void
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined)

export function Tabs({ children, defaultValue }: TabsProps) {
  const [value, setValue] = useState(defaultValue)
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: ReactNode
}

export function TabsList({ children }: TabsListProps) {
  return <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">{children}</div>
}

interface TabsTriggerProps {
  value: string
  children: ReactNode
}

export function TabsTrigger({ value, children }: TabsTriggerProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsTrigger must be used within Tabs')
  const isActive = context.value === value
  return (
    <button
      onClick={() => context.setValue(value)}
      className={`px-4 py-2 font-medium ${
        isActive ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'
      }`}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: ReactNode
}

export function TabsContent({ value, children }: TabsContentProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')
  return context.value === value ? <div className="pt-4">{children}</div> : null
}
