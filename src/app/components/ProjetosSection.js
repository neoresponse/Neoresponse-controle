"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  FolderKanban,
  Copy,
  Plus,
  Trash2,
  Edit2,
  ChevronLeft,
  CheckSquare,
  Square,
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
// HELPERS DE PERSISTÊNCIA
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
    const { error } = await supabase.from('projetos_state').upsert({ id: 'main', payload: data });
    if (error) {
      console.error("Erro do Supabase ao salvar:", error.message);
    }
  } catch (err) {
    console.error("Erro inesperado ao salvar no Supabase:", err);
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
  const [hasLoadedInit, setHasLoadedInit] = useState(false); // Evita salvar estado vazio inicial

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

  // Sincronização com Supabase Apenas no Carregamento Inicial
  useEffect(() => {
    let isMounted = true;

    const fetchSupabase = async () => {
      try {
        const { data, error } = await supabase.from('projetos_state').select('payload').eq('id', 'main').single();
        if (!error && data && data.payload && isMounted) {
          const migratedData = data.payload.map(p => ({
            ...p,
            stages: p.stages.map(s => ({
              ...s,
              checklist: s.checklist || [] 
            }))
          }));
          
          setProjects(migratedData);
          if (!activeProjectId) setActiveProjectId(migratedData[0]?.id || null);
        } else if (error && error.code === 'PGRST116') {
          const saved = loadFromStorage();
          if (saved && saved.length > 0 && isMounted) {
            setProjects(saved);
            if (!activeProjectId) setActiveProjectId(saved[0].id);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar Supabase:", err);
      } finally {
        if (isMounted) setHasLoadedInit(true);
      }
    };

    fetchSupabase();
    
    // REMOVIDO: setInterval(fetchSupabase, 5000) - Era o responsável por bugar o estado local 
    // com um dado velho caso a gravação estivesse em processamento!

    return () => {
      isMounted = false;
    };
  }, []);

  // Salva sempre que projetos mudam (mas apenas após o carregamento inicial)
  useEffect(() => {
    if (hasLoadedInit) {
      saveToStorage(projects);
    }
  }, [projects, hasLoadedInit]);

  // ============================================================
  // CRUD DE PROJETOS
  // ============================================================
  function createProject(name, type, description = "", globalAssignees = []) {
    const defaultStages = type === "projeto" ? DEFAULT_STAGES_PROJETO : DEFAULT_STAGES_PROCESSO;
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
        checklist: [], // Substituiu o "notes"
      }))
    };
  }

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
      ...JSON.parse(JSON.stringify(original)), 
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
          stages: p.stages.map(s => s.id === stageId ? { ...s, ...changes } : s)
        };
      })
    );
  }

  function handleAddStage(projectId) {
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== projectId) return p;
        const newStage = {
          id: generateId(),
          name: "Nova Etapa",
          status: "todo",
          assignees: [],
          checklist: []
        };
        return { ...p, stages: [...p.stages, newStage] };
      })
    );
  }

  function handleDeleteStage(projectId, stageId) {
    if (!confirm("Tem certeza que deseja excluir esta etapa e todas as suas tarefas?")) return;
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== projectId) return p;
        return { ...p, stages: p.stages.filter(s => s.id !== stageId) };
      })
    );
    setShowEditStageModal(false);
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

  // Função para checar/deschecar um item do checklist diretamente do Kanban
  function toggleChecklistItem(projectId, stageId, itemId) {
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          stages: p.stages.map(s => {
            if (s.id !== stageId) return s;
            return {
              ...s,
              checklist: (s.checklist || []).map(item => 
                item.id === itemId ? { ...item, checked: !item.checked } : item
              )
            };
          })
        };
      })
    );
  }

  function openEditStage(stage, projectId) {
    setEditingStage({ ...stage, projectId, checklist: stage.checklist || [] });
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
  // FUNÇÕES DE CHECKLIST DENTRO DO MODAL
  // ============================================================
  function addChecklistItemToEditing() {
    setEditingStage(prev => ({
      ...prev,
      checklist: [...prev.checklist, { id: generateId(), text: "", checked: false }]
    }));
  }

  function updateChecklistItemText(itemId, newText) {
    setEditingStage(prev => ({
      ...prev,
      checklist: prev.checklist.map(item => item.id === itemId ? { ...item, text: newText } : item)
    }));
  }

  function removeChecklistItem(itemId) {
    setEditingStage(prev => ({
      ...prev,
      checklist: prev.checklist.filter(item => item.id !== itemId)
    }));
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
    const doing = activeProject.stages.find(s => s.status === "doing");
    if (doing) return doing;
    return activeProject.stages.find(s => s.status === "todo") || null;
  }, [activeProject]);

  const progress = useMemo(() => {
    if (!activeProject || activeProject.stages.length === 0) return 0;
    const done = activeProject.stages.filter(s => s.status === "done").length;
    return Math.round((done / activeProject.stages.length) * 100);
  }, [activeProject]);

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
          cursor: onClick ? "pointer" : "default",
          borderWidth: "1px",
          borderStyle: "solid",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          flexShrink: 0
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
    const current = project.stages.find(s => s.status === "doing") || project.stages.find(s => s.status === "todo");
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
        {project.description && <p className={styles.projectCardDesc}>{project.description}</p>}

        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
          <span className={styles.progressLabel}>{done}/{total} etapas</span>
        </div>

        {current && (
          <div className={styles.currentStage}>
            <span className={styles.currentStageLabel}>Etapa atual:</span>
            <span className={styles.currentStageName}>{current.name}</span>
          </div>
        )}

        {allAssignees.length > 0 && (
          <div className={styles.memberRow}>
            {allAssignees.map(id => <MemberAvatar key={id} memberId={id} size={26} active={true} />)}
          </div>
        )}

        <button className={styles.openBtn} onClick={() => { setActiveProjectId(project.id); setView("kanban"); }}>
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
              <ChevronLeft size={16} /> Todos
            </button>
          )}
          <div>
            <h1 className={styles.headerTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {view === "list" ? "Projetos & Processos" : activeProject?.name}
              
              {/* Botão de edição dentro do Kanban */}
              {view === "kanban" && activeProject && (
                 <button 
                  className={styles.iconBtn} 
                  onClick={() => { setEditingProject(activeProject); setShowEditProjectModal(true); }} 
                  title="Editar Nome do Projeto"
                  style={{ opacity: 0.7, padding: '4px' }}
                 >
                   <Edit2 size={16} color="#DFC18A" />
                 </button>
              )}
            </h1>
            
            {view === "list" && <p className={styles.headerSub}>Gerencie projetos e processos da equipe NeoResponse</p>}
            
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
            <Copy size={14} /> Duplicar {activeProject?.type === "projeto" ? "Projeto" : "Processo"}
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
                  <h2 className={styles.listSectionTitle}><Briefcase size={16} /> Projetos ({projetos.length})</h2>
                  <div className={styles.cardsGrid}>{projetos.map(p => <ProjectCard key={p.id} project={p} />)}</div>
                </div>
              )}
              {processos.length > 0 && (
                <div className={styles.listSection}>
                  <h2 className={styles.listSectionTitle}><Workflow size={16} /> Processos ({processos.length})</h2>
                  <div className={styles.cardsGrid}>{processos.map(p => <ProjectCard key={p.id} project={p} />)}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ================= VIEW: KANBAN ================= */}
      {view === "kanban" && activeProject && (
        <div className={styles.kanbanView}>
          <div className={styles.kanbanBoard} style={{ display: 'flex', gap: '1rem', paddingBottom: '1rem', overflowX: 'auto' }}>
            
            {activeProject.stages.map((stage, idx) => {
              const colors = STAGE_STATUS_COLORS[stage.status];
              const checklist = stage.checklist || [];
              const completedTasks = checklist.filter(c => c.checked).length;
              const totalTasks = checklist.length;

              return (
                <div key={stage.id} className={styles.kanbanColumn} style={{ borderColor: colors.border, minWidth: '300px', flexShrink: 0 }}>
                  <div className={styles.columnHeader}>
                    <div className={styles.columnHeaderLeft}>
                      <StatusIcon status={stage.status} />
                      <span className={styles.columnTitle}>{stage.name}</span>
                      <span className={styles.stageNumber}>#{idx + 1}</span>
                    </div>
                    <button className={styles.iconBtn} onClick={() => openEditStage(stage, activeProject.id)} title="Editar etapa">
                      <Edit3 size={13} />
                    </button>
                  </div>

                  <button
                    className={styles.statusToggle}
                    style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}
                    onClick={() => cycleStageStatus(activeProject.id, stage.id)}
                  >
                    {colors.label}
                  </button>

                  <div className={styles.assigneeSection}>
                    <span className={styles.assigneeLabel}><Users size={12} /> Responsáveis:</span>
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
                    {stage.assignees.length === 0 && <span className={styles.noAssignee}>Ninguém atribuído</span>}
                  </div>

                  {/* CHECKLIST NO KANBAN */}
                  {totalTasks > 0 && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(166,134,80,0.1)', paddingTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a68650' }}>TAREFAS</span>
                        <span style={{ fontSize: '0.7rem', color: completedTasks === totalTasks ? '#10b981' : 'var(--text-muted)' }}>
                          {completedTasks}/{totalTasks}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {checklist.map(item => (
                          <div 
                            key={item.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'flex-start', 
                              gap: '0.5rem',
                              cursor: 'pointer',
                              padding: '0.25rem 0'
                            }}
                            onClick={() => toggleChecklistItem(activeProject.id, stage.id, item.id)}
                          >
                            <button 
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                padding: 0, 
                                color: item.checked ? '#10b981' : 'var(--text-muted)',
                                flexShrink: 0,
                                cursor: 'pointer',
                                marginTop: '1px'
                              }}
                            >
                              {item.checked ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>
                            <span style={{ 
                              fontSize: '0.8rem', 
                              color: item.checked ? 'var(--text-muted)' : 'var(--text-secondary)',
                              textDecoration: item.checked ? 'line-through' : 'none',
                              lineHeight: '1.3'
                            }}>
                              {item.text || "Tarefa sem nome"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* BOTÃO PARA ADICIONAR ETAPA */}
            <div style={{ display: 'flex', alignItems: 'flex-start', padding: '0 0.5rem' }}>
              <button 
                onClick={() => handleAddStage(activeProject.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(166,134,80,0.05)',
                  border: '1px dashed rgba(166,134,80,0.3)',
                  color: '#DFC18A',
                  padding: '1rem 1.5rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  minWidth: '200px',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(166,134,80,0.1)'; e.currentTarget.style.borderColor = '#DFC18A'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(166,134,80,0.05)'; e.currentTarget.style.borderColor = 'rgba(166,134,80,0.3)'; }}
              >
                <Plus size={16} /> Nova Etapa
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL: NOVO PROJETO/PROCESSO ================= */}
      {showNewModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNewModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Novo Item</h2>
              <button className={styles.iconBtn} onClick={() => setShowNewModal(false)}><X size={18} /></button>
            </div>

            <div className={styles.typeSelector}>
              <button className={`${styles.typeSelectorBtn} ${newType === "projeto" ? styles.typeSelectorBtnActive : ""}`} onClick={() => setNewType("projeto")}>
                <Briefcase size={16} /> Projeto
              </button>
              <button className={`${styles.typeSelectorBtn} ${newType === "processo" ? styles.typeSelectorBtnActive : ""}`} onClick={() => setNewType("processo")}>
                <Workflow size={16} /> Processo
              </button>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nome *</label>
              <input className={styles.formInput} placeholder="Ex: Campanha..." value={newName} onChange={e => setNewName(e.target.value)} autoFocus onKeyDown={e => e.key === "Enter" && handleCreateProject()} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Descrição (opcional)</label>
              <textarea className={`${styles.formInput} ${styles.formTextarea}`} value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} />
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowNewModal(false)}>Cancelar</button>
              <button className={styles.primaryBtn} onClick={handleCreateProject} disabled={!newName.trim()}>
                <Plus size={14} /> Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDITAR ETAPA (COM CHECKLIST) ================= */}
      {showEditStageModal && editingStage && (
        <div className={styles.modalOverlay} onClick={() => setShowEditStageModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Editar Etapa</h2>
              <button className={styles.iconBtn} onClick={() => setShowEditStageModal(false)}><X size={18} /></button>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nome da Etapa</label>
              <input className={styles.formInput} value={editingStage.name} onChange={e => setEditingStage(prev => ({ ...prev, name: e.target.value }))} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Status</label>
              <div className={styles.statusRow}>
                {["todo", "doing", "done"].map(s => {
                  const c = STAGE_STATUS_COLORS[s];
                  return (
                    <button key={s} className={styles.statusOption} style={{ background: editingStage.status === s ? c.bg : "transparent", color: editingStage.status === s ? c.text : "var(--text-muted)", borderColor: editingStage.status === s ? c.border : "var(--border-color)" }} onClick={() => setEditingStage(prev => ({ ...prev, status: s }))}>
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
                      style={{ background: active ? `${member.color}20` : "transparent", borderColor: active ? member.color : "var(--border-color)", color: active ? member.color : "var(--text-muted)" }}
                      onClick={() => {
                        const hasIt = editingStage.assignees.includes(member.id);
                        setEditingStage(prev => ({ ...prev, assignees: hasIt ? prev.assignees.filter(a => a !== member.id) : [...prev.assignees, member.id] }));
                      }}
                    >
                      <span className={styles.memberBtnInitials} style={{ background: active ? member.color : "rgba(166,134,80,0.1)", color: active ? "#040405" : member.color }}>{member.initials}</span>
                      {member.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SESSÃO DE CHECKLIST NO MODAL */}
            <div className={styles.formGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className={styles.formLabel} style={{ marginBottom: 0 }}>Tarefas (Checklist)</label>
                <button 
                  onClick={addChecklistItemToEditing}
                  style={{ background: 'none', border: 'none', color: '#DFC18A', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={12} /> Adicionar Tarefa
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {editingStage.checklist.map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button 
                      onClick={() => setEditingStage(prev => ({ ...prev, checklist: prev.checklist.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i) }))}
                      style={{ background: 'none', border: 'none', color: item.checked ? '#10b981' : 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                    >
                      {item.checked ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                    <input 
                      className={styles.formInput} 
                      style={{ flex: 1, padding: '6px 10px', height: '36px' }}
                      value={item.text} 
                      onChange={(e) => updateChecklistItemText(item.id, e.target.value)} 
                      placeholder="Descrição da tarefa..." 
                    />
                    <button 
                      onClick={() => removeChecklistItem(item.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', opacity: 0.7, padding: '4px' }}
                      title="Excluir tarefa"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {editingStage.checklist.length === 0 && (
                  <div style={{ padding: '1rem', textAlign: 'center', border: '1px dashed rgba(166,134,80,0.2)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Nenhuma tarefa adicionada.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalFooter} style={{ justifyContent: 'space-between' }}>
              <button 
                className={styles.iconBtnDanger} 
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer' }}
                onClick={() => handleDeleteStage(activeProject.id, editingStage.id)}
              >
                <Trash2 size={14} /> Excluir Etapa
              </button>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className={styles.cancelBtn} onClick={() => setShowEditStageModal(false)}>Cancelar</button>
                <button className={styles.primaryBtn} onClick={saveEditStage}><Save size={14} /> Salvar Etapa</button>
              </div>
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
              <button className={styles.iconBtn} onClick={() => setShowEditProjectModal(false)}><X size={18} /></button>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nome *</label>
              <input className={styles.formInput} value={editingProject.name} onChange={e => setEditingProject(prev => ({ ...prev, name: e.target.value }))} autoFocus onKeyDown={e => e.key === "Enter" && saveEditProject()} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Descrição (opcional)</label>
              <textarea className={`${styles.formInput} ${styles.formTextarea}`} value={editingProject.description || ""} onChange={e => setEditingProject(prev => ({ ...prev, description: e.target.value }))} rows={3} />
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowEditProjectModal(false)}>Cancelar</button>
              <button className={styles.primaryBtn} onClick={saveEditProject} disabled={!editingProject.name.trim()}><Save size={14} /> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
