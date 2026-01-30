'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Users,
  IdCard,
  Building,
  CreditCard,
  User,
  Shield,
  Clock,
  Home,
  Heart,
  FileText,
  Edit,
} from 'lucide-react';

interface Employee {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  personalInfo: {
    firstName: string;
    middleName: string | null;
    lastName: string;
    dateOfBirth: string | null;
    gender: string | null;
    pronoun: string | null;
  } | null;
  familyInfo: {
    maritalStatus: string | null;
  } | null;
  contactInfo: {
    email: string;
    alternateEmail: string | null;
    phoneNumber: string | null;
    alternatePhoneNumber: string | null;
  } | null;
  addressInfo: {
    residentialAddress: string | null;
    permanentAddress: string | null;
  } | null;
  governmentID: {
    panCardNumber: string | null;
    aadharCardNumber: string | null;
  } | null;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    beneficiaryName: string;
  } | null;
  employmentInfo: {
    id: string;
    userId: string;
    jobType: string | null;
    status: string;
    joiningDate: string | null;
    probationEndDate: string | null;
    createdAt: string;
    updatedAt: string;
    department: {
      id: string;
      name: string;
      code: string | null;
      manager: {
        id: string;
        name: string | null;
        email: string;
      } | null;
    } | null;
    designation: {
      id: string;
      title: string;
    } | null;
  } | null;
}

export default function EmployeeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployeeDetails();
  }, [params.id]);

  const fetchEmployeeDetails = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`/api/hr/employees/${params.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          window.location.href = '/hr/login';
          return;
        }
        throw new Error('Failed to fetch employee');
      }

      const data = await response.json();

      if (data.success) {
        setEmployee(data.employee);
      }
    } catch (error) {
      console.error('Failed to fetch employee details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Employee not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const personalInfo = employee.personalInfo;
  const employmentInfo = employee.employmentInfo;
  const contactInfo = employee.contactInfo;
  const addressInfo = employee.addressInfo;
  const governmentID = employee.governmentID;
  const bankDetails = employee.bankDetails;
  
  const fullName = personalInfo
    ? `${personalInfo.firstName || ''} ${personalInfo.middleName || ''} ${personalInfo.lastName || ''}`.trim()
    : employee.name || employee.email;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-500';
      case 'HR': return 'bg-blue-500';
      case 'MANAGER': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Employee Details</h1>
            <p className="text-muted-foreground">Complete profile information</p>
          </div>
        </div>
        <Button onClick={() => router.push(`/hr/employees/${employee.id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Employee
        </Button>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl">
                {getInitials(fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{fullName}</CardTitle>
                <Badge className={getRoleBadgeColor(employee.role)}>
                  {employee.role}
                </Badge>
              </div>
              <CardDescription className="text-base mt-2">
                {employmentInfo?.designation?.title || 'No designation'} • {employmentInfo?.department?.name || 'No department'}
              </CardDescription>
              <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {employee.email}
                </div>
                {contactInfo?.phoneNumber && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {contactInfo.phoneNumber}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">User ID</p>
              <p className="text-base">{employee.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
              <p className="text-base">{formatDate(personalInfo?.dateOfBirth || null)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Gender</p>
              <p className="text-base">{personalInfo?.gender || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Marital Status</p>
              <p className="text-base">{employee.familyInfo?.maritalStatus || 'N/A'}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Alternate Email</p>
              <p className="text-base">{contactInfo?.alternateEmail || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
              <p className="text-base">{contactInfo?.phoneNumber || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Home className="h-4 w-4" />
                Residential Address
              </p>
              <p className="text-base mt-1">{addressInfo?.residentialAddress || 'N/A'}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Home className="h-4 w-4" />
                Permanent Address
              </p>
              <p className="text-base mt-1">{addressInfo?.permanentAddress || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Employment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Designation</p>
              <p className="text-base">{employmentInfo?.designation?.title || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building className="h-4 w-4" />
                Department
              </p>
              <p className="text-base">{employmentInfo?.department?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Joining Date
              </p>
              <p className="text-base">{formatDate(employmentInfo?.joiningDate || null)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Job Type</p>
              <p className="text-base">
                <Badge variant="outline">{employmentInfo?.jobType || 'N/A'}</Badge>
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Employment Status</p>
              <p className="text-base">
                <Badge variant="outline">{employmentInfo?.status || 'N/A'}</Badge>
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Reporting Manager
              </p>
              <p className="text-base">
                {employmentInfo?.department?.manager?.name || employmentInfo?.department?.manager?.email || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Probation End Date
              </p>
              <p className="text-base">{formatDate(employmentInfo?.probationEndDate || null)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Account Created</p>
              <p className="text-base">{formatDate(employee.createdAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Government IDs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IdCard className="h-5 w-5" />
            Government IDs
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Aadhar Number</p>
            <p className="text-base font-mono">{governmentID?.aadharCardNumber || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">PAN Number</p>
            <p className="text-base font-mono">{governmentID?.panCardNumber || 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Bank & Statutory Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Bank & Statutory Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Bank Name</p>
              <p className="text-base">{bankDetails?.bankName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Account Number</p>
              <p className="text-base font-mono">{bankDetails?.accountNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">IFSC Code</p>
              <p className="text-base font-mono">{bankDetails?.ifscCode || 'N/A'}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Beneficiary Name</p>
              <p className="text-base">{bankDetails?.beneficiaryName || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={() => router.push(`/hr/employees/${params.id}/edit`)}>
          Edit Employee
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Back to List
        </Button>
      </div>
    </div>
  );
}
