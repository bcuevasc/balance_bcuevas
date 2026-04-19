// ==========================================================
// 🧠 BÚNKER SCADA - MOTOR LÓGICO V7.6 (HOTFIX FINAL ERGONOMÍA)
// ==========================================================
const BYRON_EMAIL = "bvhcc94@gmail.com"; 
const CREDIT_SETPOINT = -300000; 
const catEvitables = ["Dopamina & Antojos"]; 

const catMaestras = [
    { id: "Gastos Fijos (Búnker)", em: "🏠", label: "Gastos Fijos" },
    { id: "Suscripciones", em: "📱", label: "Suscripciones" },
    { id: "Alimentación & Supermercado", em: "🛒", label: "Alimentación Base" },
    { id: "Dopamina & Antojos", em: "🍔", label: "Dopamina & Antojos" },
    { id: "Ocio & Experiencias", em: "🎸", label: "Ocio & Experiencias" },
    { id: "Transporte & Logística", em: "🚗", label: "Transporte & Log." },
    { id: "Mantenimiento Hardware (Salud)", em: "💊", label: "Salud" },
    { id: "Hogar & Búnker", em: "🛠️", label: "Hogar & Búnker" },
    { id: "Red de Apoyo (Familia)", em: "🫂", label: "Red de Apoyo" },
    { id: "Gasto Tarjeta de Crédito", em: "💳", label: "Gasto TC" },
    { id: "Transferencia Propia / Ahorro", em: "🏦", label: "Transf. Propia (Ahorro)" },
    { id: "Transferencia Recibida", em: "📲", label: "Transf. Recibida" },
    { id: "Ingreso Adicional", em: "💰", label: "Ingreso Extra" },
    { id: "Ruido de Sistema", em: "⚙️", label: "Ruido de Sistema" },
    { id: "Sin Categoría", em: "❓", label: "Sin Categoría" }
];

const catEmojis = {};
catMaestras.forEach(c => catEmojis[c.id] = c.em);

document.addEventListener("DOMContentLoaded", () => {
    const optionsHTML = catMaestras.map(c => `<option value="${c.id}">${c.em} ${c.label}</option>`).join('');
    const selectManual = document.getElementById('inputCategoria');
    if (selectManual) selectManual.innerHTML = optionsHTML;
    const selectMass = document.getElementById('massCategorySelect');
    if (selectMass) selectMass.innerHTML = `<option value="">-- Recategorizar a --</option>` + optionsHTML;
});

const logosComerciales = {
    "uber": "uber.com", "zapping": "zapping.com", "netflix": "netflix.com",
    "spotify": "spotify.com", "lider": "lider.cl", "jumbo": "jumbo.cl",
    "pedidosya": "pedidosya.com", "pedidos ya": "pedidosya.com", "pya": "pedidosya.com",
    "rappi": "rappi.cl", "copec": "ww2.copec.cl", "shell": "shell.cl", "mcdonald": "mcdonalds.com", 
    "starbucks": "starbucks.cl", "cruz verde": "cruzverde.cl", "sodimac": "sodimac.cl", 
    "mercadolibre": "mercadolibre.cl", "apple": "apple.com", "kupos": "kupos.cl"
};

function obtenerIconoVisual(nombre, emojiFallback) {
    if(!nombre) return `<span style="font-size:1.4rem;">${emojiFallback}</span>`;
    let n = nombre.toLowerCase();
    for (let marca in logosComerciales) {
        if (n.includes(marca)) {
            let url = `https://logo.clearbit.com/${logosComerciales[marca]}?size=100`;
            return `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; background: white;" onerror="this.outerHTML='<span style=\\'font-size:1.4rem;\\'>${emojiFallback}</span>'">`;
        }
    }
    return `<span style="font-size:1.4rem;">${emojiFallback}</span>`;
}

let bdDataMaster = null; 

firebase.initializeApp({
    apiKey: "AIzaSyBiYETN_JipXWhMq9gKz-2Pap-Ce4ZJNAI",
    authDomain: "finanzas-bcuevas.firebaseapp.com",
    projectId: "finanzas-bcuevas",
    storageBucket: "finanzas-bcuevas.firebasestorage.app"
});

const db = firebase.firestore();
const auth = firebase.auth();

let listaMovimientos = [];
let datosMesGlobal = []; 
let chartBD = null, chartP = null, chartDiario = null, chartRadar = null;
let currentSort = { column: 'fechaISO', direction: 'desc' }; 
let modoEdicionActivo = false;
let sueldosHistoricos = {}; 
const SUELDO_BASE_DEFAULT = 3602505;

function loginWithGoogle() { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
function logout() { auth.signOut().then(() => window.location.reload()); }

auth.onAuthStateChanged(user => {
    if (user && user.email.toLowerCase() === BYRON_EMAIL.toLowerCase()) {
        const loginScreen = document.getElementById('login-screen');
        const reportZone = document.getElementById('reportZone');
        if(loginScreen) loginScreen.style.display = 'none';
        if(reportZone) reportZone.classList.add('active-app');
        
        db.collection("parametros").doc("sueldos").onSnapshot(snap => {
            if(snap.exists) sueldosHistoricos = snap.data();
        });

        db.collection("movimientos").onSnapshot(snap => {
            listaMovimientos = [];
            snap.forEach(doc => {
                let d = doc.data(); d.firestoreId = doc.id;
                let fObj = new Date();
                if (d.fecha && d.fecha.toDate) fObj = d.fecha.toDate();
                else if (d.fecha) { let parsed = new Date(d.fecha); if (!isNaN(parsed.getTime())) fObj = parsed; }
                
                d.fechaISO = fObj.toISOString();
                d.monto = Number(d.monto) || 0;
                listaMovimientos.push(d);
            });
            aplicarCicloAlSistema();
        });
    }
});

function cargarSueldoVisual() {
    const elMes = document.getElementById('navMesConceptual');
    const elAnio = document.getElementById('navAnio');
    const elSueldo = document.getElementById('inputSueldo');
    if(!elMes || !elAnio || !elSueldo) return;
    const llave = `${elAnio.value}_${elMes.value}`;
    const sueldoActivo = sueldosHistoricos[llave] || SUELDO_BASE_DEFAULT;
    if (document.activeElement !== elSueldo) elSueldo.value = sueldoActivo.toLocaleString('es-CL');
}

function guardarSueldoEnNube() {
    const elMes = document.getElementById('navMesConceptual');
    const elAnio = document.getElementById('navAnio');
    const elSueldo = document.getElementById('inputSueldo');
    if(!elMes || !elAnio || !elSueldo) return;
    const llave = `${elAnio.value}_${elMes.value}`;
    const valor = parseInt(elSueldo.value.replace(/\./g,'')) || 0;
    elSueldo.style.color = "var(--color-saldo)"; 
    setTimeout(() => elSueldo.style.color = "inherit", 800);
    db.collection("parametros").doc("sueldos").set({ [llave]: valor }, { merge: true });
    actualizarDashboard();
}

function actualizarDashboard() {
    const inputSueldo = document.getElementById('inputSueldo');
    const sueldo = inputSueldo ? (parseInt(inputSueldo.value.replace(/\./g,'')) || 0) : SUELDO_BASE_DEFAULT;
    const buscador = document.getElementById('inputBuscador');
    const b = buscador ? buscador.value.toLowerCase() : '';
    const navMes = document.getElementById('navMesConceptual');
    const navAnio = document.getElementById('navAnio');
    const mesVal = navMes ? parseInt(navMes.value) : new Date().getMonth();
    const anioVal = navAnio ? parseInt(navAnio.value) : new Date().getFullYear();
    const { T0, TFinal, fechaFinVisual } = calcularFechasCiclo(mesVal, anioVal);
    
    let dataMes = listaMovimientos.filter(x => { let d = new Date(x.fechaISO); return d >= T0 && d < TFinal; });
    dataMes.forEach(x => {
        x.catV = x.categoria || 'Sin Categoría';
        if (x.monto <= 1000 && x.catV === 'Sin Categoría') x.catV = "Ruido de Sistema";
        x.esIn = x.tipo === 'Ingreso' || x.catV === 'Transferencia Recibida' || x.catV === 'Ingreso Adicional';
        x.esNeutro = x.tipo === 'Por Cobrar' || x.tipo === 'Ahorro' || x.catV === 'Transferencia Propia / Ahorro';
    });

    datosMesGlobal = [...dataMes];
    let saldoAcc = sueldo, tI = 0, tF = 0, tO = 0, tC = 0, tEvitable = 0, gCat = {};
    
    [...dataMes].sort((x,y) => x.fechaISO < y.fechaISO ? -1 : 1).forEach(x => {
        if (x.esIn) { tI += x.monto; saldoAcc += x.monto; }
        else if (x.tipo === 'Por Cobrar') tC += x.monto;
        else if (!x.esNeutro) {
            saldoAcc -= x.monto;
            if (x.tipo === 'Gasto Fijo') tF += x.monto; else tO += x.monto;
            gCat[x.catV] = (gCat[x.catV] || 0) + x.monto;
        }
        if (catEvitables.includes(x.catV)) tEvitable += x.monto;
    });

    const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val.toLocaleString('es-CL'); };
    setTxt('txtTotalFijos', tF); setTxt('txtTotalOtros', tO); setTxt('txtTotalIngresos', tI);
    setTxt('txtCxC', tC); setTxt('txtSaldo', saldoAcc);
    
    const saldoProyVal = saldoAcc + tC;
    const txtSaldoProy = document.getElementById('txtProyectado');
    if(txtSaldoProy) {
        if (saldoProyVal < CREDIT_SETPOINT) txtSaldoProy.innerHTML = '<span style="color:var(--color-fuga)">⚠️ ' + saldoProyVal.toLocaleString('es-CL') + '</span>';
        else txtSaldoProy.innerText = saldoProyVal.toLocaleString('es-CL');
    }

    const diasCiclo = Math.round((TFinal - T0) / 86400000);
    const hoy = new Date();
    let diasT = (hoy >= T0 && hoy < TFinal) ? Math.max(Math.floor((hoy - T0) / 86400000) + 1, 1) : (hoy >= TFinal ? diasCiclo : 0);
    
    const badgeDias = document.getElementById('badgeDias');
    if(badgeDias) badgeDias.innerText = `${Math.max(diasCiclo - diasT, 0)} DÍAS`;
    
    let proyC = saldoAcc - ((tO / Math.max(diasT, 1)) * Math.max(diasCiclo - diasT, 0));
    setTxt('txtProyeccionCierre', Math.round(proyC));

    const setW = (id, val) => { const el = document.getElementById(id); if(el) el.style.width = Math.min(val, 100) + "%"; };
    setW('barFijos', (tF / (sueldo || 1)) * 100); setW('barOtros', (tO / (sueldo || 1)) * 100);
    setTxt('txtTotalEvitable', tEvitable);
    const pctFugas = sueldo > 0 ? ((tEvitable / sueldo) * 100).toFixed(1) : 0;
    
    const txtPctFugas = document.getElementById('txtPorcentajeFugas');
    const barraEvitable = document.getElementById('barEvitable');
    if(txtPctFugas && barraEvitable) {
        txtPctFugas.innerText = pctFugas + '%'; barraEvitable.style.width = Math.min(pctFugas, 100) + "%";
        if (pctFugas < 5) { txtPctFugas.style.color = "var(--color-saldo)"; barraEvitable.style.backgroundColor = "var(--color-saldo)"; } 
        else if (pctFugas <= 10) { txtPctFugas.style.color = "#ff9800"; barraEvitable.style.backgroundColor = "#ff9800"; } 
        else { txtPctFugas.style.color = "var(--color-fuga)"; barraEvitable.style.backgroundColor = "var(--color-fuga)"; }
    }

    renderizarListas(sueldo, b);
    if(document.getElementById('chartBurnDown')) dibujarGraficos(sueldo, [...dataMes].sort((x,y) => x.fechaISO < y.fechaISO ? -1 : 1), gCat, diasCiclo, T0);
}    

function renderizarListas(sueldoBase, filtroBuscador) {
    let datos = [...datosMesGlobal];
    if (filtroBuscador) datos = datos.filter(x => x.nombre?.toLowerCase().includes(filtroBuscador) || x.catV.toLowerCase().includes(filtroBuscador));

    datos.sort((a, b) => {
        let valA = a[currentSort.column], valB = b[currentSort.column];
        if (currentSort.column === 'nombre' || currentSort.column === 'catV') { valA = valA?.toLowerCase() || ''; valB = valB?.toLowerCase() || ''; }
        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    let saldoRelativo = sueldoBase;
    datos.forEach((x, idx) => {
        x.indiceVista = datos.length - idx;
        if (x.esIn) saldoRelativo += x.monto; else if (!x.esNeutro) saldoRelativo -= x.monto;
        x.saldoCalculadoVista = saldoRelativo;
    });

    const contenedorPC = document.getElementById('listaDetalle'); 
    const contenedorMovil = document.getElementById('listaMovilDetalle');
    
    if (!contenedorMovil && !contenedorPC) return;

    if(datos.length === 0) {
        if(contenedorMovil) contenedorMovil.innerHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-dim);"><i>📡</i><br>Sin telemetría en este ciclo.</div>`;
        if(contenedorPC) contenedorPC.innerHTML = `<tr><td colspan="11" style="text-align:center;">Sin telemetría en este ciclo.</td></tr>`;
        return;
    }

    let htmlMovil = ''; let htmlPC = '';
    let currentDayGroup = ""; 
    
    const now = new Date();
    const todayStr = now.toLocaleDateString('es-CL');
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('es-CL');

    datos.forEach((x, idx) => {
        const d = new Date(x.fechaISO);
        const dateStr = d.toLocaleDateString('es-CL');
        const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        
        if (currentSort.column === 'fechaISO' && currentSort.direction === 'desc' && dateStr !== currentDayGroup) {
            let labelText = dateStr;
            if (dateStr === todayStr) labelText = "HOY";
            else if (dateStr === yesterdayStr) labelText = "AYER";
            else {
                const meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
                labelText = `${d.getDate()} ${meses[d.getMonth()]}`;
            }
            if (contenedorMovil) {
                htmlMovil += `<div class="date-header">${labelText}</div>`;
            }
            currentDayGroup = dateStr;
        }

        const em = catEmojis[x.catV] || "❓";
        const colorMonto = x.esIn ? "var(--color-ingresos)" : x.esNeutro ? "#ff9800" : "var(--text-main)";
        const iconoVisual = obtenerIconoVisual(x.nombre, em);
        const nombreSeguro = x.nombre || "Dato no identificado";
        const montoSeguro = (typeof x.monto === 'number' && !isNaN(x.monto)) ? x.monto : 0;
        const colorSaldo = x.saldoCalculadoVista < 0 ? 'var(--color-fuga)' : 'var(--text-muted)';
        let iconImpacto = x.esIn ? `<span class="impact-icon impact-pos">(+)</span>` : x.esNeutro ? `<span class="impact-icon impact-neu">(=)</span>` : `<span class="impact-icon impact-neg">(-)</span>`;
        let statusBadge = x.catV === 'Sin Categoría' ? `<span class="status-badge status-warn">REVISAR</span>` : `<span class="status-badge status-ok">OK</span>`;
        let editIdVal = document.getElementById('editId') ? document.getElementById('editId').value : '';
        let bgEdicion = (editIdVal === x.firestoreId) ? 'background-color: rgba(210, 153, 34, 0.15); border-left: 3px solid var(--color-edit);' : '';

        if (contenedorMovil) {
            const clickAction = typeof openBottomSheet === 'function' ? `openBottomSheet('${x.firestoreId}', '${nombreSeguro.replace(/'/g, "\\'")}', ${montoSeguro})` : `editarMovimiento('${x.firestoreId}')`;
            htmlMovil += `
            <div class="mobile-card" onclick="${clickAction}">
                <div style="width: 42px; height: 42px; margin-right: 15px; background: rgba(255,255,255,0.03); border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);">
                    ${iconoVisual}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight:bold; font-size:0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-main);">${nombreSeguro}</div>
                    <div style="font-size:0.7rem; color:var(--text-dim); margin-top:2px;">${timeStr} • ${x.catV}</div>
                </div>
                <div style="font-weight:900; color:${colorMonto}; flex-shrink: 0; font-size:1.05rem;">${x.esIn?'+':(x.esNeutro?'=':'-')}$${montoSeguro.toLocaleString('es-CL')}</div>
            </div>`;
        }
        
        if (contenedorPC) {
            htmlPC += `<tr style="${bgEdicion}" draggable="true" ondragstart="dragStart(event, '${x.firestoreId}')" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="dropRow(event, '${x.firestoreId}')">
                <td class="col-check hide-mobile"><input type="checkbox" class="row-check" value="${x.firestoreId}" onchange="updateMassActions()"></td>
                <td class="col-drag hide-mobile" style="cursor: grab; text-align: center; color: var(--text-muted); font-size: 1.2rem;">☰</td>
                <td class="hide-mobile" style="text-align:center; font-size:0.75rem; font-weight:800; color:var(--text-muted);">${x.indiceVista}</td>
                <td style="font-size:0.75rem; color:var(--text-muted);">${dateStr} <span class="col-hora">${timeStr}</span></td>
                <td class="col-desc" style="font-weight:700;" title="${nombreSeguro}">${nombreSeguro}</td>
                <td class="hide-mobile" style="font-size:0.75rem;"><span class="cat-badge">${em} ${x.catV}</span></td>
                <td class="col-monto" style="color:${colorMonto};">${iconImpacto}$${montoSeguro.toLocaleString('es-CL')}</td>
                <td class="col-monto hide-mobile" style="color:${colorSaldo};">$${x.saldoCalculadoVista.toLocaleString('es-CL')}</td>
                <td class="hide-mobile" style="text-align:center; font-size:0.7rem; color:var(--text-muted);">${catEvitables.includes(x.catV) ? '100%' : '0%'}</td>
                <td class="hide-mobile" style="text-align:center;">${statusBadge}</td>
                <td style="text-align:center; padding: 2px;"><button class="btn-sys" style="padding:4px; border-color:var(--color-edit); color:var(--color-edit);" onclick="editarMovimiento('${x.firestoreId}')">✏️<span class="btn-edit-text"> EDIT</span></button></td>
            </tr>`;
        }
    });

    if (contenedorMovil) contenedorMovil.innerHTML = htmlMovil;
    if (contenedorPC) contenedorPC.innerHTML = htmlPC;
}

function sortTable(column) {
    if (currentSort.column === column) currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    else { currentSort.column = column; currentSort.direction = 'asc'; }
    document.querySelectorAll('.data-grid th').forEach(th => th.innerHTML = th.innerHTML.replace(/ ▲| ▼/g, ''));
    const activeTh = Array.from(document.querySelectorAll('.data-grid th')).find(th => th.getAttribute('onclick')?.includes(column));
    if (activeTh) activeTh.innerHTML += currentSort.direction === 'asc' ? ' ▲' : ' ▼';
    actualizarDashboard();
}

function editarMovimiento(id) {
    const mov = listaMovimientos.find(m => m.firestoreId === id);
    if(!mov) return alert("Registro no encontrado.");
    if(document.getElementById('editId')) document.getElementById('editId').value = mov.firestoreId; 
    if(document.getElementById('inputNombre')) document.getElementById('inputNombre').value = mov.nombre;
    if(document.getElementById('inputMonto')) document.getElementById('inputMonto').value = mov.monto.toLocaleString('es-CL');
    if(document.getElementById('inputCategoria')) document.getElementById('inputCategoria').value = mov.categoria || 'Sin Categoría';
    let tipoC = mov.tipo || 'Gasto';
    if (mov.catV === 'Transferencia Recibida' || mov.catV === 'Ingreso Adicional') tipoC = 'Ingreso';
    if (mov.catV === 'Transferencia Propia / Ahorro') tipoC = 'Ahorro';
    if(document.getElementById('inputTipo')) document.getElementById('inputTipo').value = tipoC;
    try {
        let d = new Date(mov.fechaISO);
        let dLocal = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        if(document.getElementById('inputFecha')) document.getElementById('inputFecha').value = dLocal;
    } catch(e) { console.error(e); }
    const btn = document.getElementById('btnGuardar');
    if(btn) { btn.innerHTML = "💾 ACTUALIZAR REGISTRO"; btn.style.backgroundColor = "var(--color-edit)"; }
    modoEdicionActivo = true;
    if (window.innerWidth <= 1024 && typeof switchTab === "function") switchTab('add');
    if (window.innerWidth <= 1024) window.scrollTo({ top: 0, behavior: 'smooth' });
    actualizarDashboard(); 
}

function agregarMovimiento() {
    const m = parseInt(document.getElementById('inputMonto').value.replace(/\./g, ''));
    const n = document.getElementById('inputNombre').value;
    const c = document.getElementById('inputCategoria').value;
    const t = document.getElementById('inputTipo').value;
    const fInput = document.getElementById('inputFecha').value;
    const editId = document.getElementById('editId').value;
    if (!m || !n || !fInput) return alert("⚠️ Faltan datos críticos.");
    const btn = document.getElementById('btnGuardar');
    btn.innerHTML = "⏳ GUARDANDO..."; btn.disabled = true;
    const dataPayload = { nombre: n, monto: m, categoria: c, tipo: t, fecha: new Date(fInput), status: 'Manual' };
    let op = (modoEdicionActivo && editId) ? db.collection("movimientos").doc(editId).update(dataPayload) : db.collection("movimientos").add(dataPayload);
    op.then(() => {
        document.getElementById('editId').value = ''; document.getElementById('inputNombre').value = ''; document.getElementById('inputMonto').value = '';
        btn.innerHTML = "GUARDAR EN BÚNKER"; btn.style.backgroundColor = "var(--color-guardar)"; btn.disabled = false; modoEdicionActivo = false;
        if (typeof switchTab === "function") switchTab('list');
    }).catch(err => { alert("❌ Error: " + err.message); btn.innerHTML = "ERROR"; btn.disabled = false; });
}

function formatearEntradaNumerica(i) { let v = i.value.replace(/\D/g,''); i.value = v ? parseInt(v).toLocaleString('es-CL') : ''; }
function toggleTheme() { document.body.classList.toggle('light-theme'); }
setInterval(() => { const c = document.getElementById('cronos'); if(c) c.innerText = new Date().toLocaleString('es-CL').toUpperCase(); }, 1000);
function toggleAllChecks() { const checkEl = document.getElementById('checkAll'); if(!checkEl) return; const check = checkEl.checked; document.querySelectorAll('.row-check').forEach(cb => cb.checked = check); updateMassActions(); }
function updateMassActions() { const bar = document.getElementById('massActionsBar'); if(!bar) return; const cnt = document.querySelectorAll('.row-check:not(#checkAll):checked').length; bar.style.display = cnt > 0 ? 'flex' : 'none'; document.getElementById('massCount').innerText = `${cnt} seleccionado(s)`; if(cnt === 0) document.getElementById('checkAll').checked = false; }
function massDelete() { const ids = Array.from(document.querySelectorAll('.row-check:not(#checkAll):checked')).map(cb => cb.value); if(ids.length === 0 || !confirm(`⚠️ ¿Eliminar ${ids.length} registro(s)?`)) return; const btn = document.querySelector('button[onclick="massDelete()"]'); const orig = btn.innerHTML; btn.innerHTML = '⏳'; Promise.all(ids.map(id => db.collection("movimientos").doc(id).delete())).then(() => { document.getElementById('massActionsBar').style.display = 'none'; document.getElementById('checkAll').checked = false; btn.innerHTML = orig; }); }
function massCategorize() { const ids = Array.from(document.querySelectorAll('.row-check:not(#checkAll):checked')).map(cb => cb.value); const cat = document.getElementById('massCategorySelect').value; if(ids.length === 0 || !cat || !confirm(`¿Categorizar como "${cat}"?`)) return; const btn = document.querySelector('button[onclick="massCategorize()"]'); const orig = btn.innerHTML; btn.innerHTML = '⏳'; Promise.all(ids.map(id => db.collection("movimientos").doc(id).update({categoria: cat}))).then(() => { document.getElementById('massActionsBar').style.display = 'none'; document.getElementById('checkAll').checked = false; document.getElementById('massCategorySelect').value = ''; btn.innerHTML = orig; }); }

// 🟢 FUNCIÓN DE DIBUJADO DE 4 GRÁFICOS (V7.6) 🟢
function dibujarGraficos(sueldo, chronData, cats, diasCiclo, T0) {
    if(chartBD) chartBD.destroy(); if(chartP) chartP.destroy(); 
    if(chartDiario) chartDiario.destroy(); if(chartRadar) chartRadar.destroy();
    
    const cT = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || "#f0f6fc"; 
    const cG = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || "#30363d"; 
    const cF = getComputedStyle(document.body).getPropertyValue('--color-fuga').trim() || "#ff5252";
    
    let daily = Array(diasCiclo + 1).fill(0);
    let dailyGastosVar = Array(diasCiclo + 1).fill(0); 
    let msT0 = T0.getTime();

    chronData.forEach(m => {
        let d = new Date(m.fechaISO);
        let diff = Math.floor((d.getTime() - msT0) / 86400000) + 1;
        if(diff >= 1 && diff <= diasCiclo) { 
            if(m.esIn) daily[diff] += m.monto; 
            else if(!m.esNeutro) { 
                daily[diff] -= m.monto; 
                if(m.tipo !== 'Gasto Fijo') dailyGastosVar[diff] += m.monto; 
            } 
        }
    });

    let actual = [sueldo], ideal = [sueldo], labelsX = ["INI"], colorLabelsX = [cT], colorGridX = [cG]; 
    let labelsFechas = ["INI"]; 
    
    let acc = sueldo, limit = Math.floor((Date.now() - msT0) / 86400000) + 1;
    const nombresMes = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

    for(let i=1; i<=diasCiclo; i++) {
        ideal.push(sueldo - (sueldo/diasCiclo)*i); 
        acc += daily[i]; 
        actual.push(i > limit ? null : acc);
        let f = new Date(msT0 + (i-1)*86400000); 
        let dia = String(f.getDate()).padStart(2, '0');
        let mesStr = nombresMes[f.getMonth()];
        
        labelsFechas.push(`${dia} ${mesStr}`); 
        
        if (f.getDate() === 1) { labelsX.push(`${dia} ${mesStr}`); colorLabelsX.push('#ff9800'); colorGridX.push('#ff9800'); } 
        else { labelsX.push(dia); colorLabelsX.push(cT); colorGridX.push(cG); }
    }

    bdDataMaster = { labels: [...labelsX], labelsFechas: [...labelsFechas], actual: [...actual], ideal: [...ideal], daily: [...daily], dailyGastosVar: [...dailyGastosVar], colorsX: [...colorLabelsX], colorsG: [...colorGridX] };

    // 1. BURN-DOWN (SIN PADDING PARA OVERLAY)
    chartBD = new Chart(document.getElementById('chartBurnDown'), {
        type: 'line', 
        data: { labels: labelsX, datasets: [
            { label: 'Consumo Real', data: actual, borderColor: '#1f6feb', borderWidth: 3, fill: {target:'origin', above:'rgba(31,111,235,0.05)', below:'rgba(218,54,51,0.2)'}, segment: {borderColor: c => c.p0.parsed.y < 0 ? cF : '#1f6feb'} },
            { label: 'Gasto Ideal', data: ideal, borderColor: 'rgba(63,185,80,0.3)', borderDash:[5,5], pointRadius:0 }
        ]},
        options: { 
            maintainAspectRatio:false, plugins:{legend:{display:false}}, 
            scales:{ 
                x:{ticks:{color: colorLabelsX, maxRotation: 45, minRotation: 45, font: (c) => ({ weight: colorLabelsX[c.index] === '#ff9800' ? '900' : 'bold', size: 10 }) }, grid:{color: colorGridX, drawBorder:false, lineWidth: (c) => colorGridX[c.index] === '#ff9800' ? 2 : 1 } }, 
                y:{ max: sueldo, ticks:{color:cT, callback:v=>'$'+Math.round(v/1000)+'k'}, grid:{color: c => c.tick.value === 0 ? cF : cG} } 
            },
            layout: { padding: { bottom: 0, top: 0 } }
        }
    });

    const aliasMap = { "Gastos Fijos (Búnker)": "Fijos", "Mantenimiento Hardware (Salud)": "Salud", "Alimentación & Supermercado": "Super", "Transferencia Propia / Ahorro": "Ahorro", "Ocio & Experiencias": "Ocio", "Transporte & Logística": "Transp", "Dopamina & Antojos": "Dopa", "Transferencia Recibida": "Ingreso", "Gasto Tarjeta de Crédito": "Tarjeta" };

    // 2. PARETO
    const sorted = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,8); const totalTop8 = sorted.reduce((sum, val) => sum + val[1], 0) || 1;
    let acumulado = 0; const dataAcumulada = sorted.map(c => { acumulado += c[1]; return (acumulado / totalTop8) * 100; });

    chartP = new Chart(document.getElementById('chartPareto'), {
        type: 'bar', 
        data: { labels: sorted.map(c => aliasMap[c[0]] || c[0].split(' ')[0]), datasets: [
            { type: 'line', label: '% Acumulado', data: dataAcumulada, borderColor: '#ff9800', borderWidth: 2, borderDash: [5, 5], pointBackgroundColor: '#ff9800', pointRadius: 3, fill: false, yAxisID: 'y1' },
            { type: 'bar', label: 'Gasto', data: sorted.map(c => c[1]), backgroundColor: sorted.map(c => c[0] === 'Dopamina & Antojos' ? '#ff5252' : '#1f6feb'), borderRadius: 4, yAxisID: 'y' }
        ]},
        options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{ticks:{color:cT, font:{size:9}}}, y:{ type: 'linear', position: 'left', ticks:{color:cT, callback:v=>'$'+Math.round(v/1000)+'k'} }, y1:{ type: 'linear', position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false }, ticks:{color:'#ff9800', callback:v=>Math.round(v)+'%', font:{weight:'bold'}} } } }
    });

    // 3. PULSO DIARIO VARIABLE (ERGONOMÍA: EJE X MUESTRA FECHAS REALES, MAX 7 DÍAS)
    const ctxDiario = document.getElementById('chartDiario');
    if(ctxDiario) {
        let lastDayWithData = diasCiclo;
        while(lastDayWithData > 0 && dailyGastosVar[lastDayWithData] === 0) lastDayWithData--;
        let startDayForBars = Math.max(1, lastDayWithData - 6); 
        
        let barLabels = labelsFechas.slice(startDayForBars, lastDayWithData + 1); 
        let barData = dailyGastosVar.slice(startDayForBars, lastDayWithData + 1);

        chartDiario = new Chart(ctxDiario, {
            type: 'bar',
            data: { labels: barLabels, datasets: [{ label: 'Gasto Físico', data: barData, backgroundColor: '#da3633', borderRadius: 4 }] },
            options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: cT, font:{size:9} }, grid: { display:false } }, y: { ticks: { color: cT, callback: v => '$' + Math.round(v / 1000) + 'k' }, grid: { color: cG } } } }
        });
    }

    // 4. RADAR DE COMPORTAMIENTO
    const ctxRadar = document.getElementById('chartRadar');
    if(ctxRadar) {
        let radarCats = {...cats};
        delete radarCats["Gastos Fijos (Búnker)"]; delete radarCats["Transferencia Propia / Ahorro"]; delete radarCats["Transferencia Recibida"]; delete radarCats["Ingreso Adicional"]; delete radarCats["Sin Categoría"]; delete radarCats["Ruido de Sistema"];

        let rSorted = Object.entries(radarCats).sort((a,b)=>b[1]-a[1]).slice(0,5); 
        if(rSorted.length < 3) rSorted.push(["Sin Datos", 0], ["Sin Datos 2", 0]); 
        
        let rLabels = rSorted.map(c => aliasMap[c[0]] || c[0].split(' ')[0]);
        let rData = rSorted.map(c => c[1]);

        chartRadar = new Chart(ctxRadar, {
            type: 'radar',
            data: { labels: rLabels, datasets: [{ label: 'Perfil de Gasto', data: rData, backgroundColor: 'rgba(31, 111, 235, 0.2)', borderColor: '#1f6feb', pointBackgroundColor: '#ff9800', borderWidth: 2 }] },
            options: { maintainAspectRatio: false, scales: { r: { ticks: { display: false }, grid: { color: cG }, angleLines: { color: cG }, pointLabels: { color: cT, font: {size: 9, weight: 'bold'} } } }, plugins: { legend: { display: false } } }
        });
    }
}

// =====================================================================
// MANEJADORES GLOBALES (NUBE Y ZOOM)
// =====================================================================

window.hacerZoomGrafico = function(diaIn, diaFin) {
    if(!chartBD || !bdDataMaster) return;
    let inicio = parseInt(diaIn); let fin = parseInt(diaFin);
    if(isNaN(inicio) || isNaN(fin) || inicio >= fin) return;
    
    let slicedActual = bdDataMaster.actual.slice(inicio, fin + 1);
    let slicedIdeal = bdDataMaster.ideal.slice(inicio, fin + 1);
    let slicedLabels = bdDataMaster.labels.slice(inicio, fin + 1);

    let validActuals = slicedActual.filter(v => v !== null);
    if(validActuals.length > 0) {
        let maxReal = Math.max(...validActuals);
        const inputSueldo = document.getElementById('inputSueldo');
        const sueldo = inputSueldo ? (parseInt(inputSueldo.value.replace(/\./g,'')) || 0) : SUELDO_BASE_DEFAULT;
        if (maxReal <= 0) {
            chartBD.options.scales.y.max = sueldo > 0 ? sueldo : 100000; 
        } else {
            let calculado = maxReal > (sueldo * 0.8) ? sueldo : maxReal * 1.1;
            chartBD.options.scales.y.max = Math.ceil(calculado / 1000) * 1000; 
        }
    }

    chartBD.data.labels = slicedLabels; chartBD.data.datasets[0].data = slicedActual; chartBD.data.datasets[1].data = slicedIdeal; chartBD.update();

    let slicedDaily = bdDataMaster.daily.slice(inicio + 1, fin + 1); 
    let gastoTotalTramo = 0;
    slicedDaily.forEach(v => { if(v < 0) gastoTotalTramo += Math.abs(v); }); 
    let dias = (fin - inicio) || 1;
    let promDiario = Math.round(gastoTotalTramo / dias);
    
    let domGasto = document.getElementById('txtGastoTramo'); if(domGasto) domGasto.innerText = '$' + gastoTotalTramo.toLocaleString('es-CL');
    let domProm = document.getElementById('txtPromedioZoom'); if(domProm) domProm.innerText = '$' + promDiario.toLocaleString('es-CL');
};

window.triggerSync = function() {
    const btn = document.querySelector('button[onclick="triggerSync()"]') || document.querySelector('.btn-sys');
    const origText = btn ? btn.innerText : '';
    if(btn) btn.innerText = "⏳ SYNC...";
    fetch("https://script.google.com/macros/s/AKfycbwKlub0qrv8_d24ZuyKKNryqOw1E68xv1_JvPOoEUc6W8TICllFfodNcwkigQE_7AuoNg/exec", {mode:'no-cors'})
    .then(() => { alert("✅ Comando enviado. Refrescando consola..."); window.location.reload(); })
    .catch(e => { alert("Error de red: " + e); if(btn) btn.innerText = origText; });
};

window.enviarReporteTelegram = function() {
    const txtSaldo = document.getElementById('txtSaldo');
    const badge = document.getElementById('navRangoBadge');
    const saldo = txtSaldo ? txtSaldo.innerText : '0';
    const periodo = badge ? badge.innerText : 'Periodo Actual';
    const msg = `🏭 *BÚNKER SCADA*\n💰 Saldo: $${saldo}\n🗓️ Periodo: ${periodo}`;
    
    fetch(`https://api.telegram.org/bot8614679709:AAEJGy9yAlKnhjVmJ0VUZpT-YmZQ6J5IOps/sendMessage`, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: "1484213465", text: msg, parse_mode: 'Markdown' }) 
    })
    .then(r => r.ok ? alert("✅ Telemetría Transmitida a Telegram.") : alert("❌ Error API Telegram"))
    .catch(e => alert("Error de red: " + e));
};
