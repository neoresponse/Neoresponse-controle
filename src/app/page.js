"use client";

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
  Percent,
  Calendar,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  HelpCircle,
  LogOut,
  Plus,
  Search,
  Trash2,
  Filter
} from "lucide-react";
import styles from "@/app/page.module.css";
import { useStore } from "@/lib/store";

// Importar Componentes Locais Simplificados
import DashboardCharts from "@/app/components/DashboardCharts";
import FinanceiroSection from "@/app/components/FinanceiroSection";
import WorkspaceSection from "@/app/components/WorkspaceSection";

// Estruturas de Processos Padrão (SOPs) para a Linha de Produção
const PROCESS_FRAMEWORKS = [
  {
    id: "framework-1",
    title: "Setup de Campanha (Nomenclatura e Rastreamento)",
    category: "Tráfego Pago",
    description: "Estrutura padrão para subida de campanhas de conversão focada em otimização de pixel e nomenclatura limpa.",
    steps: [
      "Verificar se o Pixel/CAPI está ativo e recebendo eventos de PageView e Purchase.",
      "Criar Campanha usando nomenclatura: [PRODUTO] - [PLATAFORMA] - [TIPO] - [DATA] (ex: NEO-META-CONV-3006).",
      "Definir orçamento (CBO) para campanhas em escala ou ABO para testes de públicos.",
      "Configurar Públicos: 1 conjunto de Lookalike, 1 conjunto de Interesses e 1 conjunto Aberto (Excluir compradores dos últimos 30 dias).",
      "Subir 3 criativos diferentes em cada conjunto de anúncio (Variação de imagem, carrossel e vídeo).",
      "Garantir que os parâmetros UTM de rastreamento de origem estão inseridos em todos os links."
    ],
    metric: "Custo por Clique (CPC) < R$ 1.50"
  },
  {
    id: "framework-2",
    title: "Otimização Diária de Escala e Corte",
    category: "Otimização",
    description: "Protocolo de decisão financeira diária para orçamentos de tráfego pago baseando-se no ROAS e custo por compra.",
    steps: [
      "Analisar métricas do dia anterior até as 10h da manhã.",
      "Se o ROAS da Campanha estiver abaixo de 1.2x E o prejuízo for maior que o custo de 1 conversão, pausar os conjuntos de menor desempenho.",
      "Se o ROAS da Campanha estiver entre 1.5x e 2.0x, manter orçamento sem alterações.",
      "Se o ROAS da Campanha estiver acima de 2.2x E tiver mais de 5 conversões, aumentar o orçamento diário em 15% (no CBO).",
      "Pausar criativos que gastaram o equivalente ao valor de CPA Ideal e não geraram vendas."
    ],
    metric: "CPA Médio menor que o Custo do Produto"
  },
  {
    id: "framework-3",
    title: "Linha de Produção de Vídeos de Alta Conversão (UGC)",
    category: "Criativos",
    description: "Estrutura psicológica para produção de roteiros de anúncios rápidos de 30 a 60 segundos.",
    steps: [
      "Gancho (0-3s): Chamar a atenção com quebra de padrão visual ou frase impactante (ex: 'Esse é o segredo que as marcas escondem...').",
      "Problema (3-15s): Apresentar a dor comum do público-alvo mostrando na prática.",
      "Solução (15-30s): Apresentar o produto resolvendo o problema de forma mágica e rápida (Efeito Antes/Depois).",
      "Benefícios (30-45s): Listar os 3 principais benefícios de forma dinâmica.",
      "Chamada para Ação - CTA (45-60s): Instrução clara para clique com gatilho de escassez ou desconto exclusivo."
    ],
    metric: "CTR de Entrada (Taxa de Clique) > 2.5%"
  }
];

export default function MainApp() {
  const {
    loading,
    usingSupabase,
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    kpis,
    chartTimeline,
    insights,
    filteredExpenses,
    filteredRevenues,
    addExpense,
    deleteExpense,
    addRevenue,
    deleteRevenue,
    user,
    login,
    logout
  } = useStore();

  // Controle de Abas Gerais do App
  const [appTab, setAppTab] = useState("financeiro"); // 'financeiro', 'frameworks', 'brainstorm'

  // Estados do Brainstorm / Insights
  const [ideas, setIdeas] = useState([]);
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaCategory, setIdeaCategory] = useState("Criativos");
  const [ideaDescription, setIdeaDescription] = useState("");
  const [ideaImpact, setIdeaImpact] = useState("Médio");

  // Estado do Framework ativo
  const [activeFramework, setActiveFramework] = useState("framework-1");

  // Estado do Checklist dos Frameworks
  const [checkedSteps, setCheckedSteps] = useState({});

  // Efeito para carregar dados persistidos de brainstorm e checklist
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedIdeas = localStorage.getItem("neo_brainstorm_ideas");
      if (savedIdeas) {
        setIdeas(JSON.parse(savedIdeas));
      } else {
        const initialIdeas = [
          {
            id: "idea-1",
            title: "Gancho UGC de 3 Segundos no TikTok",
            category: "Criativos",
            description: "Testar um gancho mostrando o produto quebrando e sendo consertado logo nos primeiros 3 segundos para reter atenção.",
            impact: "Alto",
            status: "fila"
          },
          {
            id: "idea-2",
            title: "Página de Pré-Venda Quiz Interativo",
            category: "Landing Page",
            description: "Criar um quiz de 5 perguntas antes da oferta para aquecer o público de tráfego frio e aumentar a taxa de conversão final.",
            impact: "Médio",
            status: "executada"
          }
        ];
        setIdeas(initialIdeas);
        localStorage.setItem("neo_brainstorm_ideas", JSON.stringify(initialIdeas));
      }

      const savedSteps = localStorage.getItem("neo_checked_steps");
      if (savedSteps) {
        setCheckedSteps(JSON.parse(savedSteps));
      }
    }
  }, []);

  const addIdea = (title, category, description, impact) => {
    const newIdea = {
      id: `idea-${Date.now()}`,
      title,
      category,
      description,
      impact,
      status: "fila"
    };
    const updated = [newIdea, ...ideas];
    setIdeas(updated);
    localStorage.setItem("neo_brainstorm_ideas", JSON.stringify(updated));
  };

  const deleteIdea = (id) => {
    const updated = ideas.filter((i) => i.id !== id);
    setIdeas(updated);
    localStorage.setItem("neo_brainstorm_ideas", JSON.stringify(updated));
  };

  const toggleIdeaStatus = (id) => {
    const updated = ideas.map((i) => {
      if (i.id === id) {
        return { ...i, status: i.status === "fila" ? "executada" : "fila" };
      }
      return i;
    });
    setIdeas(updated);
    localStorage.setItem("neo_brainstorm_ideas", JSON.stringify(updated));
  };

  const toggleStep = (frameworkId, stepIdx) => {
    const key = `${frameworkId}-${stepIdx}`;
    const updated = { ...checkedSteps, [key]: !checkedSteps[key] };
    setCheckedSteps(updated);
    localStorage.setItem("neo_checked_steps", JSON.stringify(updated));
  };

  // Estados para o formulário de login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Estados para o controle da tabela unificada de transações
  const [transactionTab, setTransactionTab] = useState("todas"); // 'todas', 'gastos', 'receitas'
  const [searchQuery, setSearchQuery] = useState("");

  // Estados para os Modais de Entrada
  const [activeModal, setActiveModal] = useState(null); // 'expense', 'revenue' ou null
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const success = login(email, password);
    if (!success) {
      setLoginError("Credenciais inválidas. Verifique seu e-mail e senha.");
    } else {
      setLoginError("");
    }
  };

  // Processa e une os gastos e receitas em uma única lista cronológica
  const consolidatedTransactions = useMemo(() => {
    const list = [];
    
    // Adicionar gastos
    filteredExpenses.forEach((exp) => {
      list.push({
        ...exp,
        type: "expense",
        displayType: "Gasto",
        colorClass: "text-danger"
      });
    });

    // Adicionar receitas
    filteredRevenues.forEach((rev) => {
      list.push({
        ...rev,
        type: "revenue",
        displayType: "Receita",
        colorClass: "text-success"
      });
    });

    // Ordenar por data (mais recente primeiro) e depois por criação
    return list
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .filter((t) => {
        // Filtro de Aba
        if (transactionTab === "gastos" && t.type !== "expense") return false;
        if (transactionTab === "receitas" && t.type !== "revenue") return false;
        
        // Filtro de Busca por Descrição
        if (searchQuery.trim() !== "") {
          return t.description.toLowerCase().includes(searchQuery.toLowerCase());
        }
        
        return true;
      });
  }, [filteredExpenses, filteredRevenues, transactionTab, searchQuery]);

  // Envio do Formulário de Transação Simplificado
  const handleTransactionSubmit = (e) => {
    e.preventDefault();
    if (!formDescription || !formAmount) return;

    const data = {
      date: formDate,
      description: formDescription,
      amount: parseFloat(formAmount)
    };

    if (activeModal === "expense") {
      addExpense(data);
    } else if (activeModal === "revenue") {
      addRevenue(data);
    }

    // Resetar campos e fechar modal
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormDescription("");
    setFormAmount("");
    setActiveModal(null);
  };

  const handleTransactionDelete = (id, type, desc) => {
    if (confirm(`Deseja remover permanentemente o lançamento "${desc}"?`)) {
      if (type === "expense") {
        deleteExpense(id);
      } else {
        deleteRevenue(id);
      }
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle size={16} className="text-success" />;
      case "danger":
        return <AlertTriangle size={16} className="text-danger" />;
      case "warning":
        return <AlertTriangle size={16} className="text-warning" />;
      case "info":
        return <Lightbulb size={16} className="text-brand" />;
      default:
        return <HelpCircle size={16} className="text-muted" />;
    }
  };

  // Intercepta a exibição se o usuário não estiver autenticado (Visual Ultra-Minimalista Premium Ampliado)
  if (!user) {
    return (
      <div className="login-container">
        <style>{`
          .login-container {
            display: flex;
            min-height: 100vh;
            width: 100%;
            align-items: center;
            justify-content: center;
            background-color: #040405;
            background-image: radial-gradient(circle at 50% 50%, #0e0e12 0%, #030304 100%);
            padding: 1.5rem;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: #e5e7eb;
          }
          .login-card {
            width: 100%;
            max-width: 440px;
            background-color: #08080a;
            border: 1px solid rgba(166, 134, 80, 0.15);
            border-radius: 12px;
            padding: 4rem 3rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-shadow: 0 30px 65px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.02);
            animation: loginFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .login-logo-container {
            margin-bottom: 2.5rem;
            display: flex;
            justify-content: center;
            position: relative;
            align-items: center;
            width: 100%;
            height: 260px;
          }
          /* Aura de brilho dourado suave atrás do logo */
          .login-logo-container::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 340px;
            height: 340px;
            background: radial-gradient(circle, rgba(166, 134, 80, 0.18) 0%, rgba(166, 134, 80, 0.05) 50%, transparent 70%);
            filter: blur(40px);
            z-index: 0;
            pointer-events: none;
          }
          .login-logo-container::after {
            content: '';
            position: absolute;
            bottom: -15px;
            width: 60px;
            height: 1px;
            background: linear-gradient(90deg, transparent, #a68650, transparent);
            z-index: 2;
          }
          .login-logo-image {
            width: 260px;
            height: 260px;
            filter: drop-shadow(0 12px 40px rgba(223, 193, 138, 0.12));
            position: relative;
            z-index: 1;
          }
          .login-form {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
          }
          .login-input {
            width: 100%;
            height: 52px;
            background-color: #040405;
            border: 1px solid #181820;
            border-radius: 6px;
            padding: 0 18px;
            color: #f3f4f6;
            font-size: 0.95rem;
            outline: none;
            transition: all 0.2s ease;
          }
          .login-input:focus {
            border-color: #a68650;
            box-shadow: 0 0 0 3px rgba(166, 134, 80, 0.1);
            background-color: #07070a;
          }
          .login-input::placeholder {
            color: #3f3f46;
          }
          .login-button {
            width: 100%;
            height: 52px;
            border-radius: 6px;
            border: 1px solid #8c6f42;
            background: linear-gradient(135deg, #d2b47a 0%, #a68650 50%, #8c6f42 100%);
            color: #08080a;
            font-weight: 700;
            font-size: 0.95rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 8px 24px rgba(166, 134, 80, 0.12);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .login-button:hover {
            transform: translateY(-1.5px);
            box-shadow: 0 12px 30px rgba(166, 134, 80, 0.22);
            background: linear-gradient(135deg, #e7d1a5 0%, #d2b47a 50%, #a68650 100%);
          }
          .login-button:active {
            transform: translateY(0);
          }
          .login-error-container {
            background-color: rgba(239, 68, 68, 0.04);
            border: 1px solid rgba(239, 68, 68, 0.15);
            padding: 12px 14px;
            border-radius: 6px;
            color: #ef4444;
            font-size: 0.8rem;
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
          }
          @keyframes loginFadeIn {
            from { opacity: 0; transform: translateY(15px) scale(0.99); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        <div className="login-card">
          {/* Logo Dourado Centralizado com Efeito Gold Glow e Aura */}
          <div className="login-logo-container">
            <img 
              src="/logo.svg" 
              alt="NEORESPONSE Logo" 
              className="login-logo-image" 
            />
          </div>

          {/* Formulário de Login */}
          <form onSubmit={handleLoginSubmit} className="login-form">
            {loginError && (
              <div className="login-error-container">
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>{loginError}</span>
              </div>
            )}

            <div style={{ marginBottom: "0" }}>
              <input
                type="email"
                className="login-input"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: "0" }}>
              <input
                type="password"
                className="login-input"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-button">
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderFrameworksTab = () => {
    const selectedFramework = PROCESS_FRAMEWORKS.find(f => f.id === activeFramework) || PROCESS_FRAMEWORKS[0];
    
    return (
      <div className="framework-layout fade-in">
        {/* Lista de Frameworks na Esquerda */}
        <div className="framework-list">
          <div style={{ marginBottom: "1rem" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: "600" }}>Linhas de Produção (SOPs)</h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>Selecione um processo padrão para estruturar a linha de produção.</p>
          </div>
          
          {PROCESS_FRAMEWORKS.map((framework) => {
            const isActive = selectedFramework.id === framework.id;
            return (
              <button
                key={framework.id}
                className={`framework-card ${isActive ? "framework-card-active" : ""}`}
                onClick={() => setActiveFramework(framework.id)}
              >
                <span className="framework-badge">{framework.category}</span>
                <h4 style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", fontWeight: "600", marginTop: "0.25rem", color: isActive ? "#DFC18A" : "#f3f4f6" }}>
                  {framework.title}
                </h4>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                  {framework.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Detalhe do Processo e Checklist na Direita */}
        <div className="framework-detail">
          <div style={{ borderBottom: "1px solid rgba(166, 134, 80, 0.15)", paddingBottom: "1.25rem", marginBottom: "1.25rem" }}>
            <span className="framework-badge" style={{ marginBottom: "0.5rem" }}>{selectedFramework.category}</span>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: "700", color: "#DFC18A" }}>
              {selectedFramework.title}
            </h3>
            <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)", marginTop: "0.5rem", lineHeight: "1.4" }}>
              {selectedFramework.description}
            </p>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <h4 style={{ fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
              Etapas de Execução (Checklist)
            </h4>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {selectedFramework.steps.map((step, idx) => {
                const isStepChecked = !!checkedSteps[`${selectedFramework.id}-${idx}`];
                return (
                  <div key={idx} className="step-item">
                    <button 
                      className={`step-checkbox ${isStepChecked ? "step-checkbox-active" : ""}`}
                      onClick={() => toggleStep(selectedFramework.id, idx)}
                    >
                      ✓
                    </button>
                    <span className={`step-text ${isStepChecked ? "step-text-completed" : ""}`}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ backgroundColor: "rgba(166, 134, 80, 0.03)", border: "1px solid rgba(166, 134, 80, 0.12)", padding: "1rem 1.25rem", borderRadius: "8px" }}>
            <h4 style={{ fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", color: "#a68650", letterSpacing: "0.05em" }}>
              Métrica de Performance Desejada
            </h4>
            <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: "600", marginTop: "0.25rem" }}>
              {selectedFramework.metric}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderBrainstormTab = () => {
    const handleAddIdeaSubmit = (e) => {
      e.preventDefault();
      if (!ideaTitle || !ideaDescription) return;
      addIdea(ideaTitle, ideaCategory, ideaDescription, ideaImpact);
      setIdeaTitle("");
      setIdeaDescription("");
      setIdeaCategory("Criativos");
      setIdeaImpact("Médio");
    };

    return (
      <div className="brainstorm-layout fade-in">
        {/* Formulário de Nova Ideia */}
        <form onSubmit={handleAddIdeaSubmit} className="brain-form">
          <div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: "600" }}>Capturar Ideia</h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>Não deixe seus insights e hipóteses de tráfego sumirem.</p>
          </div>

          <div className={styles.formGroup} style={{ marginBottom: 0 }}>
            <label style={{ fontSize: "0.7rem" }}>Título da Ideia</label>
            <input
              type="text"
              placeholder="ex: Vídeo Gancho UGC com depoimento"
              className={styles.input}
              value={ideaTitle}
              onChange={(e) => setIdeaTitle(e.target.value)}
              required
              style={{ height: "40px", fontSize: "0.85rem" }}
            />
          </div>

          <div className={styles.formGroup} style={{ marginBottom: 0 }}>
            <label style={{ fontSize: "0.7rem" }}>Categoria</label>
            <select
              className={styles.select}
              value={ideaCategory}
              onChange={(e) => setIdeaCategory(e.target.value)}
              style={{ height: "40px", fontSize: "0.85rem", backgroundColor: "#040405", border: "1px solid rgba(166, 134, 80, 0.15)", borderRadius: "6px", color: "var(--text-primary)", padding: "0 10px", outline: "none" }}
            >
              <option value="Criativos">Criativos (Anúncios)</option>
              <option value="Públicos">Públicos / Segmentação</option>
              <option value="Landing Page">Landing Page / Funil</option>
              <option value="Oferta">Oferta / Copys</option>
              <option value="Operações">Operações / Outros</option>
            </select>
          </div>

          <div className={styles.formGroup} style={{ marginBottom: 0 }}>
            <label style={{ fontSize: "0.7rem" }}>Impacto Esperado</label>
            <select
              className={styles.select}
              value={ideaImpact}
              onChange={(e) => setIdeaImpact(e.target.value)}
              style={{ height: "40px", fontSize: "0.85rem", backgroundColor: "#040405", border: "1px solid rgba(166, 134, 80, 0.15)", borderRadius: "6px", color: "var(--text-primary)", padding: "0 10px", outline: "none" }}
            >
              <option value="Alto">Alto Impacto</option>
              <option value="Médio">Médio Impacto</option>
              <option value="Baixo">Baixo Impacto</option>
            </select>
          </div>

          <div className={styles.formGroup} style={{ marginBottom: 0 }}>
            <label style={{ fontSize: "0.7rem" }}>Descrição / Insight</label>
            <textarea
              placeholder="Descreva a ideia em detalhes, roteiro de criativo ou hipótese de teste..."
              className={styles.input}
              value={ideaDescription}
              onChange={(e) => setIdeaDescription(e.target.value)}
              required
              style={{ height: "100px", fontSize: "0.85rem", resize: "none", padding: "10px 14px", fontFamily: "inherit" }}
            />
          </div>

          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ justifyContent: "center", height: "40px", fontWeight: "600" }}>
            Salvar Insight
          </button>
        </form>

        {/* Lista/Grid de Ideias */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: "600" }}>Banco de Brainstorm</h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>Ideias salvas e prontas para validação.</p>
          </div>

          <div className="ideas-grid">
            {ideas.map((idea) => {
              const isExecuted = idea.status === "executada";
              return (
                <div key={idea.id} className={`idea-card ${isExecuted ? "idea-card-executed" : ""}`}>
                  
                  {/* Cabeçalho do Card */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                    <span className="idea-badge" style={{ 
                      color: idea.category === "Criativos" ? "#DFC18A" : 
                             idea.category === "Públicos" ? "#3b82f6" : 
                             idea.category === "Landing Page" ? "#10b981" : "#f59e0b"
                    }}>
                      {idea.category}
                    </span>
                    
                    <span className="idea-badge" style={{ 
                      color: idea.impact === "Alto" ? "var(--color-danger)" : 
                             idea.impact === "Médio" ? "var(--color-warning)" : "var(--text-muted)",
                      backgroundColor: "rgba(255, 255, 255, 0.02)"
                    }}>
                      {idea.impact}
                    </span>
                  </div>

                  {/* Conteúdo */}
                  <h4 className="idea-title">{idea.title}</h4>
                  <p className="idea-desc">{idea.description}</p>

                  {/* Ações */}
                  <div className="idea-footer">
                    <button className="idea-btn-toggle" onClick={() => toggleIdeaStatus(idea.id)}>
                      {isExecuted ? "↩ Reativar" : "✓ Executada"}
                    </button>

                    <button 
                      className={`${styles.btn} ${styles.btnDanger}`}
                      onClick={() => deleteIdea(idea.id)}
                      style={{ padding: "4px 8px", fontSize: "0.7rem", height: "24px" }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
            {ideas.length === 0 && (
              <div className={styles.emptyState} style={{ gridColumn: "1 / -1", padding: "4rem 2rem" }}>
                <Sparkles size={36} className="text-muted" />
                <h3>Nenhum insight cadastrado.</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Use o formulário ao lado para registrar sua primeira ideia de tráfego.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--bg-app)" }}>
      <style>{`
        .nav-tabs {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }
        .nav-tab {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          padding: 6px 4px;
          position: relative;
          transition: color 0.2s ease;
        }
        .nav-tab:hover {
          color: #e5e7eb;
        }
        .nav-tab-active {
          color: #DFC18A;
          font-weight: 600;
        }
        .nav-tab-active::after {
          content: '';
          position: absolute;
          bottom: -22px;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, #DFC18A, #956F2E);
          border-radius: 2px;
        }
        
        /* Frameworks styles */
        .framework-layout {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 2rem;
          margin-top: 1rem;
        }
        @media (max-width: 900px) {
          .framework-layout {
            grid-template-columns: 1fr;
          }
        }
        .framework-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .framework-card {
          background-color: #08080a;
          border: 1px solid rgba(166, 134, 80, 0.12);
          border-radius: 12px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .framework-card:hover {
          border-color: rgba(166, 134, 80, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
        }
        .framework-card-active {
          border-color: #a68650;
          background-color: rgba(166, 134, 80, 0.02);
          box-shadow: 0 0 15px rgba(166, 134, 80, 0.05);
        }
        .framework-badge {
          background-color: rgba(166, 134, 80, 0.08);
          color: #a68650;
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 600;
          width: fit-content;
          border: 1px solid rgba(166, 134, 80, 0.15);
        }
        .framework-detail {
          background-color: #08080a;
          border: 1px solid rgba(166, 134, 80, 0.15);
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.6);
          height: fit-content;
          position: sticky;
          top: 90px;
        }
        .step-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }
        .step-item:last-child {
          border-bottom: none;
        }
        .step-checkbox {
          width: 18px;
          height: 18px;
          border: 1px solid #2d3039;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background-color: #040405;
          flex-shrink: 0;
          margin-top: 2px;
          color: transparent;
        }
        .step-checkbox:hover {
          border-color: #a68650;
        }
        .step-checkbox-active {
          border-color: #a68650;
          background-color: #a68650;
          color: #040405;
        }
        .step-text {
          font-size: 0.875rem;
          color: var(--text-primary);
          line-height: 1.5;
          transition: all 0.2s ease;
        }
        .step-text-completed {
          color: var(--text-muted);
          text-decoration: line-through;
        }
        
        /* Brainstorm styles */
        .brainstorm-layout {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 2rem;
        }
        @media (max-width: 900px) {
          .brainstorm-layout {
            grid-template-columns: 1fr;
          }
        }
        .brain-form {
          background-color: #08080a;
          border: 1px solid rgba(166, 134, 80, 0.15);
          border-radius: 12px;
          padding: 1.75rem;
          height: fit-content;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .ideas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.25rem;
        }
        .idea-card {
          background-color: #08080a;
          border: 1px solid rgba(166, 134, 80, 0.12);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          position: relative;
          transition: all 0.2s ease;
          text-align: left;
        }
        .idea-card:hover {
          border-color: rgba(166, 134, 80, 0.25);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4);
        }
        .idea-card-executed {
          border-color: rgba(255, 255, 255, 0.03);
          background-color: rgba(255, 255, 255, 0.01);
        }
        .idea-card-executed .idea-title {
          text-decoration: line-through;
          color: var(--text-muted);
        }
        .idea-card-executed .idea-desc {
          color: var(--text-muted);
        }
        .idea-title {
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .idea-desc {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          line-height: 1.4;
          flex-grow: 1;
        }
        .idea-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.5rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(255, 255, 255, 0.03);
        }
        .idea-btn-toggle {
          background: none;
          border: none;
          color: #a68650;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          padding: 4px 0;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .idea-btn-toggle:hover {
          text-decoration: underline;
        }
      `}</style>
      
      {/* 1. BARRA SUPERIOR PREMIUM (TOP BAR) - SEM SIDEBAR CLUTTER */}
      <header style={{ borderBottom: "1px solid rgba(166, 134, 80, 0.18)", backgroundColor: "var(--bg-surface)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", height: "70px", padding: "0 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          
          {/* Logo e Abas */}
          <div style={{ display: "flex", alignItems: "center", height: "100%", gap: "2.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
              <img 
                src="/logo.svg" 
                alt="NEORESPONSE Logo" 
                style={{ height: "54px", width: "54px", objectFit: "contain", filter: "drop-shadow(0 4px 12px rgba(166, 134, 80, 0.15))" }} 
              />
            </div>
            
            {/* Navegação por Abas */}
            <nav className="nav-tabs">
              <button 
                className={`nav-tab ${appTab === "financeiro" ? "nav-tab-active" : ""}`}
                onClick={() => setAppTab("financeiro")}
              >
                Financeiro
              </button>
              <button 
                className={`nav-tab ${appTab === "frameworks" ? "nav-tab-active" : ""}`}
                onClick={() => setAppTab("frameworks")}
              >
                Frameworks
              </button>
              <button 
                className={`nav-tab ${appTab === "brainstorm" ? "nav-tab-active" : ""}`}
                onClick={() => setAppTab("brainstorm")}
              >
                Brainstorm
              </button>
              <button 
                className={`nav-tab ${appTab === "workspace" ? "nav-tab-active" : ""}`}
                onClick={() => setAppTab("workspace")}
              >
                Workspace
              </button>
            </nav>
          </div>

          {/* Lado Direito: Status do Banco, Nome do Usuário e Botão Sair */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {/* Indicador do Banco (Supabase vs Local) */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-secondary)", marginRight: "0.5rem" }}>
              <span style={{ 
                width: "8px", 
                height: "8px", 
                borderRadius: "50%", 
                backgroundColor: usingSupabase ? "var(--color-success)" : "var(--color-warning)",
                boxShadow: usingSupabase ? "0 0 8px var(--color-success-glow)" : "0 0 8px var(--color-warning-glow)"
              }}></span>
              <span>{usingSupabase ? "Supabase (Nuvem)" : "Local (Offline)"}</span>
            </div>

            {user && (
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", letterSpacing: "0.02em", borderLeft: "1px solid rgba(166, 134, 80, 0.18)", paddingLeft: "1rem", borderRight: "1px solid rgba(166, 134, 80, 0.18)", paddingRight: "1rem", lineHeight: "1" }}>
                {user.name}
              </span>
            )}
            
            <button 
              onClick={logout} 
              className={styles.btn} 
              style={{ padding: "6px 12px", fontSize: "0.8rem", gap: "0.4rem", color: "var(--text-secondary)", borderColor: "transparent", background: "none" }}
              title="Sair da Conta"
            >
              <LogOut size={14} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. CONTEÚDO CENTRALIZADO */}
      <main style={{ flexGrow: 1, maxWidth: "1100px", width: "100%", margin: "0 auto", padding: "2rem 1.5rem" }}>
        
        {/* CONTEÚDO CONDICIONAL DE CADA ABA */}

        {/* ABA FINANCEIRO */}
        {appTab === "financeiro" && <FinanceiroSection />}

        {/* ABA FRAMEWORKS */}
        {appTab === "frameworks" && renderFrameworksTab()}

        {/* ABA BRAINSTORM */}
        {appTab === "brainstorm" && renderBrainstormTab()}

        {/* ABA WORKSPACE */}
        {appTab === "workspace" && <WorkspaceSection />}

      </main>
    </div>
  );
}
