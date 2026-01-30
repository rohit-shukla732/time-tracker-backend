'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Save,
  User,
  MapPin,
  Phone,
  Briefcase,
  IdCard,
  CreditCard,
  Building,
  Calendar,
  Users,
  Home,
  Heart,
} from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
  id: string;
  name: string | null;
  email: string;
  role: string;
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
    jobType: string | null;
    status: string;
    joiningDate: string | null;
    probationEndDate: string | null;
    departmentId: string | null;
    designationId: string | null;
  } | null;
}

interface Department {
  id: string;
  name: string;
}

interface Designation {
  id: string;
  title: string;
}

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  
  const [formData, setFormData] = useState({
    // Personal Info
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    pronoun: '',
    
    // Contact Info
    alternateEmail: '',
    phoneNumber: '',
    alternatePhoneNumber: '',
    
    // Address Info
    residentialAddress: '',
    permanentAddress: '',
    
    // Government ID
    panCardNumber: '',
    aadharCardNumber: '',
    
    // Bank Details
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    beneficiaryName: '',
    
    // Employment Info
    jobType: '',
    status: '',
    joiningDate: '',
    probationEndDate: '',
    departmentId: '',
    designationId: '',
  });

  const fetchEmployeeDetails = async () => {
    console.log('fetchEmployeeDetails called for ID:', params.id);
    
    try {
      const accessToken = localStorage.getItem('accessToken');
      console.log('Access token:', accessToken ? 'exists' : 'missing');
      
      const response = await fetch(`/api/hr/employees/${params.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.log('Unauthorized, redirecting to login');
          window.location.href = '/hr/login';
          return;
        }
        throw new Error('Failed to fetch employee');
      }

      const data = await response.json();
      
      console.log('Employee data received:', data);
      console.log('Data structure check - success:', data.success, 'employee:', !!data.employee);

      if (data.success && data.employee) {
        const emp = data.employee;
        console.log('Employee object:', emp);
        console.log('Personal Info:', emp.personalInfo);
        console.log('Employment Info:', emp.employmentInfo);
        
        // If personalInfo is null but employee has a name, try to split it
        let firstName = '';
        let middleName = '';
        let lastName = '';
        
        if (emp.personalInfo) {
          firstName = emp.personalInfo.firstName || '';
          middleName = emp.personalInfo.middleName || '';
          lastName = emp.personalInfo.lastName || '';
        } else if (emp.name) {
          // Split the name if personalInfo doesn't exist
          const nameParts = emp.name.trim().split(' ');
          if (nameParts.length === 1) {
            firstName = nameParts[0];
          } else if (nameParts.length === 2) {
            firstName = nameParts[0];
            lastName = nameParts[1];
          } else if (nameParts.length >= 3) {
            firstName = nameParts[0];
            middleName = nameParts.slice(1, -1).join(' ');
            lastName = nameParts[nameParts.length - 1];
          }
        }
        
        const newFormData = {
          firstName,
          middleName,
          lastName,
          dateOfBirth: emp.personalInfo?.dateOfBirth || '',
          gender: emp.personalInfo?.gender || '',
          maritalStatus: emp.familyInfo?.maritalStatus || '',
          pronoun: emp.personalInfo?.pronoun || '',
          
          alternateEmail: emp.contactInfo?.alternateEmail || '',
          phoneNumber: emp.contactInfo?.phoneNumber || '',
          alternatePhoneNumber: emp.contactInfo?.alternatePhoneNumber || '',
          
          residentialAddress: emp.addressInfo?.residentialAddress || '',
          permanentAddress: emp.addressInfo?.permanentAddress || '',
          
          panCardNumber: emp.governmentID?.panCardNumber || '',
          aadharCardNumber: emp.governmentID?.aadharCardNumber || '',
          
          bankName: emp.bankDetails?.bankName || '',
          accountNumber: emp.bankDetails?.accountNumber || '',
          ifscCode: emp.bankDetails?.ifscCode || '',
          beneficiaryName: emp.bankDetails?.beneficiaryName || '',
          
          jobType: emp.employmentInfo?.jobType || '',
          status: emp.employmentInfo?.status || 'ACTIVE',
          joiningDate: emp.employmentInfo?.joiningDate?.split('T')[0] || '',
          probationEndDate: emp.employmentInfo?.probationEndDate?.split('T')[0] || '',
          departmentId: emp.employmentInfo?.departmentId || '',
          designationId: emp.employmentInfo?.designationId || '',
        };
        
        console.log('New form data being set:', newFormData);
        console.log('First name value:', newFormData.firstName);
        setFormData(newFormData);
        console.log('setFormData called successfully');
      } else {
        console.error('Invalid response structure:', data);
      }
    } catch (error) {
      console.error('Failed to fetch employee details:', error);
      toast.error('Failed to load employee details');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/teams', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.teams || []);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchDesignations = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/hr/designations', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDesignations(data.designations || []);
      }
    } catch (error) {
      console.error('Failed to fetch designations:', error);
    }
  };

  useEffect(() => {
    fetchEmployeeDetails();
    fetchDepartments();
    fetchDesignations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`/api/hr/employees/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update employee');
      }

      toast.success('Employee updated successfully');
      router.push(`/hr/employees/${params.id}`);
    } catch (error) {
      console.error('Failed to update employee:', error);
      toast.error('Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Employee</h1>
            <p className="text-muted-foreground">Update employee information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="middleName">Middle Name</Label>
            <Input
              id="middleName"
              value={formData.middleName}
              onChange={(e) => handleChange('middleName', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleChange('dateOfBirth', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
                <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maritalStatus">Marital Status</Label>
            <Select value={formData.maritalStatus} onValueChange={(value) => handleChange('maritalStatus', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SINGLE">Single</SelectItem>
                <SelectItem value="MARRIED">Married</SelectItem>
                <SelectItem value="DIVORCED">Divorced</SelectItem>
                <SelectItem value="WIDOWED">Widowed</SelectItem>
                <SelectItem value="SEPARATED">Separated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => handleChange('phoneNumber', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alternatePhoneNumber">Alternate Phone</Label>
            <Input
              id="alternatePhoneNumber"
              type="tel"
              value={formData.alternatePhoneNumber}
              onChange={(e) => handleChange('alternatePhoneNumber', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alternateEmail">Alternate Email</Label>
            <Input
              id="alternateEmail"
              type="email"
              value={formData.alternateEmail}
              onChange={(e) => handleChange('alternateEmail', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Address Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="space-y-2">
            <Label htmlFor="residentialAddress" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Residential Address
            </Label>
            <Textarea
              id="residentialAddress"
              value={formData.residentialAddress}
              onChange={(e) => handleChange('residentialAddress', e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="permanentAddress" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Permanent Address
            </Label>
            <Textarea
              id="permanentAddress"
              value={formData.permanentAddress}
              onChange={(e) => handleChange('permanentAddress', e.target.value)}
              rows={3}
            />
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
          <div className="space-y-2">
            <Label htmlFor="departmentId" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Department
            </Label>
            <Select value={formData.departmentId} onValueChange={(value) => handleChange('departmentId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="designationId">Designation</Label>
            <Select value={formData.designationId} onValueChange={(value) => handleChange('designationId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select designation" />
              </SelectTrigger>
              <SelectContent>
                {designations.map((desig) => (
                  <SelectItem key={desig.id} value={desig.id}>
                    {desig.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="joiningDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Joining Date
            </Label>
            <Input
              id="joiningDate"
              type="date"
              value={formData.joiningDate}
              onChange={(e) => handleChange('joiningDate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="probationEndDate">Probation End Date</Label>
            <Input
              id="probationEndDate"
              type="date"
              value={formData.probationEndDate}
              onChange={(e) => handleChange('probationEndDate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobType">Job Type</Label>
            <Select value={formData.jobType} onValueChange={(value) => handleChange('jobType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select job type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FULL_TIME">Full Time</SelectItem>
                <SelectItem value="PART_TIME">Part Time</SelectItem>
                <SelectItem value="CONTRACTUAL">Contractual</SelectItem>
                <SelectItem value="INTERN">Intern</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Employment Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PROBATION">Probation</SelectItem>
                <SelectItem value="NOTICE_PERIOD">Notice Period</SelectItem>
                <SelectItem value="RESIGNED">Resigned</SelectItem>
                <SelectItem value="TERMINATED">Terminated</SelectItem>
                <SelectItem value="RETIRED">Retired</SelectItem>
                <SelectItem value="ABSCONDED">Absconded</SelectItem>
              </SelectContent>
            </Select>
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
          <div className="space-y-2">
            <Label htmlFor="aadharCardNumber">Aadhar Number</Label>
            <Input
              id="aadharCardNumber"
              value={formData.aadharCardNumber}
              onChange={(e) => handleChange('aadharCardNumber', e.target.value)}
              maxLength={12}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="panCardNumber">PAN Number</Label>
            <Input
              id="panCardNumber"
              value={formData.panCardNumber}
              onChange={(e) => handleChange('panCardNumber', e.target.value)}
              maxLength={10}
              style={{ textTransform: 'uppercase' }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Bank Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              value={formData.bankName}
              onChange={(e) => handleChange('bankName', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              value={formData.accountNumber}
              onChange={(e) => handleChange('accountNumber', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ifscCode">IFSC Code</Label>
            <Input
              id="ifscCode"
              value={formData.ifscCode}
              onChange={(e) => handleChange('ifscCode', e.target.value)}
              style={{ textTransform: 'uppercase' }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beneficiaryName">Beneficiary Name</Label>
            <Input
              id="beneficiaryName"
              value={formData.beneficiaryName}
              onChange={(e) => handleChange('beneficiaryName', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
