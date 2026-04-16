// backend/services/userService.js
import User from "../models/User.js";

export async function updateUserFields(user, updates) {
  if (updates.name) user.name = updates.name;
  if (updates.email) user.email = updates.email;
  if (updates.password) user.password = updates.password;
  if (updates.role) user.role = updates.role;
  if (updates.totalDonated !== undefined) user.totalDonated = Number(updates.totalDonated);
  return user;
}
