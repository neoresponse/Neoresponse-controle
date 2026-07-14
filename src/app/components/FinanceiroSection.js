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
  Plus,
  Search,
  Trash2,
  HelpCircle,
  Play,
  Pause,
  PlusCircle,
  DollarSign,
  BarChart3,
  CalendarDays
} from "lucide-react";
import { useStore } from "@/lib/store";
import styles from "@/app/page.module.css";

export default function FinanceiroSection() {
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
    filteredExpenses,
    filteredRevenues,
    addExpense,
    deleteExpense,
    addRevenue,
    deleteRevenue,
    campaigns,
    campaignMetrics,
    addCampaign,
    deleteCampaign,
    updateCampaignStatus
  } = useStore();

  // Controle de Sub-abas do Financeiro
  const [subTab, setSubTab] = useState("performance"); // 'performance', 'fluxo-caixa', 'previsao-campanhas'

  // Estados para a sub-aba Fluxo de Caixa (Visão do Ano)
  const [selectedMonth, setSelectedMonth] = useState(2); // default: Março (índice 2)
  const currentYear = 2026;
  const monthsNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const monthsAbbr = [
    "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
    "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"
  ];

  // Formulário de Receita na Visão do Ano
  const [revCategory, setRevCategory] = useState("Fee mensal");
  const [revDesc, setRevDesc] = useState("");
  const [revAmount, setRevAmount] = useState("");
  const [revDate, setRevDate] = useState(`2026-03-01`);

  // Formulário de Despesa na Visão do Ano
  const [expCategory, setExpCategory] = useState("Meta Ads");
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState(`2026-03-01`);

  // Estado para cadastro de nova campanha
  const [showCampModal, setShowCampModal] = useState(false);
  const [campName, setCampName] = useState("");
  const [campProduct, setCampProduct] = useState("");
  const [campPlatform, setCampPlatform] = useState("Meta");
  const [campStatus, setCampStatus] = useState("teste");
  const [campBudget, setCampBudget] = useState("");

  // Busca e Filtros na Tabela de Lançamentos do Fluxo de Caixa
  const [searchQuery, setSearchQuery] = useState("");

  // Atualiza datas dos inputs ao selecionar o mês
  const handleMonthSelect = (idx) => {
    setSelectedMonth(idx);
    const monthStr = String(idx + 1).padStart(2, "0");
    setRevDate(`2026-${monthStr}-01`);
    setExpDate(`2026-${monthStr}-01`);
  };

  // ==========================================
  // CÁLCULOS E FILTRAGENS DA ABA FLUXO DE CAIXA
  // ==========================================
  const monthlyData = useMemo(() => {
    const expensesForMonth = filteredExpenses.filter(e => {
      const d = new Date(e.date + "T12:00:00");
      return d.getMonth() === selectedMonth && d.getFullYear() === currentYear;
    });

    const revenuesForMonth = filteredRevenues.filter(r => {
      const d = new Date(r.date + "T12:00:00");
      return d.getMonth() === selectedMonth && d.getFullYear() === currentYear;
    });

    const totalExp = expensesForMonth.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const totalRev = revenuesForMonth.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

    // Unir lançamentos do mês
    const list = [
      ...expensesForMonth.map(e => ({ ...e, type: "expense", displayType: "Despesa", colorClass: "text-danger" })),
      ...revenuesForMonth.map(r => ({ ...r, type: "revenue", displayType: "Receita", colorClass: "text-success" }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Filtrar lançamentos pela busca
    const filteredList = list.filter(t => 
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Valor de caixa base de R$ 55.860,00 caso seja o mês de Março de 2026
    const baseCaixa = selectedMonth === 2 ? 55860.00 : 35000.00;
    const currentCaixa = baseCaixa + totalRev - totalExp;

    return {
      expensesList: expensesForMonth,
      revenuesList: revenuesForMonth,
      totalExpenses: totalExp,
      totalRevenues: totalRev,
      caixa: currentCaixa,
      transactions: filteredList
    };
  }, [filteredExpenses, filteredRevenues, selectedMonth, searchQuery]);

  // Envio de Receita
  const submitRevenue = (e) => {
    e.preventDefault();
    if (!revDesc || !revAmount) return;
    addRevenue({
      date: revDate,
      description: `[${revCategory}] ${revDesc}`,
      amount: parseFloat(revAmount)
    });
    setRevDesc("");
    setRevAmount("");
  };

  // Envio de Despesa
  const submitExpense = (e) => {
    e.preventDefault();
    if (!expDesc || !expAmount) return;
    addExpense({
      date: expDate,
      description: `[${expCategory}] ${expDesc}`,
      amount: parseFloat(expAmount)
    });
    setExpDesc("");
    setExpAmount("");
  };

  // Envio de Campanha
  const submitCampaign = (e) => {
    e.preventDefault();
    if (!campName || !campProduct || !campBudget) return;
    addCampaign({
      name: campName,
      product: campProduct,
      platform: campPlatform,
      status: campStatus,
      daily_budget: parseFloat(campBudget)
    });
    setCampName("");
    setCampProduct("");
    setCampPlatform("Meta");
    setCampStatus("teste");
    setCampBudget("");
    setShowCampModal(false);
  };

  // ==========================================
  // CÁLCULOS E FILTRAGENS DA ABA PERFORMANCE
  // ==========================================
  const performanceData = useMemo(() => {
    // Gastos por plataforma no mês selecionado (Julho por padrão no mockup)
    // Se não houver dados reais suficientes, usamos a base proporcional ao mockup das fotos
    let metaSpend = 0;
    let googleSpend = 0;
    let tiktokSpend = 0;
    let taboolaSpend = 0;

    filteredExpenses.forEach(e => {
      const desc = e.description.toLowerCase();
      const amt = parseFloat(e.amount || 0);
      if (desc.includes("meta") || desc.includes("facebook") || desc.includes("instagram")) {
        metaSpend += amt;
      } else if (desc.includes("google") || desc.includes("youtube") || desc.includes("adwords")) {
        googleSpend += amt;
      } else if (desc.includes("tiktok")) {
        tiktokSpend += amt;
      } else if (desc.includes("taboola") || desc.includes("native") || desc.includes("outbrain")) {
        taboolaSpend += amt;
      }
    });

    // Mock/Fallback para representação fiel das fotos caso o banco esteja limpo
    const useMock = metaSpend === 0 && googleSpend === 0;
    const finalMeta = useMock ? 118400 : metaSpend;
    const finalGoogle = useMock ? 96200 : googleSpend;
    const finalTiktok = useMock ? 41800 : tiktokSpend;
    const finalTaboola = useMock ? 28500 : taboolaSpend;

    const totalSpend = finalMeta + finalGoogle + finalTiktok + finalTaboola;

    // Percentuais para o Donut
    const metaPct = totalSpend > 0 ? (finalMeta / totalSpend) * 100 : 0;
    const googlePct = totalSpend > 0 ? (finalGoogle / totalSpend) * 100 : 0;
    const tiktokPct = totalSpend > 0 ? (finalTiktok / totalSpend) * 100 : 0;
    const taboolaPct = totalSpend > 0 ? (finalTaboola / totalSpend) * 100 : 0;

    // Limites de orçamento definidos (Imagem 1)
    const metaLimit = 140000;
    const googleLimit = 90000;
    const tiktokLimit = 60000;
    const taboolaLimit = 35000;

    return {
      meta: { spend: finalMeta, limit: metaLimit, pct: metaPct },
      google: { spend: finalGoogle, limit: googleLimit, pct: googlePct },
      tiktok: { spend: finalTiktok, limit: tiktokLimit, pct: tiktokPct },
      taboola: { spend: finalTaboola, limit: taboolaLimit, pct: taboolaPct },
      totalSpend
    };
  }, [filteredExpenses]);

  // ==========================================
  // CÁLCULOS E FILTRAGENS DA ABA PREVISÃO
  // ==========================================
  const forecastData = useMemo(() => {
    // Previsão baseada na tendência dos últimos 10 dias
    const today = new Date();
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(today.getDate() - 10);

    const expensesLast10 = filteredExpenses.filter(e => new Date(e.date) >= tenDaysAgo);
    const revenuesLast10 = filteredRevenues.filter(r => new Date(r.date) >= tenDaysAgo);

    const dailySpendAvg = expensesLast10.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) / 10;
    const dailyRevAvg = revenuesLast10.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0) / 10;

    // Se o banco for novo ou limpo, usamos os dados projetados realistas do mock (Imagem 3)
    const useMock = dailySpendAvg === 0 && dailyRevAvg === 0;
    const projectedSpend = useMock ? 1660 : dailySpendAvg * 15;
    const projectedRevenue = useMock ? 3830 : dailyRevAvg * 15;
    const projectedBalance = projectedRevenue - projectedSpend;
    const projectedRoas = projectedSpend > 0 ? projectedRevenue / projectedSpend : 2.31;
    
    // Ponto de equilíbrio de ROAS
    const breakEvenRoas = projectedRevenue > 0 ? 1.00 : 1.00;

    return {
      projectedSpend,
      projectedRevenue,
      projectedBalance,
      projectedRoas,
      breakEvenRoas
    };
  }, [filteredExpenses, filteredRevenues]);

  return (
    <div className="fade-in">
      <style>{`
        /* Abas Internas do Painel Financeiro */
        .sub-nav {
          display: flex;
          gap: 1rem;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 2rem;
          padding-bottom: 2px;
        }
        .sub-tab-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 0.825rem;
          font-weight: 500;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        .sub-tab-btn:hover {
          color: #fff;
          background-color: rgba(255, 255, 255, 0.03);
        }
        .sub-tab-btn-active {
          color: #040405;
          background-color: #DFC18A;
          font-weight: 600;
        }
        .sub-tab-btn-active:hover {
          color: #040405;
          background-color: #DFC18A;
        }

        /* KPI Grid Customizado */
        .finance-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
          margin-bottom: 2rem;
        }

        /* Donut Chart em CSS Conic Gradient */
        .donut-chart-container {
          display: flex;
          align-items: center;
          gap: 2rem;
        }
        .donut-graphic {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }
        .donut-hole {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background-color: #08080a;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          z-index: 2;
        }
        .donut-value {
          font-size: 0.95rem;
          font-weight: 700;
          color: #fff;
          line-height: 1.1;
        }
        .donut-subtext {
          font-size: 0.65rem;
          color: var(--text-muted);
          margin-top: 2px;
          text-transform: uppercase;
        }
        .donut-legend {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex-grow: 1;
        }
        .legend-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
        }
        .legend-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
        }
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        /* Budget progress bars */
        .budget-bars {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .budget-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .budget-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          font-weight: 500;
        }
        .budget-progress-bg {
          width: 100%;
          height: 8px;
          background-color: #12131a;
          border-radius: 4px;
          overflow: hidden;
        }
        .budget-progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.4s ease;
        }

        /* Grid do fluxo de caixa e ano */
        .month-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 600px) {
          .month-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .month-btn {
          background-color: #0b0c10;
          border: 1px solid rgba(255, 255, 255, 0.03);
          color: var(--text-muted);
          padding: 10px 4px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.72rem;
          font-weight: 600;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .month-btn:hover {
          border-color: rgba(166, 134, 80, 0.2);
          color: #fff;
        }
        .month-btn-active {
          border-color: #DFC18A;
          background-color: rgba(166, 134, 80, 0.04);
          color: #DFC18A;
        }

        /* Colunas de Formulário */
        .form-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        @media (max-width: 768px) {
          .form-columns {
            grid-template-columns: 1fr;
          }
        }
        .flow-form-card {
          background-color: #08080a;
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 1.5rem;
        }
        .flow-form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          padding-bottom: 0.75rem;
        }
        .flow-form-title {
          font-size: 0.95rem;
          font-weight: 700;
        }
        .flow-form-meta {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        /* SVG Line Chart com Previsão */
        .svg-chart-wrapper {
          position: relative;
          background-color: #08080a;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }
      `}</style>

      {/* Barra de Sub-abas */}
      <div className="sub-nav">
        <button
          className={`sub-tab-btn ${subTab === "performance" ? "sub-tab-btn-active" : ""}`}
          onClick={() => setSubTab("performance")}
        >
          Performance
        </button>
        <button
          className={`sub-tab-btn ${subTab === "fluxo-caixa" ? "sub-tab-btn-active" : ""}`}
          onClick={() => setSubTab("fluxo-caixa")}
        >
          Fluxo de Caixa (Visão do Ano)
        </button>
        <button
          className={`sub-tab-btn ${subTab === "previsao-campanhas" ? "sub-tab-btn-active" : ""}`}
          onClick={() => setSubTab("previsao-campanhas")}
        >
          Previsão & Campanhas
        </button>
      </div>

      {/* ==========================================
          SUB-ABA 1: PERFORMANCE
          ========================================== */}
      {subTab === "performance" && (
        <div className="fade-in">
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700", fontFamily: "var(--font-display)" }}>
                Painel de performance financeira
              </h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", backgroundColor: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "4px 10px", borderRadius: "20px", fontWeight: "600" }}>
              <span style={{ width: "6px", height: "6px", backgroundColor: "#10b981", borderRadius: "50%", display: "inline-block" }}></span>
              Julho {currentYear} • Ao vivo
            </div>
          </div>

          {/* Gráfico SVG de Duas Curvas com Previsão Tracejada */}
          <div className="svg-chart-wrapper">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.75rem" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)" }}>
                  <span style={{ width: "12px", height: "2.5px", backgroundColor: "#f59e0b", display: "inline-block" }}></span>
                  Investimento em mídia
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)" }}>
                  <span style={{ width: "12px", height: "2.5px", backgroundColor: "#06b6d4", display: "inline-block" }}></span>
                  Receita atribuída
                </span>
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                30 dias reais + 15 dias de previsão (tracejado) • R$
              </span>
            </div>

            {/* SVG Desenho Premium */}
            <div style={{ height: "160px", width: "100%", overflow: "visible" }}>
              <svg viewBox="0 0 1000 160" width="100%" height="100%" style={{ overflow: "visible" }}>
                {/* Linhas horizontais de grade */}
                <line x1="0" y1="20" x2="1000" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                <line x1="0" y1="80" x2="1000" y2="80" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                <line x1="0" y1="140" x2="1000" y2="140" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

                {/* Marcador vertical "Hoje" */}
                <line x1="720" y1="10" x2="720" y2="150" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="725" y="20" fill="var(--text-muted)" fontSize="9" fontWeight="600">hoje</text>
                <text x="725" y="145" fill="var(--text-muted)" fontSize="9">previsão →</text>

                {/* 1. Curva de Investimento (Dourada) */}
                {/* Parte Real (0 a 720) */}
                <path
                  d="M 0 120 Q 180 122, 360 115 T 720 110"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* Parte Prevista (720 a 1000) */}
                <path
                  d="M 720 110 Q 860 108, 1000 105"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />

                {/* 2. Curva de Receita (Azul) */}
                {/* Parte Real (0 a 720) */}
                <path
                  d="M 0 85 Q 180 75, 360 62 T 720 55"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* Parte Prevista (720 a 1000) */}
                <path
                  d="M 720 55 Q 860 55, 1000 52"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />

                {/* Pontos nas pontas */}
                <circle cx="720" cy="110" r="3.5" fill="#f59e0b" />
                <circle cx="720" cy="55" r="3.5" fill="#06b6d4" />
              </svg>
            </div>
          </div>

          {/* Cards de KPIs de Performance */}
          <div className="finance-kpi-grid">
            <div className={`${styles.glassCard} ${styles.kpiCard}`}>
              <div className={styles.kpiHeader}>
                <span>INVESTIDO NO MÊS</span>
              </div>
              <div className={styles.kpiValue}>
                R$ {performanceData.totalSpend.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", color: "var(--color-success)", fontWeight: "600", marginTop: "4px" }}>
                <ArrowUpRight size={12} />
                <span>12,4% vs. mês anterior</span>
              </div>
            </div>

            <div className={`${styles.glassCard} ${styles.kpiCard}`}>
              <div className={styles.kpiHeader}>
                <span>RECEITA ATRIBUÍDA</span>
              </div>
              <div className={styles.kpiValue}>
                R$ {(performanceData.totalSpend * 2.57).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", color: "var(--color-success)", fontWeight: "600", marginTop: "4px" }}>
                <ArrowUpRight size={12} />
                <span>18,9% vs. mês anterior</span>
              </div>
            </div>

            <div className={`${styles.glassCard} ${styles.kpiCard}`}>
              <div className={styles.kpiHeader}>
                <span>ROAS MÉDIO</span>
              </div>
              <div className={styles.kpiValue} style={{ color: "var(--color-success)" }}>
                2,57x
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", color: "var(--color-success)", fontWeight: "600", marginTop: "4px" }}>
                <ArrowUpRight size={12} />
                <span>0,18x</span>
              </div>
            </div>

            <div className={`${styles.glassCard} ${styles.kpiCard}`}>
              <div className={styles.kpiHeader}>
                <span>MARGEM LÍQUIDA</span>
              </div>
              <div className={styles.kpiValue}>
                R$ {(performanceData.totalSpend * 1.57 * 0.42).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", color: "var(--color-danger)", fontWeight: "600", marginTop: "4px" }}>
                <ArrowDownRight size={12} />
                <span>3,1% vs. meta</span>
              </div>
            </div>
          </div>

          {/* Linha de Baixo: Orçamento por Plataforma e Distribuição */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
            {/* Orçamento por plataforma */}
            <div className={styles.glassCard} style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: "700" }}>Orçamento por plataforma</h3>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Limite mensal definido</span>
              </div>

              <div className="budget-bars">
                {/* Meta Ads */}
                <div className="budget-item">
                  <div className="budget-header">
                    <span style={{ color: "#fff" }}>Meta Ads</span>
                    <span style={{ color: "var(--text-muted)" }}>
                      <strong style={{ color: "#fff" }}>R$ {(performanceData.meta.spend / 1000).toFixed(1)}k</strong> / R$ {(performanceData.meta.limit / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div className="budget-progress-bg">
                    <div
                      className="budget-progress-fill"
                      style={{
                        width: `${Math.min(100, (performanceData.meta.spend / performanceData.meta.limit) * 100)}%`,
                        backgroundColor: "#06b6d4"
                      }}
                    ></div>
                  </div>
                </div>

                {/* Google Ads */}
                <div className="budget-item">
                  <div className="budget-header">
                    <span style={{ color: "#fff" }}>Google Ads</span>
                    <span style={{ color: "var(--text-muted)" }}>
                      <strong style={{ color: "#ef4444" }}>R$ {(performanceData.google.spend / 1000).toFixed(1)}k</strong> <span style={{ color: "#ef4444" }}>/ R$ {(performanceData.google.limit / 1000).toFixed(0)}k</span>
                    </span>
                  </div>
                  <div className="budget-progress-bg">
                    <div
                      className="budget-progress-fill"
                      style={{
                        width: `${Math.min(100, (performanceData.google.spend / performanceData.google.limit) * 100)}%`,
                        backgroundColor: "#f87171" // Limite estourado em vermelho/coral
                      }}
                    ></div>
                  </div>
                </div>

                {/* TikTok Ads */}
                <div className="budget-item">
                  <div className="budget-header">
                    <span style={{ color: "#fff" }}>TikTok Ads</span>
                    <span style={{ color: "var(--text-muted)" }}>
                      <strong style={{ color: "#fff" }}>R$ {(performanceData.tiktok.spend / 1000).toFixed(1)}k</strong> / R$ {(performanceData.tiktok.limit / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div className="budget-progress-bg">
                    <div
                      className="budget-progress-fill"
                      style={{
                        width: `${Math.min(100, (performanceData.tiktok.spend / performanceData.tiktok.limit) * 100)}%`,
                        backgroundColor: "#a855f7"
                      }}
                    ></div>
                  </div>
                </div>

                {/* Taboola / Native */}
                <div className="budget-item">
                  <div className="budget-header">
                    <span style={{ color: "#fff" }}>Taboola / Native</span>
                    <span style={{ color: "var(--text-muted)" }}>
                      <strong style={{ color: "#fff" }}>R$ {(performanceData.taboola.spend / 1000).toFixed(1)}k</strong> / R$ {(performanceData.taboola.limit / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div className="budget-progress-bg">
                    <div
                      className="budget-progress-fill"
                      style={{
                        width: `${Math.min(100, (performanceData.taboola.spend / performanceData.taboola.limit) * 100)}%`,
                        backgroundColor: "#10b981"
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Distribuição de gasto */}
            <div className={styles.glassCard} style={{ padding: "1.75rem" }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: "700", marginBottom: "1.5rem" }}>Distribuição de gasto</h3>

              <div className="donut-chart-container">
                {/* Donut Chart SVG/CSS */}
                <div
                  className="donut-graphic"
                  style={{
                    background: `conic-gradient(
                      #06b6d4 0% ${performanceData.meta.pct}%,
                      #f87171 ${performanceData.meta.pct}% ${performanceData.meta.pct + performanceData.google.pct}%,
                      #a855f7 ${performanceData.meta.pct + performanceData.google.pct}% ${performanceData.meta.pct + performanceData.google.pct + performanceData.tiktok.pct}%,
                      #10b981 ${performanceData.meta.pct + performanceData.google.pct + performanceData.tiktok.pct}% 100%
                    )`
                  }}
                >
                  <div className="donut-hole">
                    <span className="donut-value">R$ {Math.round(performanceData.totalSpend / 1000)}k</span>
                    <span className="donut-subtext">total mês</span>
                  </div>
                </div>

                {/* Legenda */}
                <div className="donut-legend">
                  <div className="legend-item">
                    <span className="legend-label">
                      <span className="legend-dot" style={{ backgroundColor: "#06b6d4" }}></span>
                      Meta Ads
                    </span>
                    <strong style={{ color: "#fff" }}>{performanceData.meta.pct.toFixed(1)}%</strong>
                  </div>

                  <div className="legend-item">
                    <span className="legend-label">
                      <span className="legend-dot" style={{ backgroundColor: "#f87171" }}></span>
                      Google Ads
                    </span>
                    <strong style={{ color: "#fff" }}>{performanceData.google.pct.toFixed(1)}%</strong>
                  </div>

                  <div className="legend-item">
                    <span className="legend-label">
                      <span className="legend-dot" style={{ backgroundColor: "#a855f7" }}></span>
                      TikTok Ads
                    </span>
                    <strong style={{ color: "#fff" }}>{performanceData.tiktok.pct.toFixed(1)}%</strong>
                  </div>

                  <div className="legend-item">
                    <span className="legend-label">
                      <span className="legend-dot" style={{ backgroundColor: "#10b981" }}></span>
                      Native/Outros
                    </span>
                    <strong style={{ color: "#fff" }}>{performanceData.taboola.pct.toFixed(1)}%</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          SUB-ABA 2: FLUXO DE CAIXA (VISÃO DO ANO)
          ========================================== */}
      {subTab === "fluxo-caixa" && (
        <div className="fade-in">
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "700", fontFamily: "var(--font-display)" }}>Visão do ano</h2>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>{currentYear}</span>
          </div>

          {/* Grade de 12 Meses */}
          <div className="month-grid">
            {monthsAbbr.map((m, idx) => {
              const isActive = selectedMonth === idx;
              const isJuly = idx === 6; // Destaque para Julho
              return (
                <button
                  key={idx}
                  className={`month-btn ${isActive ? "month-btn-active" : ""}`}
                  onClick={() => handleMonthSelect(idx)}
                >
                  <span>{m}</span>
                  {isJuly ? (
                    <span style={{ fontSize: "0.6rem", color: "#10b981", fontWeight: "700" }}>21.360,88</span>
                  ) : (
                    <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>—</span>
                  )}
                  {isJuly && <span style={{ width: "3px", height: "3px", backgroundColor: "#f59e0b", borderRadius: "50%" }}></span>}
                </button>
              );
            })}
          </div>

          {/* Navegação e Balanço de Caixa Centralizado */}
          <div className={styles.glassCard} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2.5rem 1.5rem", marginBottom: "2rem", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1rem" }}>
              <button 
                className={`${styles.btn} ${styles.btnIcon}`} 
                onClick={() => handleMonthSelect(selectedMonth > 0 ? selectedMonth - 1 : 11)}
                style={{ width: "28px", height: "28px" }}
              >
                ‹
              </button>
              <span style={{ fontSize: "0.9rem", fontWeight: "700", letterSpacing: "0.02em", color: "#fff" }}>
                {monthsNames[selectedMonth]} {currentYear}
              </span>
              <button 
                className={`${styles.btn} ${styles.btnIcon}`} 
                onClick={() => handleMonthSelect(selectedMonth < 11 ? selectedMonth + 1 : 0)}
                style={{ width: "28px", height: "28px" }}
              >
                ›
              </button>
            </div>

            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>CAIXA</span>
            <div style={{ fontSize: "2rem", fontWeight: "800", fontFamily: "var(--font-display)", margin: "0.25rem 0", color: "#fff" }}>
              R$ {monthlyData.caixa.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              previsto para o fim do mês, somando pendentes: R$ {monthlyData.caixa.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Formulários de Receitas e Despesas Lado a Lado */}
          <div className="form-columns">
            {/* Receitas */}
            <div className="flow-form-card">
              <div className="flow-form-header">
                <span className="flow-form-title" style={{ color: "#10b981" }}>Receitas</span>
                <span className="flow-form-meta">
                  Previsto R$ 0,00 | Realizado <strong style={{ color: "#10b981" }}>R$ {monthlyData.totalRevenues.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</strong>
                </span>
              </div>
              <form onSubmit={submitRevenue} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <select className={styles.select} value={revCategory} onChange={(e) => setRevCategory(e.target.value)}>
                    <option value="Fee mensal">Fee mensal</option>
                    <option value="Infoproduto">Infoproduto</option>
                    <option value="Lançamento">Lançamento</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Cliente / descrição"
                    value={revDesc}
                    onChange={(e) => setRevDesc(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "0.75rem" }}>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <input
                      type="number"
                      className={styles.input}
                      placeholder="Valor (R$)"
                      value={revAmount}
                      onChange={(e) => setRevAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <input
                      type="date"
                      className={styles.input}
                      value={revDate}
                      onChange={(e) => setRevDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: "100%", padding: "10px" }}>
                  Adicionar
                </button>
              </form>
            </div>

            {/* Despesas */}
            <div className="flow-form-card">
              <div className="flow-form-header">
                <span className="flow-form-title" style={{ color: "#ef4444" }}>Despesas</span>
                <span className="flow-form-meta">
                  Previsto R$ 0,00 | Realizado <strong style={{ color: "#ef4444" }}>R$ {monthlyData.totalExpenses.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</strong>
                </span>
              </div>
              <form onSubmit={submitExpense} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <select className={styles.select} value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
                    <option value="Meta Ads">Meta Ads</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="TikTok Ads">TikTok Ads</option>
                    <option value="Taboola / Native">Taboola / Native</option>
                    <option value="Hospedagem">Hospedagem</option>
                    <option value="Ferramentas">Ferramentas</option>
                    <option value="Comissão">Comissão</option>
                    <option value="Impostos">Impostos</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Fornecedor / descrição"
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "0.75rem" }}>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <input
                      type="number"
                      className={styles.input}
                      placeholder="Valor (R$)"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <input
                      type="date"
                      className={styles.input}
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: "100%", padding: "10px" }}>
                  Adicionar
                </button>
              </form>
            </div>
          </div>

          {/* Tabela de Lançamentos Recentes do Mês */}
          <div className={`${styles.glassCard} ${styles.tableCard}`}>
            <div className={styles.tableHeaderActions}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: "700" }}>
                Lançamentos do mês de {monthsNames[selectedMonth]}
              </h3>

              <div style={{ position: "relative", maxWidth: "240px", width: "100%" }}>
                <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Filtrar por descrição..."
                  className={styles.input}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: "30px", height: "30px", fontSize: "0.8rem", width: "100%" }}
                />
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: "120px" }}>Data</th>
                    <th style={{ width: "100px" }}>Tipo</th>
                    <th>Descrição</th>
                    <th style={{ textAlign: "right", width: "180px" }}>Valor (R$)</th>
                    <th style={{ textAlign: "right", width: "80px" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.transactions.map((t) => {
                    const parts = t.date.split("-");
                    const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                    const isExpense = t.type === "expense";
                    
                    return (
                      <tr key={t.id}>
                        <td style={{ fontSize: "0.825rem", color: "var(--text-secondary)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <CalendarDays size={12} className="text-muted" />
                            {formattedDate}
                          </div>
                        </td>
                        <td>
                          <span className={isExpense ? "bg-danger-badge" : "bg-success-badge"} style={{ fontSize: "0.68rem", padding: "2px 6px" }}>
                            {t.displayType}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                          {t.description}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <strong className={t.colorClass} style={{ fontSize: "0.88rem" }}>
                            {isExpense ? "-" : "+"} R$ {t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className={`${styles.btn} ${styles.btnIcon} ${styles.btnDanger}`}
                            onClick={() => {
                              if (confirm(`Deseja remover o lançamento "${t.description}"?`)) {
                                if (isExpense) deleteExpense(t.id);
                                else deleteRevenue(t.id);
                              }
                            }}
                            style={{ width: "24px", height: "24px" }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {monthlyData.transactions.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-muted" style={{ textAlign: "center", padding: "2.5rem" }}>
                        Nenhum lançamento registrado neste mês.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          SUB-ABA 3: PREVISÃO & CAMPANHAS
          ========================================== */}
      {subTab === "previsao-campanhas" && (
        <div className="fade-in">
          {/* Header */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "700", fontFamily: "var(--font-display)", margin: 0 }}>
              Previsão de caixa
            </h2>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
              Próximos 15 dias, baseada na tendência dos últimos 10 dias
            </p>
          </div>

          {/* Cards de Previsão de Caixa */}
          <div className="finance-kpi-grid" style={{ marginBottom: "2rem" }}>
            <div className={`${styles.glassCard} ${styles.kpiCard}`}>
              <div className={styles.kpiHeader} style={{ fontSize: "0.68rem" }}>
                <span>INVESTIMENTO PROJETADO</span>
              </div>
              <div className={styles.kpiValue} style={{ fontSize: "1.35rem" }}>
                R$ {forecastData.projectedSpend.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                ROAS projetado: <strong style={{ color: "#fff" }}>{forecastData.projectedRoas.toFixed(2)}x</strong>
              </div>
            </div>

            <div className={`${styles.glassCard} ${styles.kpiCard}`}>
              <div className={styles.kpiHeader} style={{ fontSize: "0.68rem" }}>
                <span>RECEITA PROJETADA</span>
              </div>
              <div className={styles.kpiValue} style={{ fontSize: "1.35rem" }}>
                R$ {forecastData.projectedRevenue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                15 dias à frente
              </div>
            </div>

            <div className={`${styles.glassCard} ${styles.kpiCard}`}>
              <div className={styles.kpiHeader} style={{ fontSize: "0.68rem" }}>
                <span>SALDO PROJETADO</span>
              </div>
              <div className={styles.kpiValue} style={{ fontSize: "1.35rem", color: "var(--color-success)" }}>
                +R$ {forecastData.projectedBalance.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "0.7rem", color: "var(--color-success)", fontWeight: "600", marginTop: "4px" }}>
                <ArrowUpRight size={10} />
                <span>saldo positivo projetado</span>
              </div>
            </div>

            <div className={`${styles.glassCard} ${styles.kpiCard}`}>
              <div className={styles.kpiHeader} style={{ fontSize: "0.68rem" }}>
                <span>PONTO DE EQUILÍBRIO</span>
              </div>
              <div className={styles.kpiValue} style={{ fontSize: "1.35rem" }}>
                {forecastData.breakEvenRoas.toFixed(2)}x
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                ROAS mínimo p/ cobrir custo
              </div>
            </div>
          </div>

          {/* Tabela de Campanhas Ativas */}
          <div className={`${styles.glassCard} ${styles.tableCard}`}>
            <div className={styles.tableHeaderActions}>
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: "700", margin: 0 }}>Campanhas ativas</h3>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                  {campaignMetrics.length} de {campaignMetrics.length} exibidas
                </p>
              </div>

              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowCampModal(true)}>
                <Plus size={14} />
                Nova Campanha
              </button>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Campanha</th>
                    <th>Plataforma</th>
                    <th style={{ textAlign: "right" }}>Investido</th>
                    <th style={{ textAlign: "right" }}>Receita</th>
                    <th style={{ textAlign: "right" }}>ROAS</th>
                    <th style={{ textAlign: "center", width: "120px" }}>Status</th>
                    <th style={{ textAlign: "right", width: "80px" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignMetrics.map((camp) => {
                    const hasSpend = camp.spend > 0;
                    
                    // Cores visuais para as plataformas
                    const platformColors = {
                      Meta: "#06b6d4",
                      Google: "#f87171",
                      TikTok: "#a855f7"
                    };

                    return (
                      <tr key={camp.id}>
                        <td>
                          <div>
                            <strong style={{ display: "block", fontSize: "0.85rem", color: "#fff" }}>{camp.name}</strong>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                              Produto: {camp.product} • Orç: R$ {camp.daily_budget}/dia
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              backgroundColor: `${platformColors[camp.platform]}15`,
                              color: platformColors[camp.platform],
                              border: `1px solid ${platformColors[camp.platform]}30`,
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "0.72rem",
                              fontWeight: "600"
                            }}
                          >
                            {camp.platform}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", fontSize: "0.85rem", fontWeight: "600" }}>
                          R$ {camp.spend.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ textAlign: "right", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          R$ {camp.revenue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span
                            className={
                              camp.roas >= 2.0
                                ? "bg-success-badge"
                                : camp.roas >= 1.0
                                ? "bg-warning-badge"
                                : hasSpend
                                ? "bg-danger-badge"
                                : "bg-neutral-badge"
                            }
                            style={{ fontSize: "0.72rem", padding: "2px 6px" }}
                          >
                            {camp.roas > 0 ? `${camp.roas.toFixed(2)}x` : "0.00x"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: "700",
                              color: 
                                camp.status === "escalada" ? "var(--color-success)" : 
                                camp.status === "ativa" ? "var(--color-brand)" : 
                                camp.status === "teste" ? "var(--color-warning)" : "var(--text-muted)",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em"
                            }}
                          >
                            {camp.status === "escalada" ? "Escalando" :
                             camp.status === "ativa" ? "Ativa" :
                             camp.status === "teste" ? "Observar" : "Pausada"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            {/* Troca status rápido */}
                            <button
                              className={`${styles.btn} ${styles.btnIcon}`}
                              onClick={() => {
                                const nextStatus = 
                                  camp.status === "teste" ? "ativa" :
                                  camp.status === "ativa" ? "escalada" :
                                  camp.status === "escalada" ? "pausada" : "teste";
                                updateCampaignStatus(camp.id, nextStatus);
                              }}
                              title="Alterar Status"
                              style={{ width: "24px", height: "24px" }}
                            >
                              {camp.status === "pausada" ? <Play size={10} /> : <Pause size={10} />}
                            </button>

                            {/* Excluir campanha */}
                            <button
                              className={`${styles.btn} ${styles.btnIcon} ${styles.btnDanger}`}
                              onClick={() => {
                                if (confirm(`Deseja realmente excluir a campanha "${camp.name}"?`)) {
                                  deleteCampaign(camp.id);
                                }
                              }}
                              style={{ width: "24px", height: "24px" }}
                              title="Excluir Campanha"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {campaignMetrics.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-muted" style={{ textAlign: "center", padding: "2.5rem" }}>
                        Nenhuma campanha ativa. Clique em "+ Nova Campanha" para começar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL DE CADASTRO DE CAMPANHA
          ========================================== */}
      {showCampModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: "420px" }}>
            <div className={styles.modalHeader}>
              <h2>Criar Nova Campanha</h2>
              <button className={styles.closeBtn} onClick={() => setShowCampModal(false)}>✕</button>
            </div>
            <form onSubmit={submitCampaign}>
              <div className={styles.formGroup}>
                <label>Nome da Campanha</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="ex: Prospecção — Coleção Inverno"
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Produto</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="ex: Coleção Inverno"
                  value={campProduct}
                  onChange={(e) => setCampProduct(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label>Plataforma</label>
                  <select className={styles.select} value={campPlatform} onChange={(e) => setCampPlatform(e.target.value)}>
                    <option value="Meta">Meta Ads</option>
                    <option value="Google">Google Ads</option>
                    <option value="TikTok">TikTok Ads</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Status Inicial</label>
                  <select className={styles.select} value={campStatus} onChange={(e) => setCampStatus(e.target.value)}>
                    <option value="teste">Observar (Teste)</option>
                    <option value="ativa">Ativa</option>
                    <option value="escalada">Escalando</option>
                    <option value="pausada">Pausada</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Orçamento Diário (R$)</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="ex: 500"
                  value={campBudget}
                  onChange={(e) => setCampBudget(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btn} onClick={() => setShowCampModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  Salvar Campanha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
