"use client";

import React, { useState } from "react";
import { Plus, CreditCard, Power, PowerOff, Trash2, Shield, Info } from "lucide-react";
import styles from "@/app/page.module.css";
import { useStore } from "@/lib/store";

export default function CardsSection() {
  const { cardMetrics, addCard, updateCardStatus, deleteCard } = useStore();
  const [showModal, setShowModal] = useState(false);

  // Estados do Formulário
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [type, setType] = useState("virtual");
  const [limitAmount, setLimitAmount] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [status, setStatus] = useState("ativo");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !bank || !limitAmount) return;

    addCard({
      name,
      bank,
      type,
      limit_amount: parseFloat(limitAmount),
      currency,
      status
    });

    // Reset
    setName("");
    setBank("");
    setType("virtual");
    setLimitAmount("");
    setCurrency("BRL");
    setStatus("ativo");
    setShowModal(false);
  };

  const toggleStatus = (id, currentStatus) => {
    const nextStatus = currentStatus === "ativo" ? "pausado" : "ativo";
    updateCardStatus(id, nextStatus);
  };

  const handleDelete = (id, name) => {
    if (confirm(`Deseja realmente remover o cartão "${name}"? Todos os gastos passados associados a ele ficarão sem cartão.`)) {
      deleteCard(id);
    }
  };

  return (
    <div className="fade-in">
      <div className={styles.tableHeaderActions}>
        <div>
          <h2 className={styles.sectionTitle}>
            <CreditCard size={20} className="text-brand" />
            Gestão de Cartões
          </h2>
          <p className={styles.kpiSubtext} style={{ marginTop: "-8px" }}>
            Cartões virtuais e físicos integrados para controle de contingência e gastos de mídia
          </p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowModal(true)}>
          <Plus size={16} />
          Novo Cartão
        </button>
      </div>

      {/* 1. CARTÕES VISUAIS (ESTILO FINTECH) */}
      <div className={styles.cardsGrid}>
        {cardMetrics.map((c) => {
          const isAtivo = c.status === "ativo";
          return (
            <div
              key={c.id}
              className={`${styles.glassCard} ${styles.cardItem}`}
              style={{
                background: isAtivo
                  ? "linear-gradient(135deg, #111827 0%, #1f2937 100%)"
                  : "linear-gradient(135deg, #0b0f17 0%, #111622 100%)",
                borderLeft: isAtivo ? "3px solid var(--color-brand)" : "3px solid var(--text-muted)",
                opacity: isAtivo ? 1 : 0.6
              }}
            >
              <div className={styles.cardItemHeader}>
                <div>
                  <h4 className={styles.cardItemTitle}>{c.name}</h4>
                  <span className={styles.cardItemBank}>{c.bank} • {c.type === "virtual" ? "Virtual" : "Físico"}</span>
                </div>
                <span className={isAtivo ? "bg-success-badge" : "bg-neutral-badge"}>
                  {isAtivo ? "Ativo" : "Pausado"}
                </span>
              </div>

              <div style={{ display: "flex", gap: "6px", marginBottom: "1rem" }}>
                {/* Chip simulado */}
                <div style={{ width: "24px", height: "18px", backgroundColor: "#d97706", borderRadius: "3px", opacity: 0.6 }}></div>
                <Shield size={16} className="text-muted" style={{ marginTop: "2px" }} />
              </div>

              <div className={styles.cardItemLimit}>
                <span>Limite Cadastrado:</span>
                <div className={styles.cardItemLimitVal}>
                  {c.currency} {c.limit_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className={styles.cardItemFooter}>
                <span className="text-muted" style={{ fontSize: "0.7rem" }}>
                  ROAS Período: <strong className={c.profit >= 0 ? "text-success" : "text-danger"}>{c.roas.toFixed(2)}x</strong>
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    className={`${styles.btn} ${styles.btnIcon}`}
                    onClick={() => toggleStatus(c.id, c.status)}
                    data-tooltip={isAtivo ? "Pausar Cartão" : "Ativar Cartão"}
                  >
                    {isAtivo ? <PowerOff size={14} className="text-danger" /> : <Power size={14} className="text-success" />}
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnIcon} ${styles.btnDanger}`}
                    onClick={() => handleDelete(c.id, c.name)}
                    data-tooltip="Excluir Cartão"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. TABELA DE PERFORMANCE FINANCEIRA DOS CARTÕES */}
      <div className={`${styles.glassCard} ${styles.tableCard}`}>
        <h3 className={styles.sectionTitle}>
          <Info size={16} className="text-brand" />
          Métricas de Performance Atribuídas
        </h3>
        <p className={styles.kpiSubtext} style={{ marginTop: "-8px", marginBottom: "16px" }}>
          Desempenho financeiro consolidado por unidade de cartão no período selecionado
        </p>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cartão</th>
                <th>Status</th>
                <th>Investido (Gasto)</th>
                <th>Retorno (Receita)</th>
                <th>Lucro Líquido</th>
                <th>ROAS</th>
                <th>CPA Médio</th>
              </tr>
            </thead>
            <tbody>
              {cardMetrics.map((c) => {
                const hasSpend = c.spend > 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <div className={styles.cardNameCell}>
                        <div className={styles.cardIconCircle}>
                          <CreditCard size={14} />
                        </div>
                        <div>
                          <strong style={{ display: "block" }}>{c.name}</strong>
                          <span className="text-muted" style={{ fontSize: "0.75rem" }}>{c.bank}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={c.status === "ativo" ? "bg-success-badge" : "bg-neutral-badge"}>
                        {c.status === "ativo" ? "ativo" : "pausado"}
                      </span>
                    </td>
                    <td>
                      <strong>R$ {c.spend.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </td>
                    <td className="text-muted">
                      R$ {c.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={c.profit >= 0 ? "text-success" : "text-danger"} style={{ fontWeight: "700" }}>
                      {c.profit >= 0 ? "+" : ""}R$ {c.profit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={c.roas >= 2.0 ? "bg-success-badge" : c.roas >= 1.0 ? "bg-warning-badge" : hasSpend ? "bg-danger-badge" : "bg-neutral-badge"}>
                        {c.roas > 0 ? `${c.roas.toFixed(2)}x` : "0.00x"}
                      </span>
                    </td>
                    <td className="text-muted">
                      {c.cpa > 0 ? `R$ ${c.cpa.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. MODAL DE CADASTRO DE CARTÃO */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Adicionar Novo Cartão</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Nome Identificador do Cartão</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="ex: Nubank Ads 01"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Banco Emissor</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="ex: Nubank, C6 Bank, Stripe"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label>Tipo de Cartão</label>
                  <select className={styles.select} value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="virtual">Virtual</option>
                    <option value="credito">Crédito (Físico)</option>
                    <option value="debito">Débito (Físico)</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Limite (R$)</label>
                  <input
                    type="number"
                    className={styles.input}
                    placeholder="ex: 15000"
                    value={limitAmount}
                    onChange={(e) => setLimitAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label>Moeda</label>
                  <select className={styles.select} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <option value="BRL">BRL (R$)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Status Inicial</label>
                  <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="ativo">Ativo</option>
                    <option value="pausado">Pausado</option>
                  </select>
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btn} onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  Salvar Cartão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
