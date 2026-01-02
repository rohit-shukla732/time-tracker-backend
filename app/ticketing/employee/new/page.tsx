'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TicketsLayout } from '@/components/tickets/TicketsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TicketPriority, TicketCategory, ITSupportSubcategory } from '@/types';
import { toast } from 'sonner';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

export default function NewTicketPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.IT_SUPPORT,
    subcategory: ITSupportSubcategory.OTHER,
  });
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
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
      toast.error('Maximum 5 screenshots allowed');
      return;
    }

    // Create preview URLs
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    
    setScreenshots(prev => [...prev, ...validFiles]);
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const removeScreenshot = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setScreenshots(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get user info from localStorage
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;

      if (!user) {
        toast.error('Please log in to create a ticket');
        return;
      }

      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/ticketing/employee/login');
        return;
      }

      // Create ticket via API
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          category: formData.category,
          subcategory: formData.subcategory,
        }),
      });

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/ticketing/employee/login');
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        setIsSubmitting(false);
        throw new Error(error.error || 'Failed to create ticket');
      }

      const ticket = await response.json();

      // Upload screenshots if any
      if (screenshots.length > 0) {
        try {
          const formDataToSend = new FormData();
          screenshots.forEach((file) => {
            formDataToSend.append('screenshots', file);
          });
          
          const uploadResponse = await fetch(`/api/tickets/${ticket.id}/screenshots`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            credentials: 'include',
            body: formDataToSend,
          });

          if (!uploadResponse.ok) {
            console.error('Failed to upload screenshots');
            toast.error('Ticket created but screenshots failed to upload');
          }
        } catch (uploadError) {
          console.error('Error uploading screenshots:', uploadError);
          toast.error('Ticket created but screenshots failed to upload');
        }
      }

      // Send email notifications via API
      try {
        await fetch('/api/tickets/send-new-ticket-emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            ticketId: ticket.id,
          }),
        });
      } catch (emailError) {
        console.error('Failed to send email notifications:', emailError);
      }

      toast.success('Ticket created successfully! Check your email for confirmation.');
      
      // Clean up preview URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      
      router.push('/ticketing/employee/my-tickets');
    } catch (error) {
      console.error('Error creating ticket:', error);
      setIsSubmitting(false);
      toast.error('Failed to create ticket. Please try again.');
    }
  };

  return (
    <TicketsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create IT Support Ticket</h1>
          <p className="text-muted-foreground">Submit a technical issue or IT request</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Ticket Details</CardTitle>
                <CardDescription>Provide detailed information about your issue</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      placeholder="Brief description of the issue"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      maxLength={100}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.title.length}/100 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Provide detailed information about your issue..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={6}
                      maxLength={1000}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.description.length}/1000 characters
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority *</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) =>
                          setFormData({ ...formData, priority: value as TicketPriority })
                        }
                      >
                        <SelectTrigger id="priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={TicketPriority.LOW}>Low</SelectItem>
                          <SelectItem value={TicketPriority.MEDIUM}>Medium</SelectItem>
                          <SelectItem value={TicketPriority.HIGH}>High</SelectItem>
                          <SelectItem value={TicketPriority.URGENT}>Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subcategory">Issue Type *</Label>
                    <Select
                      value={formData.subcategory}
                      onValueChange={(value) =>
                        setFormData({ ...formData, subcategory: value as ITSupportSubcategory })
                      }
                      
                    >
                      <SelectTrigger id="subcategory">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ITSupportSubcategory.HARDWARE}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Hardware</span>
                            <span className="text-xs text-muted-foreground">Computer, laptop, monitor, keyboard, mouse</span>
                          </div>
                        </SelectItem>
                        <SelectItem value={ITSupportSubcategory.SOFTWARE}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Software</span>
                            <span className="text-xs text-muted-foreground">Application issues, installation, licensing</span>
                          </div>
                        </SelectItem>
                        <SelectItem value={ITSupportSubcategory.NETWORK}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Network</span>
                            <span className="text-xs text-muted-foreground">Internet, WiFi, VPN, connectivity</span>
                          </div>
                        </SelectItem>
                        <SelectItem value={ITSupportSubcategory.EMAIL}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Email</span>
                            <span className="text-xs text-muted-foreground">Email issues, Outlook</span>
                          </div>
                        </SelectItem>
                        <SelectItem value={ITSupportSubcategory.ACCESS}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Access & Permissions</span>
                            <span className="text-xs text-muted-foreground">Login issues, password reset, access rights</span>
                          </div>
                        </SelectItem>
                        <SelectItem value={ITSupportSubcategory.PRINTER}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Printer</span>
                            <span className="text-xs text-muted-foreground">Printing issues</span>
                          </div>
                        </SelectItem>
                        <SelectItem value={ITSupportSubcategory.PHONE}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Phone & Communication</span>
                            <span className="text-xs text-muted-foreground">Desk phone, mobile, Teams</span>
                          </div>
                        </SelectItem>
                        <SelectItem value={ITSupportSubcategory.OTHER}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Other</span>
                            <span className="text-xs text-muted-foreground">Other IT-related issues</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="screenshots">Screenshots (Optional)</Label>
                    <div className="space-y-3">
                      <div
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('screenshots')?.click()}
                        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                          isDragging 
                            ? 'border-primary bg-primary/5' 
                            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                        } ${
                          screenshots.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
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
                        <div className="flex flex-col items-center gap-2">
                          <div className="rounded-full bg-muted p-3">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">
                              {isDragging ? 'Drop images here' : 'Drag and drop images here'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              or <span className="text-primary hover:underline">browse</span> to upload
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Upload up to 5 images (max 5MB each). Supported formats: JPG, PNG, GIF
                      </p>
                      
                      {screenshots.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                          {screenshots.map((file, index) => (
                            <div key={index} className="relative group">
                              <div className="aspect-video rounded-lg border bg-muted overflow-hidden">
                                <img
                                  src={previewUrls[index]}
                                  alt={`Screenshot ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeScreenshot(index)}
                                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {file.name}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-1">Be Specific</h4>
                  <p className="text-muted-foreground">
                    Provide clear and detailed information about your issue.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Choose the Right Category</h4>
                  <p className="text-muted-foreground">
                    Select the most appropriate category to ensure faster resolution.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Set Correct Priority</h4>
                  <p className="text-muted-foreground">
                    Use urgent only for critical issues that need immediate attention.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Include Steps to Reproduce</h4>
                  <p className="text-muted-foreground">
                    If applicable, list the steps that lead to the issue.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1 flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" />
                    Add Screenshots
                  </h4>
                  <p className="text-muted-foreground">
                    Screenshots help us understand and resolve your issue faster.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TicketsLayout>
  );
}
