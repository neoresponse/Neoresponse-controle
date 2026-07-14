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
