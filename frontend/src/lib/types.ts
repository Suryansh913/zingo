export interface Video { id: number; owner: string; file: string | null; thumbnail: string | null; caption: string; hashtags: string; mood: string;
  visibility: string; created: string; like_count: number; comment_count: number; liked: boolean; owner_following: boolean; story_root: number | null; }
export interface Comment { id: number; user: string; text: string; parent: number | null; created: string; }
export interface Profile { id: number; username: string; bio: string; city: string; is_private: boolean; followers: number; following: number; is_me?: boolean; is_following?: boolean; email?: string; date_of_birth?: string | null; interests?: string[]; language?: string; }
export interface CursorPage<T> { results: T[]; next: string | null; }
export interface FeedPage<T> { results: T[]; next_offset: number | null; }
export interface Option { id: number; label: string; next_node: number | null; votes: number; percent: number; }
export interface NodeState { node: number; story: number; closes_at: string | null; prompt: string; video: number | null; video_available: boolean; open: boolean; total_votes: number; my_vote: number | null; winner: number | null; options: Option[]; }
export interface Tree { story: number; title: string; nodes: { id: number; root: boolean; video: number | null; options: { id: number; label: string; next: number | null }[] }[]; }
export const MOODS = ["happy", "chill", "romantic", "sad", "motivated", "funny", "adventure", "study", "party", "random"];
export interface BEntry { id: number; label: string; available: boolean; is_mine: boolean; user: string | null;
  video: { file: string | null; thumbnail: string | null; caption: string; id: number | null } | null; votes: number | null; percent: number | null; }
export interface Battle { id: number; title: string; status: "open" | "pending" | "active" | "finished" | "declined" | "cancelled" | "expired"; blind: boolean; revealed: boolean;
  result: "" | "winner" | "tie" | "forfeit" | "void"; creator: string | null; opponent: string | null; winner: string | null; winner_entry: number | null;
  voting_hours: number; created: string; starts_at: string | null; ends_at: string | null; challenge_expires_at: string; total_votes: number; my_vote: number | null;
  counts_hidden: boolean; rematch_of: number | null; entries: BEntry[];
  viewer: { is_participant: boolean; can_vote: boolean; can_accept: boolean; can_decline: boolean; can_withdraw: boolean; can_rematch: boolean }; }
export type SharedVideo = { unavailable: true } | { id: number; caption: string; thumbnail: string | null; file: string | null; owner: string };
export interface ChatMsg { id: number; conversation: number; sender: string; kind: "text" | "video"; text: string; created: string; client_id: string; video: SharedVideo | null; status?: "sending" | "failed"; error?: string; }
export interface Conv { id: number; other: { id: number; username: string }; unread: number; updated: string; last_message: { sender: string; kind: string; text: string; created: string } | null; }
export interface ConvDetail { id: number; other: { id: number; username: string }; other_last_read_id: number; can_message: boolean; reason: string; }
export interface Notif { id: number; kind: string; actor: string | null; read: boolean; created: string; video: number | null; conversation: number | null; battle: number | null; story_node: number | null; }
export interface MSession { id: number; mode: string; status: "pending" | "active" | "ended" | "declined" | "expired"; role: "caller" | "callee"; accept_deadline: string; i_accepted: boolean; peer_accepted: boolean;
  started_at: string | null; ended_at: string | null; end_reason: string; shared_interests: string[]; other: { username: string; bio: string; is_creator: boolean; is_following: boolean }; }
export interface Elig { eligible: boolean; reasons: string[]; consent: boolean; launch_state: string; age_note: string; has_dob: boolean; is_creator: boolean; turn_configured: boolean; age_verified: boolean; }
export interface HomeStoryVideo { id: number; file: string | null; thumbnail: string | null; caption: string; created: string; seen: boolean; }
export interface HomeStory { username: string; is_me: boolean; seen: boolean; videos: HomeStoryVideo[]; }
export interface Suggestion { username: string; bio: string; followers: number; is_following: boolean; }
export interface SearchResult { q: string; users: Suggestion[]; videos: Video[]; hashtags: { tag: string; count: number }[]; }
export interface StoryCard { story: number; title: string; node: number; owner: string; prompt: string; open: boolean; total_votes: number; created: string; video: { id: number; file: string | null; thumbnail: string | null }; }
export interface DatePhoto { id: number; url: string; }
export interface DateProfile { exists: true; username: string; age: number | null; bio: string; gender: string; interested_in: string[]; interests: string[]; intention: string; city: string; min_age: number; max_age: number; is_active: boolean; moderation_hold: boolean; photos: DatePhoto[]; missing: string[]; }
export interface DateState { exists: boolean; profile: DateProfile | null; eligible: boolean; reasons: string[]; launch_state: string; age_verified: boolean; age_note: string; has_dob: boolean; }
export interface DatePrefs { genders: string[]; interested_in_options: string[]; intentions: string[]; limits: { min_age: number; max_age: number; max_photos: number; photo_mb: number; bio_max: number; likes_per_day: number }; }
export interface DateCard { username: string; age: number | null; bio: string; city: string; interests: string[]; shared_interests: string[]; intention: string; photos: DatePhoto[]; social_visible: boolean; }
export interface DateMatchItem { username: string; age: number | null; city: string; photos: DatePhoto[]; interests: string[]; conversation: number | null; matched_at: string; }
