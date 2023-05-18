import { Emoji } from "./Emoji";
import { User } from "./User";
import { ReactionSubject } from "./ReactionSubject";

export interface Reaction {
  emoji: string;
  user: User["userId"];
}

export interface ReactionPayload {
  emoji: Emoji;
  reactTo: ReactionSubject;
  user: User;
}
