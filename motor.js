// ==========================================================
// 🧠 BÚNKER SCADA - MOTOR LÓGICO V31.9.5 (NÚCLEO ESTABLE + LOGOS + ZOOM)
// ==========================================================
const BYRON_EMAIL = "bvhcc94@gmail.com"; 
const CREDIT_SETPOINT = -300000; 
const catEvitables = ["Dopamina & Antojos"]; 

const catEmojis = {
    "Transferencia": "🔄", "Gastos Fijos (Búnker)": "🏠", "Suscripciones": "📱", "Alimentación & Supermercado": "🛒",
    "Dopamina & Antojos": "🍔", "Ocio & Experiencias": "🎸", "Transporte & Logística": "🚗", 
    "Mantenimiento Hardware (Salud)": "💊", "Transferencia Propia / Ahorro": "🏦", "Hogar & Búnker": "🛠️",
    "Red de Apoyo (Familia)": "🫂", "Gasto Tarjeta de Crédito": "💳", "Ingreso Adicional": "💰", 
    "Transferencia Recibida": "📲", "Ruido de Sistema": "⚙️", "Sin Categoría": "❓"
};

// 🟢 MÓDULO SMART LOGOS 🟢
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

// 🟢 VARIABLE MAESTRA PARA EL ZOOM 🟢
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
let chartBD = null, chartP = null;
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
        
        const userDisplay = document.getElementById('user-display');
        if(userDisplay) userDisplay.innerText = user.displayName;
        
        db.collection("parametros").doc("sueldos").onSnapshot(snap => {
            if(snap.exists) sueldosHistoricos = snap.data();
        });

        db.collection("movimientos").onSnapshot(snap => {
            listaMovimientos = [];
            snap.forEach(doc => {
                let d = doc.data(); d.firestoreId = doc.id;
                d.fechaISO = d.fecha?.toDate ? d.fecha.toDate().toISOString() : (d.fecha || new Date().toISOString());
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
    
    if (document.activeElement !== elSueldo) {
        elSueldo.value = sueldoActivo.toLocaleString('es-CL');
    }
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
    setTxt('txtTotalFijos', tF);
    setTxt('txtTotalOtros', tO);
    setTxt('txtTotalIngresos', tI);
    setTxt('txtCxC', tC);
    setTxt('txtSaldo', saldoAcc);
    
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
    setW('barFijos', (tF / (sueldo || 1)) * 100);
    setW('barOtros', (tO / (sueldo || 1)) * 100);
    
    setTxt('txtTotalEvitable', tEvitable);
    const pctFugas = sueldo > 0 ? ((tEvitable / sueldo) * 100).toFixed(1) : 0;
    
    const txtPctFugas = document.getElementById('txtPorcentajeFugas');
    const barraEvitable = document.getElementById('barEvitable');
    
    if(txtPctFugas && barraEvitable) {
        txtPctFugas.innerText = pctFugas + '%';
        barraEvitable.style.width = Math.min(pctFugas, 100) + "%";
        if (pctFugas < 5) { txtPctFugas.style.color = "var(--color-saldo)"; barraEvitable.style.backgroundColor = "var(--color-saldo)"; } 
        else if (pctFugas <= 10) { txtPctFugas.style.color = "#ff9800"; barraEvitable.style.backgroundColor = "#ff9800"; } 
        else { txtPctFugas.style.color = "var(--color-fuga)"; barraEvitable.style.backgroundColor = "var(--color-fuga)"; }
    }

    renderizarListas(sueldo, b);
    if(document.getElementById('chartBurnDown')) {
        dibujarGraficos(sueldo, [...dataMes].sort((x,y) => x.fechaISO < y.fechaISO ? -1 : 1), gCat, diasCiclo, T0);
    }
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
    
    let htmlPC = ''; 
    let htmlMovil = '';

    datos.forEach(x => {
        const em = catEmojis[x.catV] || "❓";
        let d = new Date(x.fechaISO);
        let dS = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} <span class="col-hora">${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}</span>`;
        let dSMovil = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        
        let iconImpacto = x.esIn ? `<span class="impact-icon impact-pos">(+)</span>` : x.esNeutro ? `<span class="impact-icon impact-neu">(=)</span>` : `<span class="impact-icon impact-neg">(-)</span>`;
        let colorMonto = x.esIn ? "var(--color-ingresos)" : x.esNeutro ? "#ff9800" : "var(--text-main)";
        let statusBadge = x.catV === 'Sin Categoría' ? `<span class="status-badge status-warn">REVISAR</span>` : `<span class="status-badge status-ok">OK</span>`;
        
        let editIdVal = document.getElementById('editId') ? document.getElementById('editId').value : '';
        let bgEdicion = (editIdVal === x.firestoreId) ? 'background-color: rgba(210, 153, 34, 0.15); border-left: 3px solid var(--color-edit);' : '';

        const nombreSeguro = x.nombre || "Dato no identificado";
        const montoSeguro = (typeof x.monto === 'number' && !isNaN(x.monto)) ? x.monto : 0;
        const saldoSeguro = (typeof x.saldoCalculadoVista === 'number' && !isNaN(x.saldoCalculadoVista)) ? x.saldoCalculadoVista : 0;
        const colorSaldo = saldoSeguro < 0 ? 'var(--color-fuga)' : 'var(--text-muted)';

        // 🟢 INYECCIÓN VISUAL DEL LOGO 🟢
        const iconoVisual = obtenerIconoVisual(x.nombre, em);

        if (contenedorPC) {
            htmlPC += `<tr style="${bgEdicion}" draggable="true" ondragstart="dragStart(event, '${x.firestoreId}')" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="dropRow(event, '${x.firestoreId}')">
                <td class="col-check hide-mobile"><input type="checkbox" class="row-check" value="${x.firestoreId}" onchange="updateMassActions()"></td>
                <td class="col-drag hide-mobile" style="cursor: grab; text-align: center; color: var(--text-muted); font-size: 1.2rem;">☰</td>
                <td class="hide-mobile" style="text-align:center; font-size:0.75rem; font-weight:800; color:var(--text-muted);">${x.indiceVista}</td>
                <td style="font-size:0.75rem; color:var(--text-muted);">${dS}</td>
                <td class="col-desc" style="font-weight:700;" title="${nombreSeguro}">${nombreSeguro}</td>
                <td class="hide-mobile" style="font-size:0.75rem;"><span class="cat-badge">${em} ${x.catV}</span></td>
                
                <td class="col-monto" style="color:${colorMonto};">${iconImpacto}$${montoSeguro.toLocaleString('es-CL')}</td>
                <td class="col-monto hide-mobile" style="color:${colorSaldo};">$${saldoSeguro.toLocaleString('es-CL')}</td>
                
                <td class="hide-mobile" style="text-align:center; font-size:0.7rem; color:var(--text-muted);">${catEvitables.includes(x.catV) ? '100%' : '0%'}</td>
                <td class="hide-mobile" style="text-align:center;">${statusBadge}</td>
                <td style="text-align:center; padding: 2px;">
                    <button class="btn-sys" style="padding:4px; border-color:var(--color-edit); color:var(--color-edit);" onclick="editarMovimiento('${x.firestoreId}')">✏️<span class="btn-edit-text"> EDIT</span></button>
                </td>
            </tr>`;
        }

        if (contenedorMovil) {
            const clickAction = typeof openBottomSheet === 'function' ? `openBottomSheet('${x.firestoreId}', '${nombreSeguro.replace(/'/g, "\\'")}', ${montoSeguro})` : `editarMovimiento('${x.firestoreId}')`;
            
            htmlMovil += `<div class="mobile-card" onclick="${clickAction}" style="background: var(--bg-card) !important; border-radius: 12px; padding: 15px; display: flex; align-items: center; border: 1px solid var(--border-subtle); margin-bottom: 10px;">
                <div style="width: 44px; height: 44px; margin-right: 15px; background: rgba(255,255,255,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
                    ${iconoVisual}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; font-size: 0.95rem; margin-bottom: 3px;">${nombreSeguro}</div>
                    <div style="font-size: 0.7rem; color: var(--text-dim);">${dSMovil} • ${x.catV}</div>
                </div>
                <div style="font-family: monospace; font-weight: 900; font-size: 1.1rem; color:${colorMonto}">${x.esIn?'+':(x.esNeutro?'=':'-')}$${montoSeguro.toLocaleString('es-CL')}</div>
            </div>`;
        }
    });

    if (contenedorPC) contenedorPC.innerHTML = htmlPC; 
    if (contenedorMovil) contenedorMovil.innerHTML = htmlMovil;
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

function toggleAllChecks() {
    const checkEl = document.getElementById('checkAll');
    if(!checkEl) return;
    const check = checkEl.checked;
    document.querySelectorAll('.row-check').forEach(cb => cb.checked = check);
    updateMassActions();
}

function updateMassActions() {
    const bar = document.getElementById('massActionsBar');
    if(!bar) return;
    const cnt = document.querySelectorAll('.row-check:not(#checkAll):checked').length;
    bar.style.display = cnt > 0 ? 'flex' : 'none';
    document.getElementById('massCount').innerText = `${cnt} seleccionado(s)`;
    if(cnt === 0) document.getElementById('checkAll').checked = false;
}

function massDelete() {
    const ids = Array.from(document.querySelectorAll('.row-check:not(#checkAll):checked')).map(cb => cb.value);
    if(ids.length === 0 || !confirm(`⚠️ ¿Eliminar ${ids.length} registro(s)?`)) return;
    const btn = document.querySelector('button[onclick="massDelete()"]'); const orig = btn.innerHTML; btn.innerHTML = '⏳';
    Promise.all(ids.map(id => db.collection("movimientos").doc(id).delete())).then(() => {
        document.getElementById('massActionsBar').style.display = 'none'; document.getElementById('checkAll').checked = false; btn.innerHTML = orig;
    });
}

function massCategorize() {
    const ids = Array.from(document.querySelectorAll('.row-check:not(#checkAll):checked')).map(cb => cb.value);
    const cat = document.getElementById('massCategorySelect').value;
    if(ids.length === 0 || !cat || !confirm(`¿Categorizar como "${cat}"?`)) return;
    const btn = document.querySelector('button[onclick="massCategorize()"]'); const orig = btn.innerHTML; btn.innerHTML = '⏳';
    Promise.all(ids.map(id => db.collection("movimientos").doc(id).update({categoria: cat}))).then(() => {
        document.getElementById('massActionsBar').style.display = 'none'; document.getElementById('checkAll').checked = false; document.getElementById('massCategorySelect').value = ''; btn.innerHTML = orig;
    });
}

function dibujarGraficos(sueldo, chronData, cats, diasCiclo, T0) {
    if(chartBD) chartBD.destroy(); if(chartP) chartP.destroy();
    
    // Fallbacks para los colores
    const cT = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || "#f0f6fc"; 
    const cG = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || "#30363d"; 
    const cF = getComputedStyle(document.body).getPropertyValue('--color-fuga').trim() || "#ff5252";
    
    let daily = Array(diasCiclo + 1).fill(0);
    chronData.forEach(m => {
        let diff = Math.floor((new Date(m.fechaISO) - T0) / 86400000) + 1;
        if(diff >= 1 && diff <= diasCiclo) { if(m.esIn) daily[diff] += m.monto; else if(!m.esNeutro) daily[diff] -= m.monto; }
    });

    let actual = [sueldo]; 
    let ideal = [sueldo]; 
    let labelsX = ["INI"]; 
    let colorLabelsX = [cT]; 
    let colorGridX = [cG]; 
    
    let acc = sueldo;
    let diaQ = null; 
    let limit = Math.floor((new Date() - T0) / 86400000) + 1;
    const nombresMes = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

    for(let i=1; i<=diasCiclo; i++) {
        ideal.push(sueldo - (sueldo/diasCiclo)*i); 
        acc += daily[i]; 
        if (acc < 0 && diaQ === null) diaQ = i; 
        actual.push(i > limit ? null : acc);
        
        let f = new Date(T0.getTime() + (i-1)*86400000); 
        let dia = String(f.getDate()).padStart(2, '0');
        if (f.getDate() === 1) { 
            labelsX.push(`${dia} ${nombresMes[f.getMonth()]}`); 
            colorLabelsX.push('#ff9800'); colorGridX.push('#ff9800'); 
        } else { 
            labelsX.push(dia); colorLabelsX.push(cT); colorGridX.push(cG); 
        }
    }

    // 🟢 ALMACENAMOS LA FOTO ORIGINAL PARA EL ZOOM 🟢
    bdDataMaster = { labels: [...labelsX], actual: [...actual], ideal: [...ideal], colorsX: [...colorLabelsX], colorsG: [...colorGridX] };

    chartBD = new Chart(document.getElementById('chartBurnDown'), {
        type: 'line', 
        data: { labels: labelsX, datasets: [
            { label: 'Consumo Real', data: actual, borderColor: '#1f6feb', borderWidth: 3, fill: {target:'origin', above:'rgba(31,111,235,0.05)', below:'rgba(218,54,51,0.2)'}, segment: {borderColor: c => c.p0.parsed.y < 0 ? cF : '#1f6feb'} },
            { label: 'Gasto Ideal', data: ideal, borderColor: 'rgba(63,185,80,0.3)', borderDash:[5,5], pointRadius:0 }
        ]},
        options: { 
            maintainAspectRatio:false, 
            plugins:{legend:{display:false}}, 
            scales:{ 
                x:{ticks:{color: colorLabelsX, maxRotation: 45, minRotation: 45, font: (c) => ({ weight: colorLabelsX[c.index] === '#ff9800' ? '900' : 'bold', size: 10 }) }, grid:{color: colorGridX, drawBorder:false, lineWidth: (c) => colorGridX[c.index] === '#ff9800' ? 2 : 1 } }, 
                y:{ticks:{color:cT, callback:v=>'$'+(v/1000)+'k'}, grid:{color: c => c.tick.value === 0 ? cF : cG}} 
            } 
        }
    });

    const sorted = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,8); const totalTop8 = sorted.reduce((sum, val) => sum + val[1], 0) || 1;
    let acumulado = 0; const dataAcumulada = sorted.map(c => { acumulado += c[1]; return (acumulado / totalTop8) * 100; });

    chartP = new Chart(document.getElementById('chartPareto'), {
        type: 'bar', 
        data: { labels: sorted.map(c => c[0].split(' ')[0]), datasets: [
            { type: 'line', label: '% Acumulado', data: dataAcumulada, borderColor: '#ff9800', borderWidth: 2, borderDash: [5, 5], pointBackgroundColor: '#ff9800', pointRadius: 3, fill: false, yAxisID: 'y1' },
            { type: 'bar', label: 'Gasto', data: sorted.map(c => c[1]), backgroundColor: sorted.map(c => c[0] === 'Dopamina & Antojos' ? '#ff5252' : '#1f6feb'), borderRadius: 4, yAxisID: 'y' }
        ]},
        options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{ticks:{color:cT, font:{size:9}}}, y:{ type: 'linear', position: 'left', ticks:{color:cT, callback:v=>'$'+(v/1000)+'k'} }, y1:{ type: 'linear', position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false }, ticks:{color:'#ff9800', callback:v=>v+'%', font:{weight:'bold'}} } } }
    });
}

function calcularFechasCiclo(mesConceptual, anio) {
    let mesInicio = mesConceptual - 1; let anioInicio = anio; if (mesInicio < 0) { mesInicio = 11; anioInicio--; }
    let T0 = new Date(anioInicio, mesInicio, 30); if (T0.getMonth() !== mesInicio) T0 = new Date(anioInicio, mesInicio + 1, 0); 
    let TFinal = new Date(anio, mesConceptual, 30); if (TFinal.getMonth() !== mesConceptual) TFinal = new Date(anio, mesConceptual + 1, 0);
    return { T0, TFinal, fechaFinVisual: new Date(TFinal.getTime() - 86400000) };
}

function cambiarCicloManual() { document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('preset-active')); aplicarCicloAlSistema(); }

function setCicloPreset(tipo) {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('preset-active'));
    const m = new Date().getMonth(); let tM = m; let tA = new Date().getFullYear();
    if (new Date().getDate() >= 30) { tM = (m + 1) % 12; if (tM === 0) tA++; }
    if (tipo === 'anterior') { const btn = document.getElementById('btnPresetAnterior'); if(btn) btn.classList.add('preset-active'); tM = tM - 1; if (tM < 0) { tM = 11; tA--; } } 
    else if (tipo === 'actual') { const btn = document.getElementById('btnPresetActual'); if(btn) btn.classList.add('preset-active'); }
    
    const navMes = document.getElementById('navMesConceptual');
    const navAnio = document.getElementById('navAnio');
    if(navMes) navMes.value = tM; 
    if(navAnio) navAnio.value = tA;
    aplicarCicloAlSistema();
}

function aplicarCicloAlSistema() {
    const navMes = document.getElementById('navMesConceptual');
    const navAnio = document.getElementById('navAnio');
    if(!navMes || !navAnio) return;
    
    const { T0, fechaFinVisual } = calcularFechasCiclo(parseInt(navMes.value), parseInt(navAnio.value));
    const badge = document.getElementById('navRangoBadge');
    if(badge) badge.innerText = `PERIODO: ${T0.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}).toUpperCase()} - ${fechaFinVisual.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}).toUpperCase()}`;
    cargarSueldoVisual(); 
    actualizarDashboard();
}

let draggedRowId = null;

function dragStart(e, id) { draggedRowId = id; e.dataTransfer.effectAllowed = 'move'; setTimeout(() => e.target.style.opacity = '0.4', 0); }
function dragOver(e) { e.preventDefault(); e.target.closest('tr').style.borderTop = '3px solid var(--color-ingresos)'; }
function dragLeave(e) { e.target.closest('tr').style.borderTop = ''; }
function dropRow(e, targetId) {
    e.preventDefault(); e.target.closest('tr').style.borderTop = '';
    if (!draggedRowId || draggedRowId === targetId) return;
    if (currentSort.column !== 'fechaISO') return alert("⚠️ ALARMA: Para recalibrar el tiempo, la tabla debe estar ordenada por Fecha.");

    let vistaActual = [...datosMesGlobal].sort((a, b) => {
         if (a.fechaISO < b.fechaISO) return currentSort.direction === 'asc' ? -1 : 1;
         if (a.fechaISO > b.fechaISO) return currentSort.direction === 'asc' ? 1 : -1;
         return 0;
    });

    let draggedIdx = vistaActual.findIndex(x => x.firestoreId === draggedRowId);
    let targetIdx = vistaActual.findIndex(x => x.firestoreId === targetId);

    let t1_idx = targetIdx > draggedIdx ? targetIdx : targetIdx - 1;
    let t2_idx = targetIdx > draggedIdx ? targetIdx + 1 : targetIdx;

    let t1_ms = t1_idx >= 0 ? new Date(vistaActual[t1_idx].fechaISO).getTime() : null;
    let t2_ms = t2_idx < vistaActual.length ? new Date(vistaActual[t2_idx].fechaISO).getTime() : null;

    let newTimeMs; let dir = currentSort.direction;
    if (t1_ms && t2_ms) newTimeMs = t1_ms + (t2_ms - t1_ms) / 2;
    else if (!t1_ms) newTimeMs = t2_ms + (dir === 'desc' ? 60000 : -60000); 
    else if (!t2_ms) newTimeMs = t1_ms + (dir === 'desc' ? -60000 : 60000);

    if(confirm("⚙️ ¿Inyectar nuevo Timestamp para forzar cuadratura?")) {
        db.collection("movimientos").doc(draggedRowId).update({ fecha: new Date(newTimeMs) });
    }
    draggedRowId = null;
}

document.addEventListener('dragend', (e) => { if(e.target.tagName === 'TR') e.target.style.opacity = '1'; });

// 🟢 FUNCIÓN DE CORTES DE ZOOM DINÁMICO 🟢
window.hacerZoomGrafico = function(diaIn, diaFin) {
    if(!chartBD || !bdDataMaster) return;
    let inicio = parseInt(diaIn);
    let fin = parseInt(diaFin);
    
    if(isNaN(inicio) || isNaN(fin) || inicio >= fin) return;

    chartBD.data.labels = bdDataMaster.labels.slice(inicio, fin + 1);
    chartBD.data.datasets[0].data = bdDataMaster.actual.slice(inicio, fin + 1);
    chartBD.data.datasets[1].data = bdDataMaster.ideal.slice(inicio, fin + 1);
    
    chartBD.update();
};
