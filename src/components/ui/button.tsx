import React from "react";
import { PlusCircle, ArrowRight, Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPlusCircle?: boolean;
  showRightArrow?: boolean;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "secondary",
      size = "md",
      leftIcon,
      rightIcon,
      showPlusCircle,
      showRightArrow,
      isLoading = false,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const variantClass =
      variant === "primary"
        ? "btn-primary"
        : variant === "danger"
        ? "btn danger"
        : variant === "ghost"
        ? "btn-ghost"
        : "btn";

    const sizeClass =
      size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "btn-md";

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${variantClass} ${sizeClass} ${className}`.trim()}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {showPlusCircle && (
              <PlusCircle className="w-4 h-4 stroke-[2]" />
            )}
            {leftIcon && !showPlusCircle && leftIcon}
            {children}
            {showRightArrow && (
              <ArrowRight className="w-4 h-4 stroke-[2]" />
            )}
            {rightIcon && !showRightArrow && rightIcon}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
