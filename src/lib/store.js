"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { generateHistoricalData } from "./mockData";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [expenses, setExpenses] = useState([]);
  const [revenues, setRevenues] = useState([]);
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
          { data: dbExpenses, error: errExpenses },
          { data: dbRevenues, error: errRevenues }
        ] = await Promise.all([
          supabase.from("expenses").select("*"),
          supabase.from("revenues").select("*")
        ]);

        if (errExpenses || errRevenues) throw new Error("Erro Supabase");

        setExpenses(dbExpenses || []);
        setRevenues(dbRevenues || []);
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

  const value = {
    user,
    login,
    logout,
    expenses,
    revenues,
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
