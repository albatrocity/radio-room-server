import { ReactionSubject } from "./ReactionSubject";
import { Emoji } from "@emoji-mart/data";
import { User } from "./User";

export interface EmojiReaction {
  emoji: Emoji;
  reactTo: ReactionSubject;
  user: User;
}
