import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AtSign, Check, Download, Fingerprint, Mail, MapPin, Phone, Search, User, Zap } from "lucide-react";
import { supabase } from "./supabase";
import "./styles.css";

const EVENT_DATE = new Date("2026-05-22T22:00:00-03:00");
const EVENT_ADDRESS = "R. Gabriela de Melo, 367 — Olhos D'Água, Belo Horizonte";
const EVENT_VENUE = "TERRAZO 367";
const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS || "admin@ph2026";

const initialForm = { fullName: "", instagram: "", phone: "", email: "", cpf: "" };

function onlyDigits(v) { return v.replace(/\D/g, ""); }
function normalizeFullName(v) { return v.replace(/[0-9]/g, "").replace(/\s{2,}/g, " "); }
function hasValidFullName(v) { return v.trim().split(/\s+/).filter(Boolean).length >= 2 && !/\d/.test(v); }
function hasValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }

function formatPhone(v) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatCpf(v) {
  const d = onlyDigits(v).slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function normalizeInstagram(v) {
  const c = v.replace(/\s/g, "").replace(/^@+/, "");
  return c ? `@${c}` : "";
}

function useCountdown(target) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, target - Date.now()));
  const rafRef = useRef(null);

  useEffect(() => {
    function tick() {
      const r = Math.max(0, target - Date.now());
      setTimeLeft(r);
      if (r > 0) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  const s = Math.floor(timeLeft / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    ended: timeLeft === 0,
  };
}

function Countdown() {
  const { days, hours, minutes, seconds, ended } = useCountdown(EVENT_DATE.getTime());

  if (ended) {
    return (
      <div className="countdown-shell">
        <p className="countdown-kicker">O evento começou!</p>
        <p className="countdown-address"><MapPin size={14} />{EVENT_ADDRESS}</p>
        <p className="countdown-venue">{EVENT_VENUE}</p>
      </div>
    );
  }

  return (
    <div className="countdown-shell">
      <p className="countdown-kicker">O evento começa em</p>
      <div className="countdown-grid">
        {[["dias", days], ["horas", hours], ["min", minutes], ["seg", seconds]].map(([label, val], i, arr) => (
          <React.Fragment key={label}>
            <div className="countdown-unit">
              <span className="countdown-value">{String(val).padStart(2, "0")}</span>
              <span className="countdown-label">{label}</span>
            </div>
            {i < arr.length - 1 && <span className="countdown-sep">:</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="countdown-info">
        <p className="countdown-date">22 de maio de 2026 · 22h</p>
        <p className="countdown-address"><MapPin size={14} />{EVENT_ADDRESS}</p>
        <p className="countdown-venue">{EVENT_VENUE}</p>
      </div>
    </div>
  );
}

function App() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const isSupabaseReady = useMemo(() => Boolean(supabase), []);

  function handleChange(event) {
    const { name, value } = event.target;
    const formatters = { fullName: normalizeFullName, phone: formatPhone, cpf: formatCpf, instagram: normalizeInstagram };
    setForm((cur) => ({ ...cur, [name]: formatters[name] ? formatters[name](value) : value }));
  }

  function handleCloseForm() {
    setIsFormOpen(false);
    setShowCountdown(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setShowSuccessModal(false);
    setStatus({ type: "idle", message: "" });

    const payload = {
      full_name: form.fullName.trim(),
      instagram: form.instagram.trim(),
      phone: onlyDigits(form.phone),
      email: form.email.trim().toLowerCase(),
      cpf: onlyDigits(form.cpf),
    };

    if (!hasValidFullName(payload.full_name)) { setStatus({ type: "error", message: "Informe nome e sobrenome." }); return; }
    if (!hasValidEmail(payload.email)) { setStatus({ type: "error", message: "Informe um e-mail válido." }); return; }
    if (payload.phone.length < 10) { setStatus({ type: "error", message: "Informe um telefone válido com DDD." }); return; }
    if (payload.cpf.length !== 11) { setStatus({ type: "error", message: "Informe um CPF com 11 dígitos." }); return; }
    if (!isSupabaseReady) { setStatus({ type: "error", message: "Supabase não configurado." }); return; }

    setIsSubmitting(true);
    const { error } = await supabase.from("guests").insert(payload);

    if (error) {
      if (error.code === "23505") { setStatus({ type: "error", message: "Este nome já está cadastrado na lista." }); }
      else { setStatus({ type: "error", message: `Erro: ${error.message || "Tente novamente."}` }); }
      setIsSubmitting(false);
      return;
    }

    setStatus({ type: "success", message: "Nome enviado com sucesso." });
    setIsFormOpen(false);
    setShowSuccessModal(true);
    setForm(initialForm);
    setIsSubmitting(false);
  }

  return (
    <main className="page">
      <div className="hero-bg" aria-hidden="true"></div>
      <div className="hero-overlay" aria-hidden="true"></div>

      {showCountdown && (
        <div className="countdown-backdrop">
          <Countdown />
        </div>
      )}

      {isFormOpen && (
        <div className="modal-backdrop form-backdrop" role="presentation">
          <div className="form-panel" role="dialog" aria-modal="true" aria-labelledby="form-title">
            <button className="close-button" type="button" aria-label="Fechar formulario" onClick={handleCloseForm}>✕</button>

            <div className="intro">
              <p className="kicker">Lista de convidados</p>
              <h2 id="form-title">Confirme seus dados</h2>
            </div>

            <form className="guest-form" onSubmit={handleSubmit} noValidate>
              <Field
                icon={<User size={18} />}
                label="Nome e sobrenome"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                autoComplete="name"
                placeholder="Ex: Paula Henrique"
                hint={
                  form.fullName.length > 0 && !hasValidFullName(form.fullName)
                    ? "Digite nome e sobrenome"
                    : null
                }
                required
              />
              <Field icon={<AtSign size={18} />} label="Instagram" name="instagram" value={form.instagram} onChange={handleChange} autoComplete="off" placeholder="@usuario" required />
              <Field icon={<Phone size={18} />} label="Telefone" name="phone" value={form.phone} onChange={handleChange} autoComplete="tel" inputMode="tel" placeholder="(11) 99999-9999" required />
              <Field icon={<Mail size={18} />} label="E-mail" name="email" value={form.email} onChange={handleChange} autoComplete="email" inputMode="email" type="email" placeholder="voce@email.com" required />
              <Field icon={<Fingerprint size={18} />} label="CPF" name="cpf" value={form.cpf} onChange={handleChange} autoComplete="off" inputMode="numeric" placeholder="000.000.000-00" required />

              {status.message && (
                <p className={`status-message ${status.type}`} role="status">
                  {status.type === "success" && <Check size={16} />}
                  {status.message}
                </p>
              )}

              <button className={`submit-button ${status.type === "error" ? "is-negative" : "is-positive"}`} type="submit" disabled={isSubmitting}>
                <span>{isSubmitting ? "Enviando..." : "Confirmar"}</span>
                <Zap size={18} fill="currentColor" />
              </button>
            </form>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="modal-backdrop" role="presentation">
          <div className="success-modal" role="dialog" aria-modal="true" aria-labelledby="success-title">
            <Check size={34} />
            <h2 id="success-title">Nome enviado com sucesso</h2>
            <button type="button" onClick={() => setShowSuccessModal(false)}>Fechar</button>
          </div>
        </div>
      )}
    </main>
  );
}

function AdminPanel() {
  const [pass, setPass] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportFiltered, setExportFiltered] = useState(false);

  function handleLogin(e) {
    e.preventDefault();
    if (pass === ADMIN_PASS) {
      setAuthenticated(true);
      setAuthError("");
      fetchGuests();
    } else {
      setAuthError("Senha incorreta.");
    }
  }

  async function fetchGuests() {
    setLoading(true);
    const { data } = await supabase.from("guests").select("*").order("created_at", { ascending: false });
    setGuests(data || []);
    setLoading(false);
  }

  const [activeTab, setActiveTab] = useState("guests");
  const [backstage, setBackstage] = useState([]);
  const [backstageLoading, setBackstageLoading] = useState(false);
  const [backstageForm, setBackstageForm] = useState({ fullName: "", phone: "" });
  const [backstageStatus, setBackstageStatus] = useState({ type: "idle", message: "" });
  const [backstageSubmitting, setBackstageSubmitting] = useState(false);

  const [guestSearch, setGuestSearch] = useState("");
  const [guestDateFrom, setGuestDateFrom] = useState("");
  const [guestDateTo, setGuestDateTo] = useState("");
  const [backstageSearch, setBackstageSearch] = useState("");
  const [backstageDateFrom, setBackstageDateFrom] = useState("");
  const [backstageDateTo, setBackstageDateTo] = useState("");

  function applyFilters(list, search, dateFrom, dateTo) {
    return list.filter((g) => {
      const nameMatch = !search || g.full_name.toLowerCase().includes(search.toLowerCase());
      const created = new Date(g.created_at);
      const fromMatch = !dateFrom || created >= new Date(dateFrom + "T00:00:00");
      const toMatch = !dateTo || created <= new Date(dateTo + "T23:59:59");
      return nameMatch && fromMatch && toMatch;
    });
  }

  const filteredGuests = applyFilters(guests, guestSearch, guestDateFrom, guestDateTo);
  const filteredBackstage = applyFilters(backstage, backstageSearch, backstageDateFrom, backstageDateTo);

  useEffect(() => {
    if (authenticated && activeTab === "backstage" && backstage.length === 0) {
      fetchBackstage();
    }
  }, [authenticated, activeTab]);

  async function fetchBackstage() {
    setBackstageLoading(true);
    const { data } = await supabase.from("backstage_guests").select("*").order("created_at", { ascending: false });
    setBackstage(data || []);
    setBackstageLoading(false);
  }

  async function handleBackstageSubmit(e) {
    e.preventDefault();
    setBackstageStatus({ type: "idle", message: "" });
    const fullName = backstageForm.fullName.trim();
    const phone = onlyDigits(backstageForm.phone);
    if (!hasValidFullName(fullName)) { setBackstageStatus({ type: "error", message: "Informe nome e sobrenome." }); return; }
    if (phone.length < 10) { setBackstageStatus({ type: "error", message: "Telefone inválido." }); return; }
    setBackstageSubmitting(true);
    const { error } = await supabase.from("backstage_guests").insert({ full_name: fullName, phone });
    if (error) {
      setBackstageStatus({ type: "error", message: "Erro ao salvar. Tente novamente." });
    } else {
      setBackstageForm({ fullName: "", phone: "" });
      setBackstageStatus({ type: "success", message: "Adicionado com sucesso." });
      fetchBackstage();
    }
    setBackstageSubmitting(false);
  }

  if (!authenticated) {
    return (
      <main className="page">
        <div className="hero-bg" aria-hidden="true"></div>
        <div className="hero-overlay" aria-hidden="true"></div>
        <div className="modal-backdrop form-backdrop">
          <div className="form-panel" role="dialog">
            <div className="intro">
              <p className="kicker">Área restrita</p>
              <h2>Admin</h2>
            </div>
            <form className="guest-form" onSubmit={handleLogin} noValidate>
              <label className="field">
                <span className="field-label">Senha</span>
                <span className="field-control">
                  <Zap size={18} />
                  <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" autoFocus required />
                </span>
              </label>
              {authError && <p className="status-message error">{authError}</p>}
              <button className="submit-button is-positive" type="submit">
                <span>Entrar</span>
                <Zap size={18} fill="currentColor" />
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  function downloadTxt(filename, content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const guestSource = exportFiltered ? filteredGuests : guests;
  const backstageSource = exportFiltered ? filteredBackstage : backstage;
  const suffix = new Date().toISOString().slice(0, 10);

  function exportGuestsFull() {
    const header = "NOME | INSTAGRAM | TELEFONE | E-MAIL | CPF | CADASTRADO EM\n" + "─".repeat(80);
    const lines = guestSource.map((g) => {
      const date = new Date(g.created_at).toLocaleString("pt-BR");
      return `${g.full_name} | ${g.instagram} | ${g.phone} | ${g.email} | ${g.cpf} | ${date}`;
    });
    downloadTxt(`convidados-${suffix}.txt`, [header, ...lines, "", `Total: ${guestSource.length} convidado(s)`].join("\n"));
  }

  function exportGuestsCsv() {
    const header = "Nome,Instagram,Telefone,E-mail,CPF,Cadastrado em";
    const lines = guestSource.map((g) => {
      const date = new Date(g.created_at).toLocaleString("pt-BR");
      return [g.full_name, g.instagram, g.phone, g.email, g.cpf, date]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    const blob = new Blob(["﻿" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `convidados-${suffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportGuestsNames() {
    const lines = guestSource.map((g) => g.full_name);
    downloadTxt(`nomes-convidados-${suffix}.txt`, ["LISTA DE NOMES — PARTY HARD", "─".repeat(40), ...lines, "", `Total: ${guestSource.length}`].join("\n"));
  }

  function exportBackstageNames() {
    const lines = backstageSource.map((g) => g.full_name);
    downloadTxt(`nomes-backstage-${suffix}.txt`, ["LISTA BACKSTAGE — PARTY HARD", "─".repeat(40), ...lines, "", `Total: ${backstageSource.length}`].join("\n"));
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="kicker">Party Hard</p>
          <h2 className="admin-title">Painel Admin</h2>
        </div>
      </header>

      <nav className="admin-tabs">
        <button className={`admin-tab ${activeTab === "guests" ? "is-active" : ""}`} onClick={() => setActiveTab("guests")}>
          Lista de Convidados
          <span className="admin-tab-count">{guests.length}</span>
        </button>
        <button className={`admin-tab ${activeTab === "backstage" ? "is-active" : ""}`} onClick={() => setActiveTab("backstage")}>
          Backstage
          <span className="admin-tab-count">{backstage.length}</span>
        </button>
      </nav>

      {activeTab === "guests" && (
        <>
          <div className="admin-toolbar">
            <span className="admin-count">
              {loading ? "Carregando..." : `${filteredGuests.length} de ${guests.length} convidado(s)`}
            </span>
            <div className="admin-toolbar-actions">
              <label className="export-filter-check">
                <input type="checkbox" checked={exportFiltered} onChange={(e) => setExportFiltered(e.target.checked)} />
                <span>Exportar pelo filtro</span>
              </label>
              <button className="admin-export-btn" onClick={exportGuestsNames} disabled={loading || guestSource.length === 0}>
                <Download size={15} /><span>Exportar Nomes</span>
              </button>
              <button className="admin-export-btn is-full" onClick={exportGuestsFull} disabled={loading || guestSource.length === 0}>
                <Download size={15} /><span>Completo TXT</span>
              </button>
              <button className="admin-export-btn is-csv" onClick={exportGuestsCsv} disabled={loading || guestSource.length === 0}>
                <Download size={15} /><span>Completo CSV</span>
              </button>
            </div>
          </div>

          <div className="admin-filters">
            <div className="admin-search">
              <Search size={15} />
              <input
                type="text"
                placeholder="Pesquisar por nome..."
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
              />
              {guestSearch && <button className="filter-clear" onClick={() => setGuestSearch("")}>✕</button>}
            </div>
            <div className="admin-date-range">
              <input type="date" value={guestDateFrom} onChange={(e) => setGuestDateFrom(e.target.value)} title="De" />
              <span className="date-sep">até</span>
              <input type="date" value={guestDateTo} onChange={(e) => setGuestDateTo(e.target.value)} title="Até" />
              {(guestDateFrom || guestDateTo) && (
                <button className="filter-clear" onClick={() => { setGuestDateFrom(""); setGuestDateTo(""); }}>✕</button>
              )}
            </div>
          </div>

          {loading ? (
            <p className="admin-loading">Carregando...</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nome</th>
                    <th>Instagram</th>
                    <th>Telefone</th>
                    <th>E-mail</th>
                    <th>CPF</th>
                    <th>Cadastrado em</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuests.length === 0 ? (
                    <tr><td colSpan={7} className="admin-empty">Nenhum resultado encontrado.</td></tr>
                  ) : (
                    filteredGuests.map((g, i) => (
                      <tr key={g.id}>
                        <td>{i + 1}</td>
                        <td>{g.full_name}</td>
                        <td>{g.instagram}</td>
                        <td>{g.phone}</td>
                        <td>{g.email}</td>
                        <td>{g.cpf}</td>
                        <td>{new Date(g.created_at).toLocaleString("pt-BR")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === "backstage" && (
        <>
          <div className="admin-toolbar">
            <span className="admin-count">
              {backstageLoading ? "Carregando..." : `${filteredBackstage.length} de ${backstage.length} pessoa(s)`}
            </span>
            <div className="admin-toolbar-actions">
              <label className="export-filter-check">
                <input type="checkbox" checked={exportFiltered} onChange={(e) => setExportFiltered(e.target.checked)} />
                <span>Exportar pelo filtro</span>
              </label>
              <button className="admin-export-btn" onClick={exportBackstageNames} disabled={backstageLoading || backstageSource.length === 0}>
                <Download size={15} /><span>Exportar Nomes Backstage</span>
              </button>
            </div>
          </div>

          <div className="admin-filters">
            <div className="admin-search">
              <Search size={15} />
              <input
                type="text"
                placeholder="Pesquisar por nome..."
                value={backstageSearch}
                onChange={(e) => setBackstageSearch(e.target.value)}
              />
              {backstageSearch && <button className="filter-clear" onClick={() => setBackstageSearch("")}>✕</button>}
            </div>
            <div className="admin-date-range">
              <input type="date" value={backstageDateFrom} onChange={(e) => setBackstageDateFrom(e.target.value)} title="De" />
              <span className="date-sep">até</span>
              <input type="date" value={backstageDateTo} onChange={(e) => setBackstageDateTo(e.target.value)} title="Até" />
              {(backstageDateFrom || backstageDateTo) && (
                <button className="filter-clear" onClick={() => { setBackstageDateFrom(""); setBackstageDateTo(""); }}>✕</button>
              )}
            </div>
          </div>

          <div className="backstage-add">
            <p className="kicker" style={{ marginBottom: 12 }}>Adicionar à lista</p>
            <form className="backstage-form" onSubmit={handleBackstageSubmit} noValidate>
              <label className="field">
                <span className="field-label">Nome completo</span>
                <span className="field-control">
                  <User size={18} />
                  <input type="text" value={backstageForm.fullName} onChange={(e) => setBackstageForm((f) => ({ ...f, fullName: normalizeFullName(e.target.value) }))} placeholder="Ex: Paula Henrique" required />
                </span>
              </label>
              <label className="field">
                <span className="field-label">Telefone</span>
                <span className="field-control">
                  <Phone size={18} />
                  <input type="tel" inputMode="tel" value={backstageForm.phone} onChange={(e) => setBackstageForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))} placeholder="(11) 99999-9999" required />
                </span>
              </label>
              {backstageStatus.message && (
                <p className={`status-message ${backstageStatus.type}`}>{backstageStatus.message}</p>
              )}
              <button className="admin-export-btn is-add" type="submit" disabled={backstageSubmitting}>
                <span>{backstageSubmitting ? "Salvando..." : "Adicionar"}</span>
              </button>
            </form>
          </div>

          {backstageLoading ? (
            <p className="admin-loading">Carregando...</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Adicionado em</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBackstage.length === 0 ? (
                    <tr><td colSpan={4} className="admin-empty">Nenhum resultado encontrado.</td></tr>
                  ) : (
                    filteredBackstage.map((g, i) => (
                      <tr key={g.id}>
                        <td>{i + 1}</td>
                        <td>{g.full_name}</td>
                        <td>{g.phone}</td>
                        <td>{new Date(g.created_at).toLocaleString("pt-BR")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function Field({ icon, label, hint, ...props }) {
  return (
    <label className={`field${hint ? " field--invalid" : ""}`}>
      <span className="field-label">{label}</span>
      <span className="field-control">
        {icon}
        <input {...props} />
      </span>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

const isAdmin = window.location.pathname === "/admin";
createRoot(document.getElementById("root")).render(isAdmin ? <AdminPanel /> : <App />);
