"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  FolderKanban,
  Copy,
  Plus,
  Trash2,
  Edit2,
  ChevronLeft,
  LayoutGrid,
  ListTodo,
  Tag,
  User,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Edit3,
  X,
  Save,
  Briefcase,
  Workflow,
  ChevronRight,
  Users
} from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import styles from "./ProjetosSection.module.css";

// ============================================================
// CONSTANTES
// ============================================================
const MEMBERS = [
  { id: "andre", name: "André", initials: "AP", color: "#a68650" },
  { id: "gustavo", name: "Gustavo", initials: "GK", color: "#10b981" }
];

const DEFAULT_STAGES_PROJETO = [
  "Briefing",
  "Planejamento",
  "Execução",
  "Revisão",
  "Concluído"
];

const DEFAULT_STAGES_PROCESSO = [
  "Identificação",
  "Mapeamento",
  "Implementação",
  "Monitoramento",
  "Otimizado"
];

const STAGE_STATUS_COLORS = {
  todo: { bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.3)", text: "#94a3b8", label: "A Fazer" },
  doing: { bg: "rgba(166,134,80,0.12)", border: "rgba(166,134,80,0.4)", text: "#d2b47a", label: "Em Andamento" },
  done: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", text: "#10b981", label: "Concluído" }
};

const generateId = () =>
  typeof window !== "undefined" && window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ============================================================
// HELPERS DE PERSISTÊNCIA (localStorage — compatível com o store)
// ============================================================
const LS_KEY = "neo_projetos_processos";

function loadFromStorage() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveToStorage(data) {
  if (typeof window === "undefined") return;
  // Salva local para feedback imediato
  try { localStorage.setItem("neo_projetos_processos", JSON.stringify(data)); } catch {}
  
  // Salva no Supabase
  try {
    await supabase.from('projetos_state').upsert({ id: 'main', payload: data });
  } catch (err) {
    console.error("Erro ao salvar no Supabase", err);
  }
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function ProjetosSection() {
  const { user } = useStore();

  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [view, setView] = useState("list"); // 'list' | 'kanban'

  // Modais
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditStageModal, setShowEditStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  // Formulário de novo projeto/processo
  const [newType, setNewType] = useState("projeto");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Sincronização com Supabase (Carregamento e Polling)
  useEffect(() => {
    let isMounted = true;

    const fetchSupabase = async () => {
      try {
        const { data, error } = await supabase.from('projetos_state').select('payload').eq('id', 'main').single();
        if (!error && data && data.payload && isMounted) {
          setProjects(data.payload);
          // Se não houver projeto ativo, seleciona o primeiro
          setActiveProjectId(prev => prev ? prev : (data.payload[0]?.id || null));
        } else if (error && error.code === 'PGRST116') {
          // Não existe linha 'main', tentar carregar do local storage
          const saved = loadFromStorage();
          if (saved && saved.length > 0 && isMounted) {
            setProjects(saved);
            setActiveProjectId(saved[0].id);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar Supabase:", err);
      }
    };

    fetchSupabase();
    
    // Polling a cada 5 segundos para manter sincronizado com o sócio
    const interval = setInterval(fetchSupabase, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Salva sempre que projetos mudam
  useEffect(() => {
    if (projects.length > 0) saveToStorage(projects);
  }, [projects]);

  // ============================================================
  // FÁBRICA DE PROJETO
  // ============================================================
  function createProject(name, type, description = "", globalAssignees = []) {
    const defaultStages =
      type === "projeto" ? DEFAULT_STAGES_PROJETO : DEFAULT_STAGES_PROCESSO;

    return {
      id: generateId(),
      name,
      type,
      description,
      createdAt: new Date().toISOString(),
      stages: defaultStages.map((stageName, idx) => ({
        id: generateId(),
        name: stageName,
        status: idx === 0 ? "doing" : "todo",
        assignees: idx === 0 ? globalAssignees : [],
        notes: ""
      }))
    };
  }

  // ============================================================
  // CRUD DE PROJETOS
  // ============================================================
  function handleCreateProject() {
    if (!newName.trim()) return;
    const proj = createProject(newName.trim(), newType, newDesc.trim());
    const updated = [proj, ...projects];
    setProjects(updated);
    setShowNewModal(false);
    setNewName("");
    setNewDesc("");
    setNewType("projeto");
  }

  function handleDeleteProject(id) {
    if (!confirm("Excluir este item permanentemente?")) return;
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    if (activeProjectId === id) {
      setActiveProjectId(null);
      setView("list");
    }
  }

  function handleDuplicateProject(id) {
    const original = projects.find(p => p.id === id);
    if (!original) return;
    const copy = {
      ...JSON.parse(JSON.stringify(original)), // deep clone
      id: generateId(),
      name: `${original.name} (Cópia)`,
      createdAt: new Date().toISOString(),
      stages: original.stages.map(s => ({ ...s, id: generateId() }))
    };
    const updated = [copy, ...projects];
    setProjects(updated);
  }

  function saveEditProject() {
    if (!editingProject || !editingProject.name.trim()) return;
    setProjects(prev => prev.map(p => p.id === editingProject.id ? editingProject : p));
    setShowEditProjectModal(false);
    setEditingProject(null);
  }

  // ============================================================
  // CRUD DE ETAPAS
  // ============================================================
  function updateStage(projectId, stageId, changes) {
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          stages: p.stages.map(s =>
            s.id === stageId ? { ...s, ...changes } : s
          )
        };
      })
    );
  }

  function toggleAssignee(projectId, stageId, memberId) {
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;
    const stage = proj.stages.find(s => s.id === stageId);
    if (!stage) return;
    const hasIt = stage.assignees.includes(memberId);
    const newAssignees = hasIt
      ? stage.assignees.filter(a => a !== memberId)
      : [...stage.assignees, memberId];
    updateStage(projectId, stageId, { assignees: newAssignees });
  }

  function cycleStageStatus(projectId, stageId) {
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;
    const stage = proj.stages.find(s => s.id === stageId);
    if (!stage) return;
    const order = ["todo", "doing", "done"];
    const nextIdx = (order.indexOf(stage.status) + 1) % order.length;
    updateStage(projectId, stageId, { status: order[nextIdx] });
  }

  function openEditStage(stage, projectId) {
    setEditingStage({ ...stage, projectId });
    setShowEditStageModal(true);
  }

  function saveEditStage() {
    if (!editingStage) return;
    const { projectId, ...stageData } = editingStage;
    updateStage(projectId, stageData.id, stageData);
    setShowEditStageModal(false);
    setEditingStage(null);
  }

  // ============================================================
  // DADOS COMPUTADOS
  // ============================================================
  const activeProject = useMemo(
    () => projects.find(p => p.id === activeProjectId),
    [projects, activeProjectId]
  );

  const currentStage = useMemo(() => {
    if (!activeProject) return null;
    // A etapa atual é a última "doing" ou a primeira "todo"
    const doing = activeProject.stages.find(s => s.status === "doing");
    if (doing) return doing;
    return activeProject.stages.find(s => s.status === "todo") || null;
  }, [activeProject]);

  const progress = useMemo(() => {
    if (!activeProject || activeProject.stages.length === 0) return 0;
    const done = activeProject.stages.filter(s => s.status === "done").length;
    return Math.round((done / activeProject.stages.length) * 100);
  }, [activeProject]);

  // Agrupa projetos por tipo para a listagem
  const projetos = projects.filter(p => p.type === "projeto");
  const processos = projects.filter(p => p.type === "processo");

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  function MemberAvatar({ memberId, size = 28, active = false, onClick }) {
    const m = MEMBERS.find(m => m.id === memberId);
    if (!m) return null;
    return (
      <button
        className={`${styles.avatar} ${active ? styles.avatarActive : ""}`}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.38,
          background: active ? m.color : "rgba(166,134,80,0.08)",
          borderColor: active ? m.color : "rgba(166,134,80,0.2)",
          color: active ? "#040405" : m.color,
          cursor: onClick ? "pointer" : "default"
        }}
        onClick={onClick}
        title={m.name}
      >
        {m.initials}
      </button>
    );
  }

  function StatusIcon({ status }) {
    if (status === "done") return <CheckCircle2 size={16} color="#10b981" />;
    if (status === "doing") return <Clock size={16} color="#d2b47a" />;
    return <Circle size={16} color="#6b7280" />;
  }

  function ProjectCard({ project }) {
    const done = project.stages.filter(s => s.status === "done").length;
    const total = project.stages.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const current = project.stages.find(s => s.status === "doing") ||
                    project.stages.find(s => s.status === "todo");
    const allAssignees = [...new Set(project.stages.flatMap(s => s.assignees))];

    return (
      <div className={styles.projectCard}>
        <div className={styles.projectCardHeader}>
          <div className={styles.projectCardMeta}>
            <span className={`${styles.typeBadge} ${project.type === "projeto" ? styles.typeBadgeProject : styles.typeBadgeProcess}`}>
              {project.type === "projeto" ? <Briefcase size={11} /> : <Workflow size={11} />}
              {project.type === "projeto" ? "Projeto" : "Processo"}
            </span>
            <span className={styles.projectCardDate}>
              {new Date(project.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </span>
          </div>
          <div className={styles.projectCardActions}>
            <button className={styles.iconBtn} onClick={() => { setEditingProject(project); setShowEditProjectModal(true); }} title="Editar">
              <Edit2 size={14} />
            </button>
            <button className={styles.iconBtn} onClick={() => handleDuplicateProject(project.id)} title="Duplicar">
              <Copy size={14} />
            </button>
            <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => handleDeleteProject(project.id)} title="Excluir">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <h3 className={styles.projectCardTitle}>{project.name}</h3>
        {project.description && (
          <p className={styles.projectCardDesc}>{project.description}</p>
        )}

        {/* Progresso */}
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
          <span className={styles.progressLabel}>{done}/{total} etapas</span>
        </div>

        {/* Etapa atual */}
        {current && (
          <div className={styles.currentStage}>
            <span className={styles.currentStageLabel}>Etapa atual:</span>
            <span className={styles.currentStageName}>{current.name}</span>
          </div>
        )}

        {/* Membros envolvidos */}
        {allAssignees.length > 0 && (
          <div className={styles.memberRow}>
            {allAssignees.map(id => (
              <MemberAvatar key={id} memberId={id} size={26} active={true} />
            ))}
          </div>
        )}

        <button
          className={styles.openBtn}
          onClick={() => { setActiveProjectId(project.id); setView("kanban"); }}
        >
          Abrir Kanban <ChevronRight size={14} />
        </button>
      </div>
    );
  }

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  return (
    <div className={styles.wrapper}>
      {/* CABEÇALHO */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {view === "kanban" && (
            <button className={styles.backBtn} onClick={() => { setView("list"); setActiveProjectId(null); }}>
              <ChevronLeft size={16} />
              Todos
            </button>
          )}
          <div>
            <h1 className={styles.headerTitle}>
              {view === "list" ? "Projetos & Processos" : activeProject?.name}
            </h1>
            {view === "list" && (
              <p className={styles.headerSub}>Gerencie projetos e processos da equipe NeoResponse</p>
            )}
            {view === "kanban" && activeProject && (
              <div className={styles.kanbanMeta}>
                <span className={`${styles.typeBadge} ${activeProject.type === "projeto" ? styles.typeBadgeProject : styles.typeBadgeProcess}`}>
                  {activeProject.type === "projeto" ? <Briefcase size={11} /> : <Workflow size={11} />}
                  {activeProject.type === "projeto" ? "Projeto" : "Processo"}
                </span>
                {currentStage && (
                  <span className={styles.currentStagePill}>
                    <Clock size={12} /> Etapa atual: <strong>{currentStage.name}</strong>
                  </span>
                )}
                <span className={styles.progressPill}>{progress}% concluído</span>
              </div>
            )}
          </div>
        </div>

        {view === "list" && (
          <button className={styles.primaryBtn} onClick={() => setShowNewModal(true)}>
            <Plus size={16} /> Novo
          </button>
        )}

        {view === "kanban" && (
          <button className={styles.secondaryBtn} onClick={() => handleDuplicateProject(activeProjectId)}>
            <Copy size={14} /> Duplicar este {activeProject?.type === "projeto" ? "Projeto" : "Processo"}
          </button>
        )}
      </div>

      {/* ================= VIEW: LISTA ================= */}
      {view === "list" && (
        <div className={styles.listView}>
          {projects.length === 0 ? (
            <div className={styles.emptyState}>
              <FolderKanban size={40} color="var(--color-brand)" opacity={0.4} />
              <p>Nenhum projeto ou processo ainda.</p>
              <button className={styles.primaryBtn} onClick={() => setShowNewModal(true)}>
                <Plus size={14} /> Criar primeiro
              </button>
            </div>
          ) : (
            <>
              {projetos.length > 0 && (
                <div className={styles.listSection}>
                  <h2 className={styles.listSectionTitle}>
                    <Briefcase size={16} /> Projetos ({projetos.length})
                  </h2>
                  <div className={styles.cardsGrid}>
                    {projetos.map(p => <ProjectCard key={p.id} project={p} />)}
                  </div>
                </div>
              )}
              {processos.length > 0 && (
                <div className={styles.listSection}>
                  <h2 className={styles.listSectionTitle}>
                    <Workflow size={16} /> Processos ({processos.length})
                  </h2>
                  <div className={styles.cardsGrid}>
                    {processos.map(p => <ProjectCard key={p.id} project={p} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ================= VIEW: KANBAN ================= */}
      {view === "kanban" && activeProject && (
        <div className={styles.kanbanView}>
          <div className={styles.kanbanBoard}>
            {activeProject.stages.map((stage, idx) => {
              const colors = STAGE_STATUS_COLORS[stage.status];
              return (
                <div
                  key={stage.id}
                  className={styles.kanbanColumn}
                  style={{ borderColor: colors.border }}
                >
                  {/* Header da coluna */}
                  <div className={styles.columnHeader}>
                    <div className={styles.columnHeaderLeft}>
                      <StatusIcon status={stage.status} />
                      <span className={styles.columnTitle}>{stage.name}</span>
                      <span className={styles.stageNumber}>#{idx + 1}</span>
                    </div>
                    <button
                      className={styles.iconBtn}
                      onClick={() => openEditStage(stage, activeProject.id)}
                      title="Editar etapa"
                    >
                      <Edit3 size={13} />
                    </button>
                  </div>

                  {/* Status toggle */}
                  <button
                    className={styles.statusToggle}
                    style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}
                    onClick={() => cycleStageStatus(activeProject.id, stage.id)}
                    title="Clique para mudar status"
                  >
                    {colors.label}
                  </button>

                  {/* Responsáveis */}
                  <div className={styles.assigneeSection}>
                    <span className={styles.assigneeLabel}>
                      <Users size={12} /> Responsáveis:
                    </span>
                    <div className={styles.assigneeRow}>
                      {MEMBERS.map(member => (
                        <MemberAvatar
                          key={member.id}
                          memberId={member.id}
                          size={32}
                          active={stage.assignees.includes(member.id)}
                          onClick={() => toggleAssignee(activeProject.id, stage.id, member.id)}
                        />
                      ))}
                    </div>
                    {stage.assignees.length > 0 && (
                      <div className={styles.assigneeNames}>
                        {stage.assignees.map(id => {
                          const m = MEMBERS.find(m => m.id === id);
                          return m ? <span key={id} style={{ color: m.color }}>{m.name}</span> : null;
                        })}
                      </div>
                    )}
                    {stage.assignees.length === 0 && (
                      <span className={styles.noAssignee}>Ninguém atribuído</span>
                    )}
                  </div>

                  {/* Notas */}
                  {stage.notes && (
                    <p className={styles.stageNotes}>{stage.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= MODAL: NOVO PROJETO/PROCESSO ================= */}
      {showNewModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNewModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Novo Item</h2>
              <button className={styles.iconBtn} onClick={() => setShowNewModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Seletor de tipo */}
            <div className={styles.typeSelector}>
              <button
                className={`${styles.typeSelectorBtn} ${newType === "projeto" ? styles.typeSelectorBtnActive : ""}`}
                onClick={() => setNewType("projeto")}
              >
                <Briefcase size={16} /> Projeto
              </button>
              <button
                className={`${styles.typeSelectorBtn} ${newType === "processo" ? styles.typeSelectorBtnActive : ""}`}
                onClick={() => setNewType("processo")}
              >
                <Workflow size={16} /> Processo
              </button>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nome *</label>
              <input
                className={styles.formInput}
                placeholder={newType === "projeto" ? "Ex: Campanha de Lançamento" : "Ex: Processo de Onboarding"}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === "Enter" && handleCreateProject()}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Descrição (opcional)</label>
              <textarea
                className={`${styles.formInput} ${styles.formTextarea}`}
                placeholder="Descreva o objetivo..."
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                rows={3}
              />
            </div>

            <div className={styles.formInfo}>
              <AlertCircle size={13} />
              Etapas padrão serão criadas automaticamente com base no tipo selecionado.
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowNewModal(false)}>
                Cancelar
              </button>
              <button className={styles.primaryBtn} onClick={handleCreateProject} disabled={!newName.trim()}>
                <Plus size={14} /> Criar {newType === "projeto" ? "Projeto" : "Processo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDITAR ETAPA ================= */}
      {showEditStageModal && editingStage && (
        <div className={styles.modalOverlay} onClick={() => setShowEditStageModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Editar Etapa</h2>
              <button className={styles.iconBtn} onClick={() => setShowEditStageModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nome da Etapa</label>
              <input
                className={styles.formInput}
                value={editingStage.name}
                onChange={e => setEditingStage(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Status</label>
              <div className={styles.statusRow}>
                {["todo", "doing", "done"].map(s => {
                  const c = STAGE_STATUS_COLORS[s];
                  return (
                    <button
                      key={s}
                      className={styles.statusOption}
                      style={{
                        background: editingStage.status === s ? c.bg : "transparent",
                        color: editingStage.status === s ? c.text : "var(--text-muted)",
                        borderColor: editingStage.status === s ? c.border : "var(--border-color)"
                      }}
                      onClick={() => setEditingStage(prev => ({ ...prev, status: s }))}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Responsáveis</label>
              <div className={styles.assigneeRow} style={{ gap: "0.75rem" }}>
                {MEMBERS.map(member => {
                  const active = editingStage.assignees.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      className={styles.memberToggleBtn}
                      style={{
                        background: active ? `${member.color}20` : "transparent",
                        borderColor: active ? member.color : "var(--border-color)",
                        color: active ? member.color : "var(--text-muted)"
                      }}
                      onClick={() => {
                        const hasIt = editingStage.assignees.includes(member.id);
                        setEditingStage(prev => ({
                          ...prev,
                          assignees: hasIt
                            ? prev.assignees.filter(a => a !== member.id)
                            : [...prev.assignees, member.id]
                        }));
                      }}
                    >
                      <span className={styles.memberBtnInitials}
                        style={{ background: active ? member.color : "rgba(166,134,80,0.1)", color: active ? "#040405" : member.color }}>
                        {member.initials}
                      </span>
                      {member.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Notas</label>
              <textarea
                className={`${styles.formInput} ${styles.formTextarea}`}
                placeholder="Detalhes, links, observações..."
                value={editingStage.notes}
                onChange={e => setEditingStage(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowEditStageModal(false)}>
                Cancelar
              </button>
              <button className={styles.primaryBtn} onClick={saveEditStage}>
                <Save size={14} /> Salvar Etapa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDITAR PROJETO ================= */}
      {showEditProjectModal && editingProject && (
        <div className={styles.modalOverlay} onClick={() => setShowEditProjectModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Editar {editingProject.type === "projeto" ? "Projeto" : "Processo"}</h2>
              <button className={styles.iconBtn} onClick={() => setShowEditProjectModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nome *</label>
              <input
                className={styles.formInput}
                value={editingProject.name}
                onChange={e => setEditingProject(prev => ({ ...prev, name: e.target.value }))}
                autoFocus
                onKeyDown={e => e.key === "Enter" && saveEditProject()}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Descrição (opcional)</label>
              <textarea
                className={`${styles.formInput} ${styles.formTextarea}`}
                value={editingProject.description || ""}
                onChange={e => setEditingProject(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowEditProjectModal(false)}>
                Cancelar
              </button>
              <button className={styles.primaryBtn} onClick={saveEditProject} disabled={!editingProject.name.trim()}>
                <Save size={14} /> Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
