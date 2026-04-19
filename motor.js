// ==========================================================
// 🧠 BÚNKER SCADA - MOTOR LÓGICO V31.9.5 (NÚCLEO OPTIMIZADO)
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
let bdDataMaster = null; // Variable Maestra para Zoom
let currentSort = { column: 'ms', direction: 'desc' }; // Optimizacion: Ordenar por milisegundos
let modoEdicionActivo = false;
let sueldosHistoricos = {}; 
const SUELDO_BASE_DEFAULT = 3602505;

// CACHÉ DE DOM PARA OPTIMIZACIÓN
const elSueldoInput = document.getElementById('inputSueldo');
const elNavMes = document.getElementById('navMesConceptual');
const elNavAnio = document.getElementById('navAnio');

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
                
                // 🟢 OPTIMIZACIÓN O(1): PRE-CÁLCULO DE FECHAS
                let fObj = d.fecha?.toDate ? d.fecha.toDate() : new Date(d.fecha || Date.now());
                d.fechaISO = fObj.toISOString();
                d.ms = fObj.getTime(); // Guarda milisegundos para ordenamientos rápidos
                
                d.monto = Number(d.monto) || 0;
                
                d.catV = d.categoria || 'Sin Categoría';
                if (d.monto <= 1000 && d.catV === 'Sin Categoría') d.catV = "Ruido de Sistema";
                d.esIn = d.tipo === 'Ingreso' || d.catV === 'Transferencia Recibida' || d.catV === 'Ingreso Adicional';
                d.esNeutro = d.tipo === 'Por Cobrar' || d.tipo === 'Ahorro' || d.catV === 'Transferencia Propia / Ahorro';

                listaMovimientos.push(d);
            });
            aplicarCicloAlSistema();
        });
    }
});

function cargarSueldoVisual() {
    if(!elNavMes || !elNavAnio || !elSueldoInput) return;
    const llave = `${elNavAnio.value}_${elNavMes.value}`;
    const sueldoActivo = sueldosHistoricos[llave] || SUELDO_BASE_DEFAULT;
    if (document.activeElement !== elSueldoInput) { elSueldoInput.value = sueldoActivo.toLocaleString('es-CL'); }
}

function guardarSueldoEnNube() {
    if(!elNavMes || !elNavAnio || !elSueldoInput) return;
    const llave = `${elNavAnio.value}_${elNavMes.value}`;
    const valor = parseInt(elSueldoInput.value.replace(/\./g,'')) || 0;
    elSueldoInput.style.color = "var(--color-saldo)"; 
    setTimeout(() => elSueldoInput.style.color = "inherit", 800);
    db.collection("parametros").doc("sueldos").set({ [llave]: valor }, { merge: true });
    actualizarDashboard();
}

function actualizarDashboard() {
    const sueldo = elSueldoInput ? (parseInt(elSueldoInput.value.replace(/\./g,'')) || 0) : SUELDO_BASE_DEFAULT;
    const mesVal = elNavMes ? parseInt(elNavMes.value) : new Date().getMonth();
    const anioVal = elNavAnio ? parseInt(elNavAnio.value) : new Date().getFullYear();
    const { T0, TFinal } = calcularFechasCiclo(mesVal, anioVal);
    const msT0 = T0.getTime();
    const msTFinal = TFinal.getTime();
    
    // 🟢 OPTIMIZACIÓN: Filtrado puro por numéricos (O(N) ultrarrápido)
    let dataMes = listaMovimientos.filter(x => x.ms >= msT0 && x.ms < msTFinal);

    datosMesGlobal = dataMes; // Eliminado el sort() aquí, se hace en renderizarListas
    let saldoAcc = sueldo, tI = 0, tF = 0, tO = 0, tC = 0, tEvitable = 0, gCat = {};
    
    dataMes.forEach(x => {
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
        txtSaldoProy.innerHTML = saldoProyVal < CREDIT_SETPOINT ? `<span style="color:var(--color-fuga)">⚠️ ${saldoProyVal.toLocaleString('es-CL')}</span>` : saldoProyVal.toLocaleString('es-CL');
    }

    const diasCiclo = Math.round((msTFinal - msT0) / 86400000);
    const hoyMs = Date.now();
    let diasT = (hoyMs >= msT0 && hoyMs < msTFinal) ? Math.max(Math.floor((hoyMs - msT0) / 86400000) + 1, 1) : (hoyMs >= msTFinal ? diasCiclo : 0);
    
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
        txtPctFugas.innerText = pctFugas + '%';
        barraEvitable.style.width = Math.min(pctFugas, 100) + "%";
        if (pctFugas < 5) { txtPctFugas.style.color = "var(--color-saldo)"; barraEvitable.style.backgroundColor = "var(--color-saldo)"; } 
        else if (pctFugas <= 10) { txtPctFugas.style.color = "#ff9800"; barraEvitable.style.backgroundColor = "#ff9800"; } 
        else { txtPctFugas.style.color = "var(--color-fuga)"; barraEvitable.style.backgroundColor = "var(--color-fuga)"; }
    }

    renderizarListas(sueldo);
    
    if(document.getElementById('chartBurnDown')) {
        // Ordenamos una sola vez para los gráficos (Ascendente para línea de tiempo)
        dibujarGraficos(sueldo, [...dataMes].sort((a,b) => a.ms - b.ms), gCat, diasCiclo, T0);
    }
}    

function renderizarListas(sueldoBase) {
    const buscador = document.getElementById('inputBuscador');
    const filtro = buscador ? buscador.value.toLowerCase() : '';
    
    let datos = [...datosMesGlobal];
    if (filtro) datos = datos.filter(x => x.nombre?.toLowerCase().includes(filtro) || x.catV.toLowerCase().includes(filtro));

    datos.sort((a, b) => {
        let valA = a[currentSort.column], valB = b[currentSort.column];
        if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
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
    let htmlPC = ''; let htmlMovil = '';

    datos.forEach(x => {
        const em = catEmojis[x.catV] || "❓";
        let d = new Date(x.ms);
        let dS = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} <span class="col-hora">${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}</span>`;
        let dSMovil = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        
        let iconImpacto = x.esIn ? `<span class="impact-icon impact-pos">(+)</span>` : x.esNeutro ? `<span class="impact-icon impact-neu">(=)</span>` : `<span class="impact-icon impact-neg">(-)</span>`;
        let colorMonto = x.esIn ? "var(--color-ingresos)" : x.esNeutro ? "#ff9800" : "var(--text-main)";
        let statusBadge = x.catV === 'Ruido de Sistema' ? `<span class="status-badge status-warn">REVISAR</span>` : `<span class="status-badge status-ok">OK</span>`;
        
        let editIdVal = document.getElementById('editId') ? document.getElementById('editId').value : '';
        let bgEdicion = (editIdVal === x.firestoreId) ? 'background-color: rgba(210, 153, 34, 0.15); border-left: 3px solid var(--color-edit);' : '';

        const nombreSeguro = x.nombre || "Dato no identificado";
        const montoSeguro = (typeof x.monto === 'number' && !isNaN(x.monto)) ? x.monto : 0;
        const colorSaldo = x.saldoCalculadoVista < 0 ? 'var(--color-fuga)' : 'var(--text-muted)';
        
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
                <td class="col-monto hide-mobile" style="color:${colorSaldo};">$${x.saldoCalculadoVista.toLocaleString('es-CL')}</td>
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
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: bold; font-size: 0.95rem; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${nombreSeguro}</div>
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

function dibujarGraficos(sueldo, chronData, cats, diasCiclo, T0) {
    if(chartBD) chartBD.destroy(); if(chartP) chartP.destroy();
    
    const cT = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || "#f0f6fc"; 
    const cG = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || "#30363d"; 
    const cF = getComputedStyle(document.body).getPropertyValue('--color-fuga').trim() || "#ff5252";
    
    let daily = Array(diasCiclo + 1).fill(0);
    const msT0 = T0.getTime();
    
    chronData.forEach(m => {
        let diff = Math.floor((m.ms - msT0) / 86400000) + 1;
        if(diff >= 1 && diff <= diasCiclo) { if(m.esIn) daily[diff] += m.monto; else if(!m.esNeutro) daily[diff] -= m.monto; }
    });

    let actual = [sueldo], ideal = [sueldo], labelsX = ["INI"], acc = sueldo, diaQ = null;
    let limit = Math.floor((Date.now() - msT0) / 86400000) + 1;

    for(let i=1; i<=diasCiclo; i++) {
        ideal.push(sueldo - (sueldo/diasCiclo)*i); 
        acc += daily[i]; 
        if (acc < 0 && diaQ === null) diaQ = i; 
        actual.push(i > limit ? null : acc);
        labelsX.push(String(new Date(msT0 + (i-1)*86400000).getDate()).padStart(2,'0'));
    }

    bdDataMaster = { labels: [...labelsX], actual: [...actual], ideal: [...ideal] };

    chartBD = new Chart(document.getElementById('chartBurnDown'), {
        type: 'line', 
        data: { labels: labelsX, datasets: [
            { label: 'Consumo Real', data: actual, borderColor: '#1f6feb', borderWidth: 3, fill: false, segment: {borderColor: c => c.p0.parsed.y < 0 ? cF : '#1f6feb'} },
            { label: 'Gasto Ideal', data: ideal, borderColor: 'rgba(63,185,80,0.3)', borderDash:[5,5], pointRadius:0 }
        ]},
        options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{ticks:{color: cT}}, y:{ticks:{color:cT}} } }
    });

    const sorted = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,8); 
    const aliasMap = { "Gastos Fijos (Búnker)": "Fijos", "Mantenimiento Hardware (Salud)": "Salud", "Alimentación & Supermercado": "Super", "Transferencia Propia / Ahorro": "Ahorro", "Ocio & Experiencias": "Ocio", "Transporte & Logística": "Transp", "Dopamina & Antojos": "Dopa", "Transferencia Recibida": "Ingreso" };

    chartP = new Chart(document.getElementById('chartPareto'), {
        type: 'bar', 
        data: { labels: sorted.map(c => aliasMap[c[0]] || c[0].split(' ')[0]), datasets: [{ label: 'Gasto', data: sorted.map(c => c[1]), backgroundColor: '#1f6feb', borderRadius: 4 }] },
        options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{ticks:{color:cT}}, y:{ticks:{color:cT}} } }
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
    
    if(elNavMes) elNavMes.value = tM; 
    if(elNavAnio) elNavAnio.value = tA;
    aplicarCicloAlSistema();
}

function editarMovimiento(id) {
    const mov = listaMovimientos.find(m => m.firestoreId === id);
    if(!mov) return;
    document.getElementById('editId').value = mov.firestoreId; 
    document.getElementById('inputNombre').value = mov.nombre;
    document.getElementById('inputMonto').value = mov.monto.toLocaleString('es-CL');
    document.getElementById('inputCategoria').value = mov.categoria || 'Sin Categoría';
    
    let tipoC = mov.tipo || 'Gasto';
    if (mov.catV === 'Transferencia Recibida' || mov.catV === 'Ingreso Adicional') tipoC = 'Ingreso';
    if (mov.catV === 'Transferencia Propia / Ahorro') tipoC = 'Ahorro';
    document.getElementById('inputTipo').value = tipoC;
    
    document.getElementById('inputFecha').value = new Date(mov.ms - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

    const btn = document.getElementById('btnGuardar');
    if(btn) { btn.innerHTML = "💾 ACTUALIZAR"; btn.style.backgroundColor = "var(--color-edit)"; }
    modoEdicionActivo = true;

    if (window.innerWidth <= 1024 && typeof switchTab === "function") switchTab('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    }).catch(err => { alert("❌ Error"); btn.innerHTML = "ERROR"; btn.disabled = false; });
}

function formatearEntradaNumerica(i) { let v = i.value.replace(/\D/g,''); i.value = v ? parseInt(v).toLocaleString('es-CL') : ''; }
function toggleTheme() { document.body.classList.toggle('light-theme'); }
setInterval(() => { const c = document.getElementById('cronos'); if(c) c.innerText = new Date().toLocaleString('es-CL').toUpperCase(); }, 1000);

let draggedRowId = null;
function dragStart(e, id) { draggedRowId = id; e.dataTransfer.effectAllowed = 'move'; setTimeout(() => e.target.style.opacity = '0.4', 0); }
function dragOver(e) { e.preventDefault(); e.target.closest('tr').style.borderTop = '3px solid var(--color-ingresos)'; }
function dragLeave(e) { e.target.closest('tr').style.borderTop = ''; }
function dropRow(e, targetId) {
    e.preventDefault(); e.target.closest('tr').style.borderTop = '';
    if (!draggedRowId || draggedRowId === targetId) return;
    if (currentSort.column !== 'ms') return alert("⚠️ ALARMA: Ordenar por Fecha antes de recalibrar.");

    let vistaActual = [...datosMesGlobal].sort((a, b) => a.ms - b.ms);
    let draggedIdx = vistaActual.findIndex(x => x.firestoreId === draggedRowId);
    let targetIdx = vistaActual.findIndex(x => x.firestoreId === targetId);

    let t1_idx = targetIdx > draggedIdx ? targetIdx : targetIdx - 1;
    let t2_idx = targetIdx > draggedIdx ? targetIdx + 1 : targetIdx;

    let t1_ms = t1_idx >= 0 ? vistaActual[t1_idx].ms : null;
    let t2_ms = t2_idx < vistaActual.length ? vistaActual[t2_idx].ms : null;

    let newTimeMs; let dir = currentSort.direction;
    if (t1_ms && t2_ms) newTimeMs = t1_ms + (t2_ms - t1_ms) / 2;
    else if (!t1_ms) newTimeMs = t2_ms + (dir === 'desc' ? 60000 : -60000); 
    else if (!t2_ms) newTimeMs = t1_ms + (dir === 'desc' ? -60000 : 60000);

    if(confirm("⚙️ ¿Inyectar nuevo Timestamp?")) db.collection("movimientos").doc(draggedRowId).update({ fecha: new Date(newTimeMs) });
    draggedRowId = null;
}
document.addEventListener('dragend', (e) => { if(e.target.tagName === 'TR') e.target.style.opacity = '1'; });

function toggleAllChecks() { const c=document.getElementById('checkAll'); if(c) document.querySelectorAll('.row-check').forEach(cb=>cb.checked=c.checked); updateMassActions(); }
function updateMassActions() { const bar=document.getElementById('massActionsBar'); if(!bar) return; const cnt=document.querySelectorAll('.row-check:not(#checkAll):checked').length; bar.style.display=cnt>0?'flex':'none'; document.getElementById('massCount').innerText=`${cnt} seleccionado(s)`; if(cnt===0) document.getElementById('checkAll').checked=false; }
function massDelete() { const ids=Array.from(document.querySelectorAll('.row-check:not(#checkAll):checked')).map(cb=>cb.value); if(ids.length===0||!confirm(`⚠️ ¿Eliminar ${ids.length} registro(s)?`)) return; Promise.all(ids.map(id=>db.collection("movimientos").doc(id).delete())).then(()=>{ document.getElementById('massActionsBar').style.display='none'; document.getElementById('checkAll').checked=false; }); }
function massCategorize() { const ids=Array.from(document.querySelectorAll('.row-check:not(#checkAll):checked')).map(cb=>cb.value); const cat=document.getElementById('massCategorySelect').value; if(ids.length===0||!cat||!confirm(`¿Categorizar como "${cat}"?`)) return; Promise.all(ids.map(id=>db.collection("movimientos").doc(id).update({categoria:cat}))).then(()=>{ document.getElementById('massActionsBar').style.display='none'; document.getElementById('checkAll').checked=false; }); }

// 🟢 ZOOM DINÁMICO 🟢
window.hacerZoomGrafico = function(diaIn, diaFin) {
    if(!chartBD || !bdDataMaster) return;
    let inicio = parseInt(diaIn); let fin = parseInt(diaFin);
    if(isNaN(inicio) || isNaN(fin) || inicio >= fin) return;
    chartBD.data.labels = bdDataMaster.labels.slice(inicio, fin + 1);
    chartBD.data.datasets[0].data = bdDataMaster.actual.slice(inicio, fin + 1);
    chartBD.data.datasets[1].data = bdDataMaster.ideal.slice(inicio, fin + 1);
    chartBD.update();
};
