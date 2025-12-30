# Database Seeders

This directory contains database seeder scripts for populating the database with initial data.

## User Seeder

Creates default admin and parent users for development and testing.

### Default Users

1. **Admin User**
   - Email: `super@gmail.com`
   - Password: `Jejomar@09`
   - Role: `admin`

2. **Parent User**
   - Email: `parent@gmail.com`
   - Password: `Jejomar@09`
   - Role: `parent`

### Usage

Run the seeder using npm script:

```bash
npm run seed
```

Or directly with node:

```bash
node seeders/userSeeder.js
```

### Behavior

- **If user exists**: The seeder will skip creation and update the password if needed
- **If user doesn't exist**: Creates a new user with the specified credentials
- **Password hashing**: Passwords are automatically hashed by the User model's pre-save hook

### Environment

Make sure your `.env` file has the correct `MONGODB_URI` before running the seeder.

### Notes

- The seeder connects to the same database as the main application
- Passwords are hashed using bcrypt (handled automatically by User model)
- Users are created with `isActive: true` by default
- The seeder will exit after completion

