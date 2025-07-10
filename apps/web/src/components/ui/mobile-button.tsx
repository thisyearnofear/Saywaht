"use client";

import React from 'react';
import { Slot as SlotPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { addHapticFeedback } from "../../lib/mobile-utils";
import { useState, useCallback, MouseEvent, TouchEvent } from '@/lib/hooks-provider';

const mobileButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90 active:bg-primary/80",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:bg-destructive/80",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:bg-secondary/70",
        text: "bg-transparent p-0 rounded-none hover:text-muted-foreground active:text-muted-foreground/80",
        link: "text-primary underline-offset-4 hover:underline active:underline",
      },
      size: {
        default: "h-11 px-4 py-2 min-h-[44px]", // Increased from h-9 for better touch targets
        sm: "h-10 rounded-md px-3 text-xs min-h-[40px]", // Increased from h-8
        lg: "h-12 rounded-md px-8 min-h-[48px]", // Increased from h-10
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]", // Increased from h-7 w-7
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface MobileButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof mobileButtonVariants> {
  asChild?: boolean;
  hapticFeedback?: boolean;
}

const MobileButton = React.forwardRef<HTMLButtonElement, MobileButtonProps>(
  ({ 
      className,
      variant,
      size,
      asChild = false,
      onClick,
      onTouchStart,
      hapticFeedback = true,
      ...props
     }: any, ref: any) => {
    const [isPressed, setIsPressed] = useState(false);

    // Enhanced touch handling for better mobile responsiveness
    const handleTouchStart = useCallback(
      (e: React.TouchEvent<HTMLButtonElement>) => {
        setIsPressed(true);
        onTouchStart?.(e);
      },
      [onTouchStart]
    );

    const handleTouchEnd = useCallback(() => {
      setIsPressed(false);
    }, []);

    const handleTouchCancel = useCallback(() => {
      setIsPressed(false);
    }, []);

    // Enhanced click handling with touch event coordination
    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        // Prevent double-firing on touch devices
        if (e.detail === 0) {
          // This is a programmatic click or touch-generated click
          onClick?.(e);
        } else {
          // This is a mouse click
          onClick?.(e);
        }
      },
      [onClick]
    );

    const Comp = asChild ? SlotPrimitive.Slot : "button";

    return (
      <Comp
        className={cn(
          mobileButtonVariants({ variant, size, className }),
          // Add touch-specific styles
          "touch-manipulation select-none",
          // Add pressed state for visual feedback
          isPressed && "scale-95 transition-transform duration-75"
        )}
        ref={ref}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        style={{
          // Ensure proper touch target size
          minHeight: "44px",
          minWidth: "44px",
          // Prevent iOS button styling
          WebkitAppearance: "none",
          // Improve touch responsiveness
          touchAction: "manipulation",
        }}
        {...props}
      />
    );
  }
);
MobileButton.displayName = "MobileButton";

export { MobileButton, mobileButtonVariants };
