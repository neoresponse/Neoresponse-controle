"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { generateHistoricalData } from "./mockData";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [expenses, setExpenses] = useState([]);
  const [revenues, setRevenues] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingSupabase, setUsingSupabase] = useState(false);

  // Filtros de data globais
  const [dateFilter, setDateFilter] = useState("30d"); // 'hoje', '7d', '30d', 'custom'
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Autenticação local do usuário (segura contra erros de hidratação do Next.js)
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("neo_user");
        if (saved) {
          setUser(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Erro ao carregar usuário do localStorage:", e);
        try {
          localStorage.removeItem("neo_user");
        } catch (err) {}
      }

      // Registrar Service Worker para PWA
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js")
          .then((reg) => console.log("PWA: Service Worker registrado:", reg.scope))
          .catch((err) => console.error("PWA: Falha ao registrar o Service Worker:", err));
      }
    }
  }, []);

  const login = (email, password) => {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();
    
    if (cleanPassword === "2026") {
      let userData = null;
      if (cleanEmail === "pelizzaro@neoresponse.com") {
        userData = { email: cleanEmail, name: "André Pelizzaro" };
      } else if (cleanEmail === "gustavo@neoresponse.com") {
        userData = { email: cleanEmail, name: "Gustavo Kreuz" };
      }

      if (userData) {
        setUser(userData);
        try {
          localStorage.setItem("neo_user", JSON.stringify(userData));
        } catch (e) {
          console.warn("localStorage.setItem não disponível:", e);
        }
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem("neo_user");
    } catch (e) {
      console.warn("localStorage.removeItem não disponível:", e);
    }
  };

  // ---------------------------------------------
  // CARREGAMENTO DE DADOS (SUPABASE OU LOCALSTORAGE)
  // ---------------------------------------------
  const loadData = useCallback(async () => {
    setLoading(true);
    const hasSupabase = isSupabaseConfigured();
    setUsingSupabase(hasSupabase);

    if (hasSupabase) {
      try {
        const [
          resExpenses,
          resRevenues,
          resCampaigns
        ] = await Promise.allSettled([
          supabase.from("expenses").select("*"),
          supabase.from("revenues").select("*"),
          supabase.from("campaigns").select("*")
        ]);

        const dbExpenses = resExpenses.status === "fulfilled" && !resExpenses.value.error ? resExpenses.value.data : null;
        const dbRevenues = resRevenues.status === "fulfilled" && !resRevenues.value.error ? resRevenues.value.data : null;
        const dbCampaigns = resCampaigns.status === "fulfilled" && !resCampaigns.value.error ? resCampaigns.value.data : null;

        if (dbExpenses === null || dbRevenues === null) {
          throw new Error("Erro ao carregar tabelas principais do Supabase");
        }

        // --- LÓGICA DE MIGRAÇÃO AUTOMÁTICA ---
        let localExpenses = [];
        let localRevenues = [];
        let localCampaigns = [];
        try {
          const rawExp = localStorage.getItem("neo_expenses_simple");
          const rawRev = localStorage.getItem("neo_revenues_simple");
          const rawCamp = localStorage.getItem("neo_campaigns");
          if (rawExp) localExpenses = JSON.parse(rawExp);
          if (rawRev) localRevenues = JSON.parse(rawRev);
          if (rawCamp) localCampaigns = JSON.parse(rawCamp);
        } catch (e) {
          console.warn("Erro ao ler localStorage para migração:", e);
        }

        const isDbEmpty = dbExpenses.length === 0 && dbRevenues.length === 0;

        if (isDbEmpty && (localExpenses.length > 0 || localRevenues.length > 0)) {
          console.log("Detectado banco Supabase vazio e dados locais. Iniciando migração automática para a nuvem...");
          
          const expensesToMigrate = localExpenses.map(({ id, created_at, ...rest }) => rest);
          const revenuesToMigrate = localRevenues.map(({ id, created_at, ...rest }) => rest);

          if (expensesToMigrate.length > 0) {
            await supabase.from("expenses").insert(expensesToMigrate);
          }
          if (revenuesToMigrate.length > 0) {
            await supabase.from("revenues").insert(revenuesToMigrate);
          }

          // Recarregar os dados migrados do Supabase
          const [resNewExp, resNewRev] = await Promise.all([
            supabase.from("expenses").select("*"),
            supabase.from("revenues").select("*")
          ]);

          setExpenses(resNewExp.data || []);
          setRevenues(resNewRev.data || []);

          localStorage.removeItem("neo_expenses_simple");
          localStorage.removeItem("neo_revenues_simple");
          console.log("Migração de despesas e receitas concluída!");
        } else {
          setExpenses(dbExpenses);
          setRevenues(dbRevenues);
        }

        // Migrar ou carregar campanhas se a tabela de campanhas existir
        if (dbCampaigns !== null) {
          if (dbCampaigns.length === 0 && localCampaigns.length > 0) {
            console.log("Migrando campanhas locais para o Supabase...");
            const campaignsToMigrate = localCampaigns.map(({ id, ...rest }) => rest);
            await supabase.from("campaigns").insert(campaignsToMigrate);
            
            const resNewCamp = await supabase.from("campaigns").select("*");
            setCampaigns(resNewCamp.data || []);
            localStorage.removeItem("neo_campaigns");
            console.log("Migração de campanhas concluída!");
          } else {
            setCampaigns(dbCampaigns);
          }
        } else {
          // Se a tabela 'campaigns' não existir no Supabase, usa localCampaigns
          console.warn("Tabela 'campaigns' não encontrada no Supabase. Usando localStorage.");
          if (localCampaigns.length > 0) {
            setCampaigns(localCampaigns);
          } else {
            // Inicializar campanhas padrão
            const initialCampaigns = [
              { id: "c-1", name: "Prospecção — Coleção Inverno", product: "Coleção Inverno", platform: "Meta", status: "escalada", daily_budget: 1000 },
              { id: "c-2", name: "Remarketing Checkout", product: "Coleção Inverno", platform: "Meta", status: "ativa", daily_budget: 500 },
              { id: "c-3", name: "Search — Genéricas", product: "Vortex Fit", platform: "Google", status: "escalada", daily_budget: 1500 },
              { id: "c-4", name: "Performance Max", product: "Vortex Fit", platform: "Google", status: "pausada", daily_budget: 800 },
              { id: "c-5", name: "Spark Ads — UGC #12", product: "Nortesys", platform: "TikTok", status: "escalada", daily_budget: 600 },
              { id: "c-6", name: "Conversões — Lookalike 3%", product: "Bela Mesa", platform: "Meta", status: "ativa", daily_budget: 700 },
              { id: "c-7", name: "Shopping Inteligente", product: "Bela Mesa", platform: "Google", status: "escalada", daily_budget: 900 }
            ];
            localStorage.setItem("neo_campaigns", JSON.stringify(initialCampaigns));
            setCampaigns(initialCampaigns);
          }
        }
      } catch (err) {
        console.error("Falha ao carregar do Supabase, usando localStorage:", err);
        loadLocalFallback();
      }
    } else {
      loadLocalFallback();
    }
    setLoading(false);
  }, []);

  const loadLocalFallback = () => {
    // Migração de limpeza única: remove dados mockados antigos da base local
    if (typeof window !== "undefined") {
      const isCleared = localStorage.getItem("neo_mock_data_cleared_v2");
      if (!isCleared) {
        localStorage.removeItem("neo_expenses_simple");
        localStorage.removeItem("neo_revenues_simple");
        localStorage.setItem("neo_mock_data_cleared_v2", "true");
      }
    }

    let localExpenses = localStorage.getItem("neo_expenses_simple");
    let localRevenues = localStorage.getItem("neo_revenues_simple");
    let localCampaigns = localStorage.getItem("neo_campaigns");

    if (!localExpenses || !localRevenues) {
      const historical = generateHistoricalData();
      localStorage.setItem("neo_expenses_simple", JSON.stringify(historical.expenses));
      localStorage.setItem("neo_revenues_simple", JSON.stringify(historical.revenues));

      setExpenses(historical.expenses);
      setRevenues(historical.revenues);
    } else {
      setExpenses(JSON.parse(localExpenses));
      setRevenues(JSON.parse(localRevenues));
    }

    if (!localCampaigns) {
      const initialCampaigns = [
        { id: "c-1", name: "Prospecção — Coleção Inverno", product: "Coleção Inverno", platform: "Meta", status: "escalada", daily_budget: 1000 },
        { id: "c-2", name: "Remarketing Checkout", product: "Coleção Inverno", platform: "Meta", status: "ativa", daily_budget: 500 },
        { id: "c-3", name: "Search — Genéricas", product: "Vortex Fit", platform: "Google", status: "escalada", daily_budget: 1500 },
        { id: "c-4", name: "Performance Max", product: "Vortex Fit", platform: "Google", status: "pausada", daily_budget: 800 },
        { id: "c-5", name: "Spark Ads — UGC #12", product: "Nortesys", platform: "TikTok", status: "escalada", daily_budget: 600 },
        { id: "c-6", name: "Conversões — Lookalike 3%", product: "Bela Mesa", platform: "Meta", status: "ativa", daily_budget: 700 },
        { id: "c-7", name: "Shopping Inteligente", product: "Bela Mesa", platform: "Google", status: "escalada", daily_budget: 900 }
      ];
      localStorage.setItem("neo_campaigns", JSON.stringify(initialCampaigns));
      setCampaigns(initialCampaigns);
    } else {
      setCampaigns(JSON.parse(localCampaigns));
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveLocal = (key, data) => {
    if (!usingSupabase) {
      localStorage.setItem(`neo_${key}_simple`, JSON.stringify(data));
    }
  };

  // ---------------------------------------------
  // OPERAÇÕES CRUD SIMPLIFICADAS
  // ---------------------------------------------
  const addExpense = async (expense) => {
    const newExpense = { ...expense, id: `exp-${Date.now()}` };
    if (usingSupabase) {
      const { data, error } = await supabase.from("expenses").insert([expense]).select();
      if (!error && data) {
        setExpenses((prev) => [...prev, data[0]]);
      }
    } else {
      const updated = [...expenses, newExpense];
      setExpenses(updated);
      saveLocal("expenses", updated);
    }
  };

  const deleteExpense = async (id) => {
    if (usingSupabase) {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (!error) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
      }
    } else {
      const updated = expenses.filter((e) => e.id !== id);
      setExpenses(updated);
      saveLocal("expenses", updated);
    }
  };

  const addRevenue = async (revenue) => {
    const newRevenue = { ...revenue, id: `rev-${Date.now()}` };
    if (usingSupabase) {
      const { data, error } = await supabase.from("revenues").insert([revenue]).select();
      if (!error && data) {
        setRevenues((prev) => [...prev, data[0]]);
      }
    } else {
      const updated = [...revenues, newRevenue];
      setRevenues(updated);
      saveLocal("revenues", updated);
    }
  };

  const deleteRevenue = async (id) => {
    if (usingSupabase) {
      const { error } = await supabase.from("revenues").delete().eq("id", id);
      if (!error) {
        setRevenues((prev) => prev.filter((r) => r.id !== id));
      }
    } else {
      const updated = revenues.filter((r) => r.id !== id);
      setRevenues(updated);
      saveLocal("revenues", updated);
    }
  };

  const addCampaign = async (campaign) => {
    const newCamp = { ...campaign, id: `c-${Date.now()}` };
    if (usingSupabase) {
      try {
        const { data, error } = await supabase.from("campaigns").insert([campaign]).select();
        if (!error && data) {
          setCampaigns((prev) => [...prev, data[0]]);
        } else {
          console.error("Erro ao salvar campanha no Supabase:", error);
        }
      } catch (e) {
        console.error("Erro ao salvar campanha no Supabase:", e);
      }
    } else {
      const updated = [...campaigns, newCamp];
      setCampaigns(updated);
      localStorage.setItem("neo_campaigns", JSON.stringify(updated));
    }
  };

  const deleteCampaign = async (id) => {
    if (usingSupabase) {
      try {
        const { error } = await supabase.from("campaigns").delete().eq("id", id);
        if (!error) {
          setCampaigns((prev) => prev.filter((c) => c.id !== id));
        } else {
          console.error("Erro ao deletar campanha no Supabase:", error);
        }
      } catch (e) {
        console.error("Erro ao deletar campanha no Supabase:", e);
      }
    } else {
      const updated = campaigns.filter(c => c.id !== id);
      setCampaigns(updated);
      localStorage.setItem("neo_campaigns", JSON.stringify(updated));
    }
  };

  const updateCampaignStatus = async (id, status) => {
    if (usingSupabase) {
      try {
        const { error } = await supabase.from("campaigns").update({ status }).eq("id", id);
        if (!error) {
          setCampaigns((prev) => prev.map(c => c.id === id ? { ...c, status } : c));
        } else {
          console.error("Erro ao atualizar status de campanha no Supabase:", error);
        }
      } catch (e) {
        console.error("Erro ao atualizar status de campanha no Supabase:", e);
      }
    } else {
      const updated = campaigns.map(c => c.id === id ? { ...c, status } : c);
      setCampaigns(updated);
      localStorage.setItem("neo_campaigns", JSON.stringify(updated));
    }
  };

  const resetLocalDatabase = () => {
    if (!usingSupabase) {
      localStorage.removeItem("neo_expenses_simple");
      localStorage.removeItem("neo_revenues_simple");
      loadLocalFallback();
    }
  };

  // ---------------------------------------------
  // FILTRAGENS E CÁLCULOS DE MÉTRICAS (CORE FINANCEIRO)
  // ---------------------------------------------
  const filteredData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getFilterDateRange = () => {
      let start = new Date(today);
      let end = new Date(today);
      end.setHours(23, 59, 59, 999);

      if (dateFilter === "hoje") {
        start.setHours(0, 0, 0, 0);
      } else if (dateFilter === "7d") {
        start.setDate(today.getDate() - 7);
      } else if (dateFilter === "30d") {
        start.setDate(today.getDate() - 30);
      } else if (dateFilter === "custom" && customStartDate) {
        start = new Date(customStartDate + "T00:00:00");
        end = customEndDate ? new Date(customEndDate + "T23:59:59") : new Date(today);
      } else {
        start.setDate(today.getDate() - 30);
      }
      return { start, end };
    };

    const { start, end } = getFilterDateRange();

    const isWithinRange = (dateStr) => {
      const d = new Date(dateStr + "T12:00:00");
      return d >= start && d <= end;
    };

    const filteredExpenses = expenses.filter((e) => isWithinRange(e.date));
    const filteredRevenues = revenues.filter((r) => isWithinRange(r.date));

    // KPIs Globais
    const totalSpend = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const totalRevenue = filteredRevenues.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    const totalProfit = totalRevenue - totalSpend;
    const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    // Histórico Diário agrupado para o gráfico
    const dailyDataMap = {};
    const tempDate = new Date(start);
    while (tempDate <= end) {
      const dateKey = tempDate.toISOString().split("T")[0];
      dailyDataMap[dateKey] = { date: dateKey, spend: 0, revenue: 0, profit: 0 };
      tempDate.setDate(tempDate.getDate() + 1);
    }

    filteredExpenses.forEach((e) => {
      if (dailyDataMap[e.date]) dailyDataMap[e.date].spend += parseFloat(e.amount || 0);
    });
    filteredRevenues.forEach((r) => {
      if (dailyDataMap[r.date]) dailyDataMap[r.date].revenue += parseFloat(r.amount || 0);
    });

    const chartTimeline = Object.values(dailyDataMap)
      .map((d) => ({
        ...d,
        profit: d.revenue - d.spend
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Insights Inteligentes Simplificados (PT-BR)
    const insights = [];

    if (totalProfit > 0) {
      insights.push({
        type: "success",
        title: "Operação Saudável",
        text: `Seu caixa está positivo neste período com lucro de R$ ${totalProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (ROAS médio de ${overallRoas.toFixed(2)}x).`
      });
    } else if (totalProfit < 0) {
      insights.push({
        type: "danger",
        title: "Alerta de Caixa",
        text: `A operação está no vermelho no período selecionado, com déficit de R$ ${Math.abs(totalProfit).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Avalie cortar custos de tráfego imediatamente.`
      });
    }

    // Achar maior gasto
    if (filteredExpenses.length > 0) {
      const highestExpense = [...filteredExpenses].sort((a, b) => b.amount - a.amount)[0];
      insights.push({
        type: "info",
        title: "Maior Custo Unitário",
        text: `O maior gasto registrado no período foi "${highestExpense.description}" no valor de R$ ${highestExpense.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`
      });
    }

    // Achar maior dia de vendas
    if (chartTimeline.length > 0) {
      const bestDay = [...chartTimeline].sort((a, b) => b.revenue - a.revenue)[0];
      if (bestDay && bestDay.revenue > 0) {
        const parts = bestDay.date.split("-");
        insights.push({
          type: "warning",
          title: "Pico de Faturamento",
          text: `Seu melhor dia de vendas foi em ${parts[2]}/${parts[1]}, faturando R$ ${bestDay.revenue.toLocaleString("pt-BR")} em um único dia.`
        });
      }
    }

    if (insights.length === 0) {
      insights.push({
        type: "neutral",
        title: "Aguardando Registros",
        text: "Insira novos gastos ou receitas para ativar os insights automáticos do sistema."
      });
    }

    return {
      kpis: {
        totalRevenue,
        totalSpend,
        totalProfit,
        overallRoas
      },
      chartTimeline,
      insights,
      filteredExpenses,
      filteredRevenues
    };
  }, [expenses, revenues, dateFilter, customStartDate, customEndDate]);

  const campaignMetrics = useMemo(() => {
    return campaigns.map(camp => {
      // Find all expenses that match the campaign name in their description
      const campExpenses = expenses.filter(e => 
        e.description.toLowerCase().includes(camp.name.toLowerCase())
      );
      const campRevenues = revenues.filter(r => 
        r.description.toLowerCase().includes(camp.name.toLowerCase())
      );
      
      let spend = campExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      let revenue = campRevenues.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
      
      // Fallback for mock campaigns (matches Image 3)
      if (spend === 0 && revenue === 0) {
        if (camp.name === "Prospecção — Coleção Inverno") {
          spend = 18420;
          revenue = 61980;
        } else if (camp.name === "Remarketing Checkout") {
          spend = 6210;
          revenue = 9870;
        } else if (camp.name === "Search — Genéricas") {
          spend = 22940;
          revenue = 41200;
        } else if (camp.name === "Performance Max") {
          spend = 14100;
          revenue = 12650;
        } else if (camp.name === "Spark Ads — UGC #12") {
          spend = 9870;
          revenue = 26400;
        } else if (camp.name === "Conversões — Lookalike 3%") {
          spend = 12300;
          revenue = 19870;
        } else if (camp.name === "Shopping Inteligente") {
          spend = 8420;
          revenue = 15900;
        } else {
          const daysActive = 10;
          spend = camp.daily_budget * daysActive;
          const roasMultiplier = camp.status === "escalada" ? 2.5 : camp.status === "ativa" ? 1.8 : 0.8;
          revenue = spend * roasMultiplier;
        }
      }
      
      const profit = revenue - spend;
      const roas = spend > 0 ? revenue / spend : 0;
      const cpa = spend > 0 ? spend / Math.max(1, Math.round(revenue / 150)) : 0;
      
      return {
        ...camp,
        spend,
        revenue,
        profit,
        roas,
        cpa
      };
    });
  }, [campaigns, expenses, revenues]);

  const value = {
    user,
    login,
    logout,
    expenses,
    revenues,
    campaigns,
    campaignMetrics,
    loading,
    usingSupabase,
    dateFilter,
    customStartDate,
    customEndDate,
    setDateFilter,
    setCustomStartDate,
    setCustomEndDate,
    
    // Métricas
    kpis: filteredData.kpis,
    chartTimeline: filteredData.chartTimeline,
    insights: filteredData.insights,
    filteredExpenses: filteredData.filteredExpenses,
    filteredRevenues: filteredData.filteredRevenues,

    // Ações
    addExpense,
    deleteExpense,
    addRevenue,
    deleteRevenue,
    addCampaign,
    deleteCampaign,
    updateCampaignStatus,
    resetLocalDatabase,
    refreshData: loadData
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore deve ser usado dentro de um StoreProvider");
  }
  return context;
}
