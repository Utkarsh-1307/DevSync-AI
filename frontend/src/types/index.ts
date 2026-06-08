export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  timezone: string;
  status: "active" | "inactive" | "suspended" | "pending_verification";
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSummary {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  status: User["status"];
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  plan: "free" | "starter" | "business" | "enterprise";
  is_active: boolean;
  max_members: number;
  ai_enabled: boolean;
  guest_access_enabled: boolean;
  owner: UserSummary;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  key: string;
  status: "active" | "archived" | "completed";
  visibility: "public" | "private" | "workspace";
  color: string;
  icon: string | null;
  is_archived: boolean;
  owner: UserSummary;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done" | "cancelled";
export type TaskPriority = "critical" | "high" | "medium" | "low" | "none";

export interface TaskLabel {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  workspace_id: string;
  project_id: string;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: UserSummary | null;
  reporter: UserSummary;
  due_date: string | null;
  completed_at: string | null;
  estimated_hours: number | null;
  logged_hours: number;
  position: number;
  version: number;
  labels: TaskLabel[];
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author: UserSummary;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export type ChannelType = "public" | "private" | "direct";

export interface Channel {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  channel_type: ChannelType;
  is_archived: boolean;
  created_by: UserSummary;
  members: UserSummary[];
  created_at: string;
  updated_at: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
}

export interface MessageAttachment {
  url: string;
  filename: string;
  content_type: string;
  file_size: number;
}

export interface Message {
  id: string;
  channel_id: string;
  workspace_id: string;
  author: UserSummary;
  content: string;
  thread_id: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  pinned_at: string | null;
  reactions: ReactionSummary[];
  attachments: MessageAttachment[];
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  user: UserSummary;
  role: "owner" | "admin" | "member" | "guest";
  joined_at: string;
}

export type NotificationType =
  | "mention"
  | "task_assigned"
  | "task_updated"
  | "task_commented"
  | "task_due_soon"
  | "task_overdue"
  | "project_invite"
  | "workspace_invite"
  | "channel_added"
  | "message_reaction"
  | "direct_message"
  | "ai_complete";

export interface Notification {
  id: string;
  workspace_id: string;
  actor: UserSummary | null;
  notification_type: NotificationType;
  title: string;
  body: string | null;
  is_read: boolean;
  read_at: string | null;
  resource_type: string | null;
  resource_id: string | null;
  resource_url: string | null;
  created_at: string;
  updated_at: string;
}

// --- Issues ---
export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";
export type IssuePriority = "critical" | "high" | "medium" | "low";

export interface IssueLabel {
  id: string;
  name: string;
  color: string;
}

export interface Issue {
  id: string;
  workspace_id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  assignee: UserSummary | null;
  reporter: UserSummary;
  due_date: string | null;
  resolved_at: string | null;
  labels: IssueLabel[];
  created_at: string;
  updated_at: string;
}

// --- Phases ---
export type PhaseStatus = "planned" | "active" | "completed";

export interface Phase {
  id: string;
  workspace_id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: PhaseStatus;
  start_date: string | null;
  end_date: string | null;
  task_count: number;
  created_at: string;
}

// --- Time Logs ---
export interface TimeLog {
  id: string;
  workspace_id: string;
  project_id: string;
  task_id: string;
  task: { id: string; title: string };
  user: UserSummary;
  description: string | null;
  hours: number;
  logged_date: string;
  created_at: string;
}

export interface TimesheetEntry {
  user: UserSummary;
  week_start: string;
  total_hours: number;
  daily_hours: Record<string, number>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface ApiError {
  error: string;
  message: string;
  detail?: unknown;
}
