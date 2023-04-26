import { Emoji } from "@emoji-mart/data";
import { User } from "./User";
import { ReactionSubject } from "./ReactionSubject";

export interface Reaction {
  emoji: string[];
  user: User["userId"];
}

export interface ReactionPayload {
  emoji: Emoji & { shortcodes: string[] };
  reactTo: ReactionSubject;
  user: User;
}
