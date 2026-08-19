(() => {
  "use strict";

  const U = window.AABBUtils;
  const Api = window.AABBApi;
  const Config = window.AABB_CONFIG;
  const { $, $$, escapeHtml, money, isoToday, currentMonth, formatDate, formatDateTime, age, initials, badge, fileToBase64, base64ToBlob, downloadBlob, exportCsv, debounce } = U;

  const State = {
    user: null,
    athletes: [],
    attendance: null,
    finance: null,
    uniforms: [],
    documents: [],
    media: [],
    settings: null,
    users: [],
    activeFinanceTab: "receivable",
    currentPage: "dashboard",
    loadingCount: 0
  };

  const PAGE_TITLES = {
    dashboard: "Visão geral",
    athletes: "Atletas",
    enrollment: "Nova matrícula",
    attendance: "Frequência",
    finance: "Financeiro",
    uniforms: "Uniformes",
    documents: "Documentos",
    media: "Fotos e vídeos",
    reports: "Relatórios",
    settings: "Configurações"
  };

  const PAGE_ROLES = {
    dashboard: ["ADMIN", "COORDENACAO", "FINANCEIRO", "TREINADOR", "SECRETARIA"],
    athletes: ["ADMIN", "COORDENACAO", "FINANCEIRO", "TREINADOR", "SECRETARIA"],
    enrollment: ["ADMIN", "COORDENACAO", "SECRETARIA"],
    attendance: ["ADMIN", "COORDENACAO", "TREINADOR"],
    finance: ["ADMIN", "FINANCEIRO"],
    uniforms: ["ADMIN", "COORDENACAO", "SECRETARIA"],
    documents: ["ADMIN", "COORDENACAO", "SECRETARIA"],
    media: ["ADMIN", "COORDENACAO", "TREINADOR", "SECRETARIA"],
    reports: ["ADMIN", "COORDENACAO", "FINANCEIRO"],
    settings: ["ADMIN"]
  };

  const PROFILE_LABELS = {
    ADMIN: "Administrador",
    COORDENACAO: "Coordenação",
    FINANCEIRO: "Financeiro",
    TREINADOR: "Treinador",
    SECRETARIA: "Secretaria"
  };

  function toast(message, type = "default") {
    const element = $("#toast");
    element.textContent = message;
    element.dataset.type = type;
    element.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove("show"), 3000);
  }

  function setLoading(active, text = "Carregando...") {
    State.loadingCount = Math.max(0, State.loadingCount + (active ? 1 : -1));
    $("#loadingText").textContent = text;
    $("#loadingOverlay").classList.toggle("hidden", State.loadingCount === 0);
  }

  async function withLoading(callback, text) {
    setLoading(true, text);
    try { return await callback(); }
    finally { setLoading(false); }
  }

  function openModal(html, options = {}) {
    $("#modalContent").innerHTML = html;
    $("#modal").classList.remove("hidden");
    $("#modalClose").classList.toggle("hidden", Boolean(options.locked));
  }

  function closeModal(force = false) {
    if (!force && $("#modalClose").classList.contains("hidden")) return;
    $("#modal").classList.add("hidden");
    $("#modalContent").innerHTML = "";
    $("#modalClose").classList.remove("hidden");
  }
  window.closeModal = closeModal;

  function athleteCell(athlete) {
    return `<div class="athlete-cell"><div class="mini-avatar">${initials(athlete.name)}</div><div><strong>${escapeHtml(athlete.name)}</strong><span>${escapeHtml(athlete.phone || "")}</span></div></div>`;
  }

  function actionAllowed(page) {
    return Boolean(State.user && PAGE_ROLES[page]?.includes(State.user.profile));
  }

  function applyRoleVisibility() {
    $$(".nav-item").forEach(item => {
      item.classList.toggle("permission-hidden", !actionAllowed(item.dataset.page));
    });
    $("#usersPanel").classList.toggle("hidden", State.user?.profile !== "ADMIN");
  }

  function updateUserUi() {
    if (!State.user) return;
    $("#userName").textContent = State.user.name;
    $("#userRole").textContent = PROFILE_LABELS[State.user.profile] || State.user.profile;
    $("#userAvatar").textContent = initials(State.user.name);
    applyRoleVisibility();
  }

  function showLogin() {
    $("#app").classList.add("hidden");
    $("#loginScreen").classList.remove("hidden");
    State.user = null;
  }

  async function showApp(user) {
    State.user = user;
    updateUserUi();
    $("#loginScreen").classList.add("hidden");
    $("#app").classList.remove("hidden");
    await go("dashboard", true);
  }

  async function updateConnectionStatus() {
    const indicator = $("#connectionIndicator");
    const text = $("#connectionText");
    const health = await Api.health();
    indicator.classList.remove("online", "offline");
    if (health.online) {
      indicator.classList.add("online");
      text.textContent = Api.isDemo() ? "Modo demonstração local" : "Conectado ao Google Apps Script";
    } else {
      indicator.classList.add("offline");
      text.textContent = "Sem conexão com a API";
    }
  }

  function configureModeUi() {
    const demo = Api.isDemo();
    $("#demoAccessBox").classList.toggle("hidden", !demo);
    $("#demoResetPanel").classList.toggle("hidden", !demo);
    $("#loginHelpText").textContent = demo
      ? "Teste a versão completa antes de conectar ao Google."
      : "Entre com o usuário cadastrado no sistema.";
    if (!demo) {
      $("#loginEmail").value = "";
      $("#loginPassword").value = "";
    }
    if (demo) {
      document.body.classList.add("has-demo-banner");
      const banner = document.createElement("div");
      banner.className = "demo-banner";
      banner.textContent = "MODO DEMONSTRAÇÃO — os dados ficam somente neste navegador";
      document.body.prepend(banner);
    }
    $("#systemModeText").textContent = demo ? "Modo demonstração" : "Sistema conectado";
    $("#systemApiText").textContent = demo ? "LocalStorage do navegador" : Config.apiUrl;
  }

  function roleDenied(page) {
    toast(`Seu perfil não possui acesso ao módulo ${PAGE_TITLES[page]}.`, "error");
  }

  async function go(page, force = false) {
    if (!force && !actionAllowed(page)) {
      roleDenied(page);
      return;
    }
    State.currentPage = page;
    $$(".page").forEach(element => element.classList.remove("active"));
    $(`#page-${page}`).classList.add("active");
    $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.page === page));
    $("#pageTitle").textContent = PAGE_TITLES[page];
    $("#sidebar").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      if (page === "dashboard") await loadDashboard();
      if (page === "athletes") await loadAthletes();
      if (page === "attendance") await loadAttendance();
      if (page === "finance") await loadFinance();
      if (page === "uniforms") await loadUniforms();
      if (page === "documents") await loadDocuments();
      if (page === "media") await loadMedia();
      if (page === "settings") await loadSettings();
    } catch (error) {
      handleApiError(error);
    }
  }

  function handleApiError(error) {
    const message = error?.message || "Ocorreu um erro inesperado.";
    if (/sessão|autorizado|token/i.test(message)) {
      Api.clearToken();
      showLogin();
    }
    toast(message, "error");
    console.error(error);
  }

  async function login(event) {
    event.preventDefault();
    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;
    try {
      const result = await withLoading(() => Api.call("login", { email, password }, { token: "" }), "Entrando...");
      Api.setToken(result.token);
      await showApp(result.user);
      if (result.user.mustChangePassword) showChangePasswordModal(true);
    } catch (error) {
      handleApiError(error);
    }
  }

  async function logout() {
    try { await Api.call("logout"); }
    catch (_) { /* A sessão local será limpa mesmo se a rede falhar. */ }
    Api.clearToken();
    showLogin();
  }

  function showChangePasswordModal(forced = false) {
    openModal(`<span class="eyebrow">SEGURANÇA</span><h2>${forced ? "Troque sua senha temporária" : "Alterar senha"}</h2>
      <div class="notice ${forced ? "warning" : ""}">${forced ? "Para continuar, crie uma senha pessoal com pelo menos 8 caracteres." : "Informe a senha atual e escolha uma nova senha."}</div>
      <div class="form-grid two" style="margin-top:16px">
        <label>Senha atual<input id="currentPasswordInput" type="password" autocomplete="current-password"></label>
        <label>Nova senha<input id="newPasswordInput" type="password" autocomplete="new-password"></label>
        <label class="span-2">Confirmar nova senha<input id="confirmPasswordInput" type="password" autocomplete="new-password"></label>
      </div>
      <div class="form-actions"><button class="btn primary" id="savePasswordBtn">Salvar nova senha</button></div>`, { locked: forced });
    $("#savePasswordBtn").onclick = async () => {
      const currentPassword = $("#currentPasswordInput").value;
      const newPassword = $("#newPasswordInput").value;
      const confirm = $("#confirmPasswordInput").value;
      if (newPassword.length < 8) return toast("A nova senha deve ter pelo menos 8 caracteres.", "error");
      if (newPassword !== confirm) return toast("A confirmação da senha não confere.", "error");
      try {
        const result = await withLoading(() => Api.call("changePassword", { currentPassword, newPassword }), "Alterando senha...");
        State.user = result.user;
        updateUserUi();
        closeModal(true);
        toast("Senha alterada com sucesso.");
      } catch (error) { handleApiError(error); }
    };
  }

  async function loadDashboard() {
    const data = await withLoading(() => Api.call("dashboard"), "Atualizando painel...");
    $("#statAthletes").textContent = data.activeAthletes || 0;
    $("#statAttendance").textContent = `${data.attendanceRate || 0}%`;
    $("#statReceived").textContent = money(data.received);
    $("#statOverdue").textContent = data.overdueCount || 0;
    const total = Number(data.paidCount || 0) + Number(data.pendingCount || 0) + Number(data.overduePaymentsCount || 0);
    const percentage = total ? Math.round((Number(data.paidCount || 0) / total) * 100) : 0;
    $("#donutPercent").textContent = `${percentage}%`;
    $("#financeDonut").style.background = `conic-gradient(var(--green) 0 ${percentage}%,#ecf0f5 ${percentage}%)`;
    $("#legendPaid").textContent = data.paidCount || 0;
    $("#legendPending").textContent = data.pendingCount || 0;
    $("#legendOverdue").textContent = data.overduePaymentsCount || 0;
    $("#recentAthletes").innerHTML = (data.recentAthletes || []).map(athlete => `<tr>
      <td>${athleteCell(athlete)}</td><td>${escapeHtml(athlete.category)}</td><td>${escapeHtml(athlete.guardian || "—")}</td>
      <td>${money(athlete.monthly)}</td><td>${badge(athlete.paymentStatus || "Pendente")}</td></tr>`).join("") || `<tr><td colspan="5">Nenhum atleta cadastrado.</td></tr>`;
    $("#activityList").innerHTML = (data.activities || []).map(item => `<div class="activity"><div class="date-box"><strong>${escapeHtml(item.day)}</strong><span>${escapeHtml(item.month)}</span></div><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></div><em>${escapeHtml(item.type)}</em></div>`).join("") || `<div class="empty-state">Nenhuma atividade cadastrada.</div>`;
  }

  async function loadAthletes() {
    const result = await withLoading(() => Api.call("listAthletes"), "Carregando atletas...");
    State.athletes = result.athletes || [];
    renderAthletes();
  }

  function renderAthletes() {
    const query = $("#athleteSearch").value.trim().toLowerCase();
    const category = $("#categoryFilter").value;
    const status = $("#statusFilter").value;
    const list = State.athletes.filter(athlete => {
      const text = `${athlete.name} ${athlete.guardian || ""}`.toLowerCase();
      return (!query || text.includes(query)) && (!category || athlete.category === category) && (!status || athlete.status === status);
    });
    $("#athletesTable").innerHTML = list.map(athlete => `<tr>
      <td>${athleteCell(athlete)}</td><td>${age(athlete.birth)} anos</td><td>${escapeHtml(athlete.category)}</td>
      <td>${escapeHtml(athlete.guardian || "—")}</td><td>${escapeHtml(athlete.shirt || "—")} • nº ${escapeHtml(athlete.number || "—")}</td>
      <td>${badge(athlete.status)}</td><td><button class="action-btn" data-athlete-view="${escapeHtml(athlete.id)}">Ver ficha</button></td></tr>`).join("") || `<tr><td colspan="7">Nenhum atleta encontrado.</td></tr>`;
    $$('[data-athlete-view]').forEach(button => button.onclick = () => viewAthlete(button.dataset.athleteView));
  }

  async function viewAthlete(id) {
    try {
      const result = await withLoading(() => Api.call("getAthlete", { id }), "Abrindo ficha...");
      const athlete = result.athlete;
      const nextStatus = athlete.status === "Inativo" ? "Ativo" : "Inativo";
      openModal(`<span class="eyebrow">FICHA DO ATLETA</span><h2>${escapeHtml(athlete.name)}</h2>
        <div class="form-grid two">
          <div><strong>Categoria</strong><p>${escapeHtml(athlete.category)}</p></div><div><strong>Idade</strong><p>${age(athlete.birth)} anos</p></div>
          <div><strong>Responsável</strong><p>${escapeHtml(athlete.guardian || "—")}</p></div><div><strong>WhatsApp</strong><p>${escapeHtml(athlete.phone || "—")}</p></div>
          <div><strong>Uniforme</strong><p>${escapeHtml(athlete.shirt || "—")} • nº ${escapeHtml(athlete.number || "—")}</p></div><div><strong>Mensalidade</strong><p>${money(athlete.monthly)}</p></div>
        </div>
        <div style="margin-top:18px;padding:15px;background:#f7f9fc;border-radius:12px"><strong>Informações de saúde</strong><p>${escapeHtml(athlete.health || "Não informado")}</p><p><strong>Alergias:</strong> ${escapeHtml(athlete.allergies || "Não informado")}</p><p><strong>Restrições:</strong> ${escapeHtml(athlete.restrictions || "Não informado")}</p></div>
        <div class="form-actions">${actionAllowed("enrollment") ? `<button class="btn ghost" id="toggleAthleteStatus">${nextStatus === "Ativo" ? "Reativar" : "Inativar"}</button>` : ""}<button class="btn primary" onclick="closeModal()">Fechar</button></div>`);
      if ($("#toggleAthleteStatus")) $("#toggleAthleteStatus").onclick = async () => {
        try {
          await withLoading(() => Api.call("setAthleteStatus", { id, status: nextStatus }), "Atualizando atleta...");
          closeModal();
          await loadAthletes();
          toast("Situação do atleta atualizada.");
        } catch (error) { handleApiError(error); }
      };
    } catch (error) { handleApiError(error); }
  }

  async function submitEnrollment(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = Object.fromEntries(form.entries());
    payload.monthly = Number(payload.monthly || 0);
    payload.dueDay = Number(payload.dueDay || 10);
    payload.imageAuth = form.get("imageAuth") === "on";
    payload.rulesAuth = form.get("rulesAuth") === "on";
    payload.healthAuth = form.get("healthAuth") === "on";
    try {
      await withLoading(() => Api.call("saveEnrollment", payload), "Salvando matrícula...");
      formElement.reset();
      toast("Matrícula salva com sucesso.");
      await go("athletes");
    } catch (error) { handleApiError(error); }
  }

  async function loadAttendance() {
    const category = $("#attendanceCategory").value;
    const date = $("#attendanceDate").value || isoToday();
    $("#attendanceDate").value = date;
    const result = await withLoading(() => Api.call("listAttendance", { category, date }), "Carregando frequência...");
    State.attendance = result;
    renderAttendance();
  }

  function renderAttendance() {
    const data = State.attendance || { athletes: [], monthly: [], summary: {} };
    $("#attPresentCount").textContent = data.summary.present || 0;
    $("#attAbsentCount").textContent = data.summary.absent || 0;
    $("#attJustifiedCount").textContent = data.summary.justified || 0;
    $("#attTotalCount").textContent = data.summary.total || 0;
    const statusClass = { Presente: "present", Ausente: "absent", Justificado: "justified" };
    $("#attendanceList").innerHTML = (data.athletes || []).map(athlete => `<div class="management-attendance-row"><div>${athleteCell(athlete)}</div><div class="attendance-status-buttons">
      ${["Presente", "Ausente", "Justificado"].map(status => `<button type="button" class="att-status-btn ${statusClass[status]} ${athlete.status === status ? "active" : ""}" data-attendee="${escapeHtml(athlete.id)}" data-status="${status}">${status === "Presente" ? "✓ Presente" : status === "Ausente" ? "× Falta" : "! Justificada"}</button>`).join("")}
      </div></div>`).join("") || `<div class="empty-state">Nenhum atleta ativo nesta turma.</div>`;
    $$('[data-attendee]').forEach(button => button.onclick = () => setAttendanceDraft(button.dataset.attendee, button.dataset.status));
    $("#attendanceHistory").innerHTML = (data.monthly || []).map(row => `<tr><td>${athleteCell(row)}</td><td>${row.trainings}</td><td>${row.present}</td><td>${row.absent}</td><td>${row.justified}</td><td><strong>${row.percentage}%</strong></td></tr>`).join("") || `<tr><td colspan="6">Nenhum histórico neste mês.</td></tr>`;
  }

  function setAttendanceDraft(athleteId, status) {
    const athlete = State.attendance?.athletes?.find(item => item.id === athleteId);
    if (!athlete) return;
    athlete.status = status;
    const selected = State.attendance.athletes.map(item => item.status).filter(Boolean);
    State.attendance.summary.present = selected.filter(value => value === "Presente").length;
    State.attendance.summary.absent = selected.filter(value => value === "Ausente").length;
    State.attendance.summary.justified = selected.filter(value => value === "Justificado").length;
    $("#attendanceStatusLabel").textContent = "Alterações não salvas";
    $("#attendanceStatusLabel").className = "badge warning";
    renderAttendance();
  }

  async function saveAttendance() {
    const records = (State.attendance?.athletes || []).filter(item => item.status).map(item => ({ athleteId: item.id, status: item.status }));
    try {
      State.attendance = await withLoading(() => Api.call("saveAttendance", {
        category: $("#attendanceCategory").value,
        date: $("#attendanceDate").value,
        records
      }), "Salvando frequência...");
      renderAttendance();
      $("#attendanceStatusLabel").textContent = "Frequência salva";
      $("#attendanceStatusLabel").className = "badge success";
      toast("Frequência registrada.");
    } catch (error) { handleApiError(error); }
  }

  function showAttendanceReport() {
    const rows = State.attendance?.monthly || [];
    openModal(`<span class="eyebrow">RELATÓRIO DE FREQUÊNCIA</span><h2>${escapeHtml($("#attendanceCategory").value)} — ${escapeHtml($("#attendanceDate").value.slice(0, 7))}</h2>
      <div class="table-wrap"><table><thead><tr><th>Atleta</th><th>Treinos</th><th>Presenças</th><th>Faltas</th><th>Justificadas</th><th>%</th></tr></thead><tbody>${rows.map(row => `<tr><td>${escapeHtml(row.name)}</td><td>${row.trainings}</td><td>${row.present}</td><td>${row.absent}</td><td>${row.justified}</td><td>${row.percentage}%</td></tr>`).join("")}</tbody></table></div>
      <div class="form-actions"><button class="btn ghost" id="attendanceCsvBtn">Exportar CSV</button><button class="btn primary" onclick="closeModal()">Fechar</button></div>`);
    $("#attendanceCsvBtn").onclick = () => exportCsv(`frequencia-${$("#attendanceCategory").value}-${$("#attendanceDate").value.slice(0,7)}`, ["Atleta","Treinos","Presenças","Faltas","Justificadas","Frequência"], rows.map(row => [row.name,row.trainings,row.present,row.absent,row.justified,`${row.percentage}%`]));
  }

  async function loadFinance() {
    const month = $("#financeMonth").value || currentMonth();
    $("#financeMonth").value = month;
    State.finance = await withLoading(() => Api.call("listFinance", {
      month,
      search: $("#financeSearch").value.trim(),
      status: $("#financeStatus").value
    }), "Carregando financeiro...");
    renderFinance();
  }

  function showFinanceTab(tab) {
    State.activeFinanceTab = tab;
    $$(".finance-tab").forEach(button => button.classList.toggle("active", button.dataset.finTab === tab));
    $$(".finance-section").forEach(section => section.classList.toggle("active", section.id === `fin-${tab}`));
  }

  function renderFinance() {
    const data = State.finance || { payments: [], expenses: [], cashbook: [], openPayments: [], summary: {} };
    const summary = data.summary || {};
    $("#finReceived").textContent = money(summary.received);
    $("#finPending").textContent = money(summary.open);
    $("#finOverdueCount").textContent = summary.overdueCount || 0;
    $("#finExpenses").textContent = money(summary.expenses);
    $("#finBalance").textContent = money(summary.balance);
    $("#monthlyExpected").textContent = money(summary.expected);
    $("#monthlyReceived").textContent = money(summary.received);
    $("#monthlyOpen").textContent = money(summary.open);
    $("#monthlyExpenses").textContent = money(summary.expenses);
    $("#monthlyResult").textContent = money(summary.balance);
    $("#receivableCount").textContent = `${(data.payments || []).length} lançamento(s)`;

    $("#financeTable").innerHTML = (data.payments || []).map(item => `<tr><td>${athleteCell({name:item.athleteName,phone:item.phone})}</td><td>${escapeHtml(item.reference)}</td><td>${formatDate(item.due)}</td><td><strong>${money(item.value)}</strong></td><td>${badge(item.status)}</td><td><div class="finance-action-group">${item.status !== "Pago" ? `<button class="action-btn green" data-payment-receive="${escapeHtml(item.id)}">Receber</button>` : `<button class="action-btn" data-payment-receipt="${escapeHtml(item.id)}">Recibo</button>`}<button class="action-btn" data-payment-edit="${escapeHtml(item.id)}">Editar</button></div></td></tr>`).join("") || `<tr><td colspan="6">Nenhuma mensalidade encontrada.</td></tr>`;
    $$('[data-payment-receive]').forEach(button => button.onclick = () => receivePayment(button.dataset.paymentReceive));
    $$('[data-payment-receipt]').forEach(button => button.onclick = () => showReceipt(button.dataset.paymentReceipt));
    $$('[data-payment-edit]').forEach(button => button.onclick = () => editPayment(button.dataset.paymentEdit));

    $("#expensesTable").innerHTML = (data.expenses || []).map(item => `<tr><td><strong>${escapeHtml(item.description)}</strong></td><td>${escapeHtml(item.category)}</td><td>${formatDate(item.due)}</td><td><strong>${money(item.value)}</strong></td><td>${badge(item.status)}</td><td><div class="finance-action-group">${item.status !== "Pago" ? `<button class="action-btn green" data-expense-pay="${escapeHtml(item.id)}">Pagar</button>` : ""}<button class="action-btn" data-expense-edit="${escapeHtml(item.id)}">Editar</button><button class="action-btn" data-expense-delete="${escapeHtml(item.id)}">Excluir</button></div></td></tr>`).join("") || `<tr><td colspan="6">Nenhuma despesa neste mês.</td></tr>`;
    $$('[data-expense-pay]').forEach(button => button.onclick = () => payExpense(button.dataset.expensePay));
    $$('[data-expense-edit]').forEach(button => button.onclick = () => showExpenseModal(button.dataset.expenseEdit));
    $$('[data-expense-delete]').forEach(button => button.onclick = () => deleteExpense(button.dataset.expenseDelete));

    $("#cashbookTable").innerHTML = (data.cashbook || []).map(item => `<tr><td>${formatDate(item.date)}</td><td>${escapeHtml(item.description)}</td><td><span class="cash-type ${item.type === "Entrada" ? "entry" : "exit"}">${escapeHtml(item.type)}</span></td><td>${escapeHtml(item.method || "—")}</td><td class="${item.type === "Entrada" ? "money-in" : "money-out"}">${item.type === "Entrada" ? "+ " : "- "}${money(item.value)}</td></tr>`).join("") || `<tr><td colspan="5">Nenhuma movimentação confirmada.</td></tr>`;

    $("#monthlyOpenTable").innerHTML = (data.openPayments || []).map(item => `<tr><td>${athleteCell({name:item.athleteName,phone:item.phone})}</td><td>${escapeHtml(item.guardian || "—")}</td><td>${escapeHtml(item.phone || "—")}</td><td>${money(item.value)}</td><td>${badge(item.status)}</td></tr>`).join("") || `<tr><td colspan="5">Nenhuma mensalidade em aberto.</td></tr>`;
    showFinanceTab(State.activeFinanceTab);
  }

  function paymentById(id) { return State.finance?.payments?.find(item => item.id === id) || State.finance?.openPayments?.find(item => item.id === id); }
  function expenseById(id) { return State.finance?.expenses?.find(item => item.id === id); }

  function receivePayment(id) {
    const item = paymentById(id);
    openModal(`<span class="eyebrow">RECEBIMENTO</span><h2>Dar baixa na mensalidade</h2><p><strong>${escapeHtml(item?.athleteName || "Atleta")}</strong> — ${money(item?.value)}</p>
      <div class="form-grid two"><label>Data do pagamento<input id="receiveDate" type="date" value="${isoToday()}"></label><label>Forma de pagamento<select id="receiveMethod"><option>Pix</option><option>Dinheiro</option><option>Transferência</option><option>Cartão</option></select></label></div>
      <div class="form-actions"><button class="btn primary" id="confirmReceiveBtn">Confirmar recebimento</button></div>`);
    $("#confirmReceiveBtn").onclick = async () => {
      try {
        await withLoading(() => Api.call("recordPayment", { id, paidAt: $("#receiveDate").value, method: $("#receiveMethod").value }), "Registrando pagamento...");
        closeModal(); await loadFinance(); await loadDashboard(); toast("Pagamento registrado.");
      } catch (error) { handleApiError(error); }
    };
  }

  function showReceipt(id) {
    const item = paymentById(id);
    openModal(`<span class="eyebrow">RECIBO</span><h2>Pagamento recebido</h2><p>Recebemos de <strong>${escapeHtml(item?.guardian || "Responsável")}</strong> o valor de <strong>${money(item?.value)}</strong>, referente à mensalidade de <strong>${escapeHtml(item?.athleteName || "Atleta")}</strong> — ${escapeHtml(item?.reference || "")}.</p>
      <div class="notice">Na versão conectada, os dados deste recibo ficam registrados no Google Sheets. A impressão pode ser feita pelo navegador.</div>
      <div class="form-actions"><button class="btn ghost" id="printReceiptBtn">Imprimir</button><button class="btn primary" onclick="closeModal()">Fechar</button></div>`);
    $("#printReceiptBtn").onclick = () => window.print();
  }

  function editPayment(id) {
    const item = paymentById(id);
    openModal(`<span class="eyebrow">EDITAR MENSALIDADE</span><h2>Ajustar lançamento</h2><div class="form-grid two">
      <label>Valor<input id="editPaymentValue" type="number" step="0.01" value="${Number(item?.value || 0)}"></label>
      <label>Vencimento<input id="editPaymentDue" type="date" value="${escapeHtml(item?.due || "")}"></label>
      <label>Situação<select id="editPaymentStatus">${["Pago","Pendente","Vencido","Isento","Negociado"].map(status => `<option ${item?.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></label>
      <label>Observação<input id="editPaymentObservation" value="${escapeHtml(item?.observation || "")}"></label>
      </div><div class="form-actions"><button class="btn primary" id="savePaymentEditBtn">Salvar alteração</button></div>`);
    $("#savePaymentEditBtn").onclick = async () => {
      try {
        await withLoading(() => Api.call("updatePayment", { id, value:Number($("#editPaymentValue").value), due:$("#editPaymentDue").value, status:$("#editPaymentStatus").value, observation:$("#editPaymentObservation").value }), "Atualizando mensalidade...");
        closeModal(); await loadFinance(); toast("Mensalidade atualizada.");
      } catch (error) { handleApiError(error); }
    };
  }

  function showExpenseModal(id = "") {
    const item = id ? expenseById(id) : null;
    openModal(`<span class="eyebrow">${item ? "EDITAR" : "NOVA"} DESPESA</span><h2>${item ? "Atualizar lançamento" : "Cadastrar conta a pagar"}</h2>
      <div class="form-grid two">
        <label>Descrição<input id="expenseDescription" value="${escapeHtml(item?.description || "")}"></label>
        <label>Categoria<select id="expenseCategory">${["Material esportivo","Competição","Transporte","Uniformes","Serviços","Outros"].map(value => `<option ${item?.category === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <label>Vencimento<input id="expenseDue" type="date" value="${escapeHtml(item?.due || `${$("#financeMonth").value}-10`)}"></label>
        <label>Valor<input id="expenseValue" type="number" step="0.01" value="${Number(item?.value || 0)}"></label>
        <label>Situação<select id="expenseStatus"><option ${item?.status !== "Pago" ? "selected" : ""}>Pendente</option><option ${item?.status === "Pago" ? "selected" : ""}>Pago</option></select></label>
        <label>Forma<select id="expenseMethod">${["Pix","Dinheiro","Transferência","Cartão"].map(value => `<option ${item?.method === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <label class="span-2">Observação<input id="expenseObservation" value="${escapeHtml(item?.observation || "")}"></label>
      </div><div class="form-actions"><button class="btn primary" id="saveExpenseBtn">Salvar despesa</button></div>`);
    $("#saveExpenseBtn").onclick = async () => {
      try {
        await withLoading(() => Api.call("saveExpense", { id:item?.id || "", description:$("#expenseDescription").value, category:$("#expenseCategory").value, due:$("#expenseDue").value, value:Number($("#expenseValue").value), status:$("#expenseStatus").value, method:$("#expenseMethod").value, observation:$("#expenseObservation").value }), "Salvando despesa...");
        closeModal(); State.activeFinanceTab = "payable"; await loadFinance(); toast("Despesa salva.");
      } catch (error) { handleApiError(error); }
    };
  }

  async function payExpense(id) {
    try {
      await withLoading(() => Api.call("payExpense", { id, paidAt:isoToday() }), "Confirmando despesa...");
      await loadFinance(); toast("Despesa marcada como paga.");
    } catch (error) { handleApiError(error); }
  }

  async function deleteExpense(id) {
    if (!confirm("Excluir esta despesa?")) return;
    try {
      await withLoading(() => Api.call("deleteExpense", { id }), "Excluindo despesa...");
      await loadFinance(); toast("Despesa excluída.");
    } catch (error) { handleApiError(error); }
  }

  async function generateMonthlyPayments() {
    try {
      const result = await withLoading(() => Api.call("generateMonthlyPayments", { month:$("#financeMonth").value }), "Gerando mensalidades...");
      toast(result.created ? `${result.created} mensalidade(s) gerada(s).` : "As mensalidades deste mês já existem.");
      await loadFinance();
    } catch (error) { handleApiError(error); }
  }

  function exportFinanceReport() {
    const data = State.finance;
    if (!data) return;
    exportCsv(`financeiro-${data.month || $("#financeMonth").value}`, ["Atleta","Responsável","Contato","Referência","Vencimento","Valor","Situação"], (data.openPayments || []).map(item => [item.athleteName,item.guardian,item.phone,item.reference,item.due,item.value,item.status]));
  }

  async function loadUniforms() {
    const result = await withLoading(() => Api.call("listUniforms"), "Carregando uniformes...");
    State.uniforms = result.uniforms || [];
    renderUniforms();
  }

  function renderUniforms() {
    const counts = {};
    State.uniforms.forEach(item => { counts[item.shirt || "Sem tamanho"] = (counts[item.shirt || "Sem tamanho"] || 0) + 1; });
    $("#uniformStats").innerHTML = Object.entries(counts).slice(0,3).map(([size,count]) => `<article class="stat-card"><div class="stat-icon blue">▣</div><div><span>Tamanho ${escapeHtml(size)}</span><strong>${count}</strong><small>atletas cadastrados</small></div></article>`).join("") || `<article class="stat-card"><div><span>Nenhum uniforme cadastrado</span></div></article>`;
    $("#uniformTable").innerHTML = State.uniforms.map(item => `<tr><td>${athleteCell(item)}</td><td>${escapeHtml(item.shirt || "—")}</td><td>${escapeHtml(item.number || "—")}</td><td>${item.kit ? badge("Entregue") : badge("Pendente")}</td><td>${formatDate(item.deliveryDate)}</td><td><button class="action-btn" data-uniform-edit="${escapeHtml(item.athleteId)}">${item.kit ? "Editar" : "Confirmar entrega"}</button></td></tr>`).join("") || `<tr><td colspan="6">Nenhum uniforme cadastrado.</td></tr>`;
    $$('[data-uniform-edit]').forEach(button => button.onclick = () => showUniformModal(button.dataset.uniformEdit));
  }

  function showUniformModal(athleteId) {
    const item = State.uniforms.find(row => row.athleteId === athleteId);
    openModal(`<span class="eyebrow">UNIFORME</span><h2>${escapeHtml(item?.name || "Atleta")}</h2><div class="form-grid two">
      <label>Tamanho da camisa<input id="uniformShirt" value="${escapeHtml(item?.shirt || "")}"></label>
      <label>Tamanho do short<input id="uniformShort" value="${escapeHtml(item?.shortSize || "")}"></label>
      <label>Número<input id="uniformNumber" type="number" min="1" max="99" value="${escapeHtml(item?.number || "")}"></label>
      <label>Data de entrega<input id="uniformDeliveryDate" type="date" value="${escapeHtml(item?.deliveryDate || isoToday())}"></label>
      </div><div class="checks"><label><input id="uniformKit" type="checkbox" ${item?.kit ? "checked" : ""}> Kit entregue ao atleta.</label></div>
      <div class="form-actions"><button class="btn primary" id="saveUniformBtn">Salvar uniforme</button></div>`);
    $("#saveUniformBtn").onclick = async () => {
      try {
        const result = await withLoading(() => Api.call("saveUniform", { athleteId, shirt:$("#uniformShirt").value, shortSize:$("#uniformShort").value, number:$("#uniformNumber").value, kit:$("#uniformKit").checked, deliveryDate:$("#uniformDeliveryDate").value }), "Salvando uniforme...");
        State.uniforms = result.uniforms || [];
        closeModal(); renderUniforms(); toast("Uniforme atualizado.");
      } catch (error) { handleApiError(error); }
    };
  }

  async function loadDocuments() {
    const [documentsResult, athletesResult] = await withLoading(() => Promise.all([Api.call("listDocuments"), State.athletes.length ? Promise.resolve({athletes:State.athletes}) : Api.call("listAthletes")]), "Carregando documentos...");
    State.documents = documentsResult.documents || [];
    State.athletes = athletesResult.athletes || State.athletes;
    renderDocuments();
  }

  function documentIcon(type) {
    const text = String(type || "").toLowerCase();
    if (text.includes("regimento")) return "▤";
    if (text.includes("anamnese") || text.includes("atestado")) return "♡";
    if (text.includes("autoriz")) return "☑";
    if (text.includes("comprovante")) return "R$";
    return "✎";
  }

  function renderDocuments() {
    $("#documentsGrid").innerHTML = State.documents.map(doc => `<article class="document-card"><div class="document-icon">${documentIcon(doc.type)}</div><div class="document-meta"><strong>${escapeHtml(doc.title)}</strong><span>${escapeHtml(doc.type)} • ${escapeHtml(doc.athleteName || "Institucional")}</span><span>${formatDate(doc.uploadDate)}${doc.expiry ? ` • Validade ${formatDate(doc.expiry)}` : ""}</span></div><div class="document-actions"><button class="action-btn" data-doc-download="${escapeHtml(doc.id)}">Abrir</button><button class="action-btn" data-doc-delete="${escapeHtml(doc.id)}">Excluir</button></div></article>`).join("") || `<div class="empty-state">Nenhum documento cadastrado.</div>`;
    $$('[data-doc-download]').forEach(button => button.onclick = () => downloadDocument(button.dataset.docDownload));
    $$('[data-doc-delete]').forEach(button => button.onclick = () => deleteDocument(button.dataset.docDelete));
  }

  function showDocumentModal() {
    openModal(`<span class="eyebrow">GOOGLE DRIVE</span><h2>Enviar documento</h2><div class="notice">Arquivos pequenos, como PDF, imagem ou comprovante. Limite configurado: ${Config.maxUploadMb} MB.</div>
      <div class="form-grid two" style="margin-top:16px">
        <label>Vincular a<select id="documentAthlete"><option value="">Documento institucional</option>${State.athletes.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("")}</select></label>
        <label>Tipo<select id="documentType"><option>Regimento interno</option><option>Ficha de matrícula</option><option>Anamnese</option><option>Atestado médico</option><option>Autorização</option><option>Comprovante</option><option>Outro</option></select></label>
        <label class="span-2">Título<input id="documentTitle" placeholder="Nome que aparecerá no sistema"></label>
        <label>Validade<input id="documentExpiry" type="date"></label>
        <label>Arquivo<input id="documentFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"></label>
      </div><div class="form-actions"><button class="btn primary" id="uploadDocumentBtn">Enviar documento</button></div>`);
    $("#uploadDocumentBtn").onclick = async () => {
      const file = $("#documentFile").files[0];
      if (!file) return toast("Selecione um arquivo.", "error");
      if (file.size > Config.maxUploadMb * 1024 * 1024) return toast(`O arquivo excede ${Config.maxUploadMb} MB.`, "error");
      try {
        const base64 = await fileToBase64(file);
        await withLoading(() => Api.call("uploadDocument", { athleteId:$("#documentAthlete").value, type:$("#documentType").value, title:$("#documentTitle").value || file.name, expiry:$("#documentExpiry").value, filename:file.name, mimeType:file.type || "application/octet-stream", size:file.size, base64 }), "Enviando para o Drive...");
        closeModal(); await loadDocuments(); toast("Documento enviado.");
      } catch (error) { handleApiError(error); }
    };
  }

  async function downloadDocument(id) {
    try {
      const result = await withLoading(() => Api.call("downloadDocument", { id }), "Preparando documento...");
      const blob = base64ToBlob(result.base64, result.mimeType);
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) downloadBlob(blob, result.filename);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) { handleApiError(error); }
  }

  async function deleteDocument(id) {
    if (!confirm("Excluir este documento do sistema e do Google Drive?")) return;
    try {
      await withLoading(() => Api.call("deleteDocument", { id }), "Excluindo documento...");
      await loadDocuments(); toast("Documento excluído.");
    } catch (error) { handleApiError(error); }
  }

  async function loadMedia() {
    const result = await withLoading(() => Api.call("listMedia"), "Carregando fotos e vídeos...");
    State.media = result.media || [];
    renderMedia();
  }

  function mediaEmoji(type) {
    const text = String(type || "").toLowerCase();
    if (text.includes("vídeo")) return "▶";
    if (text.includes("álbum")) return "🏐";
    if (text.includes("foto")) return "📷";
    return "🔗";
  }

  function renderMedia() {
    $("#mediaGrid").innerHTML = State.media.map(item => `<article class="media-card"><div class="media-cover">${mediaEmoji(item.type)}<span>${escapeHtml(item.category)}</span></div><div class="media-info"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.type)} • ${formatDate(item.eventDate)}</small><div class="media-actions"><button class="action-btn" data-media-open="${escapeHtml(item.id)}">Abrir</button><button class="action-btn" data-media-delete="${escapeHtml(item.id)}">Excluir</button></div></div></article>`).join("") || `<div class="empty-state">Nenhuma mídia cadastrada.</div>`;
    $$('[data-media-open]').forEach(button => button.onclick = () => {
      const item = State.media.find(row => row.id === button.dataset.mediaOpen);
      if (!item?.url) return toast("Este registro não possui link.", "error");
      window.open(item.url, "_blank", "noopener,noreferrer");
    });
    $$('[data-media-delete]').forEach(button => button.onclick = () => deleteMedia(button.dataset.mediaDelete));
  }

  function showMediaModal() {
    openModal(`<span class="eyebrow">FOTOS E VÍDEOS</span><h2>Novo registro</h2><div class="notice">Para vídeos, utilize um link do YouTube não listado. Para álbuns e fotos, use o link da pasta no Google Drive.</div>
      <div class="form-grid two" style="margin-top:16px">
        <label>Título<input id="mediaTitle"></label><label>Tipo<select id="mediaType"><option>Álbum</option><option>Foto</option><option>Vídeo</option><option>Link</option></select></label>
        <label>Categoria<select id="mediaCategory"><option>Treinos</option><option>Jogos</option><option>Competição</option><option>Eventos</option><option>Outros</option></select></label><label>Data<input id="mediaDate" type="date" value="${isoToday()}"></label>
        <label class="span-2">Link<input id="mediaUrl" type="url" placeholder="https://..."></label><label class="span-2">Descrição<textarea id="mediaDescription"></textarea></label>
      </div><div class="form-actions"><button class="btn primary" id="saveMediaBtn">Salvar registro</button></div>`);
    $("#saveMediaBtn").onclick = async () => {
      try {
        const result = await withLoading(() => Api.call("saveMedia", { title:$("#mediaTitle").value, type:$("#mediaType").value, category:$("#mediaCategory").value, eventDate:$("#mediaDate").value, url:$("#mediaUrl").value, description:$("#mediaDescription").value }), "Salvando mídia...");
        State.media = result.media || [];
        closeModal(); renderMedia(); toast("Registro salvo.");
      } catch (error) { handleApiError(error); }
    };
  }

  async function deleteMedia(id) {
    if (!confirm("Excluir este registro de mídia?")) return;
    try {
      const result = await withLoading(() => Api.call("deleteMedia", { id }), "Excluindo registro...");
      State.media = result.media || [];
      renderMedia(); toast("Registro excluído.");
    } catch (error) { handleApiError(error); }
  }

  async function renderReport(type) {
    try {
      const data = await withLoading(() => Api.call("reportData", { type, month:currentMonth(), category:$("#attendanceCategory").value }), "Gerando relatório...");
      const summary = Object.entries(data.summary || {}).map(([key,value]) => `<span>${escapeHtml(key)}: <strong>${typeof value === "number" && /valor|received|open|expense|balance|expected/i.test(key) ? money(value) : escapeHtml(value)}</strong></span>`).join("");
      $("#reportResult").classList.remove("hidden");
      $("#reportResult").innerHTML = `<span class="eyebrow">RELATÓRIO</span><h3>${escapeHtml(data.title)}</h3><div class="report-summary">${summary}</div><div class="table-wrap report-table-preview"><table><thead><tr>${data.columns.map(column => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${data.rows.map(row => `<tr>${row.map(value => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`).join("")}</tbody></table></div><div class="form-actions"><button class="btn ghost" id="reportCsvBtn">Exportar CSV</button><button class="btn primary" id="reportPrintBtn">Imprimir</button></div>`;
      $("#reportCsvBtn").onclick = () => exportCsv(data.title.toLowerCase().replace(/[^a-z0-9]+/gi,"-"), data.columns, data.rows);
      $("#reportPrintBtn").onclick = () => window.print();
      $("#reportResult").scrollIntoView({ behavior:"smooth" });
    } catch (error) { handleApiError(error); }
  }

  async function loadSettings() {
    const calls = [Api.call("getSettings")];
    if (State.user?.profile === "ADMIN") calls.push(Api.call("listUsers"));
    const results = await withLoading(() => Promise.all(calls), "Carregando configurações...");
    State.settings = results[0].settings || {};
    State.users = results[1]?.users || [];
    $("#settingName").value = State.settings.name || "AABB Voleibol";
    $("#settingEmail").value = State.settings.email || Config.institutionalEmail;
    $("#settingPhone").value = State.settings.phone || "";
    $("#settingTechnical").value = State.settings.technical || "";
    $("#settingMonthly").value = Number(State.settings.monthlyDefault || 120);
    $("#settingDueDay").value = Number(State.settings.dueDayDefault || 10);
    renderUsers();
  }

  async function saveSettings() {
    try {
      const result = await withLoading(() => Api.call("saveSettings", { name:$("#settingName").value, email:$("#settingEmail").value, phone:$("#settingPhone").value, technical:$("#settingTechnical").value, monthlyDefault:Number($("#settingMonthly").value), dueDayDefault:Number($("#settingDueDay").value), domain:Config.domain }), "Salvando configurações...");
      State.settings = result.settings;
      toast("Configurações salvas.");
    } catch (error) { handleApiError(error); }
  }

  function renderUsers() {
    if (State.user?.profile !== "ADMIN") return;
    $("#usersTable").innerHTML = State.users.map(user => `<tr><td>${athleteCell({name:user.name,phone:""})}</td><td>${escapeHtml(user.email)}</td><td>${escapeHtml(PROFILE_LABELS[user.profile] || user.profile)}</td><td>${badge(user.status)}</td><td>${formatDateTime(user.lastAccess)}</td><td><div class="finance-action-group"><button class="action-btn" data-user-edit="${escapeHtml(user.id)}">Editar</button><button class="action-btn" data-user-reset="${escapeHtml(user.id)}">Redefinir senha</button></div></td></tr>`).join("") || `<tr><td colspan="6">Nenhum usuário cadastrado.</td></tr>`;
    $$('[data-user-edit]').forEach(button => button.onclick = () => showUserModal(button.dataset.userEdit));
    $$('[data-user-reset]').forEach(button => button.onclick = () => resetUserPassword(button.dataset.userReset));
  }

  function showUserModal(id = "") {
    const item = id ? State.users.find(user => user.id === id) : null;
    openModal(`<span class="eyebrow">USUÁRIOS</span><h2>${item ? "Editar usuário" : "Novo usuário"}</h2><div class="form-grid two">
      <label>Nome<input id="newUserName" value="${escapeHtml(item?.name || "")}"></label><label>E-mail<input id="newUserEmail" type="email" value="${escapeHtml(item?.email || "")}"></label>
      <label>Perfil<select id="newUserProfile">${Object.entries(PROFILE_LABELS).map(([value,label]) => `<option value="${value}" ${item?.profile === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
      <label>Status<select id="newUserStatus"><option ${item?.status !== "Inativo" ? "selected" : ""}>Ativo</option><option ${item?.status === "Inativo" ? "selected" : ""}>Inativo</option></select></label>
      </div><div class="form-actions"><button class="btn primary" id="saveUserBtn">Salvar usuário</button></div>`);
    $("#saveUserBtn").onclick = async () => {
      try {
        const result = await withLoading(() => Api.call("saveUser", { id:item?.id || "", name:$("#newUserName").value, email:$("#newUserEmail").value, profile:$("#newUserProfile").value, status:$("#newUserStatus").value }), "Salvando usuário...");
        closeModal(); await loadSettings();
        if (result.temporaryPassword) showTemporaryPassword(result.temporaryPassword, result.user.email);
        else toast("Usuário atualizado.");
      } catch (error) { handleApiError(error); }
    };
  }

  function showTemporaryPassword(password, email) {
    openModal(`<span class="eyebrow">SENHA TEMPORÁRIA</span><h2>Usuário criado</h2><div class="notice warning">Copie esta senha agora. Ela é exibida somente neste momento e deverá ser alterada no primeiro acesso.</div><div class="demo-access" style="margin-top:16px"><strong>${escapeHtml(email)}</strong><span id="temporaryPasswordText">${escapeHtml(password)}</span></div><div class="form-actions"><button class="btn ghost" id="copyTempPassword">Copiar senha</button><button class="btn primary" onclick="closeModal()">Concluir</button></div>`);
    $("#copyTempPassword").onclick = async () => { await navigator.clipboard.writeText(password); toast("Senha copiada."); };
  }

  async function resetUserPassword(id) {
    if (!confirm("Gerar uma nova senha temporária para este usuário?")) return;
    try {
      const result = await withLoading(() => Api.call("resetUserPassword", { id }), "Redefinindo senha...");
      const user = State.users.find(item => item.id === id);
      showTemporaryPassword(result.temporaryPassword, user?.email || "Usuário");
    } catch (error) { handleApiError(error); }
  }

  async function resetDemo() {
    if (!confirm("Restaurar todos os dados fictícios da demonstração?")) return;
    try {
      await withLoading(() => Api.call("resetDemo", {}, { token:"" }), "Restaurando demonstração...");
      Api.clearToken();
      location.reload();
    } catch (error) { handleApiError(error); }
  }

  function bindEvents() {
    $("#loginForm").addEventListener("submit", login);
    $("#togglePassword").onclick = () => { $("#loginPassword").type = $("#loginPassword").type === "password" ? "text" : "password"; };
    $("#logoutBtn").onclick = logout;
    $("#menuBtn").onclick = () => $("#sidebar").classList.toggle("open");
    $("#modalClose").onclick = () => closeModal();
    $("#modal").onclick = event => { if (event.target.id === "modal") closeModal(); };

    $$(".nav-item").forEach(item => item.onclick = () => go(item.dataset.page));
    $$("[data-go]").forEach(item => item.onclick = () => go(item.dataset.go));

    $("#athleteSearch").addEventListener("input", debounce(renderAthletes));
    $("#categoryFilter").addEventListener("change", renderAthletes);
    $("#statusFilter").addEventListener("change", renderAthletes);
    $("#enrollmentForm").addEventListener("submit", submitEnrollment);

    $("#attendanceCategory").addEventListener("change", loadAttendance);
    $("#attendanceDate").addEventListener("change", loadAttendance);
    $("#saveAttendance").onclick = saveAttendance;
    $("#attendanceReportBtn").onclick = showAttendanceReport;

    $("#financeSearch").addEventListener("input", debounce(loadFinance, 350));
    $("#financeStatus").addEventListener("change", loadFinance);
    $("#financeMonth").addEventListener("change", loadFinance);
    $$(".finance-tab").forEach(button => button.onclick = () => showFinanceTab(button.dataset.finTab));
    $("#newExpenseBtn").onclick = () => showExpenseModal();
    $("#newExpenseInline").onclick = () => showExpenseModal();
    $("#generateMonthBtn").onclick = generateMonthlyPayments;
    $("#exportFinanceReport").onclick = exportFinanceReport;

    $("#newDocBtn").onclick = showDocumentModal;
    $("#newAlbumBtn").onclick = showMediaModal;
    $$("[data-report]").forEach(button => button.onclick = () => renderReport(button.dataset.report));

    $("#saveSettings").onclick = saveSettings;
    $("#newUserBtn").onclick = () => showUserModal();
    $("#resetDemo").onclick = resetDemo;
  }

  async function restoreSession() {
    const token = Api.getToken();
    if (!token) return showLogin();
    try {
      const result = await withLoading(() => Api.call("me"), "Restaurando sessão...");
      await showApp(result.user);
      if (result.user.mustChangePassword) showChangePasswordModal(true);
    } catch (_) {
      Api.clearToken();
      showLogin();
    }
  }

  async function initialize() {
    bindEvents();
    configureModeUi();
    $("#currentDate").textContent = new Date().toLocaleDateString("pt-BR", { weekday:"short", day:"2-digit", month:"long" });
    $("#attendanceDate").value = isoToday();
    $("#financeMonth").value = currentMonth();
    $("#seasonTag").textContent = `TEMPORADA ${new Date().getFullYear()}`;
    await updateConnectionStatus();
    await restoreSession();
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
