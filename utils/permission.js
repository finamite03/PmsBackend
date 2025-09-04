export function hasPermission(user, permission) {
    try {
      const perms = Array.isArray(user.permissions) ? user.permissions : JSON.parse(user.permissions || "[]");
      return perms.includes(permission);
    } catch {
      return false;
    }
  }