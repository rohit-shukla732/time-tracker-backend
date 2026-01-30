"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Calendar, Users, FileText, Clock } from "lucide-react";

interface LeaveSettings {
  id: string;
  monthlySickLeave: number;
  monthlyCasualLeave: number;
  monthlyAnnualLeave: number;
  allowMonthlyRollover: boolean;
  allowYearlyRollover: boolean;
  maxMonthlyRollover: number | null;
  maxYearlyRollover: number | null;
  annualSickLeave: number;
  annualCasualLeave: number;
  annualAnnualLeave: number;
  annualMaternityLeave: number;
  annualPaternityLeave: number;
  lateComingCredits: number;
  lateThresholdMinutes: number;
}

export default function HRSettings() {
  const [settings, setSettings] = useState<LeaveSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setError("");
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/hr/settings", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || `Error: ${response.status}`);
        return;
      }

      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error("Error fetching settings:", error);
      setError("Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    setError("");
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/hr/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          window.location.href = "/hr/login";
          return;
        }
        const data = await response.json();
        setError(data.error || `Error: ${response.status}`);
        return;
      }

      const data = await response.json();
      setSettings(data);
      setEditMode(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!settings) return;
    setSettings({
      ...settings,
      monthlySickLeave: 1,
      monthlyCasualLeave: 0.83,
      monthlyAnnualLeave: 1.67,
      annualSickLeave: 12,
      annualCasualLeave: 10,
      annualAnnualLeave: 20,
      annualMaternityLeave: 180,
      annualPaternityLeave: 7,
      lateComingCredits: 60,
      lateThresholdMinutes: 15,
    });
  };

  const updateSetting = (key: keyof LeaveSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error && !settings) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <Button onClick={fetchSettings} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">HR Settings</h1>
          <p className="text-muted-foreground">
            Configure leave policies and system settings
          </p>
        </div>
        {!editMode ? (
          <Button onClick={() => setEditMode(true)}>Edit Settings</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <Button variant="outline" onClick={() => { setEditMode(false); setError(""); fetchSettings(); }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {/* Reference Data Quick Link */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Reference Data Management
          </CardTitle>
          <CardDescription>
            Manage departments, designations, and other reference data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/hr/settings/departments">Manage Departments</a>
          </Button>
          <Button asChild variant="outline" className="ml-2">
            <a href="/hr/settings/designations">Manage Designations</a>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Leave Allocation
            </CardTitle>
            <CardDescription>
              Configure monthly leave credits for employees
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="monthlySick">Sick Leave (per month)</Label>
              <Input
                id="monthlySick"
                type="number"
                step="0.1"
                value={settings?.monthlySickLeave ?? 0}
                onChange={(e) => updateSetting("monthlySickLeave", parseFloat(e.target.value) || 0)}
                disabled={!editMode}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyCasual">Casual Leave (per month)</Label>
              <Input
                id="monthlyCasual"
                type="number"
                step="0.1"
                value={settings?.monthlyCasualLeave ?? 0}
                onChange={(e) => updateSetting("monthlyCasualLeave", parseFloat(e.target.value) || 0)}
                disabled={!editMode}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyAnnual">Annual Leave (per month)</Label>
              <Input
                id="monthlyAnnual"
                type="number"
                step="0.1"
                value={settings?.monthlyAnnualLeave ?? 0}
                onChange={(e) => updateSetting("monthlyAnnualLeave", parseFloat(e.target.value) || 0)}
                disabled={!editMode}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Rollover Settings
            </CardTitle>
            <CardDescription>
              Configure leave rollover policies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Monthly Rollover</Label>
                <p className="text-sm text-muted-foreground">
                  Unused monthly leaves carry to next month
                </p>
              </div>
              <Switch
                checked={settings?.allowMonthlyRollover ?? false}
                onCheckedChange={(checked: boolean) => updateSetting("allowMonthlyRollover", checked)}
                disabled={!editMode}
              />
            </div>

            {settings?.allowMonthlyRollover && (
              <div className="space-y-2">
                <Label htmlFor="maxMonthlyRollover">Max Monthly Rollover (optional)</Label>
                <Input
                  id="maxMonthlyRollover"
                  type="number"
                  step="0.5"
                  placeholder="No limit"
                  value={settings?.maxMonthlyRollover ?? ""}
                  onChange={(e) => updateSetting("maxMonthlyRollover", e.target.value ? parseFloat(e.target.value) : null)}
                  disabled={!editMode}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Yearly Rollover</Label>
                <p className="text-sm text-muted-foreground">
                  Unused yearly leaves carry to next year
                </p>
              </div>
              <Switch
                checked={settings?.allowYearlyRollover ?? false}
                onCheckedChange={(checked: boolean) => updateSetting("allowYearlyRollover", checked)}
                disabled={!editMode}
              />
            </div>

            {settings?.allowYearlyRollover && (
              <div className="space-y-2">
                <Label htmlFor="maxYearlyRollover">Max Yearly Rollover (optional)</Label>
                <Input
                  id="maxYearlyRollover"
                  type="number"
                  step="0.5"
                  placeholder="No limit"
                  value={settings?.maxYearlyRollover ?? ""}
                  onChange={(e) => updateSetting("maxYearlyRollover", e.target.value ? parseFloat(e.target.value) : null)}
                  disabled={!editMode}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Annual Leave Quotas
            </CardTitle>
            <CardDescription>
              Default annual leave allocations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span>Sick Leave:</span>
                {editMode ? (
                  <Input
                    type="number"
                    className="w-20 h-8"
                    value={settings?.annualSickLeave ?? 0}
                    onChange={(e) => updateSetting("annualSickLeave", parseFloat(e.target.value) || 0)}
                  />
                ) : (
                  <span className="font-medium">{settings?.annualSickLeave ?? 0} days/year</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span>Casual Leave:</span>
                {editMode ? (
                  <Input
                    type="number"
                    className="w-20 h-8"
                    value={settings?.annualCasualLeave ?? 0}
                    onChange={(e) => updateSetting("annualCasualLeave", parseFloat(e.target.value) || 0)}
                  />
                ) : (
                  <span className="font-medium">{settings?.annualCasualLeave ?? 0} days/year</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span>Annual Leave:</span>
                {editMode ? (
                  <Input
                    type="number"
                    className="w-20 h-8"
                    value={settings?.annualAnnualLeave ?? 0}
                    onChange={(e) => updateSetting("annualAnnualLeave", parseFloat(e.target.value) || 0)}
                  />
                ) : (
                  <span className="font-medium">{settings?.annualAnnualLeave ?? 0} days/year</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span>Maternity Leave:</span>
                {editMode ? (
                  <Input
                    type="number"
                    className="w-20 h-8"
                    value={settings?.annualMaternityLeave ?? 0}
                    onChange={(e) => updateSetting("annualMaternityLeave", parseFloat(e.target.value) || 0)}
                  />
                ) : (
                  <span className="font-medium">{settings?.annualMaternityLeave ?? 0} days</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span>Paternity Leave:</span>
                {editMode ? (
                  <Input
                    type="number"
                    className="w-20 h-8"
                    value={settings?.annualPaternityLeave ?? 0}
                    onChange={(e) => updateSetting("annualPaternityLeave", parseFloat(e.target.value) || 0)}
                  />
                ) : (
                  <span className="font-medium">{settings?.annualPaternityLeave ?? 0} days</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Late Coming Settings
            </CardTitle>
            <CardDescription>
              Configure late arrival policies and credits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lateCredits">Late Coming Credits (minutes/month)</Label>
              <Input
                id="lateCredits"
                type="number"
                step="1"
                value={settings?.lateComingCredits ?? 0}
                onChange={(e) => updateSetting("lateComingCredits", parseInt(e.target.value) || 0)}
                disabled={!editMode}
              />
              <p className="text-xs text-muted-foreground">
                Total minutes of late arrival allowed per month
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lateThreshold">Late Threshold (minutes)</Label>
              <Input
                id="lateThreshold"
                type="number"
                step="1"
                value={settings?.lateThresholdMinutes ?? 0}
                onChange={(e) => updateSetting("lateThresholdMinutes", parseInt(e.target.value) || 0)}
                disabled={!editMode}
              />
              <p className="text-xs text-muted-foreground">
                Grace period before counting as late (e.g., 15 mins)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Year-End Operations
            </CardTitle>
            <CardDescription>
              Manage annual reset and carryover
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Reset all employee leave balances for the new year
              </p>
              <Button className="w-full" variant="outline" disabled>
                Reset for {new Date().getFullYear() + 1} (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reports & Export
            </CardTitle>
            <CardDescription>
              Generate leave reports and analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button className="w-full" variant="outline" disabled>
                Export Leave History (Coming Soon)
              </Button>
              <Button className="w-full" variant="outline" disabled>
                Generate Analytics Report (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
