
import React, { useState } from 'react';
import { Input } from "@/components/ui/input"
import { Eye, EyeOff } from 'lucide-react';
import { Button } from "@/components/ui/button"

const PasswordInput = React.forwardRef(({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const disabled = props.value === "" || props.value === undefined || props.disabled;

    return (
        <div className="relative">
            <Input
                type={showPassword ? "text" : "password"}
                className={`pr-10 ${className}`}
                ref={ref}
                {...props}
            />
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={disabled}
            >
                {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="sr-only">
                    {showPassword ? "Hide password" : "Show password"}
                </span>
            </Button>
        </div>
    )
})
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
