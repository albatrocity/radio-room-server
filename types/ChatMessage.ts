import { User } from "./User";

export type ChatMessage = {
  content: string;
  timestamp: string;
  user: User;
  mentions?: [];
  reactions?: [];
  meta?: {
    status?: "error" | "success" | "warning" | "info";
    type?: "alert" | null;
    title?: string | null;
  };
};
