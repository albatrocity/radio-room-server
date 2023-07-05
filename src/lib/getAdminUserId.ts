import { getters } from "./dataStore";

export default async function getAdminUserId() {
  const users = getters.getUsers();
  const adminUser = users.find((u) => u.isAdmin)?.userId;
  return adminUser;
}
