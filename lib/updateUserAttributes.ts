import { reject, find, concat, uniqBy } from "lodash/fp";
import { User } from "../types/User";

function updateUserAttributes(
  userId: string,
  attributes: Partial<User>,
  { getUsers, setUsers }
) {
  const users = getUsers();
  const user = find({ userId }, users);
  const newUser = { ...user, ...attributes };
  const newUsers = uniqBy("userId", concat(newUser, reject({ userId }, users)));
  const cleanedUsers = newUsers.filter((user) => !!user.userId);
  setUsers(cleanedUsers);
  return { users: cleanedUsers, user: newUser };
}

export default updateUserAttributes;
