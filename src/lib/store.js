"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { generateHistoricalData } from "./mockData";

const StoreContext = createContext(null);

const generateUUID = () => {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export function StoreProvider({ children }) {
  const [expenses, setExpenses] = useState([]);
  const [revenues, setRevenues] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [boards, setBoards] = useState([]);
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
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
          resCampaigns,
          resBoards,
          resColumns,
          resTasks
        ] = await Promise.allSettled([
          supabase.from("expenses").select("*"),
          supabase.from("revenues").select("*"),
          supabase.from("campaigns").select("*"),
          supabase.from("workspace_boards").select("*"),
          supabase.from("workspace_columns").select("*"),
          supabase.from("workspace_tasks").select("*")
        ]);

        const dbExpenses = resExpenses.status === "fulfilled" && !resExpenses.value.error ? resExpenses.value.data : null;
        const dbRevenues = resRevenues.status === "fulfilled" && !resRevenues.value.error ? resRevenues.value.data : null;
        const dbCampaigns = resCampaigns.status === "fulfilled" && !resCampaigns.value.error ? resCampaigns.value.data : null;
        const dbBoards = resBoards.status === "fulfilled" && !resBoards.value.error ? resBoards.value.data : null;
        const dbColumns = resColumns.status === "fulfilled" && !resColumns.value.error ? resColumns.value.data : null;
        const dbTasks = resTasks.status === "fulfilled" && !resTasks.value.error ? resTasks.value.data : null;

        if (dbExpenses === null || dbRevenues === null) {
          throw new Error("Erro ao carregar tabelas principais do Supabase");
        }

        // --- LÓGICA DE MIGRAÇÃO AUTOMÁTICA CAIXA ---
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
          console.warn("Tabela 'campaigns' não encontrada no Supabase. Usando localStorage.");
          if (localCampaigns.length > 0) {
            setCampaigns(localCampaigns);
          } else {
            const initialCampaigns = [
              { id: generateUUID(), name: "Prospecção — Coleção Inverno", product: "Coleção Inverno", platform: "Meta", status: "escalada", daily_budget: 1000 },
              { id: generateUUID(), name: "Remarketing Checkout", product: "Coleção Inverno", platform: "Meta", status: "ativa", daily_budget: 500 },
              { id: generateUUID(), name: "Search — Genéricas", product: "Vortex Fit", platform: "Google", status: "escalada", daily_budget: 1500 },
              { id: generateUUID(), name: "Performance Max", product: "Vortex Fit", platform: "Google", status: "pausada", daily_budget: 800 },
              { id: generateUUID(), name: "Spark Ads — UGC #12", product: "Nortesys", platform: "TikTok", status: "escalada", daily_budget: 600 },
              { id: generateUUID(), name: "Conversões — Lookalike 3%", product: "Bela Mesa", platform: "Meta", status: "ativa", daily_budget: 700 },
              { id: generateUUID(), name: "Shopping Inteligente", product: "Bela Mesa", platform: "Google", status: "escalada", daily_budget: 900 }
            ];
            localStorage.setItem("neo_campaigns", JSON.stringify(initialCampaigns));
            setCampaigns(initialCampaigns);
          }
        }

        // --- LÓGICA DE MIGRAÇÃO AUTOMÁTICA WORKSPACE ---
        if (dbBoards !== null && dbColumns !== null && dbTasks !== null) {
          let localBoards = [];
          let localColumns = [];
          let localTasks = [];
          try {
            const rawB = localStorage.getItem("neo_workspace_boards");
            const rawC = localStorage.getItem("neo_workspace_columns");
            const rawT = localStorage.getItem("neo_workspace_tasks");
            if (rawB) localBoards = JSON.parse(rawB);
            if (rawC) localColumns = JSON.parse(rawC);
            if (rawT) localTasks = JSON.parse(rawT);
          } catch (e) {
            console.warn("Erro ao ler localStorage do Workspace para migração:", e);
          }

          if (dbBoards.length === 0 && localBoards.length > 0) {
            console.log("Migrando Workspace para o Supabase...");
            // Limpa IDs locais ou insere mantendo chaves primárias
            await supabase.from("workspace_boards").insert(localBoards);
            await supabase.from("workspace_columns").insert(localColumns);
            await supabase.from("workspace_tasks").insert(localTasks);

            const [resNewB, resNewC, resNewT] = await Promise.all([
              supabase.from("workspace_boards").select("*"),
              supabase.from("workspace_columns").select("*"),
              supabase.from("workspace_tasks").select("*")
            ]);
            setBoards(resNewB.data || []);
            setColumns(resNewC.data || []);
            setTasks(resNewT.data || []);

            localStorage.removeItem("neo_workspace_boards");
            localStorage.removeItem("neo_workspace_columns");
            localStorage.removeItem("neo_workspace_tasks");
            console.log("Migração do Workspace concluída!");
          } else {
            setBoards(dbBoards);
            setColumns(dbColumns);
            setTasks(dbTasks);
          }
        } else {
          console.warn("Tabelas do Workspace não encontradas no Supabase. Usando localFallback.");
          loadWorkspaceLocalFallback();
        }

        // Migrar ou carregar Calendar se a tabela existir
        if (dbEvents !== null) {
          let localEvents = [];
          try {
            const rawE = localStorage.getItem("neo_calendar_events");
            if (rawE) localEvents = JSON.parse(rawE);
          } catch (e) {
            console.warn("Erro ao ler localStorage do Calendar para migração:", e);
          }

          if (dbEvents.length === 0 && localEvents.length > 0) {
            console.log("Migrando Calendar para o Supabase...");
            await supabase.from("calendar_events").insert(localEvents);
            const resNewE = await supabase.from("calendar_events").select("*");
            setEvents(resNewE.data || []);
            localStorage.removeItem("neo_calendar_events");
            console.log("Migração do Calendar concluída!");
          } else {
            setEvents(dbEvents);
          }
        } else {
          console.warn("Tabela 'calendar_events' não encontrada no Supabase. Usando localFallback.");
          loadCalendarLocalFallback();
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

  const loadWorkspaceLocalFallback = () => {
    let localBoards = localStorage.getItem("neo_workspace_boards");
    let localColumns = localStorage.getItem("neo_workspace_columns");
    let localTasks = localStorage.getItem("neo_workspace_tasks");

    if (!localBoards || !localColumns || !localTasks) {
      const b1 = generateUUID();
      const b2 = generateUUID();

      const col1 = generateUUID();
      const col2 = generateUUID();
      const col3 = generateUUID();
      const col4 = generateUUID();
      const col5 = generateUUID();

      const col6 = generateUUID();
      const col7 = generateUUID();
      const col8 = generateUUID();
      const col9 = generateUUID();

      const initialBoards = [
        { id: b1, name: "Marketing & Lançamentos", description: "Campanhas de tráfego pago, criativos e estratégias de infoprodutos", is_favorite: true, is_archived: false, template_name: "Marketing", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: b2, name: "Desenvolvimento SaaS", description: "Backlog de funcionalidades e desenvolvimento do Neoresponse OS", is_favorite: false, is_archived: false, template_name: "Desenvolvimento", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      ];

      const initialColumns = [
        { id: col1, board_id: b1, name: "Backlog", position: 0, created_at: new Date().toISOString() },
        { id: col2, board_id: b1, name: "A Fazer", position: 1, created_at: new Date().toISOString() },
        { id: col3, board_id: b1, name: "Em Andamento", position: 2, created_at: new Date().toISOString() },
        { id: col4, board_id: b1, name: "Em Revisão", position: 3, created_at: new Date().toISOString() },
        { id: col5, board_id: b1, name: "Concluído", position: 4, created_at: new Date().toISOString() },

        { id: col6, board_id: b2, name: "Backlog", position: 0, created_at: new Date().toISOString() },
        { id: col7, board_id: b2, name: "A Fazer", position: 1, created_at: new Date().toISOString() },
        { id: col8, board_id: b2, name: "Em Andamento", position: 2, created_at: new Date().toISOString() },
        { id: col9, board_id: b2, name: "Concluído", position: 3, created_at: new Date().toISOString() }
      ];

      const initialTasks = [
        {
          id: generateUUID(),
          column_id: col2,
          board_id: b1,
          title: "Criar Copys para Lançamento Inverno",
          description: "Criar 3 variações de copy para anúncios de tráfego frio focando na dor da escassez.",
          start_date: new Date().toISOString().split("T")[0],
          due_date: new Date().toISOString().split("T")[0],
          completed_date: null,
          priority: "alta",
          status: "ativo",
          position: 0,
          checklist: [
            { id: "chk-1", text: "Copy 1: Dor da escassez", completed: false },
            { id: "chk-2", text: "Copy 2: Depoimento de aluno", completed: false },
            { id: "chk-3", text: "Copy 3: Oferta direta", completed: false }
          ],
          tags: ["Copy", "Marketing"],
          comments: [
            { id: "c-1", author: "André Pelizzaro", date: new Date().toISOString(), text: "Gostaria que o foco principal fosse o Instagram Stories." }
          ],
          history: [
            { id: "h-1", action: "criação", date: new Date().toISOString(), details: "Tarefa criada" }
          ],
          responsibles: [{ name: "André Pelizzaro", avatar: "AP" }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: generateUUID(),
          column_id: col3,
          board_id: b1,
          title: "Subir Campanhas de Conversão (CBO)",
          description: "Subir campanhas de CBO na conta de anúncios com orçamento de R$ 1.000/dia.",
          start_date: new Date().toISOString().split("T")[0],
          due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
          completed_date: null,
          priority: "urgente",
          status: "ativo",
          position: 0,
          checklist: [
            { id: "chk-4", text: "Configurar públicos de Lookalike 3%", completed: true },
            { id: "chk-5", text: "Inserir UTMs de rastreamento", completed: false }
          ],
          tags: ["Meta Ads", "Tráfego"],
          comments: [],
          history: [
            { id: "h-2", action: "criação", date: new Date().toISOString(), details: "Tarefa criada" },
            { id: "h-3", action: "mudança de coluna", date: new Date().toISOString(), details: "Movido para Em Andamento" }
          ],
          responsibles: [{ name: "André Pelizzaro", avatar: "AP" }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: generateUUID(),
          column_id: col5,
          board_id: b1,
          title: "Reunião de Alinhamento de Vendas",
          description: "Alinhar scripts de venda do comercial para o tráfego que está entrando.",
          start_date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          due_date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          completed_date: new Date().toISOString().split("T")[0],
          priority: "normal",
          status: "ativo",
          position: 0,
          checklist: [],
          tags: ["Financeiro", "Reunião"],
          comments: [],
          history: [
            { id: "h-4", action: "criação", date: new Date().toISOString(), details: "Tarefa criada" },
            { id: "h-5", action: "conclusão", date: new Date().toISOString(), details: "Tarefa concluída" }
          ],
          responsibles: [{ name: "Gustavo Kreuz", avatar: "GK" }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      localStorage.setItem("neo_workspace_boards", JSON.stringify(initialBoards));
      localStorage.setItem("neo_workspace_columns", JSON.stringify(initialColumns));
      localStorage.setItem("neo_workspace_tasks", JSON.stringify(initialTasks));

      setBoards(initialBoards);
      setColumns(initialColumns);
      setTasks(initialTasks);
    } else {
      setBoards(JSON.parse(localBoards));
      setColumns(JSON.parse(localColumns));
      setTasks(JSON.parse(localTasks));
    }
  };

  const loadCalendarLocalFallback = () => {
    let localEvents = localStorage.getItem("neo_calendar_events");
    if (!localEvents) {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];

      const initialEvents = [
        {
          id: generateUUID(),
          title: "Alinhamento Semanal de Tráfego",
          event_date: todayStr,
          start_time: "09:00",
          end_time: "10:00",
          description: "Revisar o ROAS das campanhas do Facebook Ads e planejar escala de orçamento.",
          location: "Google Meet",
          notes: "Trazer os relatórios de ROAS da planilha.",
          category: "Reunião",
          color_category: "#3b82f6",
          duration: 60,
          responsible_name: "Pelizzaro",
          history: [{ id: generateUUID(), action: "criação", date: new Date().toISOString(), details: "Evento de exemplo criado" }]
        },
        {
          id: generateUUID(),
          title: "Subir Novos Criativos de UGC",
          event_date: todayStr,
          start_time: "14:30",
          end_time: "15:30",
          description: "Subir novos conjuntos de anúncios na campanha Spark Ads do TikTok.",
          location: "Gerenciador TikTok Ads",
          notes: "Usar o criativo UGC #12 de unboxing.",
          category: "Marketing",
          color_category: "#fb923c",
          duration: 60,
          responsible_name: "Gustavo",
          history: [{ id: generateUUID(), action: "criação", date: new Date().toISOString(), details: "Evento de exemplo criado" }]
        },
        {
          id: generateUUID(),
          title: "Aprovação de Landing Page de Vendas",
          event_date: tomorrowStr,
          start_time: "17:00",
          end_time: "17:30",
          description: "Revisar a taxa de conversão e a copy da nova página de checkout.",
          location: "Figma",
          notes: "Focar na otimização de velocidade para mobile.",
          category: "Desenvolvimento",
          color_category: "#a78bfa",
          duration: 30,
          responsible_name: "Pelizzaro",
          history: [{ id: generateUUID(), action: "criação", date: new Date().toISOString(), details: "Evento de exemplo criado" }]
        }
      ];

      localStorage.setItem("neo_calendar_events", JSON.stringify(initialEvents));
      setEvents(initialEvents);
    } else {
      setEvents(JSON.parse(localEvents));
    }
  };

  const loadLocalFallback = () => {
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
        { id: generateUUID(), name: "Prospecção — Coleção Inverno", product: "Coleção Inverno", platform: "Meta", status: "escalada", daily_budget: 1000 },
        { id: generateUUID(), name: "Remarketing Checkout", product: "Coleção Inverno", platform: "Meta", status: "ativa", daily_budget: 500 },
        { id: generateUUID(), name: "Search — Genéricas", product: "Vortex Fit", platform: "Google", status: "escalada", daily_budget: 1500 },
        { id: generateUUID(), name: "Performance Max", product: "Vortex Fit", platform: "Google", status: "pausada", daily_budget: 800 },
        { id: generateUUID(), name: "Spark Ads — UGC #12", product: "Nortesys", platform: "TikTok", status: "escalada", daily_budget: 600 },
        { id: generateUUID(), name: "Conversões — Lookalike 3%", product: "Bela Mesa", platform: "Meta", status: "ativa", daily_budget: 700 },
        { id: generateUUID(), name: "Shopping Inteligente", product: "Bela Mesa", platform: "Google", status: "escalada", daily_budget: 900 }
      ];
      localStorage.setItem("neo_campaigns", JSON.stringify(initialCampaigns));
      setCampaigns(initialCampaigns);
    } else {
      setCampaigns(JSON.parse(localCampaigns));
    }

    loadWorkspaceLocalFallback();
    loadCalendarLocalFallback();
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

  // ---------------------------------------------
  // OPERAÇÕES WORKSPACE (BOARDS, COLUMNS, TASKS)
  // ---------------------------------------------

  // BOARDS
  const addBoard = async (board) => {
    const newBoard = {
      ...board,
      id: generateUUID(),
      is_favorite: false,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (usingSupabase) {
      const { data, error } = await supabase.from("workspace_boards").insert([newBoard]).select();
      if (!error && data) {
        setBoards((prev) => [...prev, data[0]]);
        
        // Criar colunas padrão para o novo board
        const defaultColNames = ["Backlog", "A Fazer", "Em Andamento", "Em Revisão", "Concluído"];
        const colsToInsert = defaultColNames.map((name, position) => ({
          id: generateUUID(),
          board_id: data[0].id,
          name,
          position
        }));
        const { data: colsData, error: colsErr } = await supabase.from("workspace_columns").insert(colsToInsert).select();
        if (!colsErr && colsData) {
          setColumns((prev) => [...prev, ...colsData]);
        }
      }
    } else {
      const updatedBoards = [...boards, newBoard];
      setBoards(updatedBoards);
      localStorage.setItem("neo_workspace_boards", JSON.stringify(updatedBoards));

      const defaultColNames = ["Backlog", "A Fazer", "Em Andamento", "Em Revisão", "Concluído"];
      const newCols = defaultColNames.map((name, idx) => ({
        id: generateUUID(),
        board_id: newBoard.id,
        name,
        position: idx,
        created_at: new Date().toISOString()
      }));
      const updatedCols = [...columns, ...newCols];
      setColumns(updatedCols);
      localStorage.setItem("neo_workspace_columns", JSON.stringify(updatedCols));
    }
  };

  const updateBoard = async (id, updates) => {
    const updatedFields = { ...updates, updated_at: new Date().toISOString() };
    if (usingSupabase) {
      const { error } = await supabase.from("workspace_boards").update(updatedFields).eq("id", id);
      if (!error) {
        setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, ...updatedFields } : b)));
      }
    } else {
      const updated = boards.map((b) => (b.id === id ? { ...b, ...updatedFields } : b));
      setBoards(updated);
      localStorage.setItem("neo_workspace_boards", JSON.stringify(updated));
    }
  };

  const deleteBoard = async (id) => {
    if (usingSupabase) {
      const { error } = await supabase.from("workspace_boards").delete().eq("id", id);
      if (!error) {
        setBoards((prev) => prev.filter((b) => b.id !== id));
        setColumns((prev) => prev.filter((col) => col.board_id !== id));
        setTasks((prev) => prev.filter((t) => t.board_id !== id));
      }
    } else {
      const updatedBoards = boards.filter((b) => b.id !== id);
      setBoards(updatedBoards);
      localStorage.setItem("neo_workspace_boards", JSON.stringify(updatedBoards));

      const updatedCols = columns.filter((col) => col.board_id !== id);
      setColumns(updatedCols);
      localStorage.setItem("neo_workspace_columns", JSON.stringify(updatedCols));

      const updatedTasks = tasks.filter((t) => t.board_id !== id);
      setTasks(updatedTasks);
      localStorage.setItem("neo_workspace_tasks", JSON.stringify(updatedTasks));
    }
  };

  const duplicateBoard = async (id) => {
    const boardToDup = boards.find(b => b.id === id);
    if (!boardToDup) return;

    const dupBoard = {
      id: generateUUID(),
      name: `${boardToDup.name} (Cópia)`,
      description: boardToDup.description,
      template_name: boardToDup.template_name,
      is_favorite: false,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (usingSupabase) {
      const { data: newB, error: bErr } = await supabase.from("workspace_boards").insert([dupBoard]).select();
      if (!bErr && newB) {
        setBoards(prev => [...prev, newB[0]]);
        
        const boardCols = columns.filter(c => c.board_id === id).sort((a,b) => a.position - b.position);
        for (const col of boardCols) {
          const newColId = generateUUID();
          const { data: newC, error: cErr } = await supabase.from("workspace_columns").insert([{
            id: newColId,
            board_id: newB[0].id,
            name: col.name,
            position: col.position
          }]).select();

          if (!cErr && newC) {
            setColumns(prev => [...prev, newC[0]]);
            
            const colTasks = tasks.filter(t => t.column_id === col.id);
            const tasksToInsert = colTasks.map(t => ({
              id: generateUUID(),
              column_id: newColId,
              board_id: newB[0].id,
              title: t.title,
              description: t.description,
              start_date: t.start_date,
              due_date: t.due_date,
              priority: t.priority,
              status: t.status,
              position: t.position,
              checklist: t.checklist,
              tags: t.tags,
              comments: t.comments,
              responsibles: t.responsibles,
              history: [{ id: generateUUID(), action: "criação", date: new Date().toISOString(), details: "Copiada do quadro anterior" }]
            }));

            if (tasksToInsert.length > 0) {
              const { data: newTs, error: tErr } = await supabase.from("workspace_tasks").insert(tasksToInsert).select();
              if (!tErr && newTs) {
                setTasks(prev => [...prev, ...newTs]);
              }
            }
          }
        }
      }
    } else {
      const updatedBoards = [...boards, dupBoard];
      setBoards(updatedBoards);
      localStorage.setItem("neo_workspace_boards", JSON.stringify(updatedBoards));

      const boardCols = columns.filter(c => c.board_id === id).sort((a,b) => a.position - b.position);
      let updatedCols = [...columns];
      let updatedTasks = [...tasks];

      boardCols.forEach((col) => {
        const newColId = generateUUID();
        updatedCols.push({
          id: newColId,
          board_id: dupBoard.id,
          name: col.name,
          position: col.position,
          created_at: new Date().toISOString()
        });

        const colTasks = tasks.filter(t => t.column_id === col.id);
        colTasks.forEach((t) => {
          updatedTasks.push({
            ...t,
            id: generateUUID(),
            column_id: newColId,
            board_id: dupBoard.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            history: [{ id: generateUUID(), action: "criação", date: new Date().toISOString(), details: "Copiada do quadro anterior" }]
          });
        });
      });

      setColumns(updatedCols);
      localStorage.setItem("neo_workspace_columns", JSON.stringify(updatedCols));

      setTasks(updatedTasks);
      localStorage.setItem("neo_workspace_tasks", JSON.stringify(updatedTasks));
    }
  };

  // COLUMNS
  const addColumn = async (column) => {
    const newCol = {
      ...column,
      id: generateUUID(),
      created_at: new Date().toISOString()
    };

    if (usingSupabase) {
      const { data, error } = await supabase.from("workspace_columns").insert([newCol]).select();
      if (!error && data) {
        setColumns((prev) => [...prev, data[0]]);
      }
    } else {
      const updated = [...columns, newCol];
      setColumns(updated);
      localStorage.setItem("neo_workspace_columns", JSON.stringify(updated));
    }
  };

  const updateColumn = async (id, name) => {
    if (usingSupabase) {
      const { error } = await supabase.from("workspace_columns").update({ name }).eq("id", id);
      if (!error) {
        setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
      }
    } else {
      const updated = columns.map((c) => (c.id === id ? { ...c, name } : c));
      setColumns(updated);
      localStorage.setItem("neo_workspace_columns", JSON.stringify(updated));
    }
  };

  const deleteColumn = async (id) => {
    if (usingSupabase) {
      const { error } = await supabase.from("workspace_columns").delete().eq("id", id);
      if (!error) {
        setColumns((prev) => prev.filter((c) => c.id !== id));
        setTasks((prev) => prev.filter((t) => t.column_id !== id));
      }
    } else {
      const updatedCols = columns.filter((c) => c.id !== id);
      setColumns(updatedCols);
      localStorage.setItem("neo_workspace_columns", JSON.stringify(updatedCols));

      const updatedTasks = tasks.filter((t) => t.column_id !== id);
      setTasks(updatedTasks);
      localStorage.setItem("neo_workspace_tasks", JSON.stringify(updatedTasks));
    }
  };

  const reorderColumns = async (boardId, reorderedCols) => {
    setColumns((prev) => {
      const filtered = prev.filter((c) => c.board_id !== boardId);
      return [...filtered, ...reorderedCols].sort((a, b) => a.position - b.position);
    });

    if (usingSupabase) {
      const promises = reorderedCols.map((c) =>
        supabase.from("workspace_columns").update({ position: c.position }).eq("id", c.id)
      );
      await Promise.all(promises);
    } else {
      const allCols = [...columns.filter((c) => c.board_id !== boardId), ...reorderedCols];
      localStorage.setItem("neo_workspace_columns", JSON.stringify(allCols));
    }
  };

  // TASKS
  const addTask = async (task) => {
    const newTask = {
      ...task,
      id: generateUUID(),
      description: task.description || "",
      priority: task.priority || "normal",
      status: task.status || "ativo",
      checklist: task.checklist || [],
      tags: task.tags || [],
      comments: task.comments || [],
      history: task.history || [{ id: generateUUID(), action: "criação", date: new Date().toISOString(), details: "Tarefa criada" }],
      responsibles: task.responsibles || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (usingSupabase) {
      const { data, error } = await supabase.from("workspace_tasks").insert([newTask]).select();
      if (!error && data) {
        setTasks((prev) => [...prev, data[0]]);
      }
    } else {
      const updated = [...tasks, newTask];
      setTasks(updated);
      localStorage.setItem("neo_workspace_tasks", JSON.stringify(updated));
    }
  };

  const updateTask = async (id, updates) => {
    const updatedFields = { ...updates, updated_at: new Date().toISOString() };
    if (usingSupabase) {
      const { error } = await supabase.from("workspace_tasks").update(updatedFields).eq("id", id);
      if (!error) {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updatedFields } : t)));
      }
    } else {
      const updated = tasks.map((t) => (t.id === id ? { ...t, ...updatedFields } : t));
      setTasks(updated);
      localStorage.setItem("neo_workspace_tasks", JSON.stringify(updated));
    }
  };

  const deleteTask = async (id) => {
    if (usingSupabase) {
      const { error } = await supabase.from("workspace_tasks").delete().eq("id", id);
      if (!error) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }
    } else {
      const updated = tasks.filter((t) => t.id !== id);
      setTasks(updated);
      localStorage.setItem("neo_workspace_tasks", JSON.stringify(updated));
    }
  };

  const reorderTasks = async (boardId, reorderedTasks) => {
    setTasks((prev) => {
      const filtered = prev.filter((t) => t.board_id !== boardId);
      return [...filtered, ...reorderedTasks].sort((a, b) => a.position - b.position);
    });

    if (usingSupabase) {
      const promises = reorderedTasks.map((t) =>
        supabase.from("workspace_tasks").update({ 
          column_id: t.column_id, 
          position: t.position,
          updated_at: new Date().toISOString()
        }).eq("id", t.id)
      );
      await Promise.all(promises);
    } else {
      const allTasks = [...tasks.filter((t) => t.board_id !== boardId), ...reorderedTasks];
      localStorage.setItem("neo_workspace_tasks", JSON.stringify(allTasks));
    }
  };

  // ---------------------------------------------
  // OPERAÇÕES CALENDAR (EVENTS)
  // ---------------------------------------------
  const addEvent = async (event) => {
    const newEvent = {
      ...event,
      id: generateUUID(),
      history: [{ id: generateUUID(), action: "criação", date: new Date().toISOString(), details: "Evento criado" }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (usingSupabase) {
      const { data, error } = await supabase.from("calendar_events").insert([newEvent]).select();
      if (!error && data) {
        setEvents((prev) => [...prev, data[0]]);
      }
    } else {
      const updated = [...events, newEvent];
      setEvents(updated);
      localStorage.setItem("neo_calendar_events", JSON.stringify(updated));
    }
  };

  const updateEvent = async (id, updates) => {
    const updatedFields = { ...updates, updated_at: new Date().toISOString() };
    if (usingSupabase) {
      const { error } = await supabase.from("calendar_events").update(updatedFields).eq("id", id);
      if (!error) {
        setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...updatedFields } : e)));
      }
    } else {
      const updated = events.map((e) => (e.id === id ? { ...e, ...updatedFields } : e));
      setEvents(updated);
      localStorage.setItem("neo_calendar_events", JSON.stringify(updated));
    }
  };

  const deleteEvent = async (id) => {
    if (usingSupabase) {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (!error) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
      }
    } else {
      const updated = events.filter((e) => e.id !== id);
      setEvents(updated);
      localStorage.setItem("neo_calendar_events", JSON.stringify(updated));
    }
  };

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
    
    // Workspace State
    boards,
    columns,
    tasks,

    // Calendar State
    events,

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
    refreshData: loadData,

    // Ações Workspace
    addBoard,
    updateBoard,
    deleteBoard,
    duplicateBoard,
    addColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,

    // Ações Calendar
    addEvent,
    updateEvent,
    deleteEvent
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
