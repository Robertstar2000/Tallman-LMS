# Division/Branch Selector Feature

## ✅ Feature Added: Division Dropdown in Workforce Registry

### What Was Added

A **division/branch selector dropdown** has been added to the Workforce Registry, allowing admins to assign users to specific divisions.

### Available Divisions

- **Columbus**
- **Addison**
- **Lake City**
- **Other**

### How It Works

1. **Admin View**: In the Workforce Registry, the "Division" column now shows a dropdown instead of static text
2. **Selection**: Click the dropdown to select a division for each user
3. **Auto-Save**: Changes are saved immediately when you select a new division
4. **Database Storage**: The selected division is stored in the `branch_id` field in the database
5. **Display**: The current division is displayed in the dropdown

### Technical Implementation

#### Frontend Changes (`pages/WorkforceRegistry.tsx`)

**Before:**
```tsx
<td className="px-10 py-8 font-bold text-slate-600 text-sm">
    {user.branch_id || 'Global'}
</td>
```

**After:**
```tsx
<td className="px-10 py-8">
    <select
        className="px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-600 text-sm outline-none hover:border-indigo-300 focus:border-indigo-500 transition-all cursor-pointer"
        value={user.branch_id || 'Other'}
        onChange={(e) => handleUpdateUser(user.user_id, { branch_id: e.target.value })}
    >
        <option value="Columbus">Columbus</option>
        <option value="Addison">Addison</option>
        <option value="Lake City">Lake City</option>
        <option value="Other">Other</option>
    </select>
</td>
```

#### API Changes

**Frontend API (`backend-server.ts`):**
```typescript
async adminUpdateUser(userId: string, updates: { 
    roles?: UserRole[], 
    status?: string, 
    branch_id?: string  // Added
}): Promise<void>
```

**Backend Endpoint (`server/index.ts`):**
```typescript
app.patch('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { roles, status, branch_id } = req.body;  // Added branch_id

    try {
        if (roles) {
            await db.run('UPDATE users SET roles = ? WHERE user_id = ?', [JSON.stringify(roles), id]);
        }
        if (status) {
            await db.run('UPDATE users SET status = ? WHERE user_id = ?', [status, id]);
        }
        if (branch_id !== undefined) {  // Added
            await db.run('UPDATE users SET branch_id = ? WHERE user_id = ?', [branch_id, id]);
        }
        res.json({ message: 'User updated' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
```

### Usage Instructions

1. **Log in** as admin (robertstar@aol.com)
2. **Navigate to Workforce Registry**
3. **Find the user** you want to assign to a division
4. **Click the Division dropdown** in their row
5. **Select the division**: Columbus, Addison, Lake City, or Other
6. **Done!** The change is saved automatically

### Database Schema

The `branch_id` field already exists in the `users` table:

```sql
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    branch_id TEXT,  -- Stores the division
    department TEXT,
    last_login TEXT,
    status TEXT DEFAULT 'active',
    roles TEXT
);
```

### Default Values

- **New users**: Default to "Other" if no division is set
- **Existing users**: Keep their current `branch_id` value
- **Display**: Shows the current value in the dropdown

### Visual Design

The dropdown has:
- ✅ Clean, modern styling matching the application theme
- ✅ Hover effects (border changes to indigo)
- ✅ Focus states for accessibility
- ✅ Smooth transitions
- ✅ Cursor pointer on hover

### Files Modified

1. `pages/WorkforceRegistry.tsx` - Added dropdown UI
2. `backend-server.ts` - Updated API interface
3. `server/index.ts` - Added branch_id handling

### Testing

To test the feature:

1. Access http://localhost:3180
2. Log in as admin
3. Go to Workforce Registry
4. Change a user's division
5. Refresh the page - the selection should persist
6. Check backend logs to see the update:
   ```bash
   docker logs tallman-backend --tail 20
   ```

### Future Enhancements

Possible improvements:
- Add division-based filtering/search
- Show division statistics (users per division)
- Color-code divisions
- Add custom division names via settings
- Division-specific course assignments

---

**Feature Status**: ✅ Complete and Deployed  
**Last Updated**: 2026-01-26  
**Docker Containers**: Restarted with changes
