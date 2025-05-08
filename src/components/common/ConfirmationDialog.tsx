// src/components/common/ConfirmationDialog.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';

// shadcn/ui components for Alert Dialog
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    // AlertDialogTrigger, // Trigger is usually handled by the parent component's button
} from "@/components/ui/alert-dialog"; // Adjust path if needed
import { Button } from "@/components/ui/button"; // Used if customizing actions
import { Loader2, AlertTriangle } from 'lucide-react'; // Icons

interface ConfirmationDialogProps {
    open: boolean; // Controls dialog visibility
    onOpenChange?: (open: boolean) => void; // Optional: If parent needs to know about open state changes
    onClose: () => void; // Function called when cancelling/closing
    onConfirm: () => void; // Function called when confirming the action
    title: string; // Dialog title text (already translated by parent)
    message: string; // Dialog descriptive message (already translated by parent)
    confirmText?: string; // Custom text for confirm button (defaults to t('common:confirm'))
    cancelText?: string; // Custom text for cancel button (defaults to t('common:cancel'))
    confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"; // Style for confirm button
    isLoading?: boolean; // Show loading state on confirm button
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    open,
    onOpenChange,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    confirmVariant = "destructive", // Default to destructive style for delete confirmations
    isLoading = false,
}) => {
    const { t } = useTranslation('common'); // Load common translations

    // Prevent closing while loading
    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen && isLoading) return; // Don't close if loading
        if (onOpenChange) {
            onOpenChange(isOpen);
        }
         // Note: onClose prop handles the actual state update in the parent
         // Calling onClose directly here if !isOpen might be redundant if parent uses onOpenChange
         if (!isOpen) {
             onClose();
         }
    };

    const handleConfirmClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault(); // Prevent any default form submission if nested
        if (!isLoading) {
            onConfirm();
        }
    }

     const handleCancelClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
         if (!isLoading) {
             onClose();
         }
     }

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            {/* No AlertDialogTrigger here, visibility controlled by 'open' prop */}
            <AlertDialogContent className="dark:bg-gray-800"> {/* Add dark mode background */}
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        {/* Optional Icon */}
                        {confirmVariant === 'destructive' && <AlertTriangle className="h-5 w-5 text-destructive" />}
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="dark:text-gray-300">
                        {/* Use whitespace-pre-wrap to respect newlines if any */}
                        <span className="whitespace-pre-wrap">{message}</span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                     {/* Cancel Button uses AlertDialogCancel for proper closing/focus */}
                    <AlertDialogCancel asChild disabled={isLoading}>
                         <Button type="button" variant="ghost" onClick={handleCancelClick}>{cancelText || t('cancel')}</Button>
                    </AlertDialogCancel>
                     {/* Confirm Button uses AlertDialogAction or custom Button */}
                    {/* Using custom Button inside AlertDialogAction allows adding loader */}
                     <AlertDialogAction asChild disabled={isLoading}>
                         <Button
                             type="button" // Ensure it's not submitting any outer form
                             variant={confirmVariant}
                             disabled={isLoading}
                             onClick={handleConfirmClick}
                         >
                             {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                             {confirmText || t('confirm')}
                         </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default ConfirmationDialog;