export function hasPermission(user, permission) {
  if (!user || !user.permissions) {
    console.warn("hasPermission - No user or permissions:", user);
    return false;
  }

  try {
    const perms = Array.isArray(user.permissions)
      ? user.permissions
      : JSON.parse(user.permissions || "[]");
    if (!Array.isArray(perms)) {
      console.warn("hasPermission - Permissions is not an array:", perms);
      return false;
    }
    const hasPerm = perms.includes(permission);
    console.log("hasPermission - Checking:", permission, "Result:", hasPerm, "Permissions:", perms);
    return hasPerm;
  } catch (error) {
    console.error("hasPermission - Error parsing permissions:", error, "Raw permissions:", user.permissions);
    return false;
  }
}