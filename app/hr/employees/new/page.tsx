"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Save, User, Briefcase, MapPin, Users as UsersIcon, CreditCard, FileText } from "lucide-react";

interface Department {
  id: string;
  name: string;
}

interface Designation {
  id: string;
  title: string;
}

interface Company {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Form data organized by tabs
  const [basicInfo, setBasicInfo] = useState({
    id: "",
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
  });

  const [personalInfo, setPersonalInfo] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    bloodGroup: "",
    maritalStatus: "",
    nationality: "",
  });

  const [contactInfo, setContactInfo] = useState({
    primaryPhone: "",
    secondaryPhone: "",
    personalEmail: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
  });

  const [addressInfo, setAddressInfo] = useState({
    currentAddress: "",
    currentCity: "",
    currentState: "",
    currentCountry: "",
    currentZipCode: "",
    permanentAddress: "",
    permanentCity: "",
    permanentState: "",
    permanentCountry: "",
    permanentZipCode: "",
  });

  const [governmentID, setGovernmentID] = useState({
    pan: "",
    aadhaar: "",
    passport: "",
    drivingLicense: "",
    voterID: "",
  });

  const [employmentInfo, setEmploymentInfo] = useState({
    companyId: "",
    branchId: "",
    departmentId: "",
    designationId: "",
    jobType: "FULL_TIME",
    status: "ACTIVE",
    joiningDate: "",
    confirmationDate: "",
    probationEndDate: "",
  });

  const [bankDetails, setBankDetails] = useState({
    accountHolderName: "",
    accountNumber: "",
    bankName: "",
    ifscCode: "",
    branchName: "",
    accountType: "SAVINGS",
  });

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      
      // Fetch departments
      const deptRes = await fetch("/api/teams", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (deptRes.ok) {
        const data = await deptRes.json();
        setDepartments(data.teams || []);
      }

      // Note: You'll need to create these API endpoints for designations, companies, and branches
      // For now, using mock data
      setDesignations([
        { id: "1", title: "Software Engineer" },
        { id: "2", title: "Senior Software Engineer" },
        { id: "3", title: "Team Lead" },
        { id: "4", title: "Manager" },
      ]);

      setCompanies([{ id: "1", name: "ACE Healthcare Services" }]);
      setBranches([{ id: "1", name: "Ahmedabad HQ" }]);
    } catch (error) {
      console.error("Failed to fetch master data:", error);
      toast.error("Failed to load form data");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("accessToken");

      // Create the user with all information
      const payload = {
        // Basic user info
        id: basicInfo.id,
        name: basicInfo.name,
        email: basicInfo.email,
        password: basicInfo.password,
        role: basicInfo.role,

        // Personal info
        personalInfo: {
          firstName: personalInfo.firstName,
          middleName: personalInfo.middleName || null,
          lastName: personalInfo.lastName,
          dateOfBirth: personalInfo.dateOfBirth ? new Date(personalInfo.dateOfBirth).toISOString() : null,
          gender: personalInfo.gender || null,
          bloodGroup: personalInfo.bloodGroup || null,
          maritalStatus: personalInfo.maritalStatus || null,
          nationality: personalInfo.nationality || "Indian",
        },

        // Contact info
        contactInfo: {
          primaryPhone: contactInfo.primaryPhone,
          secondaryPhone: contactInfo.secondaryPhone || null,
          personalEmail: contactInfo.personalEmail || null,
          emergencyContactName: contactInfo.emergencyContactName || null,
          emergencyContactPhone: contactInfo.emergencyContactPhone || null,
          emergencyContactRelation: contactInfo.emergencyContactRelation || null,
        },

        // Address info
        addressInfo: {
          currentAddress: addressInfo.currentAddress || null,
          currentCity: addressInfo.currentCity || null,
          currentState: addressInfo.currentState || null,
          currentCountry: addressInfo.currentCountry || "India",
          currentZipCode: addressInfo.currentZipCode || null,
          permanentAddress: addressInfo.permanentAddress || null,
          permanentCity: addressInfo.permanentCity || null,
          permanentState: addressInfo.permanentState || null,
          permanentCountry: addressInfo.permanentCountry || "India",
          permanentZipCode: addressInfo.permanentZipCode || null,
        },

        // Government IDs
        governmentID: {
          pan: governmentID.pan || null,
          aadhaar: governmentID.aadhaar || null,
          passport: governmentID.passport || null,
          drivingLicense: governmentID.drivingLicense || null,
          voterID: governmentID.voterID || null,
        },

        // Employment info
        employmentInfo: {
          companyId: employmentInfo.companyId || null,
          branchId: employmentInfo.branchId || null,
          departmentId: employmentInfo.departmentId || null,
          designationId: employmentInfo.designationId || null,
          jobType: employmentInfo.jobType,
          status: employmentInfo.status,
          joiningDate: employmentInfo.joiningDate ? new Date(employmentInfo.joiningDate).toISOString() : null,
          confirmationDate: employmentInfo.confirmationDate ? new Date(employmentInfo.confirmationDate).toISOString() : null,
          probationEndDate: employmentInfo.probationEndDate ? new Date(employmentInfo.probationEndDate).toISOString() : null,
        },

        // Bank details
        bankDetails: {
          accountHolderName: bankDetails.accountHolderName || null,
          accountNumber: bankDetails.accountNumber || null,
          bankName: bankDetails.bankName || null,
          ifscCode: bankDetails.ifscCode || null,
          branchName: bankDetails.branchName || null,
          accountType: bankDetails.accountType || "SAVINGS",
        },
      };

      const response = await fetch("/api/hr/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create employee");
      }

      toast.success("Employee created successfully!");
      router.push("/hr/employees");
    } catch (error: any) {
      console.error("Error creating employee:", error);
      toast.error(error.message || "Failed to create employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/hr/employees")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Add New Employee</h1>
              <p className="text-muted-foreground">Create a comprehensive employee profile</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Employee Information</CardTitle>
              <CardDescription>
                Fill in all the required details to create a new employee profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="basic">
                    <User className="h-4 w-4 mr-2" />
                    Basic
                  </TabsTrigger>
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="contact">Contact</TabsTrigger>
                  <TabsTrigger value="address">
                    <MapPin className="h-4 w-4 mr-2" />
                    Address
                  </TabsTrigger>
                  <TabsTrigger value="government">
                    <FileText className="h-4 w-4 mr-2" />
                    IDs
                  </TabsTrigger>
                  <TabsTrigger value="employment">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Employment
                  </TabsTrigger>
                  <TabsTrigger value="bank">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Bank
                  </TabsTrigger>
                </TabsList>

                {/* Basic Information */}
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="id">Employee ID *</Label>
                      <Input
                        id="id"
                        placeholder="e.g., ACE001"
                        value={basicInfo.id}
                        onChange={(e) =>
                          setBasicInfo({ ...basicInfo, id: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={basicInfo.name}
                        onChange={(e) =>
                          setBasicInfo({ ...basicInfo, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@acehcs.com"
                        value={basicInfo.email}
                        onChange={(e) =>
                          setBasicInfo({ ...basicInfo, email: e.target.value.toLowerCase() })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Initial Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Temporary password"
                        value={basicInfo.password}
                        onChange={(e) =>
                          setBasicInfo({ ...basicInfo, password: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role *</Label>
                      <Select
                        value={basicInfo.role}
                        onValueChange={(value) =>
                          setBasicInfo({ ...basicInfo, role: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMPLOYEE">Employee</SelectItem>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="HR">HR</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* Personal Information */}
                <TabsContent value="personal" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={personalInfo.firstName}
                        onChange={(e) =>
                          setPersonalInfo({ ...personalInfo, firstName: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="middleName">Middle Name</Label>
                      <Input
                        id="middleName"
                        value={personalInfo.middleName}
                        onChange={(e) =>
                          setPersonalInfo({ ...personalInfo, middleName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={personalInfo.lastName}
                        onChange={(e) =>
                          setPersonalInfo({ ...personalInfo, lastName: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={personalInfo.dateOfBirth}
                        onChange={(e) =>
                          setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={personalInfo.gender}
                        onValueChange={(value) =>
                          setPersonalInfo({ ...personalInfo, gender: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bloodGroup">Blood Group</Label>
                      <Select
                        value={personalInfo.bloodGroup}
                        onValueChange={(value) =>
                          setPersonalInfo({ ...personalInfo, bloodGroup: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select blood group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A_POSITIVE">A+</SelectItem>
                          <SelectItem value="A_NEGATIVE">A-</SelectItem>
                          <SelectItem value="B_POSITIVE">B+</SelectItem>
                          <SelectItem value="B_NEGATIVE">B-</SelectItem>
                          <SelectItem value="O_POSITIVE">O+</SelectItem>
                          <SelectItem value="O_NEGATIVE">O-</SelectItem>
                          <SelectItem value="AB_POSITIVE">AB+</SelectItem>
                          <SelectItem value="AB_NEGATIVE">AB-</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maritalStatus">Marital Status</Label>
                      <Select
                        value={personalInfo.maritalStatus}
                        onValueChange={(value) =>
                          setPersonalInfo({ ...personalInfo, maritalStatus: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SINGLE">Single</SelectItem>
                          <SelectItem value="MARRIED">Married</SelectItem>
                          <SelectItem value="DIVORCED">Divorced</SelectItem>
                          <SelectItem value="WIDOWED">Widowed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nationality">Nationality</Label>
                      <Input
                        id="nationality"
                        value={personalInfo.nationality}
                        onChange={(e) =>
                          setPersonalInfo({ ...personalInfo, nationality: e.target.value })
                        }
                        placeholder="Indian"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Contact Information */}
                <TabsContent value="contact" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryPhone">Primary Phone *</Label>
                      <Input
                        id="primaryPhone"
                        type="tel"
                        value={contactInfo.primaryPhone}
                        onChange={(e) =>
                          setContactInfo({ ...contactInfo, primaryPhone: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryPhone">Secondary Phone</Label>
                      <Input
                        id="secondaryPhone"
                        type="tel"
                        value={contactInfo.secondaryPhone}
                        onChange={(e) =>
                          setContactInfo({ ...contactInfo, secondaryPhone: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="personalEmail">Personal Email</Label>
                      <Input
                        id="personalEmail"
                        type="email"
                        value={contactInfo.personalEmail}
                        onChange={(e) =>
                          setContactInfo({ ...contactInfo, personalEmail: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                      <Input
                        id="emergencyContactName"
                        value={contactInfo.emergencyContactName}
                        onChange={(e) =>
                          setContactInfo({ ...contactInfo, emergencyContactName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                      <Input
                        id="emergencyContactPhone"
                        type="tel"
                        value={contactInfo.emergencyContactPhone}
                        onChange={(e) =>
                          setContactInfo({ ...contactInfo, emergencyContactPhone: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContactRelation">Relation</Label>
                      <Input
                        id="emergencyContactRelation"
                        value={contactInfo.emergencyContactRelation}
                        onChange={(e) =>
                          setContactInfo({ ...contactInfo, emergencyContactRelation: e.target.value })
                        }
                        placeholder="e.g., Spouse, Parent"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Address Information */}
                <TabsContent value="address" className="space-y-4 mt-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Current Address</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="currentAddress">Address</Label>
                          <Input
                            id="currentAddress"
                            value={addressInfo.currentAddress}
                            onChange={(e) =>
                              setAddressInfo({ ...addressInfo, currentAddress: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currentCity">City</Label>
                          <Input
                            id="currentCity"
                            value={addressInfo.currentCity}
                            onChange={(e) =>
                              setAddressInfo({ ...addressInfo, currentCity: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currentState">State</Label>
                          <Input
                            id="currentState"
                            value={addressInfo.currentState}
                            onChange={(e) =>
                              setAddressInfo({ ...addressInfo, currentState: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currentCountry">Country</Label>
                          <Input
                            id="currentCountry"
                            value={addressInfo.currentCountry}
                            onChange={(e) =>
                              setAddressInfo({ ...addressInfo, currentCountry: e.target.value })
                            }
                            placeholder="India"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currentZipCode">ZIP Code</Label>
                          <Input
                            id="currentZipCode"
                            value={addressInfo.currentZipCode}
                            onChange={(e) =>
                              setAddressInfo({ ...addressInfo, currentZipCode: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3">Permanent Address</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="permanentAddress">Address</Label>
                          <Input
                            id="permanentAddress"
                            value={addressInfo.permanentAddress}
                            onChange={(e) =>
                              setAddressInfo({ ...addressInfo, permanentAddress: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="permanentCity">City</Label>
                          <Input
                            id="permanentCity"
                            value={addressInfo.permanentCity}
                            onChange={(e) =>
                              setAddressInfo({ ...addressInfo, permanentCity: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="permanentState">State</Label>
                          <Input
                            id="permanentState"
                            value={addressInfo.permanentState}
                            onChange={(e) =>
                              setAddressInfo({ ...addressInfo, permanentState: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="permanentCountry">Country</Label>
                          <Input
                            id="permanentCountry"
                            value={addressInfo.permanentCountry}
                            onChange={(e) =>
                              setAddressInfo({ ...addressInfo, permanentCountry: e.target.value })
                            }
                            placeholder="India"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="permanentZipCode">ZIP Code</Label>
                          <Input
                            id="permanentZipCode"
                            value={addressInfo.permanentZipCode}
                            onChange={(e) =>
                              setAddressInfo({ ...addressInfo, permanentZipCode: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Government IDs */}
                <TabsContent value="government" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pan">PAN</Label>
                      <Input
                        id="pan"
                        value={governmentID.pan}
                        onChange={(e) =>
                          setGovernmentID({ ...governmentID, pan: e.target.value.toUpperCase() })
                        }
                        placeholder="ABCDE1234F"
                        maxLength={10}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aadhaar">Aadhaar</Label>
                      <Input
                        id="aadhaar"
                        value={governmentID.aadhaar}
                        onChange={(e) =>
                          setGovernmentID({ ...governmentID, aadhaar: e.target.value })
                        }
                        placeholder="1234 5678 9012"
                        maxLength={12}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passport">Passport</Label>
                      <Input
                        id="passport"
                        value={governmentID.passport}
                        onChange={(e) =>
                          setGovernmentID({ ...governmentID, passport: e.target.value.toUpperCase() })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="drivingLicense">Driving License</Label>
                      <Input
                        id="drivingLicense"
                        value={governmentID.drivingLicense}
                        onChange={(e) =>
                          setGovernmentID({ ...governmentID, drivingLicense: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="voterID">Voter ID</Label>
                      <Input
                        id="voterID"
                        value={governmentID.voterID}
                        onChange={(e) =>
                          setGovernmentID({ ...governmentID, voterID: e.target.value.toUpperCase() })
                        }
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Employment Information */}
                <TabsContent value="employment" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Select
                        value={employmentInfo.departmentId}
                        onValueChange={(value) =>
                          setEmploymentInfo({ ...employmentInfo, departmentId: value })
                        }
                      >
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
                      <Label htmlFor="designation">Designation</Label>
                      <Select
                        value={employmentInfo.designationId}
                        onValueChange={(value) =>
                          setEmploymentInfo({ ...employmentInfo, designationId: value })
                        }
                      >
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
                      <Label htmlFor="jobType">Job Type</Label>
                      <Select
                        value={employmentInfo.jobType}
                        onValueChange={(value) =>
                          setEmploymentInfo({ ...employmentInfo, jobType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FULL_TIME">Full Time</SelectItem>
                          <SelectItem value="PART_TIME">Part Time</SelectItem>
                          <SelectItem value="CONTRACT">Contract</SelectItem>
                          <SelectItem value="INTERN">Intern</SelectItem>
                          <SelectItem value="CONSULTANT">Consultant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={employmentInfo.status}
                        onValueChange={(value) =>
                          setEmploymentInfo({ ...employmentInfo, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="ON_PROBATION">On Probation</SelectItem>
                          <SelectItem value="ON_NOTICE">On Notice</SelectItem>
                          <SelectItem value="SUSPENDED">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="joiningDate">Joining Date *</Label>
                      <Input
                        id="joiningDate"
                        type="date"
                        value={employmentInfo.joiningDate}
                        onChange={(e) =>
                          setEmploymentInfo({ ...employmentInfo, joiningDate: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmationDate">Confirmation Date</Label>
                      <Input
                        id="confirmationDate"
                        type="date"
                        value={employmentInfo.confirmationDate}
                        onChange={(e) =>
                          setEmploymentInfo({ ...employmentInfo, confirmationDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="probationEndDate">Probation End Date</Label>
                      <Input
                        id="probationEndDate"
                        type="date"
                        value={employmentInfo.probationEndDate}
                        onChange={(e) =>
                          setEmploymentInfo({ ...employmentInfo, probationEndDate: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Bank Details */}
                <TabsContent value="bank" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountHolderName">Account Holder Name</Label>
                      <Input
                        id="accountHolderName"
                        value={bankDetails.accountHolderName}
                        onChange={(e) =>
                          setBankDetails({ ...bankDetails, accountHolderName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        value={bankDetails.accountNumber}
                        onChange={(e) =>
                          setBankDetails({ ...bankDetails, accountNumber: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        value={bankDetails.bankName}
                        onChange={(e) =>
                          setBankDetails({ ...bankDetails, bankName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ifscCode">IFSC Code</Label>
                      <Input
                        id="ifscCode"
                        value={bankDetails.ifscCode}
                        onChange={(e) =>
                          setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="branchName">Branch Name</Label>
                      <Input
                        id="branchName"
                        value={bankDetails.branchName}
                        onChange={(e) =>
                          setBankDetails({ ...bankDetails, branchName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountType">Account Type</Label>
                      <Select
                        value={bankDetails.accountType}
                        onValueChange={(value) =>
                          setBankDetails({ ...bankDetails, accountType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SAVINGS">Savings</SelectItem>
                          <SelectItem value="CURRENT">Current</SelectItem>
                          <SelectItem value="SALARY">Salary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/hr/employees")}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Creating..." : "Create Employee"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
