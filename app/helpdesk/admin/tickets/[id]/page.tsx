'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AdminTicketLayout } from '@/components/tickets/AdminTicketLayout';
import { ScreenshotLightbox } from '@/components/tickets/ScreenshotLightbox';
import { ChecklistPanel } from '@/components/tickets/ChecklistPanel';
import type { ChecklistItem } from '@/components/tickets/ChecklistPanel';
import { ChecklistSummary } from '@/components/tickets/ChecklistSummary';
import { EquipmentPanel, useEquipment } from '@/components/tickets/EquipmentPanel';
import { EquipmentSummary } from '@/components/tickets/EquipmentSummary';
import { ActivityTimeline } from '@/components/tickets/ActivityTimeline';
import { TicketHero } from '@/components/tickets/TicketHero';
import { Stagger, StaggerItem } from '@/components/tickets/motion';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type EmployeeOption, type EmployeeSelection } from '@/components/tickets/EmployeeSelect';
import { isLifecycleTicket } from '@/components/tickets/lifecycle';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Ticket, TicketComment, TicketStatus, TicketPriority } from '@/types';
import { Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { makeAuthenticatedRequest, setupAutoRefresh } from '@/lib/adminAuth';

export default function AdminTicketDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [itTeamMembers, setItTeamMembers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeOption[]>([]);
  const [linkSelections, setLinkSelections] = useState<Record<string, EmployeeSelection>>({});
  const [linking, setLinking] = useState(false);
  const [removingSubjectId, setRemovingSubjectId] = useState<string | null>(null);
  const [openDrawer, setOpenDrawer] = useState<'checklist' | 'equipment' | null>(null);
  const equipment = useEquipment(ticketId);

  useEffect(() => {
    fetchTicket();
    fetchItTeam();
    fetchEmployees();

    // Setup automatic token refresh for admin
    const cleanupTokenRefresh = setupAutoRefresh();

    return () => cleanupTokenRefresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const fetchItTeam = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await makeAuthenticatedRequest('/api/users/it-team');

      if (response.ok) {
        const data = await response.json();
        setItTeamMembers(data);
      }
    } catch (error) {
      console.error('Error fetching IT team:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/users');
      if (response.ok) {
        const data = await response.json();
        setAllEmployees(data.users ?? []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchTicket = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/helpdesk/admin/login');
        return;
      }

      const response = await makeAuthenticatedRequest(`/api/tickets/${ticketId}`);

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Session expired. Please log in again.');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          router.push('/helpdesk/admin/login');
          return;
        }
        throw new Error('Failed to fetch ticket');
      }

      const data = await response.json();
      setTicket(data);
      setComments(data.comments ?? []);
      setChecklist(data.checklist ?? []);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast.error('Failed to load ticket');
      router.push('/helpdesk/admin/tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket) return;
    const previous = ticket;

    // Optimistic update
    setTicket({ ...ticket, status: newStatus });

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/helpdesk/admin/login');
        return;
      }

      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/helpdesk/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to update ticket status');
      }

      const updatedTicket = await response.json();
      setTicket(updatedTicket);
      toast.success('Ticket status updated');

      // Send email notification via API
      try {
        await fetch(`/api/tickets/${ticketId}/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            type: 'status_update',
            newStatus,
          }),
        });
      } catch (error) {
        console.error('Failed to send status update email:', error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setTicket(previous);
      toast.error('Failed to update status');
    }
  };

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    if (!ticket) return;
    const previous = ticket;

    // Optimistic update
    setTicket({ ...ticket, priority: newPriority });

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/helpdesk/admin/login');
        return;
      }

      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          priority: newPriority,
        }),
      });

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/helpdesk/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to update ticket priority');
      }

      const updatedTicket = await response.json();
      setTicket(updatedTicket);
      toast.success('Ticket priority updated');
    } catch (error) {
      console.error('Error updating priority:', error);
      setTicket(previous);
      toast.error('Failed to update priority');
    }
  };

  const handleAssigneeChange = async (assigneeId: string | null) => {
    if (!ticket) return;
    const previous = ticket;

    // Optimistic update
    setTicket({
      ...ticket,
      assignedTo: assigneeId,
    });

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/helpdesk/admin/login');
        return;
      }

      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ assignedTo: assigneeId }),
      });

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/helpdesk/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to update assignment');
      }

      const updatedTicket = await response.json();
      setTicket(updatedTicket);
      toast.success(assigneeId ? 'Assignment updated' : 'Ticket unassigned');

      // Send email notification via API
      try {
        await fetch(`/api/tickets/${ticketId}/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({ type: 'assignment', assignedToId: assigneeId }),
        });
      } catch (error) {
        console.error('Failed to send assignment email:', error);
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      setTicket(previous);
      toast.error('Failed to assign ticket');
    }
  };

  const handleLinkEmployee = async (subjectId: string, selection: EmployeeSelection) => {
    if (!ticket) return;
    if (!selection.employeeId || selection.isNewJoiner) return;

    setLinking(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/helpdesk/admin/login');
        return;
      }

      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ subjectId, employeeId: selection.employeeId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to link employee');
      }

      const updatedTicket = await response.json();
      setTicket(updatedTicket);
      setLinkSelections((prev) => {
        const next = { ...prev };
        delete next[subjectId];
        return next;
      });
      toast.success('Linked to employee — equipment history will merge onto their account');
      equipment.reload();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to link employee');
    } finally {
      setLinking(false);
    }
  };

  const handleRemoveSubject = async (subjectId: string) => {
    if (!ticket) return;
    const name = ticket.subjects?.find((s) => s.id === subjectId)?.name ?? 'this joiner';
    if (!window.confirm(`Remove "${name}" from this ticket? Their checklist and equipment records for this ${ticket.type === 'ONBOARDING' ? 'onboarding' : 'offboarding'} will be deleted.`)) return;

    setRemovingSubjectId(subjectId);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/helpdesk/admin/login');
        return;
      }

      const response = await fetch(`/api/tickets/${ticketId}/subjects/${subjectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to remove joiner');
      }

      setTicket((prev) =>
        prev ? { ...prev, subjects: (prev.subjects ?? []).filter((s) => s.id !== subjectId) } : prev
      );
      setLinkSelections((prev) => {
        const next = { ...prev };
        delete next[subjectId];
        return next;
      });
      equipment.reload();
      toast.success('Joiner removed from the ticket');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to remove joiner');
    } finally {
      setRemovingSubjectId(null);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/helpdesk/admin/login');
        return;
      }

      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          content: newComment,
          isInternal: isInternalNote,
        }),
      });

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/helpdesk/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const comment = await response.json();
      setComments([...comments, comment]);
      const commentText = newComment;
      setNewComment('');
      setIsInternalNote(false);
      toast.success(comment.isInternal ? 'Internal note added' : 'Comment added');

      // Send email notification via API
      try {
        await fetch(`/api/tickets/${ticketId}/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            type: 'comment',
            comment: commentText,
          }),
        });
      } catch (error) {
        console.error('Failed to send comment email:', error);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !ticket) {
    return (
      <AdminTicketLayout>
        <div
          className="mx-auto max-w-3xl px-4 sm:px-6 py-10 font-sans space-y-4"
          aria-busy="true"
          aria-label="Loading ticket"
        >
          {/* Header skeleton */}
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
            <Skeleton className="h-11 w-full max-w-lg rounded-full" />
            <Skeleton className="h-4 w-64 rounded-full" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-4 w-20 rounded-full" />
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-4 w-28 rounded-full" />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-16 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
          </div>

          <div className="mt-12 space-y-12">
            {/* About skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-full rounded-full" />
              <Skeleton className="h-4 w-full rounded-full" />
              <Skeleton className="h-4 w-3/4 rounded-full" />
              <Skeleton className="mt-6 h-4 w-56 rounded-full" />
            </div>

            {/* Summary cards skeleton */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-4 rounded-[28px] border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-zinc-900/40 p-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-5 w-32 rounded-full" />
                <Skeleton className="h-3 w-20 rounded-full" />
              </div>
              <div className="space-y-4 rounded-[28px] border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-zinc-900/40 p-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-5 w-32 rounded-full" />
                <Skeleton className="h-3 w-20 rounded-full" />
              </div>
            </div>

            {/* Activity skeleton */}
            <div className="rounded-[28px] border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-zinc-900/40 p-7 sm:p-10 space-y-5">
              <Skeleton className="h-6 w-28 rounded-full" />
              <div className="flex gap-4">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-4 w-40 rounded-full" />
                  <Skeleton className="h-3 w-24 rounded-full" />
                </div>
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-4 w-40 rounded-full" />
                  <Skeleton className="h-3 w-24 rounded-full" />
                </div>
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-4 w-40 rounded-full" />
                  <Skeleton className="h-3 w-24 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-24 w-full rounded-3xl" />
            </div>
          </div>
        </div>
      </AdminTicketLayout>
    );
  }

  return (
    <AdminTicketLayout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 font-sans">
        {/* Hero */}
        <TicketHero
          ticket={ticket}
          onBack={() => router.back()}
          itTeamMembers={itTeamMembers}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
          onAssigneeChange={handleAssigneeChange}
          allEmployees={allEmployees}
          linkSelections={linkSelections}
          onLinkSelectionChange={(subjectId, selection) =>
            setLinkSelections((prev) => ({ ...prev, [subjectId]: selection }))
          }
          linking={linking}
          onLinkEmployee={handleLinkEmployee}
          removingSubjectId={removingSubjectId}
          onRemoveSubject={handleRemoveSubject}
        />

        <Stagger className="mt-12 space-y-12">
          {/* Quick panels — compact summaries that open drawers */}
          <StaggerItem>
            <div className={`grid gap-6 ${isLifecycleTicket(ticket.type) ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
              {isLifecycleTicket(ticket.type) && (
                <ChecklistSummary items={checklist} onOpen={() => setOpenDrawer('checklist')} />
              )}
              <EquipmentSummary data={equipment} onOpen={() => setOpenDrawer('equipment')} />
            </div>
          </StaggerItem>

          {/* Attachments + activity collapsed behind tabs so the page doesn't stretch */}
          <StaggerItem>
            <Tabs defaultValue="activity" className="w-full">
              <TabsList className="h-11 w-fit rounded-full px-1.5">
                <TabsTrigger value="activity" className="rounded-full text-[13px]">
                  Activity
                  {comments.length > 0 && (
                    <span className="ml-1 text-[11px] text-zinc-400 font-light">{comments.length}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="attachments" className="rounded-full text-[13px]">
                  Attachments
                  <span className="ml-1 text-[11px] text-zinc-400 font-light">
                    {ticket.screenshots?.length ?? 0}
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="mt-4">
                <ActivityTimeline
                  ticket={ticket}
                  comments={comments}
                  newComment={newComment}
                  isInternalNote={isInternalNote}
                  submitting={submitting}
                  onCommentChange={setNewComment}
                  onInternalNoteChange={setIsInternalNote}
                  onSubmit={handleSubmitComment}
                />
              </TabsContent>

              <TabsContent value="attachments" className="mt-4">
                {ticket.screenshots && ticket.screenshots.length > 0 ? (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <ImageIcon className="h-4 w-4 text-zinc-400" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                        Attachments
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {ticket.screenshots.map((screenshot: any, si: number) => (
                        <div
                          key={screenshot.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Open screenshot ${screenshot.filename}`}
                          className="group cursor-pointer space-y-2 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                          onClick={() => setLightboxIndex(si)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightboxIndex(si); } }}
                        >
                          <div className="relative aspect-video rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-black/5 dark:bg-white/5 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={screenshot.url}
                              alt={screenshot.filename}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                          </div>
                          <p className="text-[12px] text-zinc-500 truncate px-1">
                            {screenshot.filename}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-black/10 dark:border-white/10 p-10 text-center">
                    <ImageIcon className="h-5 w-5 mx-auto text-zinc-300 dark:text-zinc-600" />
                    <p className="mt-2 text-[13px] text-zinc-400 dark:text-zinc-500">No attachments yet</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </StaggerItem>
        </Stagger>
      </div>

      {/* Checklist drawer */}
      <Drawer open={openDrawer === 'checklist'} onOpenChange={(open) => { if (!open) setOpenDrawer(null); }} swipeDirection="right">
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Checklist</DrawerTitle>
            <DrawerDescription>
              {checklist.filter((i) => i.done).length} of {checklist.length} complete · view, tick or add tasks
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="min-h-0 flex-1">
            <div className="px-5 pb-6">
              <ChecklistPanel
                embedded
                ticketId={ticketId}
                items={checklist}
                onItemsChange={setChecklist}
                subjects={ticket.subjects}
                disabled={ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'}
              />
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* Equipment ledger drawer */}
      <Drawer open={openDrawer === 'equipment'} onOpenChange={(open) => { if (!open) setOpenDrawer(null); }} swipeDirection="right">
        <DrawerContent className="data-[swipe-axis=x]:sm:w-[24rem]">
          <DrawerHeader>
            <DrawerTitle>Equipment Ledger</DrawerTitle>
            <DrawerDescription>
              {equipment.loading
                ? 'Loading history…'
                : `Every change for ${equipment.subject?.subjectName ?? equipment.subject?.subjectEmail ?? 'this employee'} · ${equipment.changes.length} event${equipment.changes.length !== 1 ? 's' : ''}`}
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="min-h-0 flex-1">
            <div className="px-5 pb-6">
              <EquipmentPanel embedded ticketId={ticketId} data={equipment} onRefresh={equipment.reload} />
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {ticket.screenshots && ticket.screenshots.length > 0 && (
        <ScreenshotLightbox
          screenshots={ticket.screenshots}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </AdminTicketLayout>
  );
}