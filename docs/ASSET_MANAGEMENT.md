# Asset Management System

A comprehensive asset management system for tracking and managing both user-side and IT infrastructure assets.

## Features

### Asset Categories

#### User Side Assets
- **Laptops** - Employee workstations and portable computers
- **Keyboards** - Input devices assigned to users
- **Mouse** - Pointing devices for workstations
- **Headsets** - Audio devices for communication
- **Monitors** - Display devices for workstations

#### IT Infrastructure Assets
- **Switches** - Network switching equipment
- **Firewalls** - Network security devices
- **Access Points** - Wireless network equipment
- **Biometric Devices** - Fingerprint/facial recognition systems
- **Telephone Matrix** - PBX and telephony infrastructure
- **Telephone Handsets** - Individual phone units
- **CCTV Cameras** - Security camera systems
- **NVR** - Network Video Recorders for CCTV
- **Internet Lines** - Broadband and connectivity services

### Core Functionality

#### Asset Management
- Create, read, update, and delete assets
- Track asset details:
  - Name, description, and category
  - Serial number, model, and manufacturer
  - Purchase date and warranty expiry
  - Purchase cost and current value
  - Location and notes
- Asset status tracking:
  - Available
  - Assigned
  - In Maintenance
  - Retired
  - Damaged
  - Lost

#### Assignment Management
- Assign assets to employees
- Track assignment history
- Monitor expected return dates
- Record asset condition at assignment and return
- Assignment statuses:
  - Active
  - Returned
  - Overdue

#### Maintenance Management
- Schedule preventive maintenance
- Record corrective maintenance
- Track inspections and upgrades
- Log maintenance costs
- Maintenance types:
  - Preventive
  - Corrective
  - Inspection
  - Upgrade
- Maintenance statuses:
  - Scheduled
  - In Progress
  - Completed
  - Cancelled

#### Reporting & Analytics
- Dashboard with key metrics
- Asset distribution by category
- Asset availability statistics
- Recent assignments tracking
- Upcoming maintenance schedule
- Cost tracking and depreciation

## Database Schema

### Models

#### Asset
```typescript
{
  id: string
  assetType: AssetType (USER_SIDE | IT_INFRASTRUCTURE)
  category: AssetCategory
  name: string
  description?: string
  serialNumber?: string (unique)
  model?: string
  manufacturer?: string
  purchaseDate?: DateTime
  warrantyExpiry?: DateTime
  purchaseCost?: number
  currentValue?: number
  status: AssetStatus
  location?: string
  notes?: string
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### AssetAssignment
```typescript
{
  id: string
  assetId: string
  userId: string
  assignedBy: string
  assignedDate: DateTime
  returnedDate?: DateTime
  expectedReturnDate?: DateTime
  status: AssignmentStatus
  condition?: AssetCondition
  notes?: string
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### AssetMaintenance
```typescript
{
  id: string
  assetId: string
  maintenanceType: MaintenanceType
  description: string
  scheduledDate: DateTime
  completedDate?: DateTime
  cost?: number
  performedBy?: string
  status: MaintenanceStatus
  notes?: string
  createdAt: DateTime
  updatedAt: DateTime
}
```

## API Endpoints

### Assets

#### `GET /api/assets`
List all assets with optional filtering
- Query params: `assetType`, `category`, `status`, `search`

#### `POST /api/assets`
Create a new asset (Admin only)

#### `GET /api/assets/:id`
Get a single asset with full details

#### `PUT /api/assets/:id`
Update an asset (Admin only)

#### `DELETE /api/assets/:id`
Delete an asset (Admin only)

#### `POST /api/assets/:id/assign`
Assign an asset to a user (Admin only)

#### `POST /api/assets/:id/return`
Process asset return (Admin only)

### Assignments

#### `GET /api/assets/assignments`
List all asset assignments
- Query params: `userId`, `status`, `assetId`

### Maintenance

#### `GET /api/assets/maintenance`
List all maintenance records
- Query params: `assetId`, `status`, `maintenanceType`

#### `POST /api/assets/maintenance`
Create a new maintenance record (Admin only)

#### `GET /api/assets/maintenance/:id`
Get a single maintenance record

#### `PUT /api/assets/maintenance/:id`
Update a maintenance record (Admin only)

#### `DELETE /api/assets/maintenance/:id`
Delete a maintenance record (Admin only)

### Statistics

#### `GET /api/assets/stats`
Get comprehensive asset statistics and dashboard data

## Frontend Pages

### `/assets`
Main asset management dashboard
- Asset statistics overview
- Asset list with filtering
- Tabs for user-side and IT infrastructure assets
- Quick actions for assign/return

### `/assets/assignments`
Assignment tracking page
- List of all asset assignments
- Filter by status
- Assignment history

### `/assets/maintenance`
Maintenance management page
- List of all maintenance records
- Filter by type and status
- Schedule new maintenance

## Installation & Setup

1. **Run database migration**
   ```bash
   npx prisma migrate dev --name add_asset_management
   ```

2. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```

3. **Access the system**
   Navigate to `/assets` in your application

## Usage

### Creating an Asset
1. Navigate to the Assets page
2. Click "Add New Asset"
3. Fill in asset details
4. Select appropriate category and type
5. Submit the form

### Assigning an Asset
1. Find the available asset in the list
2. Click "Assign" button
3. Select the user to assign to
4. Add expected return date and notes
5. Record the asset condition
6. Submit the assignment

### Returning an Asset
1. Find the assigned asset
2. Click "Return" button
3. Record the asset condition
4. Add any notes about damages or issues
5. Submit the return

### Scheduling Maintenance
1. Navigate to the Maintenance page
2. Click "Schedule Maintenance"
3. Select the asset
4. Choose maintenance type
5. Set scheduled date
6. Add description and estimated cost
7. Submit the maintenance record

## Permissions

- **Admin**: Full access to all features
  - Create, update, delete assets
  - Assign and return assets
  - Schedule and manage maintenance
  - View all statistics

- **Manager/Employee**: Read-only access
  - View assets
  - View assignments
  - View maintenance records

## Best Practices

1. **Regular Audits**: Periodically verify asset locations and conditions
2. **Preventive Maintenance**: Schedule regular maintenance to extend asset life
3. **Documentation**: Keep detailed notes on asset history
4. **Serial Numbers**: Always record serial numbers for tracking
5. **Warranty Tracking**: Monitor warranty expiry dates
6. **Cost Management**: Track purchase costs and current values for depreciation
7. **Assignment Tracking**: Maintain clear records of who has which assets

## Future Enhancements

- [ ] Asset QR code generation and scanning
- [ ] Email notifications for assignments and maintenance
- [ ] Asset depreciation calculation
- [ ] Bulk import/export functionality
- [ ] Asset transfer between locations/departments
- [ ] Mobile app for asset scanning
- [ ] Integration with procurement system
- [ ] Asset lifecycle management
- [ ] Custom fields for asset categories
- [ ] Advanced reporting and analytics
