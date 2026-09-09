import type { Permission } from "$lib/types/types";

// Checks for auth and required permissions
export const RequiresPermissions = (locals: App.Locals, permissions: Permission[]) => {
    if (!locals.user) {
        return false;
    }
    for (let perm of permissions) {
        if (!locals.user.permissions.includes(perm)) {
            return false;
        }
    }
    return true;
}