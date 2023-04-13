import { reject, find, concat, uniqBy } from "lodash/fp";
import { User } from "../types/User";
import { Getters, Setters } from "types/DataStores";

function addUser(user: User | null, users: User[]) {
  const newUsers = user
    ? uniqBy("userId", concat(user, reject({ userId: user.userId }, users)))
    : users;
  return newUsers.filter((user) => !!user.userId);
}

function updateUserAttributes(
  userId: string,
  attributes: Partial<User>,
  {
    getUsers,
    setUsers,
  }: { getUsers: Getters["getUsers"]; setUsers: Setters["setUsers"] }
) {
  const users = getUsers();
  const user = find({ userId }, users);
  const newUser: User | null = user ? { ...user, ...attributes } : null;
  const cleanedUsers = addUser(newUser, users);
  setUsers(cleanedUsers);
  return { users: cleanedUsers, user: newUser };
}

export default updateUserAttributes;
