'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Briefcase, Plus, Edit, Trash2 } from 'lucide-react';

interface Designation {
  id: string;
  title: string;
  code: string | null;
  level: number | null;
  _count?: {
    employmentInfo: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function DesignationsPage() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    code: '',
    level: '',
  });

  useEffect(() => {
    fetchDesignations();
  }, []);

  const fetchDesignations = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/hr/designations', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch designations');
      }

      const data = await response.json();
      setDesignations(data.designations || []);
    } catch (error) {
      console.error('Error fetching designations:', error);
      toast.error('Failed to fetch designations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const accessToken = localStorage.getItem('accessToken');
      const url = editingDesignation
        ? `/api/hr/designations/${editingDesignation.id}`
        : '/api/hr/designations';
      
      const method = editingDesignation ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingDesignation ? 'update' : 'create'} designation`);
      }

      toast.success(`Designation ${editingDesignation ? 'updated' : 'created'} successfully`);
      setIsDialogOpen(false);
      resetForm();
      fetchDesignations();
    } catch (error) {
      console.error('Error saving designation:', error);
      toast.error(`Failed to ${editingDesignation ? 'update' : 'create'} designation`);
    }
  };

  const handleEdit = (designation: Designation) => {
    setEditingDesignation(designation);
    setFormData({
      title: designation.title,
      code: designation.code || '',
      level: designation.level ? designation.level.toString() : '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this designation?')) {
      return;
    }

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`/api/hr/designations/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete designation');
      }

      toast.success('Designation deleted successfully');
      fetchDesignations();
    } catch (error) {
      console.error('Error deleting designation:', error);
      toast.error('Failed to delete designation');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      code: '',
      level: '',
    });
    setEditingDesignation(null);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const filteredDesignations = designations.filter((desig) =>
    desig.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    desig.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Designation Management
            </CardTitle>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Designation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="Search designations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDesignations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No designations found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDesignations.map((designation) => (
                  <TableRow key={designation.id}>
                    <TableCell className="font-medium">{designation.title}</TableCell>
                    <TableCell>
                      {designation.code ? (
                        <Badge variant="outline">{designation.code}</Badge>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {designation.level !== null ? (
                        <Badge variant="secondary">Level {designation.level}</Badge>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {designation._count?.employmentInfo || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(designation)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(designation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDesignation ? 'Edit Designation' : 'Add New Designation'}
            </DialogTitle>
            <DialogDescription>
              {editingDesignation
                ? 'Update designation information'
                : 'Create a new designation'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Designation Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g., Software Engineer, HR Manager"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Designation Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., SE, SEN, LEAD"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Level (Hierarchy)</Label>
                <Input
                  id="level"
                  type="number"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  placeholder="e.g., 1 (Junior), 2 (Mid), 3 (Senior)"
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                Cancel
              </Button>
              <Button type="submit">
                {editingDesignation ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
