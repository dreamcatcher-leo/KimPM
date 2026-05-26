// =====================================================
// 김PM — TypeScript Types
// =====================================================

export type UserRole = 'founder' | 'vendor' | 'admin'
export type ProjectStatus = 'active' | 'paused' | 'on_hold' | 'completed' | 'cancelled' | 'archived'
export type FeatureStatus = 'planning' | 'spec_draft' | 'spec_approved' | 'in_progress' | 'completed_candidate' | 'approved' | 'on_hold'
export type FeatureCategory = '신규_개발' | '기존_보완' | '신규_개발_기존_보완' | '정책_반영' | '어드민_기능' | '후순위_보류'
export type PriorityGroup = 'P0' | 'P1' | 'P2' | 'P3'
export type SpecVersionStatus = 'draft' | 'approved' | 'archived'
export type WeeklyPlanStatus = 'draft' | 'vendor_agreed' | 'approved' | 'completed'
export type AlignmentSignal = '정상' | '주의' | '점검_권장'
export type RiskLevel = '낮음' | '주의' | '위험' | 'Must_Check_필요'
export type RiskType = '보고_누락' | '증빙_없는_완료_후보' | 'Weekly_Plan_미정합' | '미답변_질문' | '반복_blocker' | '범위_변경_위험' | '기획_이탈_가능성' | '검수_지연'
export type DecisionStatus = 'pending' | 'approved' | 'rejected' | 'deferred'
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected' | 'deferred'
export type EvidenceType = '코드_증빙' | '조사_증빙' | '기획_증빙' | '디버깅_증빙' | '검증_증빙' | '배포_증빙' | '협업_증빙'
export type MustCheckTrigger = '정책_범위_비용_변경' | '반복_blocker' | '완료_후보_검수' | '점검_권장_신호' | '외주사_확인_요청' | 'Weekly_Plan_미달성_누적'
export type WorkType = '코드_구현' | '레거시_분석' | '기획_정책_정리' | '버그_재현_원인_분석' | '테스트_QA' | '배포_준비' | '의사결정_대기' | '외부_API_검토'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  vendor_name: string
  vendor_contact_name: string | null
  vendor_contact_email: string | null
  vendor_contact_discord: string | null
  contract_start: string
  contract_end: string
  contract_amount: number | null
  goal: string
  description: string | null
  status: ProjectStatus
  founder_id: string | null
  brief_send_time: string
  discord_server_id: string | null
  discord_daily_report_channel: string | null
  discord_weekly_plan_channel: string | null
  discord_risks_channel: string | null
  discord_decisions_channel: string | null
  discord_completion_channel: string | null
  discord_founder_dm_channel: string | null
  discord_webhook_url: string | null
  discord_channel_id: string | null
  /** 채널 분리 — 일일보고 전용 웹훅 */
  discord_webhook_daily: string | null
  /** 채널 분리 — Must-Check 경보 전용 웹훅 */
  discord_webhook_mustcheck: string | null
  /** 채널 분리 — 리스크 감지 전용 웹훅 */
  discord_webhook_risk: string | null
  /** 채널 분리 — 의사결정 / 완료 알림 전용 웹훅 */
  discord_webhook_decision: string | null
  vendor_report_reminder_time: string | null
  created_at: string
  updated_at: string
}

export interface AccessLink {
  id: string
  project_id: string
  token: string
  vendor_name: string | null
  vendor_email: string | null
  is_active: boolean
  last_used_at: string | null
  expires_at: string | null
  created_at: string
  vendor_user_id?: string | null
  onboarding_completed?: boolean
}

export interface Feature {
  id: string
  project_id: string
  order_key: string
  name: string
  category: FeatureCategory
  description: string | null
  expected_effect: string | null
  priority_group: PriorityGroup
  priority: PriorityGroup
  status: FeatureStatus
  spec_status: 'none' | 'draft' | 'approved' | null
  is_seed: boolean
  created_at: string
  updated_at: string
}

export interface Spec {
  id: string
  feature_id: string
  version: number
  status: SpecVersionStatus
  feature_name: string | null
  background: string | null
  current_problem: string | null
  related_users: string | null
  in_scope: string | null
  out_of_scope: string | null
  screen_flow: string | null
  state_values: string | null
  notification_conditions: string | null
  admin_features: string | null
  data_items: string | null
  edge_cases: string | null
  acceptance_criteria: string | null
  qa_checklist: QAChecklistItem[]
  vendor_expected_questions: string | null
  vendor_answer_drafts: string | null
  raw_content: string | null
  approved_at: string | null
  approved_by: string | null
  sent_at: string | null        // 외주사 전달 시각 (kimpm 확장)
  viewed_at: string | null      // 외주사 최초 열람 시각 (kimpm 확장)
  created_at: string
  updated_at: string
}

// 기능정의서 전달 상태
export type SpecDeliveryStatus = 'not_sent' | 'sent' | 'viewed'

export interface QAChecklistItem {
  id: string
  category: string
  item: string
  checked: boolean
}

export interface WeeklyPlan {
  id: string
  project_id: string
  week_start: string
  week_end: string
  status: WeeklyPlanStatus
  ai_draft: WeeklyPlanContent | null
  vendor_modified: WeeklyPlanContent | null
  final_plan: WeeklyPlanContent | null
  planned_features: string[]
  planned_deliverables: string | null
  vendor_comment: string | null
  plan_items: { planned?: boolean; achieved?: boolean; description?: string }[] | null
  founder_approved_at: string | null
  founder_approved_by: string | null
  vendor_agreed_at: string | null
  discord_message_id: string | null
  created_at: string
  updated_at: string
}

export interface WeeklyPlanContent {
  summary?: string
  goals?: WeeklyPlanGoal[]
  feature_plans?: FeaturePlan[]
  deliverables?: string[]
  notes?: string
}

export interface WeeklyPlanGoal {
  feature: string
  target: string
  risk?: string
  deliverable?: string
}

export interface FeaturePlan {
  feature_id?: string
  feature_name?: string
  planned_work?: string
  expected_output?: string
}

export interface Report {
  id: string
  project_id: string
  access_link_id: string | null
  report_date: string
  work_types: WorkType[]
  related_feature_ids: string[]
  summary: string
  blocker: string | null
  files_modified: string | null
  conclusion: string | null
  tomorrow_plan: string | null
  needs_founder_check: boolean
  overall_status: 'on_track' | 'at_risk' | 'blocked'
  progress_rate: number | null
  submitted_at: string
  discord_message_id: string | null
  created_at: string
  // Joined
  evidence_items?: EvidenceItem[]
  daily_assessment?: DailyAssessment | null
  daily_assessments?: DailyAssessment[]
  related_features?: Feature[]
}

export interface EvidenceItem {
  id: string
  report_id: string
  project_id: string
  evidence_type: EvidenceType
  title: string | null
  content: string | null
  url: string | null
  file_url: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface VendorPrivateNote {
  id: string
  project_id: string
  access_link_id: string | null
  note_date: string
  content: string
  created_at: string
  updated_at: string
}

export interface DailyAssessment {
  id: string
  report_id: string
  project_id: string
  assessment_date: string
  alignment_signal: AlignmentSignal
  work_type_estimate: string | null
  spec_alignment: string | null
  weekly_plan_alignment: string | null
  progress_signal: string | null
  evidence_strength: string | null
  risk_signals: string | null
  recommended_actions: string | null
  ai_comment: string | null
  raw_response: string | null
  spec_alignment_score: number
  weekly_plan_score: number
  evidence_score: number
  created_at: string
}

export interface MustCheckItem {
  id: string
  project_id: string
  trigger_type: string
  title: string
  description: string | null
  related_report_id: string | null
  related_feature_id: string | null
  related_weekly_plan_id: string | null
  related_id: string | null
  related_type: string | null
  is_resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
}

export interface FounderDailyBrief {
  id: string
  project_id: string
  brief_date: string
  key_signals: BriefSignal[]
  report_summary: string | null
  must_check_items: BriefMustCheck[]
  decision_items: BriefDecision[]
  full_content: string | null
  discord_message_id: string | null
  sent_at: string | null
  created_at: string
}

export interface BriefSignal {
  type: 'positive' | 'warning' | 'critical'
  title: string
  description: string
}

export interface BriefMustCheck {
  id: string
  title: string
  trigger_type: MustCheckTrigger
}

export interface BriefDecision {
  id: string
  title: string
  decision_type: string
}

export interface Risk {
  id: string
  project_id: string
  risk_type: RiskType
  level: RiskLevel
  title: string
  description: string | null
  related_feature_id: string | null
  related_report_id: string | null
  is_resolved: boolean
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface Decision {
  id: string
  project_id: string
  title: string
  description: string | null
  context: string | null
  options: { label: string; description: string }[] | null
  decision_type: string | null
  related_feature_id: string | null
  related_id: string | null
  related_type: string | null
  status: DecisionStatus
  founder_decision: string | null
  decided_at: string | null
  decided_by: string | null
  ai_recommendation: string | null
  created_at: string
  updated_at: string
}

export interface ChangeRequest {
  id: string
  project_id: string
  feature_id: string | null
  access_link_id: string | null
  title: string
  content: string
  reason: string | null
  affected_features: string | null
  schedule_impact: string | null
  cost_impact: string | null
  alternative: string | null
  ai_recommendation: string | null
  priority_level: 'low' | 'medium' | 'high' | 'critical' | null
  status: ChangeRequestStatus
  founder_comment: string | null
  founder_decision: string | null
  decided_at: string | null
  decided_by: string | null
  applied_at: string | null
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  project_id: string
  feature_id: string | null
  access_link_id: string | null
  question: string
  context: string | null
  answer: string | null
  answered_at: string | null
  answered_by: string | null
  is_resolved: boolean
  created_at: string
}

export interface CompletionCandidate {
  id: string
  project_id: string
  feature_id: string
  access_link_id: string | null
  summary: string
  evidence_ids: string[]
  qa_results: Record<string, boolean>
  vendor_note: string | null
  status: DecisionStatus
  founder_decision: string | null
  decided_at: string | null
  decided_by: string | null
  created_at: string
  // Joined
  feature?: Feature
}

export interface MotivationEvent {
  id: string
  project_id: string
  event_type: string
  title: string
  message: string
  related_feature_id: string | null
  discord_message_id: string | null
  sent_at: string
}

export interface Notification {
  id: string
  project_id: string | null
  channel: 'discord' | 'email' | 'in_app'
  status: 'pending' | 'sent' | 'failed'
  title: string
  content: string
  target_discord_channel: string | null
  target_email: string | null
  discord_message_id: string | null
  sent_at: string | null
  error_message: string | null
  created_at: string
}

// Dashboard types
export interface ProjectSummary {
  project: Project
  total_features: number
  approved_features: number
  in_progress_features: number
  pending_must_checks: number
  pending_decisions: number
  open_risks: number
  last_report_date: string | null
  this_week_plan: WeeklyPlan | null
  alignment_signal: AlignmentSignal | null
}

// Vendor access context
export interface VendorContext {
  access_link: AccessLink
  project: Project
  approved_specs: Spec[]
}
