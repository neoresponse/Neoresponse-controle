"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  AlignLeft, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  X,
  AlertTriangle,
  Info,
  CheckCircle,
  FileText
} from "lucide-react";
import { useStore } from "@/lib/store";

export default function CalendarSection() {
  const {
    user,
    events,
    addEvent,
    updateEvent,
    deleteEvent
  } = useStore();

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Estados de navegação do calendário
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed (Jan = 0)
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDateStr, setSelectedDateStr] = useState(today.toISOString().split("T")[0]);

  // Estados de modais
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // null para novo, objeto para edição

  // Estados de novos campos do formulário
  const [evtTitle, setEvtTitle] = useState("");
  const [evtDate, setEvtDate] = useState("");
  const [evtStartTime, setEvtStartTime] = useState("");
  const [evtEndTime, setEvtEndTime] = useState("");
  const [evtDesc, setEvtDesc] = useState("");
  const [evtLocation, setEvtLocation] = useState("");
  const [evtNotes, setEvtNotes] = useState("");
  const [evtCategory, setEvtCategory] = useState("Reunião");
  const [evtDuration, setEvtDuration] = useState(60);
  const [evtResponsible, setEvtResponsible] = useState("");

  // Estados de filtros e busca
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("todas");
  const [filterResponsible, setFilterResponsible] = useState("todos");
  const [onlyMyEvents, setOnlyMyEvents] = useState(false);

  // Lista de Categorias e Cores
  const CATEGORIES = [
    { name: "Reunião", color: "#3b82f6" }, // Azul
    { name: "Marketing", color: "#fb923c" }, // Laranja
    { name: "Desenvolvimento", color: "#a78bfa" }, // Roxo
    { name: "Financeiro", color: "#34d399" }, // Verde
    { name: "Cliente", color: "#f472b6" }, // Rosa
    { name: "Pessoal", color: "#94a3b8" }, // Cinza
    { name: "Administrativo", color: "#22d3ee" }, // Ciano
    { name: "Lembrete", color: "#fbbf24" } // Amarelo
  ];

  // Nomes dos meses
  const MONTHS_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Anos disponíveis no seletor
  const YEARS_RANGE = useMemo(() => {
    const list = [];
    for (let y = today.getFullYear() - 5; y <= today.getFullYear() + 5; y++) {
      list.push(y);
    }
    return list;
  }, []);

  // Setar o responsável padrão como o usuário logado
  useEffect(() => {
    if (user && !evtResponsible) {
      // Formatar nome amigável do responsável (ex: Pelizzaro, Gustavo)
      const friendlyName = user.name.split(" ")[0];
      setEvtResponsible(friendlyName);
    }
  }, [user]);

  // Limpar formulário de evento
  const clearEventForm = () => {
    setEvtTitle("");
    setEvtDate(selectedDateStr);
    setEvtStartTime("09:00");
    setEvtEndTime("");
    setEvtDesc("");
    setEvtLocation("");
    setEvtNotes("");
    setEvtCategory("Reunião");
    setEvtDuration(60);
    setEvtResponsible(user ? user.name.split(" ")[0] : "");
    setEditingEvent(null);
  };

  // Carregar dados no formulário para edição
  const handleOpenEditEvent = (evt) => {
    setEditingEvent(evt);
    setEvtTitle(evt.title);
    setEvtDate(evt.event_date);
    setEvtStartTime(evt.start_time.slice(0, 5));
    setEvtEndTime(evt.end_time ? evt.end_time.slice(0, 5) : "");
    setEvtDesc(evt.description || "");
    setEvtLocation(evt.location || "");
    setEvtNotes(evt.notes || "");
    setEvtCategory(evt.category || "Reunião");
    setEvtDuration(evt.duration || 60);
    setEvtResponsible(evt.responsible_name);
    setShowEventModal(true);
  };

  // Salvar compromisso (Novo ou Edição)
  const handleSaveEvent = async () => {
    if (!evtTitle.trim() || !evtDate || !evtStartTime) {
      alert("Preencha todos os campos obrigatórios (Título, Data e Horário)!");
      return;
    }

    const categoryColor = CATEGORIES.find(c => c.name === evtCategory)?.color || "#60a5fa";

    const eventData = {
      title: evtTitle.trim(),
      event_date: evtDate,
      start_time: evtStartTime,
      end_time: evtEndTime ? evtEndTime : null,
      description: evtDesc.trim(),
      location: evtLocation.trim(),
      notes: evtNotes.trim(),
      category: evtCategory,
      color_category: categoryColor,
      duration: parseInt(evtDuration),
      responsible_name: evtResponsible
    };

    if (editingEvent) {
      // Registrar log histórico de alteração
      const historyLog = [
        ...(editingEvent.history || []),
        {
          id: crypto.randomUUID(),
          action: "edição",
          date: new Date().toISOString(),
          details: `Evento atualizado por ${user?.name || "Usuário"}`
        }
      ];
      await updateEvent(editingEvent.id, { ...eventData, history: historyLog });
    } else {
      await addEvent(eventData);
    }

    setShowEventModal(false);
    clearEventForm();
  };

  // Excluir Evento
  const handleDeleteEvent = async (id) => {
    if (confirm("Deseja realmente excluir este agendamento permanentemente?")) {
      await deleteEvent(id);
      if (editingEvent && editingEvent.id === id) {
        setShowEventModal(false);
        clearEventForm();
      }
    }
  };

  // Navegar calendário para o mês/dia atual
  const handleGoToToday = () => {
    const todayDate = new Date();
    setCurrentMonth(todayDate.getMonth());
    setCurrentYear(todayDate.getFullYear());
    setSelectedDateStr(todayDate.toISOString().split("T")[0]);
  };

  // Navegar para mês anterior
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  // Navegar para próximo mês
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // ---------------------------------------------
  // LÓGICA DE GERAÇÃO DOS DIAS DO MÊS
  // ---------------------------------------------
  const calendarDays = useMemo(() => {
    const days = [];
    
    // Primeiro dia da semana do primeiro dia do mês selecionado (Domingo = 0, Segunda = 1...)
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    
    // Total de dias no mês atual
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Total de dias no mês anterior
    const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate();

    // Dias do mês anterior para preenchimento no início
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      
      // Formatar string de data
      const monthStr = String(prevMonth + 1).padStart(2, "0");
      const dayStr = String(dayNum).padStart(2, "0");
      const dateStr = `${prevYear}-${monthStr}-${dayStr}`;

      days.push({
        dayNumber: dayNum,
        isCurrentMonth: false,
        dateString: dateStr
      });
    }

    // Dias do mês atual
    for (let i = 1; i <= totalDays; i++) {
      const monthStr = String(currentMonth + 1).padStart(2, "0");
      const dayStr = String(i).padStart(2, "0");
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

      days.push({
        dayNumber: i,
        isCurrentMonth: true,
        dateString: dateStr
      });
    }

    // Dias do mês seguinte para completar o grid (geralmente de 35 a 42 células)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

      const monthStr = String(nextMonth + 1).padStart(2, "0");
      const dayStr = String(i).padStart(2, "0");
      const dateStr = `${nextYear}-${monthStr}-${dayStr}`;

      days.push({
        dayNumber: i,
        isCurrentMonth: false,
        dateString: dateStr
      });
    }

    return days;
  }, [currentMonth, currentYear]);

  // ---------------------------------------------
  // COMPROMISSOS FILTRADOS E ESTATÍSTICAS
  // ---------------------------------------------
  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      // Busca textual
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = evt.title.toLowerCase().includes(query);
        const matchesDesc = (evt.description || "").toLowerCase().includes(query);
        const matchesResp = evt.responsible_name.toLowerCase().includes(query);
        const matchesCat = evt.category.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesResp && !matchesCat) return false;
      }

      // Filtro Categoria
      if (filterCategory !== "todas" && evt.category !== filterCategory) return false;

      // Filtro Responsável
      if (filterResponsible !== "todos" && evt.responsible_name !== filterResponsible) return false;

      // Filtro apenas meus compromissos
      if (onlyMyEvents && user) {
        const userFirst = user.name.split(" ")[0].toLowerCase();
        if (evt.responsible_name.toLowerCase() !== userFirst) return false;
      }

      return true;
    });
  }, [events, searchQuery, filterCategory, filterResponsible, onlyMyEvents, user]);

  // Agrupar eventos filtrados por data para exibição rápida no grid
  const eventsByDateMap = useMemo(() => {
    const map = {};
    filteredEvents.forEach(evt => {
      if (!map[evt.event_date]) {
        map[evt.event_date] = [];
      }
      map[evt.event_date].push(evt);
    });
    return map;
  }, [filteredEvents]);

  // Responsáveis únicos encontrados nos compromissos para preencher filtro
  const uniqueResponsibles = useMemo(() => {
    const set = new Set();
    events.forEach(e => set.add(e.responsible_name));
    return Array.from(set);
  }, [events]);

  // Estatísticas/Dashboard do Topo
  const calendarStats = useMemo(() => {
    const todayStr = today.toISOString().split("T")[0];
    
    // Filtro desta semana (de hoje até 7 dias pra frente)
    const nextWeekMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const nextWeekStr = new Date(nextWeekMs).toISOString().split("T")[0];

    const currentMonthStr = String(today.getMonth() + 1).padStart(2, "0");
    const currentYearStr = String(today.getFullYear());

    let countToday = 0;
    let countWeek = 0;
    let countMonth = 0;
    let nextEvent = null;

    events.forEach(evt => {
      // Hoje
      if (evt.event_date === todayStr) {
        countToday++;
      }
      // Essa semana (7 dias)
      if (evt.event_date >= todayStr && evt.event_date <= nextWeekStr) {
        countWeek++;
      }
      // Este mês
      if (evt.event_date.startsWith(`${currentYearStr}-${currentMonthStr}`)) {
        countMonth++;
      }

      // Encontrar o próximo compromisso futuro mais próximo
      if (evt.event_date >= todayStr) {
        const evtDateTimeStr = `${evt.event_date}T${evt.start_time}`;
        const evtTime = new Date(evtDateTimeStr).getTime();
        const nowTime = Date.now();

        if (evtTime >= nowTime) {
          if (!nextEvent) {
            nextEvent = evt;
          } else {
            const nextDateTimeStr = `${nextEvent.event_date}T${nextEvent.start_time}`;
            if (evtDateTimeStr < nextDateTimeStr) {
              nextEvent = evt;
            }
          }
        }
      }
    });

    return {
      today: countToday,
      week: countWeek,
      month: countMonth,
      total: events.length,
      next: nextEvent ? `${nextEvent.title} (${nextEvent.start_time.slice(0,5)})` : "Nenhum agendado"
    };
  }, [events]);

  // Lista lateral de próximos compromissos em ordem cronológica
  const upcomingAppointments = useMemo(() => {
    const todayStr = today.toISOString().split("T")[0];
    return [...filteredEvents]
      .filter(evt => evt.event_date >= todayStr)
      .sort((a, b) => {
        const timeA = `${a.event_date}T${a.start_time}`;
        const timeB = `${b.event_date}T${b.start_time}`;
        return timeA.localeCompare(timeB);
      })
      .slice(0, 10); // Limitar a exibir os próximos 10 compromissos
  }, [filteredEvents]);

  // Eventos do Dia Selecionado (Exibido abaixo do grid)
  const selectedDayEvents = useMemo(() => {
    return (eventsByDateMap[selectedDateStr] || []).sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [eventsByDateMap, selectedDateStr]);

  // Checar se evento é hoje ou falta menos de 24 horas para alerta visual
  const isEventNear = (evt) => {
    const todayStr = today.toISOString().split("T")[0];
    if (evt.event_date === todayStr) return true;

    const eventTime = new Date(`${evt.event_date}T${evt.start_time}`).getTime();
    const diffHours = (eventTime - Date.now()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours < 24;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* 1. DASHBOARD DO CALENDAR */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
        <div className="card" style={{ padding: "0.8rem 1.2rem", background: "rgba(18, 22, 33, 0.35)", border: "1px solid rgba(166, 134, 80, 0.05)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Eventos Hoje</div>
          <div style={{ fontSize: "1.3rem", fontWeight: "700", color: "var(--color-warning)", marginTop: "0.2rem" }}>{calendarStats.today}</div>
        </div>
        <div className="card" style={{ padding: "0.8rem 1.2rem", background: "rgba(18, 22, 33, 0.35)", border: "1px solid rgba(166, 134, 80, 0.05)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Esta Semana</div>
          <div style={{ fontSize: "1.3rem", fontWeight: "700", color: "var(--color-info)", marginTop: "0.2rem" }}>{calendarStats.week}</div>
        </div>
        <div className="card" style={{ padding: "0.8rem 1.2rem", background: "rgba(18, 22, 33, 0.35)", border: "1px solid rgba(166, 134, 80, 0.05)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Este Mês</div>
          <div style={{ fontSize: "1.3rem", fontWeight: "700", color: "var(--text-primary)", marginTop: "0.2rem" }}>{calendarStats.month}</div>
        </div>
        <div className="card" style={{ padding: "0.8rem 1.2rem", background: "rgba(18, 22, 33, 0.35)", border: "1px solid rgba(166, 134, 80, 0.05)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Próximo Compromisso</div>
          <div style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--accent-color)", marginTop: "0.4rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {calendarStats.next}
          </div>
        </div>
        <div className="card" style={{ padding: "0.8rem 1.2rem", background: "rgba(18, 22, 33, 0.35)", border: "1px solid rgba(166, 134, 80, 0.05)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Total de Agendamentos</div>
          <div style={{ fontSize: "1.3rem", fontWeight: "700", color: "var(--color-success)", marginTop: "0.2rem" }}>{calendarStats.total}</div>
        </div>
      </div>

      {/* 2. FILTROS E BUSCA */}
      <div className="card" style={{ padding: "1rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem" }}>
        
        {/* Campo de Busca */}
        <div style={{ flexGrow: 1, minWidth: "200px", position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
          <input 
            type="text" 
            className="input-text" 
            placeholder="Pesquisar por título, responsável, categoria..."
            style={{ paddingLeft: "2rem", width: "100%", fontSize: "0.8rem" }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filtro Categoria */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Filter size={12} style={{ color: "var(--text-secondary)" }} />
          <select 
            className="input-text" 
            style={{ fontSize: "0.78rem", padding: "6px 10px" }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="todas">Categoria (Todas)</option>
            {CATEGORIES.map(cat => (
              <option key={cat.name} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Filtro Responsável */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <User size={12} style={{ color: "var(--text-secondary)" }} />
          <select 
            className="input-text" 
            style={{ fontSize: "0.78rem", padding: "6px 10px" }}
            value={filterResponsible}
            onChange={(e) => setFilterResponsible(e.target.value)}
          >
            <option value="todos">Responsável (Todos)</option>
            {uniqueResponsibles.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Toggle Apenas Meus */}
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-secondary)", cursor: "pointer", marginLeft: "1rem" }}>
          <input 
            type="checkbox" 
            checked={onlyMyEvents}
            onChange={(e) => setOnlyMyEvents(e.target.checked)}
          />
          Apenas meus compromissos
        </label>

        {/* Botão Novo Evento */}
        <button 
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "8px 16px", fontSize: "0.8rem", marginLeft: "auto" }}
          onClick={() => {
            clearEventForm();
            setShowEventModal(true);
          }}
        >
          <Plus size={14} />
          Novo Agendamento
        </button>
      </div>

      {/* 3. GRID LAYOUT: CALENDÁRIO MENSAL + SIDEBAR */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "1.5rem" }}>
        
        {/* Painel do Calendário (Esquerda) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          
          <div className="card" style={{ padding: "1.2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            
            {/* Cabeçalho de Navegação do Mês */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <button className="btn btn-secondary" style={{ padding: "5px 10px", fontSize: "0.75rem" }} onClick={handleGoToToday}>
                  Hoje
                </button>
                
                <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                  <button style={navMonthBtnStyle} onClick={handlePrevMonth}><ChevronLeft size={16} /></button>
                  <button style={navMonthBtnStyle} onClick={handleNextMonth}><ChevronRight size={16} /></button>
                </div>
              </div>

              {/* Seletores Rápidos de Mês e Ano */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <select 
                  className="input-text" 
                  style={{ fontSize: "0.82rem", fontWeight: "600", padding: "4px 8px", background: "none", border: "1px solid rgba(166,134,80,0.12)" }}
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                >
                  {MONTHS_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>

                <select 
                  className="input-text" 
                  style={{ fontSize: "0.82rem", fontWeight: "600", padding: "4px 8px", background: "none", border: "1px solid rgba(166,134,80,0.12)" }}
                  value={currentYear}
                  onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                >
                  {YEARS_RANGE.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid do Calendário */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              
              {/* Dias da semana */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", paddingBottom: "0.5rem", borderBottom: "1px solid rgba(166, 134, 80, 0.08)" }}>
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
                  <span key={day} style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {day}
                  </span>
                ))}
              </div>

              {/* Grid de dias do mês */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "78px", gap: "2px", background: "rgba(166, 134, 80, 0.05)", padding: "2px", borderRadius: "0 0 6px 6px" }}>
                {calendarDays.map((day, idx) => {
                  const dayEvents = eventsByDateMap[day.dateString] || [];
                  const isSelected = selectedDateStr === day.dateString;
                  const isToday = day.dateString === today.toISOString().split("T")[0];

                  return (
                    <div 
                      key={`${day.dateString}-${idx}`}
                      onClick={() => setSelectedDateStr(day.dateString)}
                      style={{ 
                        background: isSelected ? "rgba(166, 134, 80, 0.12)" : isToday ? "rgba(255, 255, 255, 0.02)" : "rgba(7, 9, 14, 0.5)",
                        border: isSelected 
                          ? "1px solid var(--accent-color)" 
                          : isToday 
                            ? "1px solid rgba(255, 255, 255, 0.15)" 
                            : "1px solid rgba(166, 134, 80, 0.03)",
                        padding: "0.4rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.2rem",
                        cursor: "pointer",
                        opacity: day.isCurrentMonth ? "1" : "0.35",
                        transition: "all 0.1s ease"
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.015)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = isToday ? "rgba(255,255,255,0.02)" : "rgba(7, 9, 14, 0.5)";
                      }}
                    >
                      {/* Número do Dia */}
                      <span style={{ 
                        fontSize: "0.78rem", 
                        fontWeight: "600", 
                        color: isToday ? "var(--accent-color)" : "var(--text-primary)",
                        alignSelf: "flex-end"
                      }}>
                        {day.dayNumber}
                      </span>

                      {/* Indicadores Circulares das Categorias */}
                      {dayEvents.length > 0 && (
                        <div style={{ display: "flex", gap: "3px", flexWrap: "wrap", marginTop: "auto" }}>
                          {dayEvents.slice(0, 3).map((evt, eIdx) => (
                            <span 
                              key={`${evt.id}-${eIdx}`}
                              style={{ 
                                width: "6px", 
                                height: "6px", 
                                borderRadius: "50%", 
                                backgroundColor: evt.color_category 
                              }}
                            />
                          ))}
                        </div>
                      )}

                      {/* Texto Quantidade de Eventos */}
                      {dayEvents.length > 0 && (
                        <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                          {dayEvents.length} {dayEvents.length === 1 ? "evento" : "eventos"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>

          </div>

          {/* Listagem de eventos do dia selecionado */}
          <div className="card" style={{ padding: "1.2rem" }}>
            <h3 style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "600", borderBottom: "1px solid rgba(166,134,80,0.1)", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
              Agendamentos para o dia {selectedDateStr.split("-").reverse().join("/")} ({selectedDayEvents.length})
            </h3>

            {selectedDayEvents.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", padding: "1rem 0" }}>
                Nenhum compromisso agendado para esta data. Clique em "Novo Agendamento" para planejar.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                {selectedDayEvents.map(evt => {
                  const isNear = isEventNear(evt);
                  return (
                    <div 
                      key={evt.id}
                      onClick={() => handleOpenEditEvent(evt)}
                      style={{ 
                        padding: "0.8rem", 
                        background: "rgba(255, 255, 255, 0.01)", 
                        border: "1px solid rgba(166, 134, 80, 0.08)", 
                        borderLeft: `3px solid ${evt.color_category}`,
                        borderRadius: "6px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(166, 134, 80, 0.03)";
                        e.currentTarget.style.borderColor = "rgba(166, 134, 80, 0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.01)";
                        e.currentTarget.style.borderColor = "rgba(166, 134, 80, 0.08)";
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--text-primary)" }}>{evt.title}</span>
                          <span style={{ fontSize: "0.62rem", padding: "1px 6px", borderRadius: "4px", background: `${evt.color_category}20`, color: evt.color_category, fontWeight: "500" }}>{evt.category}</span>
                          {isNear && (
                            <span title="Evento próximo / hoje" style={{ color: "var(--color-warning)", display: "flex", alignItems: "center" }}>
                              <AlertTriangle size={11} />
                            </span>
                          )}
                        </div>
                        {evt.description && <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>{evt.description}</span>}
                        {evt.location && (
                          <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                            <MapPin size={10} /> {evt.location}
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Clock size={11} />
                          {evt.start_time.slice(0, 5)} {evt.end_time ? ` - ${evt.end_time.slice(0, 5)}` : ""}
                        </span>
                        <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                          <User size={10} /> {evt.responsible_name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Painel Lateral: Próximos Agendamentos (Direita) */}
        <div className="card" style={{ padding: "1.2rem", display: "flex", flexDirection: "column", gap: "1rem", height: "fit-content" }}>
          <h3 style={{ fontSize: "0.85rem", color: "var(--accent-color)", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem", borderBottom: "1px solid rgba(166,134,80,0.1)", paddingBottom: "0.5rem" }}>
            <Calendar size={13} />
            Próximos Agendamentos
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem", overflowY: "auto", maxHeight: "650px", paddingRight: "4px" }}>
            {upcomingAppointments.length === 0 ? (
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Sem compromissos futuros.
              </div>
            ) : (
              upcomingAppointments.map((evt, idx) => (
                <div 
                  key={`${evt.id}-upcoming-${idx}`}
                  onClick={() => {
                    const evtDateObj = new Date(evt.event_date);
                    setCurrentMonth(evtDateObj.getMonth());
                    setCurrentYear(evtDateObj.getFullYear());
                    setSelectedDateStr(evt.event_date);
                  }}
                  style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "0.4rem", 
                    cursor: "pointer", 
                    paddingBottom: "1rem", 
                    borderBottom: "1px solid rgba(255,255,255,0.03)" 
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--accent-color)" }}>{evt.start_time.slice(0, 5)}</span>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>{formatDate(evt.event_date)}</span>
                  </div>
                  <span style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{evt.title}</span>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                    <span style={{ color: evt.color_category }}>{evt.category}</span>
                    <span>Resp: {evt.responsible_name}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 4. MODAL DETALHE / CADASTRO DE COMPROMISSO */}
      {showEventModal && (
        <div style={modalOverlayStyle}>
          <div className="card" style={{ ...modalCardStyle, maxWidth: "520px" }}>
            <div style={modalHeaderStyle}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--accent-color)" }}>
                {editingEvent ? "Editar Compromisso" : "Agendar Compromisso"}
              </h3>
              <button style={closeButtonStyle} onClick={() => { setShowEventModal(false); clearEventForm(); }}><X size={16} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
              
              {/* Título */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <label style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>Título do Evento *</label>
                <input 
                  type="text" 
                  className="input-text" 
                  placeholder="Ex: Reunião com agência Meta Ads" 
                  value={evtTitle} 
                  onChange={(e) => setEvtTitle(e.target.value)}
                />
              </div>

              {/* Data e Horário */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>Data *</label>
                  <input 
                    type="date" 
                    className="input-text" 
                    value={evtDate} 
                    onChange={(e) => setEvtDate(e.target.value)}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    <label style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>Hora Início *</label>
                    <input 
                      type="time" 
                      className="input-text" 
                      value={evtStartTime} 
                      onChange={(e) => setEvtStartTime(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    <label style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>Hora Fim (Opc)</label>
                    <input 
                      type="time" 
                      className="input-text" 
                      value={evtEndTime} 
                      onChange={(e) => setEvtEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Responsável e Categoria */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>Responsável</label>
                  <input 
                    type="text" 
                    className="input-text" 
                    placeholder="Pelizzaro, Gustavo..." 
                    value={evtResponsible} 
                    onChange={(e) => setEvtResponsible(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>Categoria</label>
                  <select 
                    className="input-text" 
                    value={evtCategory} 
                    onChange={(e) => setEvtCategory(e.target.value)}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <label style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>Descrição (Opcional)</label>
                <textarea 
                  className="input-text" 
                  placeholder="Detalhamento do assunto a ser tratado..." 
                  style={{ minHeight: "60px", resize: "vertical", fontSize: "0.78rem" }}
                  value={evtDesc} 
                  onChange={(e) => setEvtDesc(e.target.value)}
                />
              </div>

              {/* Local / Link Reunião */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <label style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>Local / Link Reunião (Opcional)</label>
                <input 
                  type="text" 
                  className="input-text" 
                  placeholder="Ex: Google Meet, Escritório..." 
                  value={evtLocation} 
                  onChange={(e) => setEvtLocation(e.target.value)}
                />
              </div>

              {/* Observações / Anotações */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <label style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>Anotações / Notas pós-reunião (Opcional)</label>
                <textarea 
                  className="input-text" 
                  placeholder="Anotações feitas durante ou após o compromisso..." 
                  style={{ minHeight: "50px", resize: "vertical", fontSize: "0.78rem" }}
                  value={evtNotes} 
                  onChange={(e) => setEvtNotes(e.target.value)}
                />
              </div>

              {/* Duração em minutos */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <label style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>Duração Estimada (Minutos)</label>
                <input 
                  type="number" 
                  className="input-text" 
                  value={evtDuration} 
                  onChange={(e) => setEvtDuration(e.target.value)}
                />
              </div>

              {/* Histórico Simplificado */}
              {editingEvent && editingEvent.history && editingEvent.history.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "0.6rem" }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>Histórico de Alterações:</span>
                  <div style={{ maxHeight: "60px", overflowY: "auto", fontSize: "0.62rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "2px" }}>
                    {editingEvent.history.map((h, hIdx) => (
                      <span key={hIdx}>• {h.details} ({new Date(h.date).toLocaleDateString("pt-BR")})</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ações Inferiores */}
              <div style={{ display: "flex", gap: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                {editingEvent && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: "10px 14px", color: "var(--color-danger)", borderColor: "rgba(239, 68, 68, 0.2)", background: "none" }}
                    onClick={() => handleDeleteEvent(editingEvent.id)}
                  >
                    Excluir
                  </button>
                )}
                <button className="btn btn-primary" style={{ flexGrow: 1, padding: "10px" }} onClick={handleSaveEvent}>
                  Salvar
                </button>
                <button className="btn btn-secondary" style={{ flexGrow: 1, padding: "10px" }} onClick={() => { setShowEventModal(false); clearEventForm(); }}>
                  Cancelar
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// ESTILOS AUXILIARES INLINE
const navMonthBtnStyle = {
  background: "none",
  border: "1px solid rgba(166, 134, 80, 0.12)",
  borderRadius: "4px",
  color: "var(--text-primary)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "4px"
};

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(7, 9, 14, 0.75)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "1rem"
};

const modalCardStyle = {
  background: "#0d111b",
  border: "1px solid rgba(166, 134, 80, 0.18)",
  borderRadius: "10px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
  width: "100%",
  padding: "1.5rem"
};

const modalHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: "0.8rem",
  borderBottom: "1px solid rgba(255,255,255,0.06)"
};

const closeButtonStyle = {
  background: "none",
  border: "none",
  color: "var(--text-secondary)",
  cursor: "pointer",
  padding: "4px"
};
