// ==========================================================
// 🧠 BÚNKER SCADA ORACLE - MOTOR PRO V16.5 (STRICT CORE)
// ==========================================================

const BYRON_EMAIL = "bvhcc94@gmail.com"; 
const SUELDO_BASE_DEFAULT = 3602505;

let listaMovimientos = [], sueldosHistoricos = {}; 
let chartBD = null, chartDiario = null, chartP = null, chartRadar = null;
window.totalTC = 0; window.VALOR_USD = 950; 

const catMaestras = [
    { id: "Gastos Fijos (Búnker)", em: "🏠", label: "Carga Fija" }, { id: "Infraestructura (Depto)", em: "🏢", label: "Infraestructura" },
    { id: "Flota & Movilidad", em: "🚙", label: "Vehículo" }, { id: "Alimentación & Supermercado", em: "🛒", label: "Supermercado" },
    { id: "Dopamina & Antojos", em: "🍔", label: "Fugas (Dopamina)" }, { id: "Transferencia Propia / Ahorro", em: "🏦", label: "Ahorro" },
    { id: "Gasto Tarjeta de Crédito", em: "💳", label: "Compra TC" }, { id: "Cuentas por Cobrar (Activos)", em: "💸", label: "Me Deben" }
];

// 🚀 LÓGICA DE BOTONES MACRO PRO
window.aplicarMacro = function(tipo) {
    const n = document.getElementById('inputNombre'), c = document.getElementById('inputCategoria'), m = document.getElementById('inputMonto'), f = document.getElementById('inputFuga');
    if(tipo === 'cajero') { n.value = "Giro Cajero"; c.value = "Transferencia Propia / Ahorro"; if(f) f.value = "0"; }
    else if(tipo === 'super') { n.value = "Supermercado"; c.value = "Alimentación & Supermercado"; if(f) f.value = "0"; }
    else if(tipo === 'antojo') { n.value = "Snack / Delivery"; c.value = "Dopamina & Antojos"; if(f) f.value = "100"; }
    
    // Forzamos "Gasto" por defecto a menos que sea Cajero
    const t = document.getElementById('inputTipo');
    if(t) t.value = tipo === 'cajero' ? "Ahorro" : "Gasto";

    if(m) m.focus();
    window.mostrarToast("MACRO " + tipo.toUpperCase() + " LISTO");
};

window.mostrarToast = function(m) { 
    let t = document.getElementById('toast-notif');
    if(!t) {
        t = document.createElement('div'); t.id = 'toast-notif';
        t.style.cssText = 'position:fixed; bottom:110px; left:50%; transform:translateX(-50%); background:rgba(46,160,67,0.95); color:#fff; padding:12px 28px; border-radius:30px; font-weight:900; font-size:0.85rem; font-family:monospace; z-index:99999; transition:all 0.4s; text-transform:uppercase; border: 2px solid #2ea043; opacity:0; pointer-events:none;';
        document.body.appendChild(t);
    }
    t.innerHTML = '⚡ ' + m; t.style.opacity = '1'; setTimeout(() => t.style.opacity = '0', 3000);
};

window.formatearEntradaNumerica = function(i) { let v = i.value.replace(/\D/g,''); i.value = v ? parseInt(v).toLocaleString('es-CL') : ''; };
setInterval(() => { const c = document.getElementById('cronos'); if(c) c.innerText = new Date().toLocaleString('es-CL').toUpperCase(); }, 1000);

document.addEventListener("DOMContentLoaded", async () => {
    try { let response = await fetch('https://mindicador.cl/api/dolar'); let data = await response.json(); if(data && data.serie && data.serie.length > 0) window.VALOR_USD = data.serie[0].valor; } catch(e) { window.VALOR_USD = 950; }
    const opts = catMaestras.map(c => `<option value="${c.id}">${c.em} ${c.label}</option>`).join('');
    const sel = document.getElementById('inputCategoria'); if(sel) sel.innerHTML = opts;
    const selMass = document.getElementById('massCategorySelect'); if(selMass) selMass.innerHTML = `<option value="">-- Recategorizar --</option>` + opts;
});

// FIREBASE
firebase.initializeApp({ apiKey: "AIzaSyBiYETN_JipXWhMq9gKz-2Pap-Ce4ZJNAI", authDomain: "finanzas-bcuevas.firebaseapp.com", projectId: "finanzas-bcuevas" });
const db = firebase.firestore(), auth = firebase.auth();

window.loginWithGoogle = function() { const p = new firebase.auth.GoogleAuthProvider(); auth.signInWithPopup(p).catch(() => auth.signInWithRedirect(p)); };
window.logout = function() { auth.signOut().then(() => window.location.reload()); };

auth.onAuthStateChanged(user => {
    if (user && user.email.toLowerCase() === BYRON_EMAIL.toLowerCase()) {
        const loginScreen = document.getElementById('login-screen'), reportZone = document.getElementById('reportZone');
        if(loginScreen) loginScreen.style.display = 'none'; if(reportZone) reportZone.style.display = 'flex';
        const userDisplay = document.getElementById('user-display'); if(userDisplay) userDisplay.innerText = user.displayName.split(" ")[0];
        
        db.collection("parametros").doc("sueldos").onSnapshot(s => { if(s.exists) sueldosHistoricos = s.data(); });
        db.collection("movimientos").onSnapshot(s => {
            listaMovimientos = [];
            s.forEach(doc => { let d = doc.data(); d.firestoreId = doc.id; d.fechaISO = d.fecha?.toDate ? d.fecha.toDate().toISOString() : (d.fecha || new Date().toISOString()); d.monto = Number(d.monto) || 0; listaMovimientos.push(d); });
            window.aplicarCicloAlSistema();
        });
        window.inicializarListenerTC();
    } else if(user) { auth.signOut(); alert("⛔ DENEGADO"); }
});

window.calcularFechasCiclo = function(mesConceptual, anio) {
    let mesInicio = mesConceptual - 1; let anioInicio = anio; if (mesInicio < 0) { mesInicio = 11; anioInicio--; }
    let T0 = new Date(anioInicio, mesInicio, 30); if (T0.getMonth() !== mesInicio) T0 = new Date(anioInicio, mesInicio + 1, 0); 
    let TFinal = new Date(anio, mesConceptual, 30); if (TFinal.getMonth() !== mesConceptual) TFinal = new Date(anio, mesConceptual + 1, 0);
    return { T0, TFinal, fechaFinVisual: new Date(TFinal.getTime() - 86400000) };
};

window.obtenerSueldoMes = function(a, m) { return sueldosHistoricos[`${a}_${m}`] || SUELDO_BASE_DEFAULT; };

window.aplicarCicloAlSistema = function() {
    const navMes = document.getElementById('navMesConceptual'), navAnio = document.getElementById('navAnio'); if(!navMes || !navAnio) return;
    const { T0, fechaFinVisual } = window.calcularFechasCiclo(parseInt(navMes.value), parseInt(navAnio.value));
    const badge = document.getElementById('navRangoBadge'); if(badge) badge.innerText = `[${T0.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}).toUpperCase()} - ${fechaFinVisual.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}).toUpperCase()}]`;
    const elSueldo = document.getElementById('inputSueldo'); if(elSueldo && document.activeElement !== elSueldo) { elSueldo.value = window.obtenerSueldoMes(parseInt(navAnio.value), parseInt(navMes.value)).toLocaleString('es-CL'); elSueldo.setAttribute('data-mes-ancla', navMes.value); elSueldo.setAttribute('data-anio-ancla', navAnio.value); }
    window.actualizarDashboard();
};

window.guardarSueldoEnNube = function() {
    const elSueldo = document.getElementById('inputSueldo'); if(!elSueldo) return;
    let m = parseInt(elSueldo.getAttribute('data-mes-ancla')), a = parseInt(elSueldo.getAttribute('data-anio-ancla')), s = parseInt(elSueldo.value.replace(/\./g, '')); 
    if (isNaN(m) || isNaN(a) || isNaN(s) || s <= 0) return;
    sueldosHistoricos[`${a}_${m}`] = s;
    db.collection("parametros").doc("sueldos").set({ [`${a}_${m}`]: s }, {merge: true}).then(() => { window.mostrarToast(`SUELDO GUARDADO`); window.actualizarDashboard(); });
};

// 🧠 PRO ENGINE: ACTUALIZAR DASHBOARD CON ARRASTRE Y 5 CARDS
window.actualizarDashboard = function() {
    const elM = document.getElementById('navMesConceptual'), elA = document.getElementById('navAnio');
    if(!elM || !elA) return;
    const mes = parseInt(elM.value), anio = parseInt(elA.value);
    const sueldo = window.obtenerSueldoMes(anio, mes);
    
    // Cálculo de Arrastre (Carry-over)
    let mesPrev = mes - 1; let anioPrev = anio; if(mesPrev < 0) { mesPrev = 11; anioPrev--; }
    const prevFechas = window.calcularFechasCiclo(mesPrev, anioPrev);
    let balancePrev = window.obtenerSueldoMes(anioPrev, mesPrev);
    
    listaMovimientos.forEach(x => {
        let d = new Date(x.fechaISO);
        if(d >= prevFechas.T0 && d <= prevFechas.TFinal && x.categoria !== 'Gasto Tarjeta de Crédito') {
            if(x.tipo === 'Ingreso' || x.categoria === 'Transferencia Recibida') balancePrev += x.monto; 
            else if(x.tipo !== 'Por Cobrar' && x.tipo !== 'Ahorro' && x.categoria !== 'Transferencia Propia / Ahorro') balancePrev -= x.monto;
        }
    });
    
    const arrastre = balancePrev < 0 ? Math.abs(balancePrev) : 0;
    const elArr = document.getElementById('txtArrastreLinea'); if(elArr) elArr.innerText = arrastre.toLocaleString('es-CL');
    const cardArr = document.getElementById('cardArrastre'); if(cardArr) cardArr.style.display = arrastre > 0 ? 'block' : 'none';

    let saldoAcc = sueldo - arrastre, tF = 0, tO = 0, gCat = {};
    const { T0, TFinal } = window.calcularFechasCiclo(mes, anio);
    
    let dataMes = listaMovimientos.filter(x => { let d = new Date(x.fechaISO); return d >= T0 && d <= TFinal; });
    dataMes.forEach(x => {
        if(x.categoria !== 'Gasto Tarjeta de Crédito') {
            if(x.tipo === 'Ingreso' || x.categoria === 'Transferencia Recibida') saldoAcc += x.monto;
            else if(x.tipo !== 'Por Cobrar' && x.tipo !== 'Ahorro' && x.categoria !== 'Transferencia Propia / Ahorro') {
                saldoAcc -= x.monto;
                if(x.tipo === 'Gasto Fijo' || x.categoria === 'Infraestructura (Depto)' || x.categoria === 'Flota & Movilidad') tF += x.monto; 
                else tO += x.monto;
                gCat[x.categoria] = (gCat[x.categoria] || 0) + x.monto;
            }
        }
    });

    const setTxt = (id, v) => { const el = document.getElementById(id); if(el) el.innerText = v.toLocaleString('es-CL'); };
    setTxt('txtSaldo', saldoAcc); setTxt('txtTotalFijos', tF); setTxt('txtTotalOtros', tO);
    if(document.getElementById('txtProyectado')) document.getElementById('txtProyectado').innerText = (saldoAcc - window.totalTC).toLocaleString('es-CL');
    
    window.renderizarListas(sueldo - arrastre);
    window.dibujarGraficos(sueldo - arrastre, dataMes, gCat, Math.max(1, Math.round((TFinal - T0) / 86400000)), T0);
};

window.renderizarListas = function(base) {
    const b = document.getElementById('inputBuscador') ? document.getElementById('inputBuscador').value.toLowerCase() : '';
    let datos = listaMovimientos.filter(x => { let d = new Date(x.fechaISO); const { T0, TFinal } = window.calcularFechasCiclo(parseInt(document.getElementById('navMesConceptual').value), parseInt(document.getElementById('navAnio').value)); return d >= T0 && d <= TFinal && x.categoria !== 'Gasto Tarjeta de Crédito'; });
    if(b) datos = datos.filter(x => x.nombre?.toLowerCase().includes(b) || x.categoria.toLowerCase().includes(b));
    
    datos.sort((a,b)=>a.fechaISO < b.fechaISO ? -1 : 1);
    const pc = document.getElementById('listaDetalle'), mov = document.getElementById('listaMovilDetalle');
    let hPC = '', hMov = '', sR = base;
    
    datos.forEach(x => {
        if(x.tipo === 'Ingreso' || x.categoria === 'Transferencia Recibida') sR += x.monto; else if(x.tipo !== 'Por Cobrar' && x.tipo !== 'Ahorro' && x.categoria !== 'Transferencia Propia / Ahorro') sR -= x.monto;
        hPC = `<tr><td style="text-align: center;"><input type="checkbox" class="row-check" value="${x.firestoreId}" onchange="window.updateMassActions()"></td><td>${new Date(x.fechaISO).toLocaleDateString('es-CL')}</td><td style="font-weight:bold;">${x.nombre}</td><td><span style="font-size:0.65rem; padding:2px 6px; border-radius:4px; background:rgba(255,255,255,0.05); border:1px solid var(--border-color);">${x.categoria}</span></td><td style="text-align:right; font-family:monospace; color:${x.tipo==='Ingreso'||x.categoria==='Transferencia Recibida'?'var(--color-ingresos)':(x.tipo==='Ahorro'||x.tipo==='Por Cobrar'?'#d29922':'var(--text-main)')};">$${x.monto.toLocaleString()}</td><td style="text-align:right; font-family:monospace; color:var(--text-muted);">$${sR.toLocaleString()}</td><td style="text-align:center;"><button style="background:transparent; border:none; cursor:pointer;" onclick="window.editarMovimiento('${x.firestoreId}')">✏️</button></td></tr>` + hPC;
        const icon = window.obtenerIconoVisual(x.nombre, catEmojis[x.categoria] || "❓");
        hMov = `<div class="mobile-card" onclick="window.editarMovimiento('${x.firestoreId}')" style="background:var(--bg-panel); border:1px solid var(--border-color); padding:12px; border-radius:12px; display:flex; margin-bottom:8px; align-items:center;">
                    <div style="font-size:1.5rem; margin-right:12px; width:40px; height:40px; display:flex; justify-content:center; align-items:center; background:var(--bg-elevated); border-radius:50%;">${icon}</div>
                    <div style="flex:1; min-width:0;"><div style="font-weight:bold; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${x.nombre}</div><div style="font-size:0.7rem; color:var(--text-dim);">${new Date(x.fechaISO).toLocaleDateString('es-CL', {day:'2-digit', month:'2-digit'})} • ${x.categoria}</div></div>
                    <div style="text-align:right;"><div style="font-family:monospace; font-weight:bold; font-size:1.1rem; color:${x.tipo==='Ingreso'||x.categoria==='Transferencia Recibida'?'var(--color-ingresos)':(x.tipo==='Ahorro'||x.tipo==='Por Cobrar'?'#d29922':'white')};">$${Math.round(x.monto/1000)}k</div></div>
                </div>` + hMov;
    });
    if(pc) pc.innerHTML = hPC; if(mov) mov.innerHTML = hMov;
};

function obtenerIconoVisual(nombre, emojiFallback) {
    let n = (nombre||"").toLowerCase();
    for (let marca in logosComerciales) if (n.includes(marca)) return `<img src="https://logo.clearbit.com/${logosComerciales[marca]}?size=100" style="width:100%; height:100%; object-fit:cover; border-radius:50%; background:white;" onerror="this.outerHTML='<span style=\\'font-size:1.2rem;\\'>${emojiFallback}</span>'">`;
    return `<span style="font-size:1.2rem;">${emojiFallback}</span>`;
}

// ⌨️ ESCAPE LISTENER
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.cerrarPreVuelo();
        const h = document.getElementById('modal-historian'); if(h) h.style.display = 'none';
        if(typeof window.closeBottomSheet === 'function') window.closeBottomSheet();
    }
});

window.abrirPreVuelo = function() {
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio');
    const nombresMes = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const lbl = document.getElementById('pv-mes-label'); if(lbl && elMes) lbl.innerText = `${nombresMes[parseInt(elMes.value)]} ${elAnio.value}`;
    const sInput = document.getElementById('inputSueldo'), pSueldo = document.getElementById('pv-sueldo');
    if(pSueldo) pSueldo.value = sInput && sInput.value ? sInput.value : "3.602.505";
    window.calcularDiaCero(); document.getElementById('modal-dia-cero').style.display = 'flex';
};
window.cerrarPreVuelo = function() { document.getElementById('modal-dia-cero').style.display = 'none'; };

window.calcularDiaCero = function() {
    const val = (id) => parseInt((document.getElementById(id)?.value || "0").replace(/\./g, '')) || 0;
    let tcIntUSD = val('pv-tc-int');
    let tcIntCLP = Math.round(tcIntUSD * (isNaN(window.VALOR_USD) ? 950 : window.VALOR_USD));
    const lblInt = document.getElementById('pv-tc-int-clp'); if(lblInt) lblInt.innerText = `~ $${tcIntCLP.toLocaleString('es-CL')} CLP`;

    let sueldo = val('pv-sueldo');
    let deudas = val('pv-tc-nac') + tcIntCLP;
    let estruc = val('pv-arriendo') + val('pv-udec') + val('pv-cae');
    document.getElementById('pv-txt-liquidez').innerText = (sueldo - deudas - estruc).toLocaleString('es-CL');
};

window.ejecutarArranque = function() {
    if(!confirm("⚠️ INYECCIÓN CRÍTICA V16.5\n\n¿Inyectar Planilla Operativa en la Matriz?")) return;
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio'); let fechaDestino = new Date(parseInt(elAnio.value), parseInt(elMes.value), 1, 10, 0, 0);
    const batch = db.batch(); let inyectados = 0;
    
    const procesar = (idInput, nombre, cat) => {
        let el = document.getElementById(idInput); if (!el) return; 
        let monto = (idInput === 'pv-tc-int') ? Math.round((parseInt(el.value.replace(/\./g, '')) || 0) * (isNaN(window.VALOR_USD) ? 950 : window.VALOR_USD)) : (parseInt(el.value.replace(/\./g, '')) || 0);
        if (monto > 0) { batch.set(db.collection("movimientos").doc(), { monto: monto, nombre: nombre, categoria: cat, tipo: "Gasto Fijo", fecha: fechaDestino, status: 'Estimado', innecesarioPct: 0, cuotas: 1 }); inyectados++; }
    };
    
    procesar('pv-tc-nac', "PAGO TC NACIONAL (DÍA CERO)", "Gastos Fijos (Búnker)"); procesar('pv-tc-int', "PAGO TC INTERNACIONAL (DÍA CERO)", "Gastos Fijos (Búnker)"); procesar('pv-arriendo', "ARRIENDO / DIVIDENDO", "Infraestructura (Depto)"); procesar('pv-udec', "PAGO UDEC 2024", "Infraestructura (Depto)"); procesar('pv-cae', "PAGO CAE", "Infraestructura (Depto)");
    if (inyectados > 0) { batch.commit().then(() => { window.cerrarPreVuelo(); window.mostrarToast(`ARRANQUE COMPLETADO: ${inyectados} INYECTADOS.`); window.actualizarDashboard(); }); } else { alert("No se inyectaron registros."); window.cerrarPreVuelo(); }
};

window.editarMovimiento = function(id) {
    const mov = listaMovimientos.find(m => m.firestoreId === id); if(!mov) return;
    if(document.getElementById('editId')) document.getElementById('editId').value = mov.firestoreId; 
    if(document.getElementById('inputNombre')) document.getElementById('inputNombre').value = mov.nombre;
    if(document.getElementById('inputMonto')) document.getElementById('inputMonto').value = mov.monto.toLocaleString('es-CL');
    if(document.getElementById('inputCategoria')) document.getElementById('inputCategoria').value = mov.categoria || 'Sin Categoría';
    let tipoC = mov.tipo || 'Gasto'; if (mov.categoria === 'Transferencia Recibida') tipoC = 'Ingreso'; if (mov.categoria === 'Transferencia Propia / Ahorro') tipoC = 'Ahorro';
    if(document.getElementById('inputTipo')) document.getElementById('inputTipo').value = tipoC;
    try { let d = new Date(mov.fechaISO); let dLocal = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16); if(document.getElementById('inputFecha')) document.getElementById('inputFecha').value = dLocal; } catch(e) {}
    modoEdicionActivo = true; window.scrollTo(0,0);
};

window.agregarMovimiento = function() {
    const m = parseInt(document.getElementById('inputMonto').value.replace(/\./g, '')); const n = document.getElementById('inputNombre').value; const c = document.getElementById('inputCategoria').value; const t = document.getElementById('inputTipo') ? document.getElementById('inputTipo').value : "Gasto"; const fInput = document.getElementById('inputFecha').value; const editId = document.getElementById('editId').value;
    const iFugaEl = document.getElementById('inputFuga'); const pctFuga = iFugaEl ? parseInt(iFugaEl.value) : (catEvitables.includes(c) ? 100 : 0);

    if (!m || !n || !fInput) return window.mostrarToast("⚠️ FALTAN PARÁMETROS");
    const dataPayload = { nombre: n, monto: m, categoria: c, tipo: t, fecha: new Date(fInput), status: 'Manual', innecesarioPct: pctFuga, cuotas: 1 };
    
    let op = (modoEdicionActivo && editId) ? db.collection("movimientos").doc(editId).update(dataPayload) : db.collection("movimientos").add(dataPayload);
    op.then(() => {
        if(document.getElementById('editId')) document.getElementById('editId').value = ''; 
        if(document.getElementById('inputNombre')) document.getElementById('inputNombre').value = ''; 
        if(document.getElementById('inputMonto')) document.getElementById('inputMonto').value = '';
        modoEdicionActivo = false; window.mostrarToast("REGISTRO CONFIRMADO");
    }).catch(err => alert("❌ Error: " + err.message));
};

window.toggleAllChecks = function() { const checkEl = document.getElementById('checkAll'); if(!checkEl) return; const check = checkEl.checked; document.querySelectorAll('.row-check').forEach(cb => cb.checked = check); window.updateMassActions(); };
window.updateMassActions = function() { const bar = document.getElementById('massActionsBar'); if(!bar) return; const cnt = document.querySelectorAll('.row-check:not(#checkAll):checked').length; bar.style.display = cnt > 0 ? 'flex' : 'none'; document.getElementById('massCount').innerText = `${cnt} SEL`; if(cnt === 0) document.getElementById('checkAll').checked = false; };
window.massDelete = function() { const ids = Array.from(document.querySelectorAll('.row-check:not(#checkAll):checked')).map(cb => cb.value); if(ids.length === 0 || !confirm(`⚠️ ¿Eliminar ${ids.length} registro(s)?`)) return; Promise.all(ids.map(id => db.collection("movimientos").doc(id).delete())).then(() => { document.getElementById('massActionsBar').style.display = 'none'; document.getElementById('checkAll').checked = false; window.mostrarToast("ELIMINADOS"); }); };
window.massCategorize = function() { const ids = Array.from(document.querySelectorAll('.row-check:not(#checkAll):checked')).map(cb => cb.value); const cat = document.getElementById('massCategorySelect').value; if(ids.length === 0 || !cat || !confirm(`¿Categorizar como "${cat}"?`)) return; Promise.all(ids.map(id => db.collection("movimientos").doc(id).update({categoria: cat}))).then(() => { document.getElementById('massActionsBar').style.display = 'none'; document.getElementById('checkAll').checked = false; document.getElementById('massCategorySelect').value = ''; window.mostrarToast("RECATEGORIZADOS"); }); };

window.inicializarListenerTC = function() {
    db.collection("deuda_tc").orderBy("mesCobro", "asc").onSnapshot(snap => {
        window.totalTC = 0; let hTC = '';
        snap.forEach(doc => { let d = doc.data(); window.totalTC += d.monto; hTC += `<tr><td>${d.cuota}</td><td>${d.nombre}</td><td style="text-align:right;">$${d.monto.toLocaleString()}</td></tr>`; });
        if(document.getElementById('listaDetalleTC')) document.getElementById('listaDetalleTC').innerHTML = hTC;
        if(document.getElementById('txtTotalTC')) document.getElementById('txtTotalTC').innerText = window.totalTC.toLocaleString('es-CL');
        window.actualizarDashboard();
    });
};

window.cargarCSV_TC = function() {
    let fileInputTC = document.createElement('input'); fileInputTC.type = 'file'; fileInputTC.accept = '.csv';
    fileInputTC.onchange = e => {
        let file = e.target.files[0]; let esFacturado = confirm("💳 PARÁMETRO DE INGESTA\n\n¿Corresponde a movimientos FACTURADOS?");
        let reader = new FileReader();
        reader.onload = async ev => {
            try {
                let text = ev.target.result; let lineas = text.split('\n'); let batch = db.batch(); let cuotasProcesadas = 0;
                for(let i = 1; i < lineas.length; i++) {
                    if(lineas[i].trim() === '') continue; let separador = lineas[i].includes(';') ? ';' : ','; let cols = lineas[i].split(separador); if(cols.length < 4) continue; 
                    let fecha = cols[0].trim(); let nombre = cols[1].trim().replace(/\s+/g, ' ').toUpperCase(); 
                    let colCuotas = cols.find(c => c.includes('/') && c.length <= 5) || "01/01"; let cuotasInfo = colCuotas.trim().split('/'); 
                    let montoStr = cols[cols.length - 1].replace(/[^0-9-]/g, ''); if(!montoStr && cols.length > 1) montoStr = cols[cols.length - 2].replace(/[^0-9-]/g, '');
                    let montoTotal = parseInt(montoStr);
                    if(isNaN(montoTotal) || montoTotal <= 0 || nombre.includes("REV.COMPRAS") || nombre.includes("PAGO PESOS") || nombre.includes("TEF")) continue;
                    let cuotaActual = parseInt(cuotasInfo[0]) || 1; let totalCuotas = parseInt(cuotasInfo[1]) || 1; let montoMensual = totalCuotas > 1 ? Math.round(montoTotal / totalCuotas) : montoTotal;
                    let partesF = fecha.replace(/-/g, '/').split('/'); if (partesF.length !== 3) continue; 
                    let fechaCompra = new Date(partesF[2], partesF[1] - 1, partesF[0]); let hoy = new Date();
                    for(let c = cuotaActual; c <= totalCuotas; c++) {
                        let fechaCobro; if (esFacturado) fechaCobro = new Date(hoy.getFullYear(), hoy.getMonth() + (c - cuotaActual), 15); else { let mesesDesfase = totalCuotas > 1 ? 2 : 1; fechaCobro = new Date(fechaCompra); fechaCobro.setMonth(fechaCobro.getMonth() + mesesDesfase + (c - cuotaActual)); }
                        let docId = `${fecha.replace(/[^0-9]/g, '')}-${nombre.replace(/[^A-Z0-9]/g, '').substring(0,10)}-C${c}de${totalCuotas}`;
                        batch.set(db.collection("deuda_tc").doc(docId), { nombre: nombre, monto: montoMensual, cuota: `${c}/${totalCuotas}`, mesCobro: fechaCobro.toISOString(), status: esFacturado ? "Facturado" : "Proyectado" }); cuotasProcesadas++;
                    }
                }
                if (cuotasProcesadas > 0) { await batch.commit(); window.mostrarToast(`${cuotasProcesadas} INYECTADAS`); } else alert("⚠️ RECHAZO:\nNo hay cuotas válidas.");
            } catch (error) { alert("❌ SYS ERROR: " + error.message); }
        }; reader.readAsText(file, 'UTF-8');
    }; fileInputTC.click();
};

window.enviarReporteTelegram = async function() {
    const botToken = "TU_TOKEN_AQUI"; const chatId = "TU_CHAT_ID_AQUI";
    if(botToken === "TU_TOKEN_AQUI") return window.mostrarToast("⚠️ Configura el Bot en motor.js");
    const msj = `🤖 *REPORTE BÚNKER*\n💰 Saldo: $${document.getElementById('txtSaldo').innerText}\n💳 Proyectado: $${document.getElementById('txtProyectado').innerText}`;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({chat_id: chatId, text: msj, parse_mode: 'Markdown'}) });
    window.mostrarToast("TRANSMISIÓN ENVIADA");
};

window.exportarDataLink = function() { let csv = "ISO_DATE,CATEGORY,TYPE,AMOUNT_CLP,DETAIL\n"; datosMesGlobal.forEach(x => { let detailSafe = (x.nombre || "Unknown").replace(/(\r\n|\n|\r)/gm, " ").replace(/"/g, '""').trim(); csv += `${x.fechaISO},"${x.categoria}","${x.tipo}",${x.monto},"${detailSafe}"\n`; }); try { const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Bunker_DataLink_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(link); link.click(); document.body.removeChild(link); } catch (e) { console.error(e); } };

window.dibujarGraficos = function(s, data, cats, diasCiclo, T0) {
    if(typeof Chart === 'undefined') return;
    if(chartBD) chartBD.destroy(); if(chartDiario) chartDiario.destroy(); if(chartP) chartP.destroy(); if(chartRadar) chartRadar.destroy();
    
    let daily = Array(diasCiclo + 1).fill(0), msT0 = T0.getTime();
    data.forEach(m => { let diff = Math.floor((new Date(m.fechaISO).getTime() - msT0) / 86400000) + 1; if(diff >= 1 && diff <= diasCiclo && m.tipo !== 'Ingreso' && m.categoria !== 'Transferencia Recibida' && m.categoria !== 'Transferencia Propia / Ahorro' && m.tipo !== 'Por Cobrar') daily[diff] += m.monto; });

    let actual = [s], acc = s, labelsX = ["INI"];
    for(let i=1; i<=diasCiclo; i++) { acc -= daily[i]; actual.push(acc); labelsX.push(i); }

    const cT = "#e6edf3", cG = "#21262d";
    const ctxBD = document.getElementById('chartBurnDown');
    if(ctxBD) chartBD = new Chart(ctxBD, { type: 'line', data: { labels: labelsX, datasets: [{ label: 'Consumo Real', data: actual, borderColor: '#1f6feb', borderWidth: 2, pointRadius: 0 }] }, options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{color:cG},ticks:{color:cT}},y:{grid:{color:cG},ticks:{color:cT}}} } });

    const ctxDiario = document.getElementById('chartDiario');
    if(ctxDiario) chartDiario = new Chart(ctxDiario, { type: 'bar', data: { labels: labelsX.slice(1), datasets: [{ label: 'Gasto Diario', data: daily.slice(1), backgroundColor: 'rgba(31, 111, 235, 0.6)' }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales:{x:{grid:{display:false},ticks:{color:cT}},y:{grid:{color:cG},ticks:{color:cT}}} } });
    
    const ctxPareto = document.getElementById('chartPareto');
    if(ctxPareto && cats) {
        const sorted = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,6);
        chartP = new Chart(ctxPareto, { type: 'doughnut', data: { labels: sorted.map(c => c[0]), datasets: [{ data: sorted.map(c => c[1]), backgroundColor: ['#1f6feb', '#2ea043', '#d29922', '#ff5252', '#a371f7', '#00bcd4'], borderWidth: 1, borderColor: '#030508' }] }, options: { maintainAspectRatio:false, plugins:{legend:{position: 'right', labels:{color:cT, font:{size:9}}}} } });
    }
};
