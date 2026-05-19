import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AtSign, Check, Fingerprint, Mail, MapPin, Phone, User, Zap } from "lucide-react";
import { supabase } from "./supabase";
import "./styles.css";

const EVENT_DATE = new Date("2026-05-22T22:00:00-03:00");
const EVENT_ADDRESS = "R. Gabriela de Melo, 367 — Olhos D'Água, Belo Horizonte";
const EVENT_VENUE = "TERRAZO 367";

const initialForm = {
  fullName: "",
  instagram: "",
  phone: "",
  email: "",
  cpf: "",
};

function onlyDigits(value) {
  return value.replace(/\D/g, "");
}

function normalizeFullName(value) {
  return value.replace(/[0-9]/g, "").replace(/\s{2,}/g, " ");
}

function hasValidFullName(value) {
  const names = value.trim().split(/\s+/).filter(Boolean);
  return names.length >= 2 && !/\d/.test(value);
}

function hasValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function formatPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCpf(value) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function normalizeInstagram(value) {
  const cleanValue = value.replace(/\s/g, "").replace(/^@+/, "");
  return cleanValue ? `@${cleanValue}` : "";
}

function useCountdown(target) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, target - Date.now()));
  const rafRef = useRef(null);

  useEffect(() => {
    function tick() {
      const remaining = Math.max(0, target - Date.now());
      setTimeLeft(remaining);
      if (remaining > 0) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  const totalSeconds = Math.floor(timeLeft / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, ended: timeLeft === 0 };
}

function Countdown() {
  const { days, hours, minutes, seconds, ended } = useCountdown(EVENT_DATE.getTime());

  if (ended) {
    return (
      <div className="countdown-shell">
        <p className="countdown-kicker">O evento começou!</p>
        <p className="countdown-address">
          <MapPin size={14} />
          {EVENT_ADDRESS}
        </p>
        <p className="countdown-venue">{EVENT_VENUE}</p>
      </div>
    );
  }

  return (
    <div className="countdown-shell">
      <p className="countdown-kicker">O evento começa em</p>

      <div className="countdown-grid">
        <div className="countdown-unit">
          <span className="countdown-value">{String(days).padStart(2, "0")}</span>
          <span className="countdown-label">dias</span>
        </div>
        <span className="countdown-sep">:</span>
        <div className="countdown-unit">
          <span className="countdown-value">{String(hours).padStart(2, "0")}</span>
          <span className="countdown-label">horas</span>
        </div>
        <span className="countdown-sep">:</span>
        <div className="countdown-unit">
          <span className="countdown-value">{String(minutes).padStart(2, "0")}</span>
          <span className="countdown-label">min</span>
        </div>
        <span className="countdown-sep">:</span>
        <div className="countdown-unit">
          <span className="countdown-value">{String(seconds).padStart(2, "0")}</span>
          <span className="countdown-label">seg</span>
        </div>
      </div>

      <div className="countdown-info">
        <p className="countdown-date">22 de maio de 2026 · 22h</p>
        <p className="countdown-address">
          <MapPin size={14} />
          {EVENT_ADDRESS}
        </p>
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
    const formatters = {
      fullName: normalizeFullName,
      phone: formatPhone,
      cpf: formatCpf,
      instagram: normalizeInstagram,
    };

    setForm((current) => ({
      ...current,
      [name]: formatters[name] ? formatters[name](value) : value,
    }));
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

    if (!hasValidFullName(payload.full_name)) {
      setStatus({ type: "error", message: "Informe nome e sobrenome." });
      return;
    }

    if (!hasValidEmail(payload.email)) {
      setStatus({ type: "error", message: "Informe um e-mail valido." });
      return;
    }

    if (payload.phone.length < 10) {
      setStatus({ type: "error", message: "Informe um telefone válido com DDD." });
      return;
    }

    if (payload.cpf.length !== 11) {
      setStatus({ type: "error", message: "Informe um CPF com 11 dígitos." });
      return;
    }

    if (!isSupabaseReady) {
      setStatus({
        type: "error",
        message: "Configure o Supabase no arquivo .env para ativar os envios.",
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from("guests").insert(payload);

    if (error) {
      if (error.code === "23505") {
        setStatus({
          type: "error",
          message: "Este nome ja esta cadastrado na lista.",
        });
        setIsSubmitting(false);
        return;
      }

      setStatus({
        type: "error",
        message: `Erro: ${error.message || "Nao foi possivel confirmar agora. Tente novamente."}`,
      });
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
            <button
              className="close-button"
              type="button"
              aria-label="Fechar formulario"
              onClick={handleCloseForm}
            >
              X
            </button>

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
                pattern="[^0-9]*"
                required
              />

              <Field
                icon={<AtSign size={18} />}
                label="Instagram"
                name="instagram"
                value={form.instagram}
                onChange={handleChange}
                autoComplete="off"
                placeholder="@usuario"
                required
              />

              <Field
                icon={<Phone size={18} />}
                label="Telefone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                autoComplete="tel"
                inputMode="tel"
                placeholder="(11) 99999-9999"
                required
              />

              <Field
                icon={<Mail size={18} />}
                label="E-mail"
                name="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                inputMode="email"
                type="email"
                placeholder="voce@email.com"
                required
              />

              <Field
                icon={<Fingerprint size={18} />}
                label="CPF"
                name="cpf"
                value={form.cpf}
                onChange={handleChange}
                autoComplete="off"
                inputMode="numeric"
                placeholder="000.000.000-00"
                required
              />

              {status.message && (
                <p className={`status-message ${status.type}`} role="status">
                  {status.type === "success" && <Check size={16} />}
                  {status.message}
                </p>
              )}

              <button
                className={`submit-button ${status.type === "error" ? "is-negative" : "is-positive"}`}
                type="submit"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? "Enviando" : "Confirmar"}</span>
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
            <button type="button" onClick={() => setShowSuccessModal(false)}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ icon, label, ...props }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-control">
        {icon}
        <input {...props} />
      </span>
    </label>
  );
}

createRoot(document.getElementById("root")).render(<App />);
