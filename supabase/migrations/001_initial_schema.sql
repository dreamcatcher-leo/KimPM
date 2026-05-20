-- =====================================================
-- DeliveryGuard PM for BeforePet — Initial Schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM Types
-- =====================================================

CREATE TYPE user_role AS ENUM ('founder', 'vendor', 'admin');
CREATE TYPE project_status AS ENUM ('active', 'paused', 'completed', 'archived');
CREATE TYPE feature_status AS ENUM ('planning', 'spec_draft', 'spec_approved', 'in_progress', 'completed_candidate', 'approved', 'on_hold');
CREATE TYPE feature_category AS ENUM ('신규_개발', '기존_보완', '신규_개발_기존_보완', '정책_반영', '어드민_기능', '후순위_보류');
CREATE TYPE priority_group AS ENUM ('P0', 'P1', 'P2', 'P3');
CREATE TYPE spec_version_status AS ENUM ('draft', 'approved', 'archived');
CREATE TYPE weekly_plan_status AS ENUM ('draft', 'vendor_agreed', 'approved', 'completed');
CREATE TYPE report_work_type AS ENUM ('코드_구현', '레거시_분석', '기획_정책_정리', '버그_재현_원인_분석', '테스트_QA', '배포_준비', '의사결정_대기', '외부_API_검토');
CREATE TYPE alignment_signal AS ENUM ('정상', '주의', '점검_권장');
CREATE TYPE risk_level AS ENUM ('낮음', '주의', '위험', 'Must_Check_필요');
CREATE TYPE risk_type AS ENUM ('보고_누락', '증빙_없는_완료_후보', 'Weekly_Plan_미정합', '미답변_질문', '반복_blocker', '범위_변경_위험', '기획_이탈_가능성', '검수_지연');
CREATE TYPE decision_status AS ENUM ('pending', 'approved', 'rejected', 'deferred');
CREATE TYPE change_request_status AS ENUM ('pending', 'approved', 'rejected', 'deferred');
CREATE TYPE evidence_type AS ENUM ('코드_증빙', '조사_증빙', '기획_증빙', '디버깅_증빙', '검증_증빙', '배포_증빙', '협업_증빙');
CREATE TYPE must_check_trigger AS ENUM ('정책_범위_비용_변경', '반복_blocker', '완료_후보_검수', '점검_권장_신호', '외주사_확인_요청', 'Weekly_Plan_미달성_누적');
CREATE TYPE notification_channel AS ENUM ('discord', 'email', 'in_app');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');

-- =====================================================
-- Core Tables
-- =====================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'founder',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_contact_name TEXT,
  vendor_contact_email TEXT,
  vendor_contact_discord TEXT,
  contract_start DATE NOT NULL,
  contract_end DATE NOT NULL,
  contract_amount BIGINT,
  goal TEXT NOT NULL,
  description TEXT,
  status project_status DEFAULT 'active',
  founder_id UUID REFERENCES profiles(id),
  brief_send_time TIME DEFAULT '09:00',
  discord_server_id TEXT,
  discord_daily_report_channel TEXT,
  discord_weekly_plan_channel TEXT,
  discord_risks_channel TEXT,
  discord_decisions_channel TEXT,
  discord_completion_channel TEXT,
  discord_founder_dm_channel TEXT,
  discord_webhook_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor Access Links (1-time tokens)
CREATE TABLE access_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  vendor_name TEXT,
  vendor_email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Features (기능 목록)
CREATE TABLE features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  order_key TEXT NOT NULL, -- e.g. "P0-1", "P1-3"
  name TEXT NOT NULL,
  category feature_category NOT NULL,
  description TEXT,
  expected_effect TEXT,
  priority_group priority_group NOT NULL DEFAULT 'P1',
  status feature_status DEFAULT 'planning',
  is_seed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature Specs (AI 기능 정의서)
CREATE TABLE specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  status spec_version_status DEFAULT 'draft',
  -- Spec content fields
  feature_name TEXT,
  background TEXT,
  current_problem TEXT,
  related_users TEXT,
  in_scope TEXT,
  out_of_scope TEXT,
  screen_flow TEXT,
  state_values TEXT,
  notification_conditions TEXT,
  admin_features TEXT,
  data_items TEXT,
  edge_cases TEXT,
  acceptance_criteria TEXT,
  qa_checklist JSONB DEFAULT '[]',
  vendor_expected_questions TEXT,
  vendor_answer_drafts TEXT,
  -- Meta
  raw_content TEXT, -- Full markdown output from AI
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly Plans (주간 계획)
CREATE TABLE weekly_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status weekly_plan_status DEFAULT 'draft',
  ai_draft JSONB, -- AI generated plan
  vendor_modified JSONB, -- Vendor modified plan
  final_plan JSONB, -- Founder approved plan
  planned_features UUID[], -- feature ids
  planned_deliverables TEXT,
  vendor_comment TEXT,
  founder_approved_at TIMESTAMPTZ,
  founder_approved_by UUID REFERENCES profiles(id),
  vendor_agreed_at TIMESTAMPTZ,
  discord_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Reports (외주사 일일 보고)
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  access_link_id UUID REFERENCES access_links(id),
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Required fields
  work_types report_work_type[] NOT NULL,
  related_feature_ids UUID[],
  summary TEXT NOT NULL,
  blocker TEXT,
  -- Optional fields
  files_modified TEXT,
  conclusion TEXT,
  tomorrow_plan TEXT,
  needs_founder_check BOOLEAN DEFAULT FALSE,
  -- Meta
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  discord_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Logs / Evidence Items (증빙자료)
CREATE TABLE evidence_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),
  evidence_type evidence_type NOT NULL,
  title TEXT,
  content TEXT,
  url TEXT,
  file_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Private Notes (외주사 비공개 메모)
CREATE TABLE vendor_private_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  access_link_id UUID REFERENCES access_links(id),
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Daily Assessments (AI 판단 보조 카드)
CREATE TABLE daily_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),
  assessment_date DATE NOT NULL,
  alignment_signal alignment_signal NOT NULL DEFAULT '정상',
  -- Assessment fields
  work_type_estimate TEXT,
  spec_alignment TEXT,
  weekly_plan_alignment TEXT,
  progress_signal TEXT,
  evidence_strength TEXT,
  risk_signals TEXT,
  recommended_actions TEXT,
  ai_comment TEXT,
  raw_response TEXT,
  -- Scores (0-100)
  spec_alignment_score INTEGER DEFAULT 0,
  weekly_plan_score INTEGER DEFAULT 0,
  evidence_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Must-Check Items (대표 직접 확인 필요)
CREATE TABLE must_check_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  trigger_type must_check_trigger NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  related_report_id UUID REFERENCES reports(id),
  related_feature_id UUID REFERENCES features(id),
  related_weekly_plan_id UUID REFERENCES weekly_plans(id),
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Founder Daily Briefs
CREATE TABLE founder_daily_briefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  brief_date DATE NOT NULL,
  key_signals JSONB DEFAULT '[]', -- top 3 signals
  report_summary TEXT,
  must_check_items JSONB DEFAULT '[]', -- 0-3 items
  decision_items JSONB DEFAULT '[]', -- 0-3 items
  full_content TEXT,
  discord_message_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risks (리스크)
CREATE TABLE risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  risk_type risk_type NOT NULL,
  level risk_level NOT NULL DEFAULT '낮음',
  title TEXT NOT NULL,
  description TEXT,
  related_feature_id UUID REFERENCES features(id),
  related_report_id UUID REFERENCES reports(id),
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decisions (의사결정함)
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  decision_type TEXT, -- '정책_결정', '범위_변경', '일정_영향', '비용_영향', '완료_승인', '반복_지연', '계약_범위_충돌'
  related_feature_id UUID REFERENCES features(id),
  status decision_status DEFAULT 'pending',
  founder_decision TEXT,
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES profiles(id),
  ai_recommendation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Change Requests (변경 요청)
CREATE TABLE change_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  feature_id UUID REFERENCES features(id),
  access_link_id UUID REFERENCES access_links(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  reason TEXT,
  affected_features TEXT,
  schedule_impact TEXT,
  cost_impact TEXT,
  alternative TEXT,
  ai_recommendation TEXT,
  status change_request_status DEFAULT 'pending',
  founder_decision TEXT,
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES profiles(id),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions (외주사 질문)
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  feature_id UUID REFERENCES features(id),
  access_link_id UUID REFERENCES access_links(id),
  question TEXT NOT NULL,
  context TEXT,
  answer TEXT,
  answered_at TIMESTAMPTZ,
  answered_by UUID REFERENCES profiles(id),
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Completion Candidates (완료 후보)
CREATE TABLE completion_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id),
  access_link_id UUID REFERENCES access_links(id),
  summary TEXT NOT NULL,
  evidence_ids UUID[],
  qa_results JSONB DEFAULT '{}',
  vendor_note TEXT,
  status decision_status DEFAULT 'pending',
  founder_decision TEXT,
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Motivation Events (외주사 모티베이션)
CREATE TABLE motivation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'feature_complete', 'weekly_goal_met', 'streak'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_feature_id UUID REFERENCES features(id),
  discord_message_id TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  channel notification_channel NOT NULL,
  status notification_status DEFAULT 'pending',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_discord_channel TEXT,
  target_email TEXT,
  discord_message_id TEXT,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Indexes
-- =====================================================

CREATE INDEX idx_features_project_id ON features(project_id);
CREATE INDEX idx_features_status ON features(status);
CREATE INDEX idx_specs_feature_id ON specs(feature_id);
CREATE INDEX idx_reports_project_id ON reports(project_id);
CREATE INDEX idx_reports_date ON reports(report_date);
CREATE INDEX idx_daily_assessments_report_id ON daily_assessments(report_id);
CREATE INDEX idx_must_check_project_id ON must_check_items(project_id);
CREATE INDEX idx_must_check_resolved ON must_check_items(is_resolved);
CREATE INDEX idx_risks_project_id ON risks(project_id);
CREATE INDEX idx_risks_resolved ON risks(is_resolved);
CREATE INDEX idx_decisions_project_id ON decisions(project_id);
CREATE INDEX idx_change_requests_project_id ON change_requests(project_id);
CREATE INDEX idx_access_links_token ON access_links(token);
CREATE INDEX idx_weekly_plans_project_week ON weekly_plans(project_id, week_start);

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE must_check_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_daily_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE completion_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_private_notes ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role full access profiles" ON profiles FOR ALL USING (auth.role() = 'service_role');

-- Projects: founders can manage their projects
CREATE POLICY "Founders manage own projects" ON projects FOR ALL USING (
  auth.uid() = founder_id OR auth.role() = 'service_role'
);

-- Features: founders manage, vendors read via service role
CREATE POLICY "Founders manage features" ON features FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE id = features.project_id AND founder_id = auth.uid())
  OR auth.role() = 'service_role'
);

-- Specs: founders manage, service role for vendor API
CREATE POLICY "Founders manage specs" ON specs FOR ALL USING (
  EXISTS (SELECT 1 FROM features f JOIN projects p ON f.project_id = p.id WHERE f.id = specs.feature_id AND p.founder_id = auth.uid())
  OR auth.role() = 'service_role'
);

-- Reports: service role for vendor submissions
CREATE POLICY "Service role manages reports" ON reports FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Founders view project reports" ON reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE id = reports.project_id AND founder_id = auth.uid())
);

-- Must-Check: founders only
CREATE POLICY "Founders manage must check" ON must_check_items FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE id = must_check_items.project_id AND founder_id = auth.uid())
  OR auth.role() = 'service_role'
);

-- Service role bypass for all tables
CREATE POLICY "Service role full access weekly_plans" ON weekly_plans FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Founders manage weekly_plans" ON weekly_plans FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE id = weekly_plans.project_id AND founder_id = auth.uid())
);
CREATE POLICY "Service role full access evidence" ON evidence_items FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Founders view evidence" ON evidence_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE id = evidence_items.project_id AND founder_id = auth.uid())
);
CREATE POLICY "Service role full access assessments" ON daily_assessments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Founders view assessments" ON daily_assessments FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE id = daily_assessments.project_id AND founder_id = auth.uid())
);
CREATE POLICY "Service role full access briefs" ON founder_daily_briefs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Founders view briefs" ON founder_daily_briefs FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE id = founder_daily_briefs.project_id AND founder_id = auth.uid())
);
CREATE POLICY "Service role full access risks" ON risks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Founders manage risks" ON risks FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE id = risks.project_id AND founder_id = auth.uid())
);
CREATE POLICY "Service role full access decisions" ON decisions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Founders manage decisions" ON decisions FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE id = decisions.project_id AND founder_id = auth.uid())
);
CREATE POLICY "Service role full access change_requests" ON change_requests FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Founders manage change_requests" ON change_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE id = change_requests.project_id AND founder_id = auth.uid())
);
CREATE POLICY "Service role full access questions" ON questions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Founders manage questions" ON questions FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE id = questions.project_id AND founder_id = auth.uid())
);
CREATE POLICY "Service role full access completion" ON completion_candidates FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Founders manage completion" ON completion_candidates FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE id = completion_candidates.project_id AND founder_id = auth.uid())
);
CREATE POLICY "Service role full access notifications" ON notifications FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access access_links" ON access_links FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Founders manage access_links" ON access_links FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE id = access_links.project_id AND founder_id = auth.uid())
);
CREATE POLICY "Service role full access private_notes" ON vendor_private_notes FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- Functions
-- =====================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_features_updated_at BEFORE UPDATE ON features FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_specs_updated_at BEFORE UPDATE ON specs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON risks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_decisions_updated_at BEFORE UPDATE ON decisions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_change_requests_updated_at BEFORE UPDATE ON change_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'founder')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
