// ═══════════════════════════════════════════════════════
// WhatsApp Cloud API — TypeScript Type Tanımları
// ═══════════════════════════════════════════════════════

// ─── DB MODELS ────────────────────────────────────────

export interface WhatsAppAccount {
  id: string;
  business_id: string;
  waba_id: string | null;
  phone_number_id: string;
  phone_number: string;
  access_token: string;
  webhook_verify_token: string;
  status: 'pending' | 'active' | 'disconnected';
  connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppConversation {
  id: string;
  business_id: string;
  customer_id: string | null;
  wa_contact_phone: string;
  wa_contact_name: string | null;
  status: 'open' | 'closed' | 'ai_handling' | 'human_handling';
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  intent: ConversationIntent | null;
  source: ConversationSource;
  campaign_id: string | null;
  ai_context: Record<string, unknown>;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  customers?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    is_vip?: boolean;
  } | null;
}

export type ConversationIntent = 
  | 'lead' 
  | 'appointment' 
  | 'support' 
  | 'winback' 
  | 'campaign_reply'
  | 'no_show_reply'
  | 'reminder_reply'
  | 'general';

export type ConversationSource = 
  | 'inbound' 
  | 'campaign' 
  | 'reminder' 
  | 'winback' 
  | 'no_show';

export interface WhatsAppMessage {
  id: string;
  business_id: string;
  conversation_id: string;
  wa_message_id: string | null;
  direction: 'inbound' | 'outbound';
  message_type: 'text' | 'template' | 'image' | 'interactive' | 'button';
  content: string | null;
  template_name: string | null;
  template_params: Record<string, unknown> | null;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  error_code: string | null;
  error_message: string | null;
  sender_type: 'system' | 'ai' | 'human' | 'customer';
  metadata: MessageMetadata;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

export interface MessageMetadata {
  intent?: string;
  campaign_id?: string;
  appointment_id?: string;
  ai_confidence?: number;
  ai_suggested_reply?: string;
  trigger?: string; // 'reminder' | 'no_show' | 'winback' | 'campaign' | 'manual'
  [key: string]: unknown;
}

// ─── META WEBHOOK TYPES ───────────────────────────────

export interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}

export interface MetaWebhookEntry {
  id: string;
  changes: MetaWebhookChange[];
}

export interface MetaWebhookChange {
  value: MetaWebhookValue;
  field: string;
}

export interface MetaWebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: MetaContact[];
  messages?: MetaInboundMessage[];
  statuses?: MetaStatusUpdate[];
}

export interface MetaContact {
  profile: { name: string };
  wa_id: string;
}

export interface MetaInboundMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'reaction' | 'interactive' | 'button' | 'location';
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  button?: { text: string; payload: string };
  context?: {
    from: string;
    id: string;
  };
}

export interface MetaStatusUpdate {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: { code: number; title: string; message: string }[];
}

// ─── META SEND API TYPES ──────────────────────────────

export interface SendTextMessagePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text';
  text: { body: string };
}

export interface SendTemplateMessagePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: { code: string };
    components?: TemplateComponent[];
  };
}

export interface TemplateComponent {
  type: 'body' | 'header' | 'button';
  parameters: TemplateParameter[];
  sub_type?: string;
  index?: number;
}

export interface TemplateParameter {
  type: 'text' | 'image' | 'document' | 'video';
  text?: string;
  image?: { link: string };
}

export interface SendInteractiveMessagePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'button' | 'list';
    header?: { type: 'text'; text: string };
    body: { text: string };
    footer?: { text: string };
    action: {
      buttons?: InteractiveButton[];
      button?: string;
      sections?: InteractiveSection[];
    };
  };
}

export interface InteractiveButton {
  type: 'reply';
  reply: { id: string; title: string };
}

export interface InteractiveSection {
  title: string;
  rows: { id: string; title: string; description?: string }[];
}

export type SendMessagePayload = 
  | SendTextMessagePayload 
  | SendTemplateMessagePayload 
  | SendInteractiveMessagePayload;

export interface MetaSendResponse {
  messaging_product: string;
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

// ─── AI INTENT TYPES ──────────────────────────────────

export interface IntentResult {
  intent: ConversationIntent;
  confidence: number;
  suggested_reply: string;
  should_auto_send: boolean;
  needs_human_review: boolean;
  suggested_actions?: SuggestedAction[];
}

export interface SuggestedAction {
  type: 'book_appointment' | 'send_campaign' | 'offer_discount' | 'escalate_human';
  label: string;
  data?: Record<string, unknown>;
}

// ─── CAMPAIGN SEND TYPES ──────────────────────────────

export interface CampaignSendResult {
  total: number;
  sent: number;
  failed: number;
  errors: { customer_id: string; phone: string; error: string }[];
}
