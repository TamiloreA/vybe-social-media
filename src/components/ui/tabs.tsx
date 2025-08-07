"use client";

import React, { ReactNode, createContext, useContext, useState } from "react";

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (val: string) => void;
}

interface TabsContextValue {
  value: string;
  setValue: (val: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

export function Tabs({
  children,
  defaultValue,
  value: propValue,
  onValueChange,
  className,
  ...rest
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? propValue ?? "");
  const value = propValue !== undefined ? propValue : internalValue;

  const setValue = (val: string) => {
    if (propValue === undefined) setInternalValue(val);
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className} {...rest}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function TabsList({ children, className, ...rest }: TabsListProps) {
  return (
    <div
      className={`flex space-x-4 border-b border-gray-200 dark:border-gray-700 ${className ?? ""}`}
      {...rest}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: ReactNode;
}

export function TabsTrigger({
  value,
  children,
  className,
  ...rest
}: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");
  const isActive = context.value === value;

  return (
    <button
      onClick={() => context.setValue(value)}
      aria-selected={isActive}
      role="tab"
      className={`px-4 py-2 font-medium ${
        isActive
          ? "border-b-2 border-blue-600 text-blue-600"
          : "text-gray-500"
      } ${className ?? ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children: ReactNode;
}

export function TabsContent({
  value,
  children,
  className,
  ...rest
}: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");
  if (context.value !== value) return null;

  return (
    <div className={`pt-4 ${className ?? ""}`} role="tabpanel" {...rest}>
      {children}
    </div>
  );
}
