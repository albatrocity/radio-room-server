import { uniqBy, reject } from "remeda";
import { getters, setters } from "../lib/dataStore";
import { User } from "../types/User";

function addUser(user: User | null, users: User[]) {
  const newUsers = user
    ? uniqBy(
        [...reject(users, (u) => u.userId === user.userId), user],
        (u) => u.userId
      )
    : users;
  return newUsers.filter((user) => !!user.userId);
}

function updateUserAttributes(userId: string, attributes: Partial<User>) {
  const { getUsers } = getters;
  const { setUsers } = setters;
  const users = getUsers();
  const user = users.find((u) => u.userId === userId);
  const newUser: User | null = user ? { ...user, ...attributes } : null;
  const cleanedUsers = addUser(newUser, users);
  setUsers(cleanedUsers);
  return { users: cleanedUsers, user: newUser };
}

export default updateUserAttributes;
