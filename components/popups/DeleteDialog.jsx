import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog"
import { Button } from '../ui/button'

const DeleteDialog = ({
    accentColor = '#008919',
    tagText = 'PROJECT B',
    showTag = true,
    title = 'Are You Sure Want to Delete?',
    description = "This action can't be undone!",
    confirmButtonText = 'Yes, Proceed',
    cancelButtonText = 'Cancel',
    onConfirm = () => { },
    onCancel = () => { },
    triggerText = '',
    triggerElement = null,
    maxWidth = 'sm:max-w-[425px]',
    buttonWidth = 'w-[300px]',
    open,
    onOpenChange,
    children,
    ...props
}) => {
    const tagStyle = {
        color: accentColor,
        backgroundColor: `${accentColor}10`,
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange} {...props}>
            {triggerElement || <DialogTrigger>{triggerText}</DialogTrigger>}
            <DialogContent className={`bg-white ${maxWidth}`}>
                {showTag && tagText && (
                    <div className='flex items-center justify-center w-full'>
                        <p
                            className='!text-sm rounded-sm uppercase font-medium py-1 px-2 w-fit'
                            style={tagStyle}
                        >
                            {tagText}
                        </p>
                    </div>
                )}
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                {children || (
                    <div className="flex flex-col items-center justify-center w-full gap-2">
                        <Button
                            variant="default"
                            className={buttonWidth}
                            onClick={onConfirm}
                        >
                            {confirmButtonText}
                        </Button>
                        <DialogClose asChild>
                            <Button
                                variant="outline"
                                className={buttonWidth}
                                onClick={onCancel}
                            >
                                {cancelButtonText}
                            </Button>
                        </DialogClose>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

export default DeleteDialog