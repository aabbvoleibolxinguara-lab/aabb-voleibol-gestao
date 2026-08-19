window.AABBMockApi = (() => {
  const { isoToday, currentMonth } = window.AABBUtils;
  const STORAGE_KEY = "aabb_voleibol_gestao_v1_demo";
  const SESSION_KEY = "aabb_voleibol_demo_session";

  const randomUuid = () => {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
      const random = Math.random() * 16 | 0;
      const value = character === "x" ? random : (random & 0x3 | 0x8);
      return value.toString(16);
    });
  };
  const uuid = prefix => `${prefix}-${randomUuid().split("-")[0].toUpperCase()}`;
  const nowIso = () => new Date().toISOString();
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const clone = value => JSON.parse(JSON.stringify(value));

  function seedDatabase() {
    const month = currentMonth();
    const year = Number(month.slice(0, 4));
    const monthIndex = Number(month.slice(5, 7)) - 1;
    const due = day => {
      const d = new Date(year, monthIndex, day, 12);
      return d.toISOString().slice(0, 10);
    };

    const athletes = [
      {id:"ATL-1001",name:"Mariana Alves",birth:"2012-04-18",sex:"Feminino",document:"",category:"Sub-15",position:"Ponteiro(a)",shirt:"M",shortSize:"M",number:"7",address:"Xinguara - PA",status:"Ativo",monthly:120,dueDay:10,discount:"Valor integral",imageAuth:true,rulesAuth:true,folderId:"DEMO",created:"2026-07-20",guardian:"Patrícia Alves",relation:"Mãe",phone:"(94) 99123-4567",email:"patricia@example.com",guardianDocument:"",health:"Não",allergies:"Não",medications:"Não",injuries:"Não",restrictions:"Não",emergency:"Patrícia - (94) 99123-4567",kit:true,deliveryDate:"2026-07-15"},
      {id:"ATL-1002",name:"Gabriel Souza",birth:"2013-09-02",sex:"Masculino",document:"",category:"Sub-13",position:"Levantador(a)",shirt:"14",shortSize:"14",number:"10",address:"Xinguara - PA",status:"Ativo",monthly:120,dueDay:10,discount:"Valor integral",imageAuth:true,rulesAuth:true,folderId:"DEMO",created:"2026-07-19",guardian:"Carlos Souza",relation:"Pai",phone:"(94) 99877-1122",email:"carlos@example.com",guardianDocument:"",health:"Asma leve controlada",allergies:"Não",medications:"Bombinha quando prescrita",injuries:"Não",restrictions:"Acompanhamento em crises",emergency:"Carlos - (94) 99877-1122",kit:false,deliveryDate:""},
      {id:"ATL-1003",name:"Ana Clara Lima",birth:"2011-01-25",sex:"Feminino",document:"",category:"Sub-15",position:"Líbero",shirt:"P",shortSize:"P",number:"4",address:"Xinguara - PA",status:"Ativo",monthly:100,dueDay:10,discount:"Desconto para irmãos",imageAuth:true,rulesAuth:true,folderId:"DEMO",created:"2026-07-18",guardian:"Renata Lima",relation:"Mãe",phone:"(94) 99220-4455",email:"renata@example.com",guardianDocument:"",health:"Não",allergies:"Não",medications:"Não",injuries:"Entorse de tornozelo em 2025",restrictions:"Sem restrição atual",emergency:"Renata - (94) 99220-4455",kit:true,deliveryDate:"2026-07-15"},
      {id:"ATL-1004",name:"João Pedro Martins",birth:"2009-11-13",sex:"Masculino",document:"",category:"Sub-17",position:"Central",shirt:"G",shortSize:"G",number:"12",address:"Xinguara - PA",status:"Pendente",monthly:120,dueDay:15,discount:"Valor integral",imageAuth:true,rulesAuth:true,folderId:"DEMO",created:"2026-07-17",guardian:"Luciana Martins",relation:"Mãe",phone:"(94) 99931-7788",email:"luciana@example.com",guardianDocument:"",health:"Não",allergies:"Dipirona",medications:"Não",injuries:"Não",restrictions:"Não",emergency:"Luciana - (94) 99931-7788",kit:false,deliveryDate:""},
      {id:"ATL-1005",name:"Beatriz Oliveira",birth:"2015-06-07",sex:"Feminino",document:"",category:"Sub-11",position:"Em definição",shirt:"12",shortSize:"12",number:"2",address:"Xinguara - PA",status:"Ativo",monthly:120,dueDay:10,discount:"Valor integral",imageAuth:true,rulesAuth:true,folderId:"DEMO",created:"2026-07-15",guardian:"Márcio Oliveira",relation:"Pai",phone:"(94) 99345-0091",email:"marcio@example.com",guardianDocument:"",health:"Não",allergies:"Não",medications:"Não",injuries:"Não",restrictions:"Não",emergency:"Márcio - (94) 99345-0091",kit:true,deliveryDate:"2026-07-16"},
      {id:"ATL-1006",name:"Lucas Ribeiro",birth:"2010-03-30",sex:"Masculino",document:"",category:"Sub-17",position:"Oposto(a)",shirt:"M",shortSize:"M",number:"8",address:"Xinguara - PA",status:"Ativo",monthly:120,dueDay:10,discount:"Valor integral",imageAuth:true,rulesAuth:true,folderId:"DEMO",created:"2026-07-12",guardian:"Sandra Ribeiro",relation:"Mãe",phone:"(94) 99114-5522",email:"sandra@example.com",guardianDocument:"",health:"Não",allergies:"Não",medications:"Não",injuries:"Não",restrictions:"Não",emergency:"Sandra - (94) 99114-5522",kit:true,deliveryDate:"2026-07-17"}
    ];

    const payments = athletes.map((athlete, index) => ({
      id: `MEN-${1001 + index}`,
      athleteId: athlete.id,
      reference: month,
      due: due(athlete.dueDay || 10),
      value: athlete.monthly,
      status: ["Pago", "Vencido", "Pago", "Pendente", "Pago", "Vencido"][index],
      paidAt: [0, 2, 4].includes(index) ? due(8 + index) : "",
      method: [0, 2, 4].includes(index) ? "Pix" : "",
      observation: ""
    }));

    const expenses = [
      {id:"DES-1001",description:"Compra de bolas oficiais",category:"Material esportivo",due:due(18),value:450,status:"Pago",paidAt:due(18),method:"Pix",observation:""},
      {id:"DES-1002",description:"Inscrição na Copa Regional",category:"Competição",due:due(22),value:300,status:"Pago",paidAt:due(22),method:"Transferência",observation:""},
      {id:"DES-1003",description:"Transporte para amistoso",category:"Transporte",due:due(28),value:280,status:"Pendente",paidAt:"",method:"Pix",observation:""}
    ];

    const attendance = {};
    const day1 = `${month}-05`;
    const day2 = `${month}-12`;
    const day3 = `${month}-19`;
    [day1, day2, day3].forEach((date, dateIndex) => {
      attendance[`Sub-15_${date}`] = {
        "ATL-1001": dateIndex === 2 ? "Justificado" : "Presente",
        "ATL-1003": dateIndex === 1 ? "Ausente" : "Presente"
      };
    });
    attendance[`Sub-15_${isoToday()}`] = {"ATL-1001":"Presente","ATL-1003":"Presente"};

    return {
      settings: {
        name: "AABB Voleibol",
        email: "aabbvoleibolxinguara@gmail.com",
        phone: "(94) 99999-9999",
        technical: "Coordenação AABB Voleibol",
        monthlyDefault: 120,
        dueDayDefault: 10,
        domain: "gestao.aabbvoleibol.com.br"
      },
      users: [
        {id:"USR-ADMIN",name:"Administrador AABB",email:"aabbvoleibolxinguara@gmail.com",profile:"ADMIN",status:"Ativo",password:"Demo@2026",mustChangePassword:false,lastAccess:nowIso(),created:nowIso()},
        {id:"USR-COORD",name:"Coordenação",email:"coordenacao@aabbvoleibol.com.br",profile:"COORDENACAO",status:"Ativo",password:"Demo@2026",mustChangePassword:false,lastAccess:"",created:nowIso()}
      ],
      athletes,
      payments,
      expenses,
      attendance,
      documents: [
        {id:"DOC-1001",athleteId:"",athleteName:"",type:"Regimento interno",title:"Regimento interno da escolinha",filename:"regimento-interno.pdf",mimeType:"application/pdf",size:182000,uploadDate:"2026-07-01",expiry:"",status:"Ativo",content:""},
        {id:"DOC-1002",athleteId:"",athleteName:"",type:"Modelo",title:"Autorização de uso de imagem",filename:"autorizacao-imagem.pdf",mimeType:"application/pdf",size:74000,uploadDate:"2026-07-02",expiry:"",status:"Ativo",content:""}
      ],
      media: [
        {id:"MID-1001",title:"Treino técnico Sub-15",type:"Álbum",category:"Treinos",url:"https://drive.google.com/",eventDate:`${month}-12`,description:"Registro do treino técnico."},
        {id:"MID-1002",title:"Copa Regional",type:"Vídeo",category:"Competição",url:"https://www.youtube.com/",eventDate:`${month}-20`,description:"Melhores momentos."}
      ],
      sessions: {}
    };
  }

  function loadDb() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedDatabase();
      saveDb(seeded);
      return seeded;
    }
    try { return JSON.parse(raw); }
    catch (_) {
      const seeded = seedDatabase();
      saveDb(seeded);
      return seeded;
    }
  }

  function saveDb(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function requireSession(db, token) {
    const session = db.sessions[token];
    if (!session) throw new Error("Sessão inválida. Entre novamente.");
    const user = db.users.find(item => item.id === session.userId && item.status === "Ativo");
    if (!user) throw new Error("Usuário não autorizado.");
    return user;
  }

  function publicUser(user) {
    return {
      id:user.id, name:user.name, email:user.email, profile:user.profile,
      status:user.status, mustChangePassword:Boolean(user.mustChangePassword),
      lastAccess:user.lastAccess || ""
    };
  }

  function paymentStatus(payment) {
    if (payment.status === "Pendente" && payment.due < isoToday()) return "Vencido";
    return payment.status;
  }

  function syncStatuses(db) {
    db.payments.forEach(payment => { payment.status = paymentStatus(payment); });
  }

  function athleteView(db, athlete) {
    return clone(athlete);
  }

  function cashbook(db, month) {
    const rows = [];
    db.payments.filter(item => item.reference === month && item.status === "Pago").forEach(item => {
      const athlete = db.athletes.find(a => a.id === item.athleteId);
      rows.push({id:`CX-${item.id}`,date:item.paidAt || item.due,description:`Mensalidade — ${athlete?.name || "Atleta"}`,type:"Entrada",method:item.method || "Não informado",value:item.value,referenceId:item.id});
    });
    db.expenses.filter(item => item.due.slice(0,7) === month && item.status === "Pago").forEach(item => {
      rows.push({id:`CX-${item.id}`,date:item.paidAt || item.due,description:item.description,type:"Saída",method:item.method || "Não informado",value:item.value,referenceId:item.id});
    });
    return rows.sort((a,b) => String(b.date).localeCompare(String(a.date)));
  }

  function financeResult(db, payload = {}) {
    syncStatuses(db);
    const month = payload.month || currentMonth();
    const search = String(payload.search || "").toLowerCase();
    const status = payload.status || "";
    const payments = db.payments.filter(item => item.reference === month).map(item => {
      const athlete = db.athletes.find(a => a.id === item.athleteId) || {};
      return {...clone(item),athleteName:athlete.name || "Atleta",guardian:athlete.guardian || "",phone:athlete.phone || ""};
    }).filter(item => (!search || item.athleteName.toLowerCase().includes(search)) && (!status || item.status === status));
    const allMonthPayments = db.payments.filter(item => item.reference === month);
    const expenses = db.expenses.filter(item => item.due.slice(0,7) === month).map(clone);
    const paid = allMonthPayments.filter(item => item.status === "Pago");
    const open = allMonthPayments.filter(item => ["Pendente","Vencido"].includes(item.status));
    const overdue = allMonthPayments.filter(item => item.status === "Vencido");
    const paidExpenses = expenses.filter(item => item.status === "Pago");
    const received = paid.reduce((sum,item) => sum + Number(item.value || 0), 0);
    const openValue = open.reduce((sum,item) => sum + Number(item.value || 0), 0);
    const expenseValue = paidExpenses.reduce((sum,item) => sum + Number(item.value || 0), 0);
    const expected = allMonthPayments.reduce((sum,item) => sum + Number(item.value || 0), 0);
    return {
      month,
      payments,
      expenses,
      cashbook: cashbook(db, month),
      openPayments: open.map(item => {
        const athlete = db.athletes.find(a => a.id === item.athleteId) || {};
        return {...clone(item),athleteName:athlete.name || "Atleta",guardian:athlete.guardian || "",phone:athlete.phone || ""};
      }),
      summary:{received,open:openValue,overdueCount:overdue.length,expenses:expenseValue,balance:received-expenseValue,expected}
    };
  }

  function attendanceResult(db, payload = {}) {
    const category = payload.category || "Sub-15";
    const date = payload.date || isoToday();
    const key = `${category}_${date}`;
    const statuses = db.attendance[key] || {};
    const athletes = db.athletes.filter(a => a.category === category && a.status === "Ativo").map(a => ({id:a.id,name:a.name,phone:a.phone,status:statuses[a.id] || ""}));
    const month = date.slice(0,7);
    const monthly = athletes.map(athlete => {
      const values = Object.entries(db.attendance)
        .filter(([recordKey]) => recordKey.startsWith(`${category}_${month}`))
        .map(([,records]) => records[athlete.id])
        .filter(Boolean);
      const present = values.filter(value => value === "Presente").length;
      const absent = values.filter(value => value === "Ausente").length;
      const justified = values.filter(value => value === "Justificado").length;
      const percentage = values.length ? Math.round(((present + justified) / values.length) * 100) : 0;
      return {athleteId:athlete.id,name:athlete.name,phone:athlete.phone,trainings:values.length,present,absent,justified,percentage};
    });
    const selected = Object.values(statuses);
    return {
      category,date,athletes,monthly,
      summary:{present:selected.filter(v=>v==="Presente").length,absent:selected.filter(v=>v==="Ausente").length,justified:selected.filter(v=>v==="Justificado").length,total:athletes.length}
    };
  }

  function dashboardResult(db) {
    syncStatuses(db);
    const month = currentMonth();
    const finance = financeResult(db,{month});
    const active = db.athletes.filter(a => a.status === "Ativo");
    const monthAttendance = Object.entries(db.attendance).filter(([key]) => key.includes(`_${month}`));
    const values = monthAttendance.flatMap(([,records]) => Object.values(records));
    const frequency = values.length ? Math.round((values.filter(v => ["Presente","Justificado"].includes(v)).length / values.length) * 100) : 0;
    return {
      activeAthletes:active.length,
      attendanceRate:frequency,
      received:finance.summary.received,
      overdueCount:finance.summary.overdueCount,
      paidCount:db.payments.filter(p=>p.reference===month&&p.status==="Pago").length,
      pendingCount:db.payments.filter(p=>p.reference===month&&p.status==="Pendente").length,
      overduePaymentsCount:db.payments.filter(p=>p.reference===month&&p.status==="Vencido").length,
      recentAthletes:[...db.athletes].sort((a,b)=>String(b.created).localeCompare(String(a.created))).slice(0,5).map(a=>{
        const payment=db.payments.find(p=>p.athleteId===a.id&&p.reference===month);
        return {...athleteView(db,a),paymentStatus:payment?.status||"Pendente"};
      }),
      activities:[
        {day:"24",month:"AGO",title:"Treino Sub-15",detail:"18:00 • Ginásio AABB",type:"Treino"},
        {day:"26",month:"AGO",title:"Amistoso regional",detail:"09:00 • Ginásio Municipal",type:"Jogo"},
        {day:"30",month:"AGO",title:"Reunião com responsáveis",detail:"19:00 • Sala de reuniões",type:"Reunião"}
      ]
    };
  }

  async function call(action, payload = {}, token = "") {
    await delay(90);
    const db = loadDb();
    let user = null;

    if (!["health","login","resetDemo"].includes(action)) user = requireSession(db, token);

    switch (action) {
      case "health":
        return {ok:true,configured:true,mode:"demo",version:window.AABB_CONFIG.version};

      case "login": { 
        const email = String(payload.email || "").trim().toLowerCase();
        const found = db.users.find(item => item.email.toLowerCase() === email && item.status === "Ativo");
        if (!found || found.password !== payload.password) throw new Error("E-mail ou senha incorretos.");
        const newToken = randomUuid();
        db.sessions[newToken] = {userId:found.id,created:nowIso()};
        found.lastAccess = nowIso();
        saveDb(db);
        sessionStorage.setItem(SESSION_KEY,newToken);
        return {token:newToken,user:publicUser(found)};
      }

      case "logout":
        delete db.sessions[token];
        saveDb(db);
        sessionStorage.removeItem(SESSION_KEY);
        return {success:true};

      case "me":
        return {user:publicUser(user)};

      case "changePassword": {
        if (user.password !== payload.currentPassword) throw new Error("A senha atual não confere.");
        if (String(payload.newPassword || "").length < 8) throw new Error("A nova senha deve ter pelo menos 8 caracteres.");
        user.password = payload.newPassword;
        user.mustChangePassword = false;
        saveDb(db);
        return {user:publicUser(user)};
      }

      case "dashboard":
        return dashboardResult(db);

      case "listAthletes":
        return {athletes:db.athletes.map(a=>athleteView(db,a))};

      case "getAthlete": {
        const athlete = db.athletes.find(a=>a.id===payload.id);
        if (!athlete) throw new Error("Atleta não encontrado.");
        return {athlete:athleteView(db,athlete)};
      }

      case "saveEnrollment": {
        const athlete = {
          id:uuid("ATL"),name:payload.name,birth:payload.birth,sex:payload.sex || "",
          document:payload.document || "",category:payload.category,position:payload.position || "Em definição",
          shirt:payload.shirt || "",shortSize:payload.shortSize || payload.shirt || "",number:payload.number || "",
          address:payload.address || "",status:"Ativo",monthly:Number(payload.monthly || db.settings.monthlyDefault || 0),
          dueDay:Number(payload.dueDay || db.settings.dueDayDefault || 10),discount:payload.discount || "Valor integral",
          imageAuth:Boolean(payload.imageAuth),rulesAuth:Boolean(payload.rulesAuth),folderId:"DEMO",created:isoToday(),
          guardian:payload.guardian,relation:payload.relation || "",phone:payload.phone,email:payload.email || "",
          guardianDocument:payload.guardianDocument || "",health:payload.health || "Não",allergies:payload.allergies || "Não",
          medications:payload.medications || "Não",injuries:payload.injuries || "Não",restrictions:payload.restrictions || "Não",
          emergency:payload.emergency || "",kit:false,deliveryDate:""
        };
        if (!athlete.name || !athlete.birth || !athlete.category || !athlete.guardian || !athlete.phone) throw new Error("Preencha os campos obrigatórios da matrícula.");
        db.athletes.push(athlete);
        const month=currentMonth();
        const due=`${month}-${String(Math.min(28,Math.max(1,athlete.dueDay))).padStart(2,"0")}`;
        db.payments.push({id:uuid("MEN"),athleteId:athlete.id,reference:month,due,value:athlete.monthly,status:"Pendente",paidAt:"",method:"",observation:""});
        saveDb(db);
        return {athlete:clone(athlete)};
      }

      case "setAthleteStatus": {
        const athlete=db.athletes.find(a=>a.id===payload.id);
        if(!athlete) throw new Error("Atleta não encontrado.");
        athlete.status=payload.status;
        saveDb(db);
        return {athlete:clone(athlete)};
      }

      case "listAttendance":
        return attendanceResult(db,payload);

      case "saveAttendance": {
        const key=`${payload.category}_${payload.date}`;
        db.attendance[key]=db.attendance[key]||{};
        (payload.records||[]).forEach(record=>{db.attendance[key][record.athleteId]=record.status;});
        saveDb(db);
        return attendanceResult(db,payload);
      }

      case "listFinance":
        saveDb(db);
        return financeResult(db,payload);

      case "generateMonthlyPayments": {
        const month=payload.month||currentMonth();
        let created=0;
        db.athletes.filter(a=>a.status==="Ativo").forEach(athlete=>{
          if(!db.payments.some(p=>p.athleteId===athlete.id&&p.reference===month)){
            db.payments.push({id:uuid("MEN"),athleteId:athlete.id,reference:month,due:`${month}-${String(Math.min(28,Math.max(1,athlete.dueDay||10))).padStart(2,"0")}`,value:Number(athlete.monthly||0),status:"Pendente",paidAt:"",method:"",observation:""});
            created+=1;
          }
        });
        saveDb(db);
        return {created,...financeResult(db,{month})};
      }

      case "recordPayment": {
        const item=db.payments.find(p=>p.id===payload.id);
        if(!item) throw new Error("Mensalidade não encontrada.");
        item.status="Pago";item.paidAt=payload.paidAt||isoToday();item.method=payload.method||"Pix";
        saveDb(db);return financeResult(db,{month:item.reference});
      }

      case "updatePayment": {
        const item=db.payments.find(p=>p.id===payload.id);
        if(!item) throw new Error("Mensalidade não encontrada.");
        item.value=Number(payload.value ?? item.value);item.status=payload.status||item.status;item.due=payload.due||item.due;item.observation=payload.observation||"";
        if(item.status!=="Pago"){item.paidAt="";item.method="";}
        saveDb(db);return financeResult(db,{month:item.reference});
      }

      case "saveExpense": {
        let item=payload.id?db.expenses.find(e=>e.id===payload.id):null;
        if(!item){item={id:uuid("DES")};db.expenses.push(item);}
        Object.assign(item,{description:payload.description||"Despesa",category:payload.category||"Outros",due:payload.due,value:Number(payload.value||0),status:payload.status||"Pendente",method:payload.method||"Pix",observation:payload.observation||""});
        item.paidAt=item.status==="Pago"?(payload.paidAt||item.paidAt||isoToday()):"";
        saveDb(db);return financeResult(db,{month:item.due.slice(0,7)});
      }

      case "payExpense": {
        const item=db.expenses.find(e=>e.id===payload.id);
        if(!item) throw new Error("Despesa não encontrada.");
        item.status="Pago";item.paidAt=payload.paidAt||isoToday();item.method=payload.method||item.method||"Pix";
        saveDb(db);return financeResult(db,{month:item.due.slice(0,7)});
      }

      case "deleteExpense": {
        const item=db.expenses.find(e=>e.id===payload.id);
        db.expenses=db.expenses.filter(e=>e.id!==payload.id);
        saveDb(db);return financeResult(db,{month:item?.due?.slice(0,7)||currentMonth()});
      }

      case "listUniforms":
        return {uniforms:db.athletes.map(a=>({athleteId:a.id,name:a.name,phone:a.phone,shirt:a.shirt,shortSize:a.shortSize||"",number:a.number||"",kit:Boolean(a.kit),deliveryDate:a.deliveryDate||""}))};

      case "saveUniform": {
        const athlete=db.athletes.find(a=>a.id===payload.athleteId);
        if(!athlete) throw new Error("Atleta não encontrado.");
        athlete.shirt=payload.shirt??athlete.shirt;athlete.shortSize=payload.shortSize??athlete.shortSize;athlete.number=payload.number??athlete.number;athlete.kit=Boolean(payload.kit);athlete.deliveryDate=athlete.kit?(payload.deliveryDate||isoToday()):"";
        saveDb(db);
        return {uniforms:db.athletes.map(a=>({athleteId:a.id,name:a.name,phone:a.phone,shirt:a.shirt,shortSize:a.shortSize||"",number:a.number||"",kit:Boolean(a.kit),deliveryDate:a.deliveryDate||""}))};
      }

      case "listDocuments":
        return {documents:db.documents.map(doc=>({...clone(doc),athleteName:doc.athleteId?(db.athletes.find(a=>a.id===doc.athleteId)?.name||""):"Institucional"}))};

      case "uploadDocument": {
        const athlete=db.athletes.find(a=>a.id===payload.athleteId);
        const doc={id:uuid("DOC"),athleteId:payload.athleteId||"",athleteName:athlete?.name||"",type:payload.type||"Documento",title:payload.title||payload.filename,filename:payload.filename,mimeType:payload.mimeType||"application/octet-stream",size:Number(payload.size||0),uploadDate:isoToday(),expiry:payload.expiry||"",status:"Ativo",content:payload.base64||""};
        db.documents.push(doc);saveDb(db);return {document:clone(doc)};
      }

      case "downloadDocument": {
        const doc=db.documents.find(d=>d.id===payload.id);
        if(!doc) throw new Error("Documento não encontrado.");
        const fallback=btoa(unescape(encodeURIComponent(`Documento demonstrativo: ${doc.title}\nArquivo real será armazenado no Google Drive.`)));
        return {filename:doc.filename||"documento.txt",mimeType:doc.content?doc.mimeType:"text/plain",base64:doc.content||fallback};
      }

      case "deleteDocument":
        db.documents=db.documents.filter(d=>d.id!==payload.id);saveDb(db);return {success:true};

      case "listMedia":
        return {media:clone(db.media)};

      case "saveMedia": {
        let item=payload.id?db.media.find(m=>m.id===payload.id):null;
        if(!item){item={id:uuid("MID")};db.media.push(item);}
        Object.assign(item,{title:payload.title||"Registro",type:payload.type||"Link",category:payload.category||"Outros",url:payload.url||"",eventDate:payload.eventDate||isoToday(),description:payload.description||""});
        saveDb(db);return {media:clone(db.media)};
      }

      case "deleteMedia":
        db.media=db.media.filter(m=>m.id!==payload.id);saveDb(db);return {media:clone(db.media)};

      case "getSettings":
        return {settings:clone(db.settings)};

      case "saveSettings":
        Object.assign(db.settings,payload);saveDb(db);return {settings:clone(db.settings)};

      case "listUsers":
        return {users:db.users.map(publicUser)};

      case "saveUser": {
        let item=payload.id?db.users.find(u=>u.id===payload.id):null;
        let temporaryPassword="";
        if(!item){
          temporaryPassword=`Aabb@${Math.floor(1000+Math.random()*9000)}`;
          item={id:uuid("USR"),password:temporaryPassword,mustChangePassword:true,created:nowIso(),lastAccess:""};
          db.users.push(item);
        }
        Object.assign(item,{name:payload.name,email:String(payload.email||"").toLowerCase(),profile:payload.profile||"TREINADOR",status:payload.status||"Ativo"});
        saveDb(db);return {user:publicUser(item),temporaryPassword};
      }

      case "resetUserPassword": {
        const item=db.users.find(u=>u.id===payload.id);
        if(!item) throw new Error("Usuário não encontrado.");
        const temporaryPassword=`Aabb@${Math.floor(1000+Math.random()*9000)}`;
        item.password=temporaryPassword;item.mustChangePassword=true;saveDb(db);
        return {temporaryPassword};
      }

      case "reportData": {
        const type=payload.type||"Atletas ativos";
        if(type==="Atletas ativos") return {title:type,columns:["Atleta","Categoria","Responsável","Telefone","Status"],rows:db.athletes.filter(a=>a.status==="Ativo").map(a=>[a.name,a.category,a.guardian,a.phone,a.status]),summary:{total:db.athletes.filter(a=>a.status==="Ativo").length}};
        if(type==="Frequência mensal") {
          const category=payload.category||"Sub-15";const result=attendanceResult(db,{category,date:`${payload.month||currentMonth()}-01`});
          return {title:`${type} — ${category}`,columns:["Atleta","Treinos","Presenças","Faltas","Justificadas","Frequência"],rows:result.monthly.map(r=>[r.name,r.trainings,r.present,r.absent,r.justified,`${r.percentage}%`]),summary:{atletas:result.monthly.length}};
        }
        if(type==="Mensalidades") {
          const result=financeResult(db,{month:payload.month||currentMonth()});
          return {title:type,columns:["Atleta","Referência","Vencimento","Valor","Status"],rows:result.payments.map(p=>[p.athleteName,p.reference,p.due,p.value,p.status]),summary:result.summary};
        }
        if(type==="Uniformes") return {title:type,columns:["Atleta","Camisa","Short","Número","Kit"],rows:db.athletes.map(a=>[a.name,a.shirt,a.shortSize||"",a.number||"",a.kit?"Entregue":"Pendente"]),summary:{entregues:db.athletes.filter(a=>a.kit).length}};
        if(type==="Anamnese") return {title:type,columns:["Atleta","Condição de saúde","Alergias","Lesões","Restrições"],rows:db.athletes.map(a=>[a.name,a.health,a.allergies,a.injuries,a.restrictions]),summary:{total:db.athletes.length}};
        return {title:"Documentos",columns:["Título","Tipo","Atleta","Envio","Validade"],rows:db.documents.map(d=>[d.title,d.type,d.athleteName||"Institucional",d.uploadDate,d.expiry||"—"]),summary:{total:db.documents.length}};
      }

      case "resetDemo": {
        const seeded=seedDatabase();saveDb(seeded);sessionStorage.removeItem(SESSION_KEY);return {success:true};
      }

      default:
        throw new Error(`Ação de demonstração não implementada: ${action}`);
    }
  }

  return {
    call,
    getStoredToken: () => sessionStorage.getItem(SESSION_KEY) || "",
    setStoredToken: token => sessionStorage.setItem(SESSION_KEY, token),
    clearStoredToken: () => sessionStorage.removeItem(SESSION_KEY)
  };
})();
