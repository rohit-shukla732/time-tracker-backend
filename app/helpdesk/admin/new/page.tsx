"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminTicketLayout } from "@/components/tickets/AdminTicketLayout";
import { makeAuthenticatedRequest } from "@/lib/adminAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TicketPriority, TicketCategory, TicketSubcategory } from "@/types";
import { toast } from "sonner";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import TicketShipmentAnimation from "@/components/animated/TicketShipmentAnimation";

export default function NewTicketPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: TicketPriority.MEDIUM,
    categoryId: "",
    subcategoryId: "",
  });
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [showShipmentAnimation, setShowShipmentAnimation] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoadError(null);
    if (!localStorage.getItem("accessToken")) {
      router.push("/helpdesk/admin/login");
      return;
    }
    try {
      const response = await makeAuthenticatedRequest("/api/tickets/categories", {
        headers: { "Content-Type": "application/json" },
      });
      if (response.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        router.push("/helpdesk/admin/login");
        return;
      }
      if (!response.ok) {
        throw new Error(`Failed to load ticket categories: ${response.status}`);
      }
      const data: TicketCategory[] = await response.json();
      setCategories(data);
      if (data.length === 0) {
        setLoadError(
          "No ticket categories are configured yet. Please contact your administrator."
        );
      } else {
        setFormData((prev) => ({
          ...prev,
          categoryId: prev.categoryId || data[0].id,
        }));
      }
    } catch (error) {
      console.error("Failed to load ticket categories:", error);
      setLoadError("Failed to load ticket categories. Please try again.");
    }
  }, [router]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const activeSubcategories = categories.find(
    (c) => c.id === formData.categoryId
  )?.subcategories || [];

  const handleCategoryChange = (categoryId: string) => {
    setFormData({
      ...formData,
      categoryId,
      subcategoryId: "",
    });
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const processFiles = (files: File[]) => {
    // Validate file types
    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isUnder5MB = file.size <= 5 * 1024 * 1024; // 5MB limit

      if (!isImage) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (!isUnder5MB) {
        toast.error(`${file.name} is larger than 5MB`);
        return false;
      }
      return true;
    });

    if (screenshots.length + validFiles.length > 5) {
      toast.error("Maximum 5 screenshots allowed");
      return;
    }

    // Create preview URLs
    const newPreviewUrls = validFiles.map((file) => URL.createObjectURL(file));

    setScreenshots((prev) => [...prev, ...validFiles]);
    setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const removeScreenshot = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get user info from localStorage
      const storedUser = localStorage.getItem("user");
      const user = storedUser ? JSON.parse(storedUser) : null;

      if (!user) {
        toast.error("Please log in to create a ticket");
        return;
      }

      const token = localStorage.getItem("accessToken");
      if (!token) {
        toast.error("Please log in to continue");
        router.push("/helpdesk/admin/login");
        return;
      }

      // Create ticket via API
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          categoryId: formData.categoryId || null,
          subcategoryId: formData.subcategoryId || null,
        }),
      });

      if (response.status === 401) {
        toast.error("Session expired. Please log in again.");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        router.push("/helpdesk/admin/login");
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        setIsSubmitting(false);
        throw new Error(error.error || "Failed to create ticket");
      }

      const ticket = await response.json();

      // Upload screenshots if any
      if (screenshots.length > 0) {
        try {
          const formDataToSend = new FormData();
          screenshots.forEach((file) => {
            formDataToSend.append("screenshots", file);
          });

          const uploadResponse = await fetch(
            `/api/tickets/${ticket.id}/screenshots`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              credentials: "include",
              body: formDataToSend,
            },
          );

          if (!uploadResponse.ok) {
            console.error("Failed to upload screenshots");
            toast.error("Ticket created but screenshots failed to upload");
          }
        } catch (uploadError) {
          console.error("Error uploading screenshots:", uploadError);
          toast.error("Ticket created but screenshots failed to upload");
        }
      }

      // Send email notifications via API
      try {
        await fetch("/api/tickets/send-new-ticket-emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({
            ticketId: ticket.id,
          }),
        });
      } catch (emailError) {
        console.error("Failed to send email notifications:", emailError);
      }

      // Clean up preview URLs
      previewUrls.forEach((url) => URL.revokeObjectURL(url));

      setShowShipmentAnimation(true);
    } catch (error) {
      console.error("Error creating ticket:", error);
      setIsSubmitting(false);
      toast.error("Failed to create ticket. Please try again.");
    }
  };

  return (
    <AdminTicketLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-12">
        {/* Header - Apple Style Large Typography */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
            Create an IT Support Ticket
          </h1>
          <p className="text-[19px] text-zinc-500 dark:text-zinc-400 font-light">
            Tell us what’s happening so we can help.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <div className="p-8 rounded-[32px] bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2.5">
                  <Label htmlFor="title" className="text-[14px] font-medium text-zinc-600 dark:text-zinc-400 ml-1">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Brief description of the issue"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    maxLength={100}
                    required
                    className="h-14 px-4 bg-white/50 dark:bg-zinc-900/50 border-black/5 dark:border-white/5 rounded-2xl text-[17px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-light"
                  />
                  <p className="text-xs text-zinc-400 ml-1 font-light">
                    {formData.title.length}/100 characters
                  </p>
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="description" className="text-[14px] font-medium text-zinc-600 dark:text-zinc-400 ml-1">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide detailed information about your issue..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                    rows={6}
                    maxLength={1000}
                    required
                    className="p-4 bg-white/50 dark:bg-zinc-900/50 border-black/5 dark:border-white/5 rounded-2xl text-[17px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-light resize-none"
                  />
                  <p className="text-xs text-zinc-400 ml-1 font-light">
                    {formData.description.length}/1000 characters
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="priority" className="text-[14px] font-medium text-zinc-600 dark:text-zinc-400 ml-1">Priority *</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          priority: value as TicketPriority,
                        })
                      }
                    >
                      <SelectTrigger id="priority" className="h-14 px-4 bg-white/50 dark:bg-zinc-900/50 border-black/5 dark:border-white/5 rounded-2xl text-[16px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-2 focus-visible:ring-primary/20 transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-black/5 dark:border-white/5 shadow-xl">
                        <SelectItem value={TicketPriority.LOW} className="rounded-xl">Low</SelectItem>
                        <SelectItem value={TicketPriority.MEDIUM} className="rounded-xl">Medium</SelectItem>
                        <SelectItem value={TicketPriority.HIGH} className="rounded-xl">High</SelectItem>
                        <SelectItem value={TicketPriority.URGENT} className="rounded-xl">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {loadError ? (
                    <div className="md:col-span-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-amber-200/70 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10">
                        <p className="text-[14px] text-amber-800 dark:text-amber-200 font-light">{loadError}</p>
                        <button
                          type="button"
                          onClick={loadCategories}
                          className="shrink-0 px-5 h-10 rounded-full bg-amber-600 text-white text-[13px] font-medium hover:bg-amber-700 active:scale-[0.98] transition-all"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2.5">
                        <Label htmlFor="category" className="text-[14px] font-medium text-zinc-600 dark:text-zinc-400 ml-1">Category *</Label>
                        <Select
                          value={formData.categoryId}
                          onValueChange={handleCategoryChange}
                        >
                          <SelectTrigger id="category" className="h-14 px-4 bg-white/50 dark:bg-zinc-900/50 border-black/5 dark:border-white/5 rounded-2xl text-[16px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-2 focus-visible:ring-primary/20 transition-all">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-black/5 dark:border-white/5 shadow-xl">
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id} className="rounded-xl">
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2.5">
                        <Label htmlFor="subcategory" className="text-[14px] font-medium text-zinc-600 dark:text-zinc-400 ml-1">Issue Type *</Label>
                        <Select
                          value={formData.subcategoryId}
                          onValueChange={(value) =>
                            setFormData({ ...formData, subcategoryId: value })
                          }
                        >
                          <SelectTrigger id="subcategory" className="h-14 px-4 bg-white/50 dark:bg-zinc-900/50 border-black/5 dark:border-white/5 rounded-2xl text-[16px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-2 focus-visible:ring-primary/20 transition-all">
                            <SelectValue placeholder="Select issue type" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-black/5 dark:border-white/5 shadow-xl">
                            {activeSubcategories.length === 0 && (
                              <SelectItem value="none" disabled className="rounded-xl">
                                No issue types available
                              </SelectItem>
                            )}
                            {activeSubcategories.map((subcategory) => (
                              <SelectItem key={subcategory.id} value={subcategory.id} className="rounded-xl">
                                <div className="flex flex-col items-start py-1">
                                  <span className="font-medium">{subcategory.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="screenshots" className="text-[14px] font-medium text-zinc-600 dark:text-zinc-400 ml-1">Screenshots (Optional)</Label>
                  <div className="space-y-3">
                    <div
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() =>
                        document.getElementById("screenshots")?.click()
                      }
                      className={`relative border border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 ${
                        isDragging
                          ? "border-primary bg-primary/5 scale-[0.99]"
                          : "border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 bg-black/5 dark:bg-white/5 hover:bg-black/[0.07] dark:hover:bg-white/[0.07]"
                      } ${
                        screenshots.length >= 5
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <Input
                        id="screenshots"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        disabled={screenshots.length >= 5}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-full bg-white dark:bg-zinc-800 p-4 shadow-sm">
                          <Upload className="h-6 w-6 text-zinc-500" strokeWidth={1.5} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                            {isDragging
                              ? "Drop images here"
                              : "Click or drag images to upload"}
                          </p>
                          <p className="text-[13px] text-zinc-500 font-light">
                            Up to 5 images (max 5MB each). JPG, PNG, GIF.
                          </p>
                        </div>
                      </div>
                    </div>

                    {screenshots.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                        {screenshots.map((file, index) => (
                          <div key={index} className="relative group rounded-2xl overflow-hidden border border-black/5 dark:border-white/5 shadow-sm bg-black/5 dark:bg-white/5 aspect-square">
                            <img
                              src={previewUrls[index]}
                              alt={`Screenshot ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeScreenshot(index);
                                }}
                                className="bg-white/20 hover:bg-red-500 text-white rounded-full p-2 transition-colors"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                              <p className="text-[11px] text-white truncate font-medium drop-shadow-md">
                                {file.name}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-6">
                  <button
                    type="submit"
                    className="flex-1 h-14 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[16px] font-medium tracking-wide shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] active:scale-[0.98] transition-all duration-200"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting Request..." : "Submit Request"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="h-14 px-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-[16px] font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-[0.98] transition-all duration-200"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div>
            <div className="p-8 rounded-[32px] bg-zinc-100/50 dark:bg-zinc-800/30 border border-transparent">
              <h3 className="text-[20px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mb-6">
                Guidelines
              </h3>
              <div className="space-y-6 text-[14px]">
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">Be Specific</h4>
                  <p className="text-zinc-500 font-light leading-relaxed">
                    Provide clear and detailed information about your issue. The more details, the faster we can help.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    Choose the Right Category
                  </h4>
                  <p className="text-zinc-500 font-light leading-relaxed">
                    Select the most appropriate issue type to ensure it reaches the right expert.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">Set Correct Priority</h4>
                  <p className="text-zinc-500 font-light leading-relaxed">
                    Reserve urgent priority for critical issues that block your core work.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-zinc-400" />
                    Visual Proof
                  </h4>
                  <p className="text-zinc-500 font-light leading-relaxed">
                    Screenshots of error messages or broken interfaces often hold the answer to the problem.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <TicketShipmentAnimation
        open={showShipmentAnimation}
        onDashboard={() => {
          setShowShipmentAnimation(false);
          router.push("/helpdesk/admin");
        }}
        onViewTickets={() => {
          setShowShipmentAnimation(false);
          router.push("/helpdesk/admin/tickets");
        }}
      />
    </AdminTicketLayout>
  );
}
