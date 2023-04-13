import { User } from "./User";

export interface Reaction {
  emoji: string[];
  user: User["userId"];
}
