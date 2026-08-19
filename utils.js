window.AABBUtils = (() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const money = value => Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

  const isoToday = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
  };

  const currentMonth = () => isoToday().slice(0, 7);

  const formatDate = value => {
    if (!value) return "—";
    const normalized = String(value).slice(0, 10);
    const [year, month, day] = normalized.split("-");
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  };

  const formatDateTime = value => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("pt-BR");
  };

  const age = birth => {
    if (!birth) return "—";
    const date = new Date(`${String(birth).slice(0, 10)}T12:00:00`);
    const now = new Date();
    let years = now.getFullYear() - date.getFullYear();
    const birthday = new Date(now.getFullYear(), date.getMonth(), date.getDate());
    if (now < birthday) years -= 1;
    return Math.max(0, years);
  };

  const initials = name => String(name || "AABB")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0] || "")
    .join("")
    .toUpperCase();

  const normalizeStatus = value => String(value || "").trim().toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

  const badge = status => `<span class="badge ${normalizeStatus(status)}">${escapeHtml(status)}</span>`;

  const fileToBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      resolve(value.includes(",") ? value.split(",")[1] : value);
    };
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });

  const base64ToBlob = (base64, mimeType = "application/octet-stream") => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mimeType });
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename || "arquivo";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportCsv = (filename, columns, rows) => {
    const quote = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const lines = [columns.map(quote).join(";")];
    rows.forEach(row => lines.push(row.map(quote).join(";")));
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
  };

  const debounce = (fn, wait = 250) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  };

  return {
    $, $$, escapeHtml, money, isoToday, currentMonth, formatDate, formatDateTime,
    age, initials, normalizeStatus, badge, fileToBase64, base64ToBlob, downloadBlob,
    exportCsv, debounce
  };
})();
