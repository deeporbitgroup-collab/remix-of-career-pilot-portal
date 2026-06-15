import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm [&[type='file']]:file:mr-4 [&[type='file']]:file:py-2 [&[type='file']]:file:px-4 [&[type='file']]:file:rounded-md [&[type='file']]:file:border-0 [&[type='file']]:file:text-sm [&[type='file']]:file:font-semibold [&[type='file']]:file:bg-primary [&[type='file']]:file:text-primary-foreground [&[type='file']]:hover:file:bg-primary/90",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
