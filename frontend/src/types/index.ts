export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  response: string;
  session_id: string;
}

export interface Settings {
  app_id: string;
  app_secret_masked: string;
  access_token_masked: string;
  page_id: string;
  instagram_business_account_id: string;
  ig_username: string;
  ig_password_masked: string;
  api_mode: string;
  llm_provider: string;
  llm_api_key_masked: string;
  llm_model: string;
  polling_interval_seconds: number;
  monitor_enabled: boolean;
}

export interface ConversationItem {
  id: number;
  instagram_user_id: string;
  instagram_username: string;
  event_type: string;
  trigger_media_id: string;
  trigger_media_caption: string;
  agent_action: string;
  agent_message: string;
  session_id: string;
  created_at: string;
}

export interface ConversationListResponse {
  items: ConversationItem[];
  total: number;
  page: number;
  limit: number;
}

export interface MonitorStatus {
  running: boolean;
  last_poll: string | null;
  total_polls: number;
  new_followers_detected: number;
  new_likes_detected: number;
  errors: number;
}

export interface DashboardStats {
  total_conversations: number;
  total_dms_sent: number;
  total_comments_posted: number;
  total_followers_greeted: number;
}

export interface ActivityLogItem {
  id: number;
  level: string;
  message: string;
  details: string;
  created_at: string;
}
