-- task_schedules: 기능별 작업 일정 (외주사가 입력, 대표자 승인)
CREATE TABLE IF NOT EXISTS task_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  access_link_id UUID REFERENCES access_links(id) ON DELETE SET NULL,

  -- 일정 정보
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  note TEXT,

  -- 승인 상태
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_schedules_project_id ON task_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_task_schedules_feature_id ON task_schedules(feature_id);
CREATE INDEX IF NOT EXISTS idx_task_schedules_status ON task_schedules(status);

-- RLS
ALTER TABLE task_schedules ENABLE ROW LEVEL SECURITY;

-- 대표자: 본인 프로젝트의 task_schedules 전체 접근
CREATE POLICY "founder_full_access_task_schedules" ON task_schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = task_schedules.project_id
      AND p.founder_id = auth.uid()
    )
  );
