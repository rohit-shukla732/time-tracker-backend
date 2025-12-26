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
import { TicketPriority, TicketCategory } from '@/types';
import { toast } from 'sonner';

export default function NewTicketPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.OTHER,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // TODO: API call to create ticket
    toast.success('Ticket created successfully!');
    router.push('/ticketing/employee/my-tickets');
  };

  return (
    <TicketsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Ticket</h1>
          <p className="text-muted-foreground">Submit a new support ticket</p>
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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          setFormData({ ...formData, category: value as TicketCategory })
                        }
                      >
                        <SelectTrigger id="category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={TicketCategory.TECHNICAL}>Technical</SelectItem>
                          <SelectItem value={TicketCategory.HR}>HR</SelectItem>
                          <SelectItem value={TicketCategory.FACILITIES}>Facilities</SelectItem>
                          <SelectItem value={TicketCategory.IT_SUPPORT}>IT Support</SelectItem>
                          <SelectItem value={TicketCategory.PAYROLL}>Payroll</SelectItem>
                          <SelectItem value={TicketCategory.LEAVE}>Leave</SelectItem>
                          <SelectItem value={TicketCategory.OTHER}>Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

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
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1">
                      Submit Ticket
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TicketsLayout>
  );
}
