import { uniqBy, reject } from "remeda";
import { User } from "../types/User";
import { getRoomUsers, persistUser } from "../operations/data";

function addUser(user: User | null, users: User[]) {
  const newUsers = user
    ? uniqBy(
        [...reject(users, (u) => u.userId === user.userId), user],
        (u) => u.userId
      )
    : users;
  return newUsers.filter((user) => !!user.userId);
}

async function updateUserAttributes(
  userId: string,
  attributes: Partial<User>,
  roomId?: string
) {
  await persistUser(userId, attributes);
  const users = roomId ? await getRoomUsers(roomId) : [];
  const user = users.find((u) => u?.userId === userId);
  return { user, users };
}

export default updateUserAttributes;
