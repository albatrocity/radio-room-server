const { reject, find, concat, uniqBy } = require("lodash/fp");

module.exports = function updateUserAttributes(
  userId,
  attributes,
  { getUsers, setUsers }
) {
  const users = getUsers();
  const user = find({ userId }, users);
  const newUser = { ...user, ...attributes };
  const newUsers = uniqBy("userId", concat(newUser, reject({ userId }, users)));
  const cleanedUsers = newUsers.filter((user) => !!user.userId);
  setUsers(cleanedUsers);
  return { users: cleanedUsers, user: newUser };
};
