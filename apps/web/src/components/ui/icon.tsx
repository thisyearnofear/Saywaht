// Enhanced Icon component - Single source of truth for icon rendering
// Provides consistent styling, sizing, and accessibility

import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getIcon, type IconName } from "@/lib/icons";
import type { IconProps } from "@/lib/types";

// ============================================================================
// ENHANCED ICON COMPONENT
// ============================================================================

interface EnhancedIconProps extends Omit<IconProps, 'size'> {
  /** Icon name from our curated icon set */
  name?: IconName;
  /** Direct icon component (alternative to name) */
  icon?: LucideIcon;
  /** Predefined size variants */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number | string;
  /** Accessibility label */
  'aria-label'?: string;
  /** Whether the icon is decorative (hides from screen readers) */
  decorative?: boolean;
}

const sizeMap = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

/**
 * Enhanced Icon component with consistent styling and accessibility
 * 
 * @example
 * // Using icon name (recommended)
 * <Icon name="play" size="md" />
 * 
 * // Using direct icon component
 * <Icon icon={Play} size="lg" />
 * 
 * // Custom size
 * <Icon name="pause" size={28} />
 */
export function Icon({
  name,
  icon,
  size = 'md',
  className,
  color,
  strokeWidth = 2,
  'aria-label': ariaLabel,
  decorative = false,
  ...props
}: EnhancedIconProps) {
  // Determine which icon to render
  const IconComponent = icon || (name ? getIcon(name) : null);
  
  if (!IconComponent) {
    console.warn('Icon component: No icon provided. Use either "name" or "icon" prop.');
    return null;
  }

  // Determine size value
  const sizeValue = typeof size === 'string' && size in sizeMap 
    ? sizeMap[size as keyof typeof sizeMap]
    : size;

  // Accessibility props
  const accessibilityProps = decorative 
    ? { 'aria-hidden': true }
    : { 'aria-label': ariaLabel || (name ? `${name} icon` : 'Icon') };

  return (
    <IconComponent
      size={sizeValue}
      color={color}
      strokeWidth={strokeWidth}
      className={cn("shrink-0", className)}
      {...accessibilityProps}
      {...props}
    />
  );
}

// ============================================================================
// SPECIALIZED ICON COMPONENTS
// ============================================================================

/**
 * Loading icon with built-in animation
 */
export function LoadingIcon({ 
  className, 
  size = 'md',
  ...props 
}: Omit<EnhancedIconProps, 'name' | 'icon'>) {
  return (
    <Icon
      name="loading"
      size={size}
      className={cn("animate-spin", className)}
      aria-label="Loading"
      {...props}
    />
  );
}

/**
 * Status icon with semantic colors
 */
export function StatusIcon({ 
  status,
  className,
  size = 'md',
  ...props
}: Omit<EnhancedIconProps, 'name' | 'icon'> & {
  status: 'success' | 'warning' | 'error' | 'info';
}) {
  const statusConfig = {
    success: { name: 'success' as IconName, color: 'text-green-500' },
    warning: { name: 'warning' as IconName, color: 'text-yellow-500' },
    error: { name: 'warning' as IconName, color: 'text-red-500' },
    info: { name: 'warning' as IconName, color: 'text-blue-500' },
  };

  const config = statusConfig[status];

  return (
    <Icon
      name={config.name}
      size={size}
      className={cn(config.color, className)}
      aria-label={`${status} status`}
      {...props}
    />
  );
}

/**
 * Interactive icon button with hover states
 */
export function IconButton({
  name,
  icon,
  size = 'md',
  className,
  onClick,
  disabled = false,
  'aria-label': ariaLabel,
  ...props
}: EnhancedIconProps & {
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || (name ? `${name} button` : 'Icon button')}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-2",
        "transition-colors duration-200",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      <Icon
        name={name}
        icon={icon}
        size={size}
        decorative
      />
    </button>
  );
}

// Export types for external use
export type { EnhancedIconProps, IconName };
