"use client";

import React, { useState, useMemo } from "react";
import { 
  Folder, 
  Calendar, 
  ListTodo, 
  CheckSquare, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  MoreVertical, 
  Copy, 
  Star, 
  Archive, 
  Clock, 
  User, 
  Tag, 
  MessageSquare, 
  Paperclip, 
  Link2, 
  ChevronRight, 
  ArrowUpDown, 
  PlusCircle, 
  Grid, 
  List, 
  Sparkles, 
  Move,
  CheckCircle,
  X,
  PlusSquare,
  AlertTriangle
} from "lucide-react";
import { useStore } from "@/lib/store";

export default function WorkspaceSection() {
  const {
    user,
    boards,
    columns,
    tasks,
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
    reorderTasks
  } = useStore();

  // Estados de navegação interna
  const [workspaceTab, setWorkspaceTab] = useState("boards"); // 'boards' ou 'minhas-tarefas'
  const [activeBoardId, setActiveBoardId] = useState(null); // null significa ver a lista de boards
  
  // Estados de modais
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [showEditBoardModal, setShowEditBoardModal] = useState(false);
  const [boardToEdit, setBoardToEdit] = useState(null);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [activeTask, setActiveTask] = useState(null);

  // Estados de criação de novos itens
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDesc, setNewBoardDesc] = useState("");
  const [newBoardTemplate, setNewBoardTemplate] = useState("Projeto Padrão");

  const [newColumnName, setNewColumnName] = useState("");
  const [showNewColumnInput, setShowNewColumnInput] = useState(null); // columnId
  const [quickTaskTitle, setQuickTaskTitle] = useState({}); // { columnId: "title" }

  // Filtros, Busca e Ordenação no Kanban
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("todas");
  const [filterTag, setFilterTag] = useState("todas");
  const [filterResponsible, setFilterResponsible] = useState("todos");
  const [sortOption, setSortOption] = useState("data"); // 'data', 'prioridade', 'prazo', 'nome'
  const [showArchivedTasks, setShowArchivedTasks] = useState(false);

  // Comentários, Checklist e Tags no Modal
  const [newCommentText, setNewCommentText] = useState("");
  const [newChecklistItemText, setNewChecklistItemText] = useState("");
  const [newTagInput, setNewTagInput] = useState("");
  const [newResponsibleInput, setNewResponsibleInput] = useState("");

  // Drag and Drop (HTML5 Native)
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [draggedColumnId, setDraggedColumnId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);

  // Templates pré-definidos para Boards
  const BOARD_TEMPLATES = {
    "Projeto Padrão": ["Backlog", "A Fazer", "Em Andamento", "Em Revisão", "Concluído"],
    "Funil de Marketing": ["Briefing & Ideias", "Roteiro & Copy", "Design & Criativos", "Aprovação Final", "Publicado/No Ar"],
    "CRM de Vendas": ["Lead Frio", "Contato Feito", "Apresentação/Proposta", "Negociação", "Fechado Ganho", "Perdido"],
    "Desenvolvimento Ágil": ["Sprint Backlog", "A Fazer", "Em Progresso", "Testes / QA", "Concluído"],
    "Gestão Financeira": ["Contas a Pagar", "Contas a Receber", "Conciliação Pendente", "Faturado", "Arquivado"]
  };

  // Cores de prioridade
  const PRIORITY_COLORS = {
    baixa: { border: "rgba(100, 116, 139, 0.4)", bg: "rgba(100, 116, 139, 0.15)", text: "#94a3b8" },
    normal: { border: "rgba(59, 130, 246, 0.4)", bg: "rgba(59, 130, 246, 0.15)", text: "#60a5fa" },
    alta: { border: "rgba(249, 115, 22, 0.4)", bg: "rgba(249, 115, 22, 0.15)", text: "#fb923c" },
    urgente: { border: "rgba(239, 68, 68, 0.4)", bg: "rgba(239, 68, 68, 0.15)", text: "#f87171" }
  };

  // Helper para gerar UUIDv4 compatível com o store.js
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

  // Cores fixas para Tags dinâmicas
  const getTagColor = (tagName) => {
    const colors = ["#fb7185", "#38bdf8", "#34d399", "#a78bfa", "#fbbf24", "#f472b6", "#22d3ee", "#c084fc"];
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Formatar Datas
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year.slice(-2)}`;
  };

  // ---------------------------------------------
  // HANDLERS DE DRAG & DROP
  // ---------------------------------------------
  const handleTaskDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleColumnDragStart = (e, columnId) => {
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleTaskDrop = async (e, targetColumnId) => {
    e.preventDefault();
    setDragOverColumnId(null);

    if (draggedTaskId) {
      const taskToMove = tasks.find(t => t.id === draggedTaskId);
      if (!taskToMove || taskToMove.column_id === targetColumnId) return;

      const columnTasks = tasks
        .filter(t => t.column_id === targetColumnId && t.status === "ativo")
        .sort((a, b) => a.position - b.position);

      const targetPosition = columnTasks.length;

      // Monta a nova tarefa com coluna e posição atualizadas
      const updatedTask = {
        ...taskToMove,
        column_id: targetColumnId,
        position: targetPosition,
        history: [
          ...taskToMove.history,
          { 
            id: generateUUID(), 
            action: "mudança de coluna", 
            date: new Date().toISOString(), 
            details: `Movida para a coluna "${columns.find(c => c.id === targetColumnId)?.name || ""}"` 
          }
        ]
      };

      // Atualiza o estado
      const reordered = tasks.map(t => t.id === draggedTaskId ? updatedTask : t);
      await reorderTasks(activeBoardId, reordered);
      setDraggedTaskId(null);
    }
  };

  const handleColumnDrop = async (e, targetColumnId) => {
    e.preventDefault();
    if (draggedColumnId && draggedColumnId !== targetColumnId) {
      const boardCols = columns
        .filter(c => c.board_id === activeBoardId)
        .sort((a, b) => a.position - b.position);
      
      const dragIndex = boardCols.findIndex(c => c.id === draggedColumnId);
      const dropIndex = boardCols.findIndex(c => c.id === targetColumnId);

      const [removed] = boardCols.splice(dragIndex, 1);
      boardCols.splice(dropIndex, 0, removed);

      const reorderedCols = boardCols.map((col, idx) => ({
        ...col,
        position: idx
      }));

      await reorderColumns(activeBoardId, reorderedCols);
      setDraggedColumnId(null);
    }
  };

  // ---------------------------------------------
  // LÓGICA DE CRUD
  // ---------------------------------------------
  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;

    const boardData = {
      name: newBoardName,
      description: newBoardDesc,
      template_name: newBoardTemplate
    };

    await addBoard(boardData);
    
    // Resetar campos
    setNewBoardName("");
    setNewBoardDesc("");
    setShowNewBoardModal(false);
  };

  const handleSaveEditBoard = async () => {
    if (!boardToEdit || !boardToEdit.name.trim()) return;
    await updateBoard(boardToEdit.id, {
      name: boardToEdit.name,
      description: boardToEdit.description
    });
    setShowEditBoardModal(false);
    setBoardToEdit(null);
  };

  const handleCreateColumn = async () => {
    if (!newColumnName.trim() || !activeBoardId) return;

    const boardCols = columns.filter(c => c.board_id === activeBoardId);
    const position = boardCols.length;

    await addColumn({
      board_id: activeBoardId,
      name: newColumnName,
      position
    });

    setNewColumnName("");
  };

  const handleCreateTask = async (columnId) => {
    const title = quickTaskTitle[columnId];
    if (!title || !title.trim() || !activeBoardId) return;

    const colTasks = tasks.filter(t => t.column_id === columnId);
    const position = colTasks.length;

    await addTask({
      column_id: columnId,
      board_id: activeBoardId,
      title: title.trim(),
      position
    });

    // Limpar campo de criação rápida
    setQuickTaskTitle(prev => ({ ...prev, [columnId]: "" }));
  };

  const handleSaveTaskDetail = async () => {
    if (!activeTask) return;
    await updateTask(activeTask.id, activeTask);
    setShowTaskDetailModal(false);
    setActiveTask(null);
  };

  // ---------------------------------------------
  // CHECKLIST, COMENTÁRIOS E TAGS NO MODAL DETALHE
  // ---------------------------------------------
  const handleAddChecklistItem = () => {
    if (!newChecklistItemText.trim() || !activeTask) return;

    const newItem = {
      id: generateUUID(),
      text: newChecklistItemText.trim(),
      completed: false
    };

    const updatedChecklist = [...(activeTask.checklist || []), newItem];
    const updatedHistory = [
      ...(activeTask.history || []),
      { id: generateUUID(), action: "alteração de checklist", date: new Date().toISOString(), details: `Adicionado item: "${newItem.text}"` }
    ];

    setActiveTask(prev => ({
      ...prev,
      checklist: updatedChecklist,
      history: updatedHistory
    }));

    setNewChecklistItemText("");
  };

  const handleToggleChecklistItem = (itemId) => {
    if (!activeTask) return;

    const updatedChecklist = activeTask.checklist.map(item => {
      if (item.id === itemId) {
        return { ...item, completed: !item.completed };
      }
      return item;
    });

    setActiveTask(prev => ({
      ...prev,
      checklist: updatedChecklist
    }));
  };

  const handleDeleteChecklistItem = (itemId) => {
    if (!activeTask) return;

    const updatedChecklist = activeTask.checklist.filter(item => item.id !== itemId);

    setActiveTask(prev => ({
      ...prev,
      checklist: updatedChecklist
    }));
  };

  const handleAddComment = () => {
    if (!newCommentText.trim() || !activeTask) return;

    const newComment = {
      id: generateUUID(),
      author: user?.name || "Usuário",
      date: new Date().toISOString(),
      text: newCommentText.trim()
    };

    const updatedComments = [...(activeTask.comments || []), newComment];
    const updatedHistory = [
      ...(activeTask.history || []),
      { id: generateUUID(), action: "comentário", date: new Date().toISOString(), details: `Comentou: "${newComment.text.slice(0, 30)}..."` }
    ];

    setActiveTask(prev => ({
      ...prev,
      comments: updatedComments,
      history: updatedHistory
    }));

    setNewCommentText("");
  };

  const handleAddTag = () => {
    if (!newTagInput.trim() || !activeTask) return;
    const cleanTag = newTagInput.trim();

    if (activeTask.tags.includes(cleanTag)) return;

    const updatedTags = [...activeTask.tags, cleanTag];
    const updatedHistory = [
      ...(activeTask.history || []),
      { id: generateUUID(), action: "alteração de tags", date: new Date().toISOString(), details: `Adicionou tag: "${cleanTag}"` }
    ];

    setActiveTask(prev => ({
      ...prev,
      tags: updatedTags,
      history: updatedHistory
    }));

    setNewTagInput("");
  };

  const handleRemoveTag = (tagName) => {
    if (!activeTask) return;

    const updatedTags = activeTask.tags.filter(t => t !== tagName);
    const updatedHistory = [
      ...(activeTask.history || []),
      { id: generateUUID(), action: "alteração de tags", date: new Date().toISOString(), details: `Removeu tag: "${tagName}"` }
    ];

    setActiveTask(prev => ({
      ...prev,
      tags: updatedTags,
      history: updatedHistory
    }));
  };

  const handleAddResponsible = () => {
    if (!newResponsibleInput.trim() || !activeTask) return;
    const name = newResponsibleInput.trim();

    if (activeTask.responsibles.some(r => r.name.toLowerCase() === name.toLowerCase())) return;

    // Gerar iniciais do avatar
    const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

    const updatedResponsibles = [...activeTask.responsibles, { name, avatar: initials }];
    const updatedHistory = [
      ...(activeTask.history || []),
      { id: generateUUID(), action: "alteração de responsável", date: new Date().toISOString(), details: `Atribuiu a: "${name}"` }
    ];

    setActiveTask(prev => ({
      ...prev,
      responsibles: updatedResponsibles,
      history: updatedHistory
    }));

    setNewResponsibleInput("");
  };

  const handleRemoveResponsible = (name) => {
    if (!activeTask) return;

    const updatedResponsibles = activeTask.responsibles.filter(r => r.name !== name);
    const updatedHistory = [
      ...(activeTask.history || []),
      { id: generateUUID(), action: "alteração de responsável", date: new Date().toISOString(), details: `Removeu atribuição de: "${name}"` }
    ];

    setActiveTask(prev => ({
      ...prev,
      responsibles: updatedResponsibles,
      history: updatedHistory
    }));
  };

  // ---------------------------------------------
  // DADOS FILTRADOS (KANBAN E LISTAS)
  // ---------------------------------------------
  
  // Board Ativo
  const activeBoard = useMemo(() => {
    return boards.find(b => b.id === activeBoardId);
  }, [boards, activeBoardId]);

  // Colunas do Board Ativo
  const activeColumns = useMemo(() => {
    if (!activeBoardId) return [];
    return columns
      .filter(c => c.board_id === activeBoardId)
      .sort((a, b) => a.position - b.position);
  }, [columns, activeBoardId]);

  // Todas as tags únicas do Board Ativo para o filtro
  const allBoardTags = useMemo(() => {
    if (!activeBoardId) return [];
    const boardTasks = tasks.filter(t => t.board_id === activeBoardId);
    const tagSet = new Set();
    boardTasks.forEach(t => (t.tags || []).forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet);
  }, [tasks, activeBoardId]);

  // Estatísticas/Dashboard do Board Ativo
  const boardStats = useMemo(() => {
    if (!activeBoardId) return null;
    const boardTasks = tasks.filter(t => t.board_id === activeBoardId && t.status === "ativo");
    
    const total = boardTasks.length;
    const completedTasks = boardTasks.filter(t => {
      const col = columns.find(c => c.id === t.column_id);
      return col?.name.toLowerCase() === "concluído" || col?.name.toLowerCase() === "concluídas" || t.completed_date;
    });
    const completed = completedTasks.length;

    const inProgressTasks = boardTasks.filter(t => {
      const col = columns.find(c => c.id === t.column_id);
      return col?.name.toLowerCase() === "em andamento" || col?.name.toLowerCase() === "em progresso";
    });
    const inProgress = inProgressTasks.length;

    const urgent = boardTasks.filter(t => t.priority === "urgente").length;

    // Calcular atrasadas
    const todayStr = new Date().toISOString().split("T")[0];
    const overdue = boardTasks.filter(t => t.due_date && t.due_date < todayStr && !t.completed_date).length;

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, overdue, urgent, percent };
  }, [tasks, columns, activeBoardId]);

  // Tarefas filtradas e ordenadas para o Kanban do Board Ativo
  const filteredTasksMap = useMemo(() => {
    if (!activeBoardId) return {};

    const boardTasks = tasks.filter(t => {
      if (t.board_id !== activeBoardId) return false;
      if (!showArchivedTasks && t.status === "arquivado") return false;
      if (showArchivedTasks && t.status !== "arquivado") return false;

      // Busca por query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = (t.description || "").toLowerCase().includes(query);
        const matchesTag = (t.tags || []).some(tag => tag.toLowerCase().includes(query));
        const matchesResp = (t.responsibles || []).some(r => r.name.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDesc && !matchesTag && !matchesResp) return false;
      }

      // Filtro de prioridade
      if (filterPriority !== "todas" && t.priority !== filterPriority) return false;

      // Filtro de tag
      if (filterTag !== "todas" && !(t.tags || []).includes(filterTag)) return false;

      // Filtro de responsável
      if (filterResponsible !== "todos") {
        if (!(t.responsibles || []).some(r => r.name === filterResponsible)) return false;
      }

      return true;
    });

    // Ordenação
    const sorted = [...boardTasks].sort((a, b) => {
      if (sortOption === "prazo") {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      }
      if (sortOption === "prioridade") {
        const weight = { urgente: 4, alta: 3, normal: 2, baixa: 1 };
        return (weight[b.priority] || 0) - (weight[a.priority] || 0);
      }
      if (sortOption === "nome") {
        return a.title.localeCompare(b.title);
      }
      // Padrão: data de criação ou posição
      return a.position - b.position;
    });

    // Mapeia tarefas para suas respectivas colunas
    const map = {};
    activeColumns.forEach(col => {
      map[col.id] = sorted.filter(t => t.column_id === col.id);
    });
    return map;
  }, [tasks, activeColumns, activeBoardId, searchQuery, filterPriority, filterTag, filterResponsible, sortOption, showArchivedTasks]);

  // Lista unificada para "Minhas Tarefas"
  const minhasTarefas = useMemo(() => {
    const activeTasks = tasks.filter(t => t.status === "ativo" && t.responsibles && t.responsibles.length > 0);
    const todayStr = new Date().toISOString().split("T")[0];

    const atrasadas = [];
    const hoje = [];
    const proximas = [];
    const concluidas = [];

    activeTasks.forEach(t => {
      if (t.completed_date) {
        concluidas.push(t);
      } else if (t.due_date) {
        if (t.due_date < todayStr) {
          atrasadas.push(t);
        } else if (t.due_date === todayStr) {
          hoje.push(t);
        } else {
          proximas.push(t);
        }
      } else {
        proximas.push(t);
      }
    });

    return { atrasadas, hoje, proximas, concluidas };
  }, [tasks]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* 1. SELETOR DE SUB-ABAS DO WORKSPACE */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(166, 134, 80, 0.12)", paddingBottom: "0.8rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            className={`nav-tab ${workspaceTab === "boards" ? "nav-tab-active" : ""}`}
            style={{ padding: "8px 16px", fontSize: "0.82rem" }}
            onClick={() => {
              setWorkspaceTab("boards");
              setActiveBoardId(null);
            }}
          >
            <Grid size={14} style={{ marginRight: "0.4rem" }} />
            Boards (Projetos)
          </button>
          <button 
            className={`nav-tab ${workspaceTab === "minhas-tarefas" ? "nav-tab-active" : ""}`}
            style={{ padding: "8px 16px", fontSize: "0.82rem" }}
            onClick={() => {
              setWorkspaceTab("minhas-tarefas");
              setActiveBoardId(null);
            }}
          >
            <ListTodo size={14} style={{ marginRight: "0.4rem" }} />
            Minhas Tarefas
          </button>
        </div>

        {workspaceTab === "boards" && !activeBoardId && (
          <button 
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "8px 16px", fontSize: "0.8rem" }}
            onClick={() => setShowNewBoardModal(true)}
          >
            <Plus size={14} />
            Novo Board
          </button>
        )}

        {activeBoardId && (
          <button 
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "8px 16px", fontSize: "0.8rem" }}
            onClick={() => setActiveBoardId(null)}
          >
            Voltar para Boards
          </button>
        )}
      </div>

      {/* 2. CONTEÚDO CONDICIONAL DA SUB-ABA */}
      
      {/* --- SUB-ABA BOARDS (LISTA DE PROJETOS) --- */}
      {workspaceTab === "boards" && !activeBoardId && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Boards Favoritos */}
          {boards.some(b => b.is_favorite && !b.is_archived) && (
            <div>
              <h3 style={{ fontSize: "0.95rem", color: "var(--accent-color)", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "1rem" }}>
                <Star size={14} fill="var(--accent-color)" />
                Quadros Favoritos
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.2rem" }}>
                {boards.filter(b => b.is_favorite && !b.is_archived).map(board => (
                  <BoardCard 
                    key={board.id} 
                    board={board} 
                    tasks={tasks}
                    onOpen={() => setActiveBoardId(board.id)}
                    onToggleFavorite={() => updateBoard(board.id, { is_favorite: !board.is_favorite })}
                    onDuplicate={() => duplicateBoard(board.id)}
                    onArchive={() => updateBoard(board.id, { is_archived: true })}
                    onEdit={() => {
                      setBoardToEdit(board);
                      setShowEditBoardModal(true);
                    }}
                    onDelete={() => deleteBoard(board.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Todos os Boards */}
          <div>
            <h3 style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "1rem" }}>
              <Folder size={14} style={{ color: "var(--text-secondary)" }} />
              Todos os Projetos
            </h3>
            
            {boards.filter(b => !b.is_archived).length === 0 ? (
              <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "3rem 1.5rem", textAlign: "center" }}>
                <Sparkles size={32} style={{ color: "var(--accent-color)", opacity: "0.6" }} />
                <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  Nenhum projeto criado ainda. Comece criando um novo board!
                </div>
                <button 
                  className="btn btn-primary"
                  style={{ fontSize: "0.8rem", padding: "8px 16px" }}
                  onClick={() => setShowNewBoardModal(true)}
                >
                  Criar Primeiro Board
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.2rem" }}>
                {boards.filter(b => !b.is_archived).map(board => (
                  <BoardCard 
                    key={board.id} 
                    board={board} 
                    tasks={tasks}
                    onOpen={() => setActiveBoardId(board.id)}
                    onToggleFavorite={() => updateBoard(board.id, { is_favorite: !board.is_favorite })}
                    onDuplicate={() => duplicateBoard(board.id)}
                    onArchive={() => updateBoard(board.id, { is_archived: true })}
                    onEdit={() => {
                      setBoardToEdit(board);
                      setShowEditBoardModal(true);
                    }}
                    onDelete={() => deleteBoard(board.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Projetos Arquivados */}
          {boards.some(b => b.is_archived) && (
            <div style={{ marginTop: "1rem", borderTop: "1px dashed rgba(166, 134, 80, 0.15)", paddingTop: "1.5rem" }}>
              <h4 style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500", marginBottom: "0.8rem" }}>
                Projetos Arquivados
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem" }}>
                {boards.filter(b => b.is_archived).map(board => (
                  <div key={board.id} className="card" style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: "1rem", background: "rgba(18, 22, 33, 0.2)" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textDecoration: "line-through" }}>{board.name}</span>
                    <button 
                      style={{ background: "none", border: "none", color: "var(--color-success)", fontSize: "0.75rem", cursor: "pointer", padding: "0" }}
                      onClick={() => updateBoard(board.id, { is_archived: false })}
                    >
                      Restaurar
                    </button>
                    <button 
                      style={{ background: "none", border: "none", color: "var(--color-danger)", fontSize: "0.75rem", cursor: "pointer", padding: "0" }}
                      onClick={() => deleteBoard(board.id)}
                    >
                      Excluir
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* --- KANBAN BOARD VIEW (QUADRO DO PROJETO ATIVO) --- */}
      {workspaceTab === "boards" && activeBoardId && activeBoard && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Dashboard/KPIs do Quadro no Topo */}
          {boardStats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1rem" }}>
              <div className="card" style={{ padding: "0.8rem 1.2rem", background: "rgba(18, 22, 33, 0.35)", border: "1px solid rgba(166, 134, 80, 0.05)" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Total de Tarefas</div>
                <div style={{ fontSize: "1.3rem", fontWeight: "700", color: "var(--text-primary)", marginTop: "0.2rem" }}>{boardStats.total}</div>
              </div>
              <div className="card" style={{ padding: "0.8rem 1.2rem", background: "rgba(18, 22, 33, 0.35)", border: "1px solid rgba(166, 134, 80, 0.05)" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Concluídas</div>
                <div style={{ fontSize: "1.3rem", fontWeight: "700", color: "var(--color-success)", marginTop: "0.2rem" }}>{boardStats.completed}</div>
              </div>
              <div className="card" style={{ padding: "0.8rem 1.2rem", background: "rgba(18, 22, 33, 0.35)", border: "1px solid rgba(166, 134, 80, 0.05)" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Em Andamento</div>
                <div style={{ fontSize: "1.3rem", fontWeight: "700", color: "var(--color-warning)", marginTop: "0.2rem" }}>{boardStats.inProgress}</div>
              </div>
              <div className="card" style={{ padding: "0.8rem 1.2rem", background: "rgba(18, 22, 33, 0.35)", border: "1px solid rgba(166, 134, 80, 0.05)" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Atrasadas</div>
                <div style={{ fontSize: "1.3rem", fontWeight: "700", color: "var(--color-danger)", marginTop: "0.2rem" }}>{boardStats.overdue}</div>
              </div>
              <div className="card" style={{ padding: "0.8rem 1.2rem", background: "rgba(18, 22, 33, 0.35)", border: "1px solid rgba(166, 134, 80, 0.05)" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Urgentes</div>
                <div style={{ fontSize: "1.3rem", fontWeight: "700", color: "#f87171", marginTop: "0.2rem" }}>{boardStats.urgent}</div>
              </div>
              <div className="card" style={{ padding: "0.8rem 1.2rem", display: "flex", flexDirection: "column", justifyContent: "center", background: "rgba(18, 22, 33, 0.4)", border: "1px solid rgba(166, 134, 80, 0.1)" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Progresso</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem" }}>
                  <div style={{ flexGrow: 1, height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ width: `${boardStats.percent}%`, height: "100%", background: "var(--color-success)", borderRadius: "3px" }}></div>
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-primary)" }}>{boardStats.percent}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Filtros, Busca e Toggles */}
          <div className="card" style={{ padding: "1rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem" }}>
            
            {/* Campo de Busca */}
            <div style={{ flexGrow: 1, minWidth: "200px", position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
              <input 
                type="text" 
                className="input-text" 
                placeholder="Pesquisar por título, descrição, tag..."
                style={{ paddingLeft: "2rem", width: "100%", fontSize: "0.8rem" }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filtro Prioridade */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Filter size={12} style={{ color: "var(--text-secondary)" }} />
              <select 
                className="input-text" 
                style={{ fontSize: "0.78rem", padding: "6px 10px" }}
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="todas">Prioridade (Todas)</option>
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>

            {/* Filtro Tags */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Tag size={12} style={{ color: "var(--text-secondary)" }} />
              <select 
                className="input-text" 
                style={{ fontSize: "0.78rem", padding: "6px 10px" }}
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
              >
                <option value="todas">Etiqueta (Todas)</option>
                {allBoardTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            {/* Ordenação */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <ArrowUpDown size={12} style={{ color: "var(--text-secondary)" }} />
              <select 
                className="input-text" 
                style={{ fontSize: "0.78rem", padding: "6px 10px" }}
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="data">Ordenar por Posição</option>
                <option value="prazo">Prazo Final</option>
                <option value="prioridade">Prioridade</option>
                <option value="nome">Nome A-Z</option>
              </select>
            </div>

            {/* Toggle Arquivado */}
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-secondary)", cursor: "pointer", marginLeft: "auto" }}>
              <input 
                type="checkbox" 
                checked={showArchivedTasks}
                onChange={(e) => setShowArchivedTasks(e.target.checked)}
              />
              Ver Arquivadas
            </label>
          </div>

          {/* Quadro Kanban (Scroll Horizontal) */}
          <div style={{ 
            display: "flex", 
            gap: "1.2rem", 
            overflowX: "auto", 
            paddingBottom: "1.5rem", 
            alignItems: "flex-start",
            minHeight: "550px"
          }}>
            {activeColumns.map(col => {
              const colTasks = filteredTasksMap[col.id] || [];

              return (
                <div 
                  key={col.id} 
                  className="card"
                  style={{ 
                    flex: "0 0 280px", 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "1rem", 
                    padding: "1rem", 
                    maxHeight: "530px",
                    background: dragOverColumnId === col.id ? "rgba(166, 134, 80, 0.05)" : "rgba(18, 22, 33, 0.4)",
                    border: dragOverColumnId === col.id ? "1px dashed var(--accent-color)" : "1px solid rgba(166, 134, 80, 0.08)",
                    transition: "all 0.2s ease"
                  }}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDrop={(e) => handleTaskDrop(e, col.id)}
                >
                  
                  {/* Cabeçalho da Coluna */}
                  <div 
                    draggable
                    onDragStart={(e) => handleColumnDragStart(e, col.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleColumnDrop(e, col.id)}
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "space-between", 
                      cursor: "grab", 
                      paddingBottom: "0.5rem", 
                      borderBottom: "1px solid rgba(166, 134, 80, 0.06)" 
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Move size={12} style={{ color: "rgba(255,255,255,0.15)" }} />
                      <input 
                        type="text"
                        style={{ 
                          background: "none", 
                          border: "none", 
                          color: "var(--text-primary)", 
                          fontSize: "0.85rem", 
                          fontWeight: "600", 
                          width: "140px",
                          outline: "none"
                        }}
                        value={col.name}
                        onChange={(e) => updateColumn(col.id, e.target.value)}
                      />
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ 
                        fontSize: "0.7rem", 
                        padding: "2px 6px", 
                        borderRadius: "10px", 
                        background: "rgba(255,255,255,0.06)", 
                        color: "var(--text-secondary)" 
                      }}>
                        {colTasks.length}
                      </span>
                      <button 
                        style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer", padding: "2px" }}
                        onClick={() => deleteColumn(col.id)}
                        title="Excluir Coluna"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Lista de Cartões (Scroll Vertical Interno) */}
                  <div style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "0.8rem", 
                    overflowY: "auto", 
                    flexGrow: 1, 
                    paddingRight: "4px" 
                  }}>
                    {colTasks.map(task => {
                      const priorityStyle = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal;
                      const checklistCount = task.checklist ? task.checklist.length : 0;
                      const checklistDone = task.checklist ? task.checklist.filter(i => i.completed).length : 0;
                      const isOverdue = task.due_date && task.due_date < new Date().toISOString().split("T")[0] && !task.completed_date;

                      return (
                        <div 
                          key={task.id} 
                          draggable
                          onDragStart={(e) => handleTaskDragStart(e, task.id)}
                          onClick={() => {
                            setActiveTask({ ...task });
                            setShowTaskDetailModal(true);
                          }}
                          style={{ 
                            padding: "0.8rem", 
                            background: "rgba(7, 9, 14, 0.4)", 
                            borderRadius: "6px", 
                            border: `1px solid rgba(166, 134, 80, 0.08)`, 
                            borderLeft: `3px solid ${priorityStyle.text}`,
                            cursor: "grab", 
                            display: "flex", 
                            flexDirection: "column", 
                            gap: "0.6rem",
                            transition: "all 0.15s ease",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "rgba(166, 134, 80, 0.25)";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "rgba(166, 134, 80, 0.08)";
                            e.currentTarget.style.transform = "none";
                          }}
                        >
                          {/* Tags */}
                          {task.tags && task.tags.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                              {task.tags.map(tag => (
                                <span 
                                  key={tag} 
                                  style={{ 
                                    fontSize: "0.62rem", 
                                    padding: "2px 6px", 
                                    borderRadius: "4px", 
                                    background: `${getTagColor(tag)}20`, 
                                    color: getTagColor(tag),
                                    fontWeight: "500"
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Título */}
                          <div style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--text-primary)", lineHeight: "1.3" }}>
                            {task.title}
                          </div>

                          {/* Descrição Snippet */}
                          {task.description && (
                            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {task.description}
                            </div>
                          )}

                          {/* Checklist & Comm indicators */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.2rem", paddingTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                            
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--text-secondary)" }}>
                              {/* Checklist */}
                              {checklistCount > 0 && (
                                <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.68rem" }}>
                                  <CheckSquare size={10} />
                                  <span>{checklistDone}/{checklistCount}</span>
                                </div>
                              )}
                              {/* Comentários */}
                              {task.comments && task.comments.length > 0 && (
                                <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.68rem" }}>
                                  <MessageSquare size={10} />
                                  <span>{task.comments.length}</span>
                                </div>
                              )}
                              {/* Prazo */}
                              {task.due_date && (
                                <div 
                                  style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: "0.2rem", 
                                    fontSize: "0.68rem",
                                    color: task.completed_date ? "var(--color-success)" : isOverdue ? "var(--color-danger)" : "var(--color-warning)"
                                  }}
                                >
                                  <Clock size={10} />
                                  <span>{formatDate(task.due_date)}</span>
                                </div>
                              )}
                            </div>

                            {/* Responsáveis (Avatars) */}
                            {task.responsibles && task.responsibles.length > 0 && (
                              <div style={{ display: "flex", marginLeft: "auto" }}>
                                {task.responsibles.map((resp, idx) => (
                                  <div 
                                    key={resp.name} 
                                    style={{ 
                                      width: "18px", 
                                      height: "18px", 
                                      borderRadius: "50%", 
                                      background: "var(--accent-color)", 
                                      color: "#07090e", 
                                      fontSize: "0.6rem", 
                                      fontWeight: "700", 
                                      display: "flex", 
                                      alignItems: "center", 
                                      justifyContent: "center",
                                      border: "1.5px solid #07090e",
                                      marginLeft: idx > 0 ? "-6px" : "0"
                                    }}
                                    title={resp.name}
                                  >
                                    {resp.avatar}
                                  </div>
                                ))}
                              </div>
                            )}

                          </div>

                        </div>
                      );
                    })}
                  </div>

                  {/* Criação Rápida de Tarefa */}
                  <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
                    {showNewColumnInput === col.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <input 
                          type="text" 
                          className="input-text" 
                          placeholder="Título da tarefa..."
                          style={{ fontSize: "0.78rem", padding: "6px 10px", width: "100%" }}
                          value={quickTaskTitle[col.id] || ""}
                          onChange={(e) => setQuickTaskTitle(prev => ({ ...prev, [col.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateTask(col.id);
                          }}
                          autoFocus
                        />
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button 
                            className="btn btn-primary"
                            style={{ fontSize: "0.72rem", padding: "4px 10px" }}
                            onClick={() => handleCreateTask(col.id)}
                          >
                            Adicionar
                          </button>
                          <button 
                            className="btn btn-secondary"
                            style={{ fontSize: "0.72rem", padding: "4px 10px" }}
                            onClick={() => setShowNewColumnInput(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        style={{ 
                          width: "100%", 
                          background: "none", 
                          border: "1px dashed rgba(166, 134, 80, 0.15)", 
                          borderRadius: "6px", 
                          color: "var(--text-secondary)", 
                          fontSize: "0.75rem", 
                          padding: "6px", 
                          cursor: "pointer", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center", 
                          gap: "0.3rem" 
                        }}
                        onClick={() => setShowNewColumnInput(col.id)}
                      >
                        <Plus size={12} />
                        Nova Tarefa
                      </button>
                    )}
                  </div>

                </div>
              );
            })}

            {/* Adicionar Coluna */}
            <div 
              className="card"
              style={{ 
                flex: "0 0 280px", 
                padding: "1rem", 
                background: "rgba(18, 22, 33, 0.2)", 
                border: "1px dashed rgba(166, 134, 80, 0.15)", 
                display: "flex", 
                flexDirection: "column", 
                gap: "0.8rem" 
              }}
            >
              <input 
                type="text" 
                className="input-text" 
                placeholder="Nome da coluna..."
                style={{ fontSize: "0.8rem", width: "100%" }}
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateColumn();
                }}
              />
              <button 
                className="btn btn-primary"
                style={{ fontSize: "0.8rem", padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}
                onClick={handleCreateColumn}
              >
                <Plus size={12} />
                Criar Coluna
              </button>
            </div>

          </div>

        </div>
      )}

      {/* --- SUB-ABA MINHAS TAREFAS (VISÃO CONSOLIDADA) --- */}
      {workspaceTab === "minhas-tarefas" && minhasTarefas && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            
            {/* Coluna da Esquerda: Atrasadas e Hoje */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Atrasadas */}
              <div className="card" style={{ padding: "1.2rem" }}>
                <h3 style={{ fontSize: "0.9rem", color: "var(--color-danger)", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "1rem" }}>
                  <AlertTriangle size={14} />
                  Atrasadas ({minhasTarefas.atrasadas.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                  {minhasTarefas.atrasadas.length === 0 ? (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", padding: "1rem 0" }}>Nenhuma tarefa atrasada. Bom trabalho!</div>
                  ) : (
                    minhasTarefas.atrasadas.map(t => <MinhaTarefaRow key={t.id} task={t} boards={boards} columns={columns} onOpen={() => { setActiveBoardId(t.board_id); setWorkspaceTab("boards"); }} />)
                  )}
                </div>
              </div>

              {/* Hoje */}
              <div className="card" style={{ padding: "1.2rem" }}>
                <h3 style={{ fontSize: "0.9rem", color: "var(--color-warning)", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "1rem" }}>
                  <Clock size={14} />
                  Para Hoje ({minhasTarefas.hoje.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                  {minhasTarefas.hoje.length === 0 ? (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", padding: "1rem 0" }}>Sem tarefas pendentes para hoje.</div>
                  ) : (
                    minhasTarefas.hoje.map(t => <MinhaTarefaRow key={t.id} task={t} boards={boards} columns={columns} onOpen={() => { setActiveBoardId(t.board_id); setWorkspaceTab("boards"); }} />)
                  )}
                </div>
              </div>
            </div>

            {/* Coluna da Direita: Próximos Dias e Concluídas */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Próximas */}
              <div className="card" style={{ padding: "1.2rem" }}>
                <h3 style={{ fontSize: "0.9rem", color: "var(--color-info)", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "1rem" }}>
                  <Calendar size={14} />
                  Próximos Dias ({minhasTarefas.proximas.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                  {minhasTarefas.proximas.length === 0 ? (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", padding: "1rem 0" }}>Sem próximas tarefas.</div>
                  ) : (
                    minhasTarefas.proximas.map(t => <MinhaTarefaRow key={t.id} task={t} boards={boards} columns={columns} onOpen={() => { setActiveBoardId(t.board_id); setWorkspaceTab("boards"); }} />)
                  )}
                </div>
              </div>

              {/* Concluídas */}
              <div className="card" style={{ padding: "1.2rem" }}>
                <h3 style={{ fontSize: "0.9rem", color: "var(--color-success)", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "1rem" }}>
                  <CheckCircle size={14} />
                  Concluídas ({minhasTarefas.concluidas.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                  {minhasTarefas.concluidas.length === 0 ? (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", padding: "1rem 0" }}>Nenhuma concluída ainda.</div>
                  ) : (
                    minhasTarefas.concluidas.map(t => <MinhaTarefaRow key={t.id} task={t} boards={boards} columns={columns} onOpen={() => { setActiveBoardId(t.board_id); setWorkspaceTab("boards"); }} />)
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ---------------------------------------------
          MODAIS E DIÁLOGOS
      --------------------------------------------- */}

      {/* MODAL NOVO BOARD */}
      {showNewBoardModal && (
        <div style={modalOverlayStyle}>
          <div className="card" style={{ ...modalCardStyle, maxWidth: "450px" }}>
            <div style={modalHeaderStyle}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--accent-color)" }}>Criar Novo Projeto / Board</h3>
              <button style={closeButtonStyle} onClick={() => setShowNewBoardModal(false)}><X size={16} /></button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Nome do Board</label>
                <input 
                  type="text" 
                  className="input-text" 
                  placeholder="Ex: Marketing Meta Ads" 
                  value={newBoardName} 
                  onChange={(e) => setNewBoardName(e.target.value)} 
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Descrição (Opcional)</label>
                <textarea 
                  className="input-text" 
                  placeholder="Descreva o propósito deste projeto..." 
                  style={{ minHeight: "80px", resize: "vertical" }}
                  value={newBoardDesc} 
                  onChange={(e) => setNewBoardDesc(e.target.value)} 
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Modelo do Quadro (Template)</label>
                <select 
                  className="input-text" 
                  value={newBoardTemplate} 
                  onChange={(e) => setNewBoardTemplate(e.target.value)}
                >
                  {Object.keys(BOARD_TEMPLATES).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "0.8rem", marginTop: "0.8rem" }}>
                <button className="btn btn-primary" style={{ flexGrow: 1, padding: "10px" }} onClick={handleCreateBoard}>
                  Criar Board
                </button>
                <button className="btn btn-secondary" style={{ flexGrow: 1, padding: "10px" }} onClick={() => setShowNewBoardModal(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR BOARD */}
      {showEditBoardModal && boardToEdit && (
        <div style={modalOverlayStyle}>
          <div className="card" style={{ ...modalCardStyle, maxWidth: "450px" }}>
            <div style={modalHeaderStyle}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--accent-color)" }}>Editar Projeto</h3>
              <button style={closeButtonStyle} onClick={() => { setShowEditBoardModal(false); setBoardToEdit(null); }}><X size={16} /></button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Nome do Board</label>
                <input 
                  type="text" 
                  className="input-text" 
                  value={boardToEdit.name} 
                  onChange={(e) => setBoardToEdit({ ...boardToEdit, name: e.target.value })} 
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Descrição</label>
                <textarea 
                  className="input-text" 
                  style={{ minHeight: "80px", resize: "vertical" }}
                  value={boardToEdit.description || ""} 
                  onChange={(e) => setBoardToEdit({ ...boardToEdit, description: e.target.value })} 
                />
              </div>

              <div style={{ display: "flex", gap: "0.8rem", marginTop: "0.8rem" }}>
                <button className="btn btn-primary" style={{ flexGrow: 1, padding: "10px" }} onClick={handleSaveEditBoard}>
                  Salvar
                </button>
                <button className="btn btn-secondary" style={{ flexGrow: 1, padding: "10px" }} onClick={() => { setShowEditBoardModal(false); setBoardToEdit(null); }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHE DA TAREFA */}
      {showTaskDetailModal && activeTask && (
        <div style={modalOverlayStyle}>
          <div className="card" style={{ ...modalCardStyle, maxWidth: "680px", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            
            {/* Header */}
            <div style={modalHeaderStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ 
                  fontSize: "0.7rem", 
                  padding: "2px 8px", 
                  borderRadius: "4px", 
                  background: activeTask.status === "arquivado" ? "var(--color-danger)30" : "var(--color-success)30", 
                  color: activeTask.status === "arquivado" ? "var(--color-danger)" : "var(--color-success)"
                }}>
                  {activeTask.status === "arquivado" ? "Arquivada" : "Ativa"}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>no quadro "{activeBoard?.name}"</span>
              </div>
              <button style={closeButtonStyle} onClick={() => { setShowTaskDetailModal(false); setActiveTask(null); }}><X size={16} /></button>
            </div>

            {/* Grid Principal */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: "1.5rem" }}>
              
              {/* Esquerda: Informações Principais, Checklist e Comentários */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                
                {/* Título */}
                <input 
                  type="text" 
                  className="input-text" 
                  style={{ fontSize: "1.1rem", fontWeight: "600", border: "none", borderBottom: "1px solid rgba(255,255,255,0.06)", borderRadius: "0", paddingLeft: "0", paddingRight: "0", background: "none" }}
                  value={activeTask.title}
                  onChange={(e) => setActiveTask({ ...activeTask, title: e.target.value })}
                />

                {/* Descrição Rica */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: "500" }}>Descrição da Tarefa</label>
                  <textarea 
                    className="input-text" 
                    placeholder="Adicione uma descrição rica sobre os objetivos desta tarefa..."
                    style={{ minHeight: "100px", resize: "vertical", fontSize: "0.8rem", lineHeight: "1.4" }}
                    value={activeTask.description || ""}
                    onChange={(e) => setActiveTask({ ...activeTask, description: e.target.value })}
                  />
                </div>

                {/* Checklist com progresso automático */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: "500", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <CheckSquare size={13} />
                      Checklist / Subtarefas
                    </label>
                    {activeTask.checklist && activeTask.checklist.length > 0 && (
                      <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                        {activeTask.checklist.filter(i => i.completed).length}/{activeTask.checklist.length} ({Math.round((activeTask.checklist.filter(i => i.completed).length / activeTask.checklist.length) * 100)}%)
                      </span>
                    )}
                  </div>

                  {/* Barra de progresso */}
                  {activeTask.checklist && activeTask.checklist.length > 0 && (
                    <div style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{ 
                        width: `${Math.round((activeTask.checklist.filter(i => i.completed).length / activeTask.checklist.length) * 100)}%`, 
                        height: "100%", 
                        background: "var(--color-success)" 
                      }}></div>
                    </div>
                  )}

                  {/* Lista de itens do checklist */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {activeTask.checklist && activeTask.checklist.map(item => (
                      <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", padding: "4px 0" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem", color: item.completed ? "var(--text-secondary)" : "var(--text-primary)", textDecoration: item.completed ? "line-through" : "none", cursor: "pointer" }}>
                          <input 
                            type="checkbox" 
                            checked={item.completed} 
                            onChange={() => handleToggleChecklistItem(item.id)}
                          />
                          <span>{item.text}</span>
                        </label>
                        <button 
                          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.15)", cursor: "pointer", padding: "2px" }}
                          onClick={() => handleDeleteChecklistItem(item.id)}
                          onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-danger)"}
                          onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.15)"}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Campo adicionar item no checklist */}
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.2rem" }}>
                    <input 
                      type="text" 
                      className="input-text" 
                      placeholder="Adicionar novo item..."
                      style={{ fontSize: "0.78rem", padding: "6px 10px", flexGrow: 1 }}
                      value={newChecklistItemText}
                      onChange={(e) => setNewChecklistItemText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddChecklistItem();
                      }}
                    />
                    <button className="btn btn-secondary" style={{ fontSize: "0.72rem", padding: "6px 12px" }} onClick={handleAddChecklistItem}>
                      Adicionar
                    </button>
                  </div>

                </div>

                {/* Comentários */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "1rem" }}>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: "500", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <MessageSquare size={13} />
                    Comentários ({activeTask.comments ? activeTask.comments.length : 0})
                  </label>

                  {/* Campo de comentário */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <textarea 
                      className="input-text" 
                      placeholder="Escreva um comentário..."
                      style={{ minHeight: "60px", resize: "vertical", fontSize: "0.78rem" }}
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                    />
                    <button className="btn btn-primary" style={{ fontSize: "0.75rem", padding: "6px 12px", alignSelf: "flex-end" }} onClick={handleAddComment}>
                      Enviar Comentário
                    </button>
                  </div>

                  {/* Lista de comentários */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginTop: "0.5rem" }}>
                    {activeTask.comments && activeTask.comments.map(c => (
                      <div key={c.id} style={{ display: "flex", gap: "0.6rem", background: "rgba(255,255,255,0.01)", padding: "0.6rem", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.03)" }}>
                        <div style={{ 
                          width: "22px", 
                          height: "22px", 
                          borderRadius: "50%", 
                          background: "rgba(166, 134, 80, 0.2)", 
                          color: "var(--accent-color)", 
                          fontSize: "0.65rem", 
                          fontWeight: "700", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center" 
                        }}>
                          {c.author.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", flexGrow: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-primary)" }}>{c.author}</span>
                            <span style={{ fontSize: "0.62rem", color: "var(--text-secondary)" }}>{new Date(c.date).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</span>
                          </div>
                          <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: "1.4", margin: "0" }}>{c.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Histórico de alterações */}
                {activeTask.history && activeTask.history.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "1rem" }}>
                    <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: "500" }}>Histórico de Alterações</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "100px", overflowY: "auto", paddingRight: "4px" }}>
                      {activeTask.history.map(h => (
                        <div key={h.id} style={{ fontSize: "0.66rem", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                          <span>• {h.details}</span>
                          <span style={{ color: "rgba(255,255,255,0.25)" }}>{new Date(h.date).toLocaleDateString("pt-BR")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Direita: Sidebar com Metadados da Tarefa */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", borderLeft: "1px solid rgba(255,255,255,0.04)", paddingLeft: "1.2rem" }}>
                
                {/* Prioridade */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>Prioridade</label>
                  <select 
                    className="input-text" 
                    style={{ fontSize: "0.76rem", padding: "6px" }}
                    value={activeTask.priority}
                    onChange={(e) => setActiveTask({ ...activeTask, priority: e.target.value })}
                  >
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>

                {/* Status / Ação Arquivar */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>Estado</label>
                  <button 
                    className="btn btn-secondary"
                    style={{ fontSize: "0.74rem", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}
                    onClick={() => {
                      const newStatus = activeTask.status === "arquivado" ? "ativo" : "arquivado";
                      const logAction = newStatus === "arquivado" ? "arquivamento" : "reabertura";
                      setActiveTask({ 
                        ...activeTask, 
                        status: newStatus,
                        history: [
                          ...activeTask.history,
                          { id: generateUUID(), action: logAction, date: new Date().toISOString(), details: `Tarefa ${newStatus === "arquivado" ? "arquivada" : "restaurada"}` }
                        ]
                      });
                    }}
                  >
                    <Archive size={12} />
                    {activeTask.status === "arquivado" ? "Reativar Tarefa" : "Arquivar Tarefa"}
                  </button>
                </div>

                {/* Prazo */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>Prazo Final</label>
                  <input 
                    type="date" 
                    className="input-text" 
                    style={{ fontSize: "0.76rem", padding: "6px" }}
                    value={activeTask.due_date || ""}
                    onChange={(e) => {
                      const due = e.target.value;
                      setActiveTask({ 
                        ...activeTask, 
                        due_date: due || null,
                        history: [
                          ...activeTask.history,
                          { id: generateUUID(), action: "alteração de prazo", date: new Date().toISOString(), details: `Prazo alterado para ${due ? formatDate(due) : "nenhum"}` }
                        ]
                      });
                    }}
                  />
                </div>

                {/* Data Conclusão */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>Conclusão</label>
                  {activeTask.completed_date ? (
                    <button 
                      className="btn btn-secondary"
                      style={{ fontSize: "0.74rem", padding: "6px", color: "var(--color-warning)" }}
                      onClick={() => setActiveTask({ ...activeTask, completed_date: null })}
                    >
                      Reabrir Tarefa
                    </button>
                  ) : (
                    <button 
                      className="btn btn-secondary"
                      style={{ fontSize: "0.74rem", padding: "6px", color: "var(--color-success)" }}
                      onClick={() => setActiveTask({ ...activeTask, completed_date: new Date().toISOString().split("T")[0] })}
                    >
                      Marcar Concluída
                    </button>
                  )}
                </div>

                {/* Responsáveis (Multi) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "0.8rem" }}>
                  <label style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>Responsáveis</label>
                  
                  {/* Responsáveis Atuais */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    {activeTask.responsibles && activeTask.responsibles.map(r => (
                      <div key={r.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.3rem", background: "rgba(255,255,255,0.02)", padding: "4px 8px", borderRadius: "4px" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-primary)" }}>{r.name}</span>
                        <button 
                          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.15)", cursor: "pointer", padding: "2px" }}
                          onClick={() => handleRemoveResponsible(r.name)}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Input Adicionar Responsável */}
                  <div style={{ display: "flex", gap: "0.2rem" }}>
                    <input 
                      type="text" 
                      className="input-text" 
                      placeholder="Nome..."
                      style={{ fontSize: "0.75rem", padding: "4px 8px", flexGrow: 1 }}
                      value={newResponsibleInput}
                      onChange={(e) => setNewResponsibleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddResponsible();
                      }}
                    />
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: "4px 8px" }}
                      onClick={handleAddResponsible}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Tags (Multi) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "0.8rem" }}>
                  <label style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>Tags / Etiquetas</label>
                  
                  {/* Tags Atuais */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                    {activeTask.tags && activeTask.tags.map(t => (
                      <span 
                        key={t} 
                        style={{ 
                          fontSize: "0.62rem", 
                          padding: "2px 6px", 
                          borderRadius: "4px", 
                          background: `${getTagColor(t)}20`, 
                          color: getTagColor(t),
                          display: "flex",
                          alignItems: "center",
                          gap: "0.2rem"
                        }}
                      >
                        {t}
                        <button 
                          style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: "0", display: "flex", alignItems: "center" }}
                          onClick={() => handleRemoveTag(t)}
                        >
                          <X size={8} />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Input Adicionar Tag */}
                  <div style={{ display: "flex", gap: "0.2rem" }}>
                    <input 
                      type="text" 
                      className="input-text" 
                      placeholder="Tag..."
                      style={{ fontSize: "0.75rem", padding: "4px 8px", flexGrow: 1 }}
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddTag();
                      }}
                    />
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: "4px 8px" }}
                      onClick={handleAddTag}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Botão de Excluir no modal */}
                <button 
                  className="btn btn-secondary"
                  style={{ display: "flex", alignItems: "center", justifyCenter: "center", gap: "0.3rem", padding: "8px", fontSize: "0.75rem", color: "var(--color-danger)", borderColor: "rgba(239, 68, 68, 0.2)", background: "none", marginTop: "auto" }}
                  onClick={async () => {
                    if (confirm("Deseja realmente excluir permanentemente esta tarefa?")) {
                      await deleteTask(activeTask.id);
                      setShowTaskDetailModal(false);
                      setActiveTask(null);
                    }
                  }}
                >
                  <Trash2 size={12} />
                  Excluir Cartão
                </button>

              </div>

            </div>

            {/* Ações Inferiores do Modal */}
            <div style={{ display: "flex", gap: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "1rem", marginTop: "0.5rem" }}>
              <button className="btn btn-primary" style={{ flexGrow: 1, padding: "10px", fontSize: "0.82rem" }} onClick={handleSaveTaskDetail}>
                Salvar Alterações
              </button>
              <button className="btn btn-secondary" style={{ flexGrow: 1, padding: "10px", fontSize: "0.82rem" }} onClick={() => { setShowTaskDetailModal(false); setActiveTask(null); }}>
                Fechar sem Salvar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// ---------------------------------------------
// COMPONENTES AUXILIARES INTERNOS
// ---------------------------------------------

function BoardCard({ board, tasks, onOpen, onToggleFavorite, onDuplicate, onArchive, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);

  // Contagem de tarefas ativas do board
  const boardTasks = tasks.filter(t => t.board_id === board.id && t.status === "ativo");
  const count = boardTasks.length;

  return (
    <div 
      className="card"
      style={{ 
        padding: "1.2rem", 
        background: "rgba(18, 22, 33, 0.4)", 
        border: "1px solid rgba(166, 134, 80, 0.08)",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "0.8rem",
        position: "relative",
        cursor: "pointer",
        transition: "all 0.2s ease"
      }}
      onClick={onOpen}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(166, 134, 80, 0.25)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(166, 134, 80, 0.08)";
        e.currentTarget.style.transform = "none";
      }}
    >
      {/* Nome e Favorito */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
        <h4 style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-primary)", margin: "0", lineHeight: "1.4" }}>
          {board.name}
        </h4>
        
        {/* Ações Flutuantes */}
        <div style={{ display: "flex", gap: "0.3rem", position: "relative" }} onClick={(e) => e.stopPropagation()}>
          <button 
            style={{ background: "none", border: "none", cursor: "pointer", color: board.is_favorite ? "var(--accent-color)" : "rgba(255,255,255,0.2)", padding: "2px" }}
            onClick={onToggleFavorite}
          >
            <Star size={12} fill={board.is_favorite ? "var(--accent-color)" : "none"} />
          </button>
          
          <button 
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: "2px" }}
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical size={12} />
          </button>

          {showMenu && (
            <div style={dropdownMenuStyle} onMouseLeave={() => setShowMenu(false)}>
              <button style={dropdownItemStyle} onClick={() => { onEdit(); setShowMenu(false); }}>
                <Edit size={10} /> Editar
              </button>
              <button style={dropdownItemStyle} onClick={() => { onDuplicate(); setShowMenu(false); }}>
                <Copy size={10} /> Duplicar
              </button>
              <button style={dropdownItemStyle} onClick={() => { onArchive(); setShowMenu(false); }}>
                <Archive size={10} /> Arquivar
              </button>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "4px 0" }}></div>
              <button style={{ ...dropdownItemStyle, color: "var(--color-danger)" }} onClick={() => { if(confirm("Excluir projeto permanentemente?")) onDelete(); setShowMenu(false); }}>
                <Trash2 size={10} /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Descrição */}
      {board.description && (
        <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", margin: "0", lineHeight: "1.4", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: "2", WebkitBoxOrient: "vertical" }}>
          {board.description}
        </p>
      )}

      {/* Estatísticas Simples */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: "auto", paddingTop: "0.6rem", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
          <CheckSquare size={10} />
          {count} {count === 1 ? "tarefa" : "tarefas"}
        </span>
        <span style={{ fontSize: "0.62rem" }}>
          Criado em {new Date(board.created_at).toLocaleDateString("pt-BR")}
        </span>
      </div>

    </div>
  );
}

function MinhaTarefaRow({ task, boards, columns, onOpen }) {
  const board = boards.find(b => b.id === task.board_id);
  const column = columns.find(c => c.id === task.column_id);

  // Cores de prioridade
  const textColors = { baixa: "#94a3b8", normal: "#60a5fa", alta: "#fb923c", urgente: "#f87171" };

  return (
    <div 
      onClick={onOpen}
      style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        padding: "0.6rem 0.8rem", 
        background: "rgba(255,255,255,0.01)", 
        border: "1px solid rgba(255,255,255,0.03)", 
        borderRadius: "6px",
        cursor: "pointer",
        transition: "all 0.15s ease"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(166, 134, 80, 0.03)";
        e.currentTarget.style.borderColor = "rgba(166, 134, 80, 0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.01)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.03)";
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--text-primary)" }}>{task.title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.65rem", color: "var(--text-secondary)" }}>
          <span style={{ color: "var(--accent-color)" }}>{board?.name}</span>
          <span>•</span>
          <span>{column?.name}</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
        <span style={{ 
          fontSize: "0.6rem", 
          padding: "2px 6px", 
          borderRadius: "4px", 
          textTransform: "uppercase", 
          background: `${textColors[task.priority]}15`, 
          color: textColors[task.priority],
          fontWeight: "700"
        }}>
          {task.priority}
        </span>
        {task.due_date && (
          <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.2rem" }}>
            <Calendar size={10} />
            {task.due_date.split("-").reverse().slice(0,2).join("/")}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------
// ESTILOS INLINE AUXILIARES
// ---------------------------------------------
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

const dropdownMenuStyle = {
  position: "absolute",
  right: 0,
  top: "100%",
  background: "#0d111b",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "6px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  padding: "6px",
  zIndex: 100,
  width: "120px",
  display: "flex",
  flexDirection: "column",
  gap: "2px"
};

const dropdownItemStyle = {
  background: "none",
  border: "none",
  color: "var(--text-secondary)",
  fontSize: "0.75rem",
  padding: "6px 8px",
  width: "100%",
  textAlign: "left",
  cursor: "pointer",
  borderRadius: "4px",
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  transition: "all 0.1s ease"
};
