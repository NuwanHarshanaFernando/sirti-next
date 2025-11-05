# SIRTI Inventory System

A secure inventory management system with role-based authentication and session management.

## Features

- User authentication with NextAuth.js
- Role-based access control (admin, manager, staff)
- Session management with MongoDB
- Admin dashboard for managing user sessions
- Audit trail for admin actions
- Secure password hashing with bcrypt-ts

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- MongoDB database

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/sirti-inventory.git
cd sirti-inventory
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```
MONGODB_URI=mongodb://localhost:27017/sirti-inventory
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-should-be-at-least-32-characters
```

Replace the `MONGODB_URI` with your MongoDB connection string and set a strong `NEXTAUTH_SECRET` for JWT encryption.

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Versioning

The project uses semantic versioning (MAJOR.MINOR.PATCH). To update the version:

```bash
# Update patch version (for bug fixes)
node scripts/version.js patch

# Update minor version (for new features)
node scripts/version.js minor

# Update major version (for breaking changes)
node scripts/version.js major
```

The version will be updated in both `package.json` and `.env.local` files automatically.

## User Roles

- **Admin**: Can manage all aspects of the system, including user sessions
- **Manager**: Can manage inventory but cannot access admin functions
- **Staff**: Limited access to basic inventory operations

## Admin Session Management

Admins can view and manage all active user sessions at `/admin/sessions`. From this dashboard, they can:

- View all active sessions
- See which user is associated with each session
- Terminate any session
- View when sessions will expire

## Security

- Passwords are hashed using bcrypt-ts
- Role-based middleware protection for routes
- Session data stored securely in MongoDB
- Audit trail for administrative actions

## API Routes

- `GET /api/admin/sessions`: Fetch all active sessions (admin only)
- `DELETE /api/admin/terminate-session?id=SESSION_ID`: Terminate a specific session (admin only)

## License

[MIT](https://choosealicense.com/licenses/mit/)
