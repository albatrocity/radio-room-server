export interface User {
  id?: string; // socket ID
  userId: string;
  username?: string;
  isAdmin?: boolean;
  isDj?: boolean;
  isDeputyDj?: boolean;
  status?: "participating" | "listening";
}
