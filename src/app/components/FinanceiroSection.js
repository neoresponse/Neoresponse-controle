"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Check,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { useStore } from "@/lib/store";
import styles from "@/app/page.module.css";

const REVENUE_CATEGORIES = ["Fee mensal", "Infoproduto", "Lançamento", "Outros"];
const EXPENSE_CATEGORIES = [
  "Meta Ads",
  "Google Ads",
  "TikTok Ads",
  "Taboola / Native",
  "Hospedagem",
  "Ferramentas",
  "Comissão",
  "Impostos",
  "Outros"
];

function parseDescription(raw) {
  const match = (raw || "").match(/^\[(.+?)\]\s*(.*)$/);
  if (match) return { category: match[1], name: match[2] || raw };
  return { category: "Outros", name: raw || "" };
}

function formatMoney(value) {
  return (value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FinanceiroSection() {
  const {
    expenses,
    revenues,
    addExpense,
    updateExpense,
    deleteExpense,
    addRevenue,
    updateRevenue,
    deleteRevenue
  } = useStore();

  const today = new Date();
  const [refDate, setRefDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Estado do formulário
  const [formType, setFormType] = useState("despesa");
  const [formCategory, setFormCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [formName, setFormName] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(today.toISOString().slice(0, 10));
  const [formStatus, setFormStatus] = useState("previsto");

  // ← NOVO: controle de moeda para receitas
  const [formCurrency, setFormCurrency] = useState("BRL"); // "BRL" | "USD"
  const [usdRate, setUsdRate] = useState(null);
  const [rateFetching, setRateFetching] = useState(false);
  const [rateError, setRateError] = useState(false);

  const monthLabel = refDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  // Busca cotação USD → BRL na AwesomeAPI (gratuita, sem chave)
  const fetchUsdRate = async () => {
    setRateFetching(true);
    setRateError(false);
    try {
      const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
      const data = await res.json();
      const rate = parseFloat(data.USDBRL.bid);
      setUsdRate(rate);
    } catch (e) {
      console.error("Erro ao buscar cotação:", e);
      setRateError(true);
      setUsdRate(null);
    } finally {
      setRateFetching(false);
    }
  };

  // Valor convertido para preview em tempo real
  const brlPreview = useMemo(() => {
    if (formCurrency !== "USD" || !usdRate || !formAmount) return null;
    const usd = parseFloat(formAmount);
    if (isNaN(usd)) return null;
    return usd * usdRate;
  }, [formCurrency, usdRate, formAmount]);

  const monthTransactions = useMemo(() => {
    const y = refDate.getFullYear();
    const m = refDate.getMonth();

    const exp = expenses
      .filter((e) => {
        const d = new Date(e.date + "T12:00:00");
        return d.getFullYear() === y && d.getMonth() === m;
      })
      .map((e) => ({ ...e, type: "despesa", ...parseDescription(e.description) }));

    const rev = revenues
      .filter((r) => {
        const d = new Date(r.date + "T12:00:00");
        return d.getFullYear() === y && d.getMonth() === m;
      })
      .map((r) => ({ ...r, type: "receita", ...parseDescription(r.description) }));

    const all = [...exp, ...rev].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!searchQuery) return all;
    return all.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [expenses, revenues, refDate, searchQuery]);

  const totals = useMemo(() => {
    let receitaPrevista = 0, receitaPaga = 0, despesaPrevista = 0, despesaPaga = 0;
    monthTransactions.forEach((t) => {
      const amt = parseFloat(t.amount || 0);
      const isPaid = t.status === "pago" || !t.status;
      if (t.type === "receita") {
        if (isPaid) receitaPaga += amt;
        else receitaPrevista += amt;
      } else {
        if (isPaid) despesaPaga += amt;
        else despesaPrevista += amt;
      }
    });
    return { receitaPrevista, receitaPaga, despesaPrevista, despesaPaga };
  }, [monthTransactions]);

  const saldoAtual = useMemo(() => {
    const totalRecebido = revenues
      .filter((r) => r.status === "pago" || !r.status)
      .reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const totalPago = expenses
      .filter((e) => e.status === "pago" || !e.status)
      .reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    return totalRecebido - totalPago;
  }, [expenses, revenues]);

  const changeMonth = (delta) => {
    setRefDate(new Date(refDate.getFullYear(), refDate.getMonth() + delta, 1));
  };

  const openNewModal = (type) => {
    setEditingItem(null);
    setFormType(type);
    setFormCategory(type === "despesa" ? EXPENSE_CATEGORIES[0] : REVENUE_CATEGORIES[0]);
    setFormName("");
    setFormAmount("");
    const day = Math.min(today.getDate(), 28);
    setFormDate(new Date(refDate.getFullYear(), refDate.getMonth(), day).toISOString().slice(0, 10));
    setFormStatus("previsto");
    // Resetar moeda e buscar cotação se for receita
    setFormCurrency("BRL");
    setUsdRate(null);
    if (type === "receita") {
      fetchUsdRate(); // já busca no background ao abrir
    }
    setShowModal(true);
  };

  const openEditModal = (t) => {
    setEditingItem(t);
    setFormType(t.type);
    setFormCategory(t.category);
    setFormName(t.name);
    setFormAmount(String(t.amount));
    setFormDate(t.date);
    setFormStatus(t.status === "pago" || !t.status ? "pago" : "previsto");
    setFormCurrency("BRL"); // edição sempre em BRL (valor já está convertido)
    setShowModal(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    if (!formName || !formAmount) return;

    let finalAmount = parseFloat(formAmount);

    // ← Conversão USD → BRL ao salvar
    if (formType === "receita" && formCurrency === "USD") {
      if (!usdRate) {
        alert("Cotação do dólar não disponível. Tente novamente.");
        return;
      }
      finalAmount = finalAmount * usdRate;
    }

    const payload = {
      date: formDate,
      description: `[${formCategory}] ${formName}`,
      amount: parseFloat(finalAmount.toFixed(2)),
      status: formStatus,
      paid_date: formStatus === "pago" ? formDate : null
    };

    if (editingItem) {
      if (formType === "despesa") await updateExpense(editingItem.id, payload);
      else await updateRevenue(editingItem.id, payload);
    } else {
      if (formType === "despesa") await addExpense(payload);
      else await addRevenue(payload);
    }
    setShowModal(false);
  };

  const togglePaid = async (t) => {
    const isPaid = t.status === "pago" || !t.status;
    const newStatus = isPaid ? "previsto" : "pago";
    const updates = {
      status: newStatus,
      paid_date: newStatus === "pago" ? new Date().toISOString().slice(0, 10) : null
    };
    if (t.type === "despesa") await updateExpense(t.id, updates);
    else await updateRevenue(t.id, updates);
  };

  const removeItem = async (t) => {
    if (!confirm(`Excluir "${t.name}"?`)) return;
    if (t.type === "despesa") await deleteExpense(t.id);
    else await deleteRevenue(t.id);
  };

  return (
    <div className="fade-in">
      <style>{`
        .txn-row:last-child { border-bottom: none !important; }
        .txn-row:hover { background-color: rgba(255,255,255,0.02); }
        .status-toggle-btn {
          border: none;
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .status-toggle-btn:active { transform: scale(0.9); }
        .type-choice-btn {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .type-choice-btn-active-exp {
          background-color: rgba(239, 68, 68, 0.12);
          border-color: #ef4444;
          color: #ef4444;
        }
        .type-choice-btn-active-rev {
          background-color: rgba(16, 185, 129, 0.12);
          border-color: #10b981;
          color: #10b981;
        }
        /* Moeda toggle */
        .currency-btn {
          flex: 1;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-secondary);
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.15s ease;
          letter-spacing: 0.04em;
        }
        .currency-btn-brl {
          background-color: rgba(16, 185, 129, 0.12);
          border-color: #10b981;
          color: #10b981;
        }
        .currency-btn-usd {
          background-color: rgba(59, 130, 246, 0.12);
          border-color: #3b82f6;
          color: #3b82f6;
        }
        .brl-preview {
          margin-top: 6px;
          padding: 8px 12px;
          border-radius: 8px;
          background: rgba(59, 130, 246, 0.06);
          border: 1px solid rgba(59, 130, 246, 0.15);
          font-size: 0.8rem;
          color: #93c5fd;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }
        .rate-badge {
          font-size: 0.7rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 4px;
        }
      `}</style>

      {/* Saldo atual */}
      <div className={styles.glassCard} style={{ padding: "2rem", textAlign: "center", marginBottom: "1.5rem" }}>
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Saldo atual
        </span>
        <div
          style={{
            fontSize: "2.2rem",
            fontWeight: 800,
            margin: "0.25rem 0",
            fontFamily: "var(--font-display)",
            color: saldoAtual >= 0 ? "#fff" : "#ef4444"
          }}
        >
          R$ {formatMoney(saldoAtual)}
        </div>
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
          soma de tudo que já foi pago ou recebido
        </span>
      </div>

      {/* Navegação de mês */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.25rem", marginBottom: "1.25rem" }}>
        <button className={`${styles.btn} ${styles.btnIcon}`} onClick={() => changeMonth(-1)} style={{ width: "30px", height: "30px" }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontWeight: 700, textTransform: "capitalize", minWidth: "160px", textAlign: "center" }}>
          {monthLabel}
        </span>
        <button className={`${styles.btn} ${styles.btnIcon}`} onClick={() => changeMonth(1)} style={{ width: "30px", height: "30px" }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Cards resumo do mês */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className={`${styles.glassCard} ${styles.kpiCard}`}>
          <div className={styles.kpiHeader}><span>RECEITAS</span></div>
          <div className={styles.kpiValue} style={{ color: "#10b981" }}>
            R$ {formatMoney(totals.receitaPaga)}
          </div>
          {totals.receitaPrevista > 0 && (
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
              + R$ {formatMoney(totals.receitaPrevista)} previsto
            </div>
          )}
        </div>

        <div className={`${styles.glassCard} ${styles.kpiCard}`}>
          <div className={styles.kpiHeader}><span>DESPESAS</span></div>
          <div className={styles.kpiValue} style={{ color: "#ef4444" }}>
            R$ {formatMoney(totals.despesaPaga)}
          </div>
          {totals.despesaPrevista > 0 && (
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
              + R$ {formatMoney(totals.despesaPrevista)} previsto
            </div>
          )}
        </div>

        <div className={`${styles.glassCard} ${styles.kpiCard}`}>
          <div className={styles.kpiHeader}><span>SALDO DO MÊS</span></div>
          <div
            className={styles.kpiValue}
            style={{ color: totals.receitaPaga - totals.despesaPaga >= 0 ? "#fff" : "#ef4444" }}
          >
            R$ {formatMoney(totals.receitaPaga - totals.despesaPaga)}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
            já realizado neste mês
          </div>
        </div>
      </div>

      {/* Botões de ação */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => openNewModal("receita")} style={{ flex: 1 }}>
          <Plus size={14} /> Nova Receita
        </button>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => openNewModal("despesa")} style={{ flex: 1 }}>
          <Plus size={14} /> Nova Despesa
        </button>
      </div>

      {/* Busca */}
      <div style={{ position: "relative", marginBottom: "1rem" }}>
        <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="Buscar lançamento..."
          className={styles.input}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: "30px", width: "100%" }}
        />
      </div>

      {/* Lista de lançamentos */}
      <div className={`${styles.glassCard} ${styles.tableCard}`} style={{ padding: "0.5rem 1.25rem" }}>
        {monthTransactions.length === 0 && (
          <div className="text-muted" style={{ textAlign: "center", padding: "2.5rem" }}>
            Nenhum lançamento neste mês.
          </div>
        )}

        {monthTransactions.map((t) => {
          const isPaid = t.status === "pago" || !t.status;
          const isExpense = t.type === "despesa";
          return (
            <div
              key={`${t.type}-${t.id}`}
              className="txn-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.85rem",
                padding: "0.85rem 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)"
              }}
            >
              <button
                className="status-toggle-btn"
                onClick={() => togglePaid(t)}
                title={isPaid ? "Marcar como previsto" : `Marcar como ${isExpense ? "pago" : "recebido"}`}
                style={{
                  width: "28px", height: "28px", borderRadius: "50%",
                  border: isPaid ? "none" : "1.5px solid var(--text-muted)",
                  background: isPaid ? (isExpense ? "#ef4444" : "#10b981") : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                }}
              >
                {isPaid ? <Check size={14} color="#fff" /> : <Clock size={13} color="var(--text-muted)" />}
              </button>

              <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => openEditModal(t)}>
                <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.name}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  {t.category} • {new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR")} •{" "}
                  {isPaid ? (isExpense ? "Pago" : "Recebido") : "Previsto"}
                </div>
              </div>

              <strong style={{ fontSize: "0.9rem", color: isExpense ? "#ef4444" : "#10b981", whiteSpace: "nowrap" }}>
                {isExpense ? "-" : "+"} R$ {formatMoney(t.amount)}
              </strong>

              <button className={`${styles.btn} ${styles.btnIcon}`} onClick={() => openEditModal(t)} style={{ width: "26px", height: "26px" }} title="Editar">
                <Pencil size={11} />
              </button>
              <button className={`${styles.btn} ${styles.btnIcon} ${styles.btnDanger}`} onClick={() => removeItem(t)} style={{ width: "26px", height: "26px" }} title="Excluir">
                <Trash2 size={11} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: "420px" }}>
            <div className={styles.modalHeader}>
              <h2>
                {editingItem ? "Editar" : "Novo"} {formType === "despesa" ? "Despesa" : "Receita"}
              </h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={submitForm}>
              {/* Tipo (só quando novo) */}
              {!editingItem && (
                <div className={styles.formGroup}>
                  <label>Tipo</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className={`type-choice-btn ${formType === "despesa" ? "type-choice-btn-active-exp" : ""}`}
                      onClick={() => { setFormType("despesa"); setFormCategory(EXPENSE_CATEGORIES[0]); setFormCurrency("BRL"); }}
                    >
                      Despesa
                    </button>
                    <button
                      type="button"
                      className={`type-choice-btn ${formType === "receita" ? "type-choice-btn-active-rev" : ""}`}
                      onClick={() => { setFormType("receita"); setFormCategory(REVENUE_CATEGORIES[0]); if (!usdRate) fetchUsdRate(); }}
                    >
                      Receita
                    </button>
                  </div>
                </div>
              )}

              {/* Moeda — apenas para RECEITAS novas */}
              {formType === "receita" && !editingItem && (
                <div className={styles.formGroup}>
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Moeda</span>
                    {/* Cotação ao vivo */}
                    <span className="rate-badge">
                      {rateFetching && <RefreshCw size={11} style={{ animation: "spin 1s linear infinite" }} />}
                      {usdRate && !rateFetching && `1 USD = R$ ${usdRate.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      {rateError && <span style={{ color: "#ef4444", fontSize: "0.68rem" }}>cotação indisponível</span>}
                      {usdRate && (
                        <button
                          type="button"
                          onClick={fetchUsdRate}
                          title="Atualizar cotação"
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "0 2px", color: "var(--text-muted)" }}
                        >
                          <RefreshCw size={11} />
                        </button>
                      )}
                    </span>
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className={`currency-btn ${formCurrency === "BRL" ? "currency-btn-brl" : ""}`}
                      onClick={() => setFormCurrency("BRL")}
                    >
                      R$ BRL
                    </button>
                    <button
                      type="button"
                      className={`currency-btn ${formCurrency === "USD" ? "currency-btn-usd" : ""}`}
                      onClick={() => { setFormCurrency("USD"); if (!usdRate) fetchUsdRate(); }}
                    >
                      $ USD
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Nome / descrição</label>
                <input
                  type="text"
                  className={styles.input}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={formType === "despesa" ? "ex: Assinatura Meta Ads" : "ex: Mensalidade Cliente X"}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Categoria</label>
                <select className={styles.select} value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                  {(formType === "despesa" ? EXPENSE_CATEGORIES : REVENUE_CATEGORIES).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label>Valor ({formCurrency === "USD" && formType === "receita" ? "US$" : "R$"})</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.input}
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                  />
                  {/* Preview de conversão em tempo real */}
                  {brlPreview !== null && (
                    <div className="brl-preview">
                      <span>≈ <strong>R$ {formatMoney(brlPreview)}</strong></span>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                        cotação {usdRate?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label>Data</label>
                  <input type="date" className={styles.input} value={formDate} onChange={(e) => setFormDate(e.target.value)} required />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Status</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="type-choice-btn"
                    onClick={() => setFormStatus("previsto")}
                    style={formStatus === "previsto" ? { backgroundColor: "#DFC18A", borderColor: "#DFC18A", color: "#040405" } : {}}
                  >
                    Previsto
                  </button>
                  <button
                    type="button"
                    className="type-choice-btn"
                    onClick={() => setFormStatus("pago")}
                    style={formStatus === "pago" ? { backgroundColor: "#DFC18A", borderColor: "#DFC18A", color: "#040405" } : {}}
                  >
                    {formType === "despesa" ? "Pago" : "Recebido"}
                  </button>
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btn} onClick={() => setShowModal(false)}>Cancelar</button>
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={formCurrency === "USD" && rateFetching}
                >
                  {formCurrency === "USD" && rateFetching ? "Buscando cotação..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Keyframe para o ícone de loading */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
