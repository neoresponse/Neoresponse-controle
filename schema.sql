-- ==========================================
-- NEORESPONSE — DATABASE SCHEMA SIMPLIFICADO (PT-BR)
-- ==========================================

-- 1. Tabela de Gastos (Saídas: Anúncios, Produção, Custos Fixos)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Tabela de Receitas (Entradas: Vendas de Infoprodutos, Assinaturas, etc.)
CREATE TABLE IF NOT EXISTS revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Tabela de Campanhas (Tráfego Pago)
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  product TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL,
  daily_budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- POLÍTICAS DE SEGURANÇA (RLS) - ACESSO PÚBLICO SIMPLIFICADO
-- Habilita segurança de linha de tabela padrão e libera o acesso anônimo para o MVP
-- ==========================================
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Políticas para tabela de gastos
CREATE POLICY "Permitir acesso público de leitura para gastos" ON expenses FOR SELECT USING (true);
CREATE POLICY "Permitir acesso público de escrita para gastos" ON expenses FOR ALL USING (true) WITH CHECK (true);

-- Políticas para tabela de receitas
CREATE POLICY "Permitir acesso público de leitura para receitas" ON revenues FOR SELECT USING (true);
CREATE POLICY "Permitir acesso público de escrita para receitas" ON revenues FOR ALL USING (true) WITH CHECK (true);

-- Políticas para tabela de campanhas
CREATE POLICY "Permitir acesso público de leitura para campanhas" ON campaigns FOR SELECT USING (true);
CREATE POLICY "Permitir acesso público de escrita para campanhas" ON campaigns FOR ALL USING (true) WITH CHECK (true);

-- 4. Tabela de Quadros de Projeto (Workspace Boards)
CREATE TABLE IF NOT EXISTS workspace_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  template_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Tabela de Colunas do Kanban (Workspace Columns)
CREATE TABLE IF NOT EXISTS workspace_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES workspace_boards(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Tabela de Cartões/Tarefas (Workspace Tasks)
CREATE TABLE IF NOT EXISTS workspace_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id UUID REFERENCES workspace_columns(id) ON DELETE CASCADE NOT NULL,
  board_id UUID REFERENCES workspace_boards(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  start_date DATE,
  due_date DATE,
  completed_date DATE,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'ativo',
  position INTEGER NOT NULL DEFAULT 0,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  comments JSONB NOT NULL DEFAULT '[]'::jsonb,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  responsibles JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Políticas RLS para Workspace
ALTER TABLE workspace_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acesso público de leitura para boards" ON workspace_boards FOR SELECT USING (true);
CREATE POLICY "Permitir acesso público de escrita para boards" ON workspace_boards FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso público de leitura para colunas" ON workspace_columns FOR SELECT USING (true);
CREATE POLICY "Permitir acesso público de escrita para colunas" ON workspace_columns FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso público de leitura para tarefas" ON workspace_tasks FOR SELECT USING (true);
CREATE POLICY "Permitir acesso público de escrita para tarefas" ON workspace_tasks FOR ALL USING (true) WITH CHECK (true);
