"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const InternalTransferDialog = ({
  icon: Icon,
  title,
  description,
  sourceProject,
  availableProjects,
  onSubmit,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    stockQuantity: "",
    destinationProjectId: "",
    reason: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.stockQuantity || !formData.destinationProjectId) {
      toast.error("Please fill in all required fields");
      return;
    }

    const quantity = parseInt(formData.stockQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit(formData, sourceProject._id, formData.destinationProjectId);
      setFormData({
        stockQuantity: "",
        destinationProjectId: "",
        reason: "",
      });
      setIsOpen(false);
    } catch (error) {
      toast.error(`Error submitting internal transfer: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const destinationProjects = availableProjects.filter(
    (project) => project._id !== sourceProject._id
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="p-2 h-8 w-8 hover:bg-blue-50 hover:border-blue-300"
        >
          <Icon className="w-4 h-4 text-blue-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-blue-600" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="destinationProject">Destination Project *</Label>
            <Select
              value={formData.destinationProjectId}
              onValueChange={(value) => handleInputChange("destinationProjectId", value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select destination project" />
              </SelectTrigger>
              <SelectContent>
                {destinationProjects.map((project) => (
                  <SelectItem key={project._id} value={project._id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.ProjectColor || "#ccc" }}
                      />
                      {project.projectName}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="stockQuantity">Quantity *</Label>
            <Input
              id="stockQuantity"
              type="number"
              min="1"
              placeholder="Enter quantity to transfer"
              value={formData.stockQuantity}
              onChange={(e) => handleInputChange("stockQuantity", e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for transfer..."
              value={formData.reason}
              onChange={(e) => handleInputChange("reason", e.target.value)}
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Request Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InternalTransferDialog;
