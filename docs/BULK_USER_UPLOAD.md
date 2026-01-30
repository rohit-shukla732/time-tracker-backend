# Bulk User Upload Feature

This document describes how to use the bulk user upload feature in the admin users page.

## Overview

The bulk user upload feature allows administrators to create multiple user accounts at once by uploading an Excel or CSV file. This is useful for onboarding multiple employees simultaneously.

## How to Use

1. Navigate to the **Admin Users** page
2. Click the **"Bulk Upload"** button in the top right corner
3. Download the template file to see the required format
4. Prepare your Excel/CSV file with the following columns:
   - **empCode** (or employeeCode, emp_code, code): Employee code/ID - will be used as the user ID and default password
   - **name**: Full name of the employee
   - **email**: Email address (must be unique)
5. Upload your file
6. Review the results

## File Format

### Supported File Types
- Excel files (`.xlsx`, `.xls`)
- CSV files (`.csv`)

### Required Columns

The file must contain these three columns (column names are case-insensitive and flexible):

| Column Name Options | Description | Example |
|---------------------|-------------|---------|
| empCode, employeeCode, emp_code, code | Employee code/ID | ACE001 |
| name | Full name of employee | John Doe |
| email | Email address | john.doe@company.com |

### Template Example

```csv
empCode,name,email
ACE001,John Doe,john.doe@example.com
ACE002,Jane Smith,jane.smith@example.com
ACE003,Bob Johnson,bob.johnson@example.com
```

## Important Notes

### Default Password
- The password for each created user will be **the same as their employee code**
- Users should be instructed to change their password after first login
- Example: If employee code is `ACE001`, the password will be `ACE001`

### Default Role
- All users created through bulk upload are assigned the **EMPLOYEE** role by default
- Administrators can change roles individually after upload if needed

### Validation
The system will validate:
- Employee code is unique (not already in use)
- Email is unique (not already registered)
- Email format is valid
- All required fields are present

### Error Handling
- If any row fails validation, it will be skipped
- The upload will continue processing other rows
- A detailed error report will be displayed showing:
  - Which rows failed
  - What the error was for each row
  - Total successes and failures

## Upload Results

After uploading, you'll see:
- Total number of rows processed
- Number of successful user creations
- Number of failed rows
- Detailed error messages for failed rows (if any)

## API Endpoint

**Endpoint**: `POST /api/admin/users/bulk-upload`

**Authentication**: Admin role required

**Request Format**: `multipart/form-data` with file field

**Response Format**:
```json
{
  "success": true,
  "message": "Processed 10 rows: 8 succeeded, 2 failed",
  "results": {
    "success": 8,
    "failed": 2,
    "errors": [
      {
        "row": 3,
        "empCode": "ACE003",
        "error": "Email already exists"
      },
      {
        "row": 7,
        "empCode": "ACE007",
        "error": "Invalid email format"
      }
    ]
  }
}
```

## Security Considerations

1. **File Size**: Consider adding file size limits in production
2. **Rate Limiting**: Implementation of rate limiting is recommended
3. **Input Sanitization**: All input data is validated and sanitized
4. **Password Policy**: Users should be prompted to change their default password on first login
5. **Admin Access Only**: This feature is restricted to admin users only

## Best Practices

1. **Test with Small File First**: Before uploading hundreds of users, test with a small file (5-10 users)
2. **Verify Data**: Double-check your Excel/CSV file for accuracy before uploading
3. **Unique Identifiers**: Ensure all employee codes and emails are unique
4. **Email Format**: Verify all email addresses are in correct format
5. **Backup**: Consider backing up existing user data before bulk operations
6. **Notify Users**: Inform new users about their account creation and provide login instructions

## Troubleshooting

### Common Issues

**"Employee code already exists"**
- The employee code is already in use by another user
- Use a different, unique employee code

**"Email already exists"**
- The email address is already registered
- Use a different, unique email address

**"Invalid email format"**
- The email address doesn't match the expected format
- Verify the email is in format: `name@domain.com`

**"Excel file is empty"**
- The uploaded file has no data rows
- Ensure the file has at least one data row (besides the header)

**"No file uploaded"**
- A file was not properly selected or attached
- Try selecting the file again

## Future Enhancements

Potential improvements for future versions:
- Support for additional user fields (department, role, etc.)
- Email notifications to new users with login credentials
- Scheduled password reset requirement for bulk-created accounts
- Import preview before actual creation
- Dry-run mode to validate without creating users
- Support for updating existing users
