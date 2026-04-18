// ==========================================================
// 🧠 BÚNKER SCADA - MOTOR LÓGICO V2.0 (UNIVERSAL)
// ==========================================================
const BYRON_EMAIL = "bvhcc94@gmail.com"; 
const CREDIT_SETPOINT = -300000; 
const catEvitables = ["Dopamina & Antojos"]; 
const catEmojis = { "Transferencia": "🔄", "Gastos Fijos (Búnker)": "🏠", "Suscripciones": "📱", "Alimentación & Supermercado": "🛒", "Dopamina & Antojos": "🍔", "Ocio & Experiencias": "🎸", "Transporte & Logística": "🚗", "Mantenimiento Hardware (Salud)": "💊", "Transferencia Propia / Ahorro": "🏦", "Hogar & Búnker": "🛠️", "Red de Apoyo (Familia)": "🫂", "Gasto Tarjeta de Crédito": "💳", "Ingreso Adicional": "💰", "Transferencia Recibida": "📲", "Ruido de Sistema": "⚙️", "Sin Categoría": "❓" };

firebase.initializeApp({
    apiKey: "AIzaSyBiYETN_JipXWhMq9gKz-2Pap-Ce4ZJNAI", authDomain: "finanzas-bcuevas.firebaseapp.com",
    projectId: "finanzas-bcuevas", storageBucket: "finanzas-bcuevas.firebasestorage.app"
});

const db = firebase.firestore(); const auth = firebase.auth();
let listaMovimientos = []; let datosMesGlobal = []; let chartBD = null, chartP = null;
let currentSort = { column: 'fechaISO', direction: 'desc' }; let modoEdicionActivo = false;
let sueldosHistoricos = {}; const SUELDO_BASE_DEFAULT = 3602505;

function loginWithGoogle() { auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider()); }
function logout() { auth.signOut().then(() => window.location.reload()); }

auth.onAuthStateChanged(user => {
    if (user && user.email.toLowerCase() === BYRON_EMAIL.toLowerCase()) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('reportZone').classList.add('active-app');
        document.getElementById('user-display').innerText = user.displayName;
        
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

// --- LÓGICA DE SUELDO DINÁMICO ---
function cargarSueldoVisual() {
    const mesVal = document.getElementById('navMesConceptual').value;
    const anioVal = document.getElementById('navAnio').value;
    const llave = `${anioVal}_${mesVal}`;
    const sueldoActivo = sueldosHistoricos[llave] || SUELDO_BASE_DEFAULT;
    if (document.activeElement !== document.getElementById('inputSueldo')) {
        document.getElementById('inputSueldo').value = sueldoActivo.toLocaleString('es-CL');
    }
}

function guardarSueldoEnNube() {
    const mesVal = document.getElementById('navMesConceptual').value;
    const anioVal = document.getElementById('navAnio').value;
    const llave = `${anioVal}_${mesVal}`;
    const valor = parseInt(document.getElementById('inputSueldo').value.replace(/\./g,'')) || 0;
    const input = document.getElementById('inputSueldo'); input.style.color = "var(--color-saldo)"; setTimeout(() => input.style.color = "inherit", 800);
    db.collection("parametros").doc("sueldos").set({ [llave]: valor }, { merge: true });
    actualizarDashboard();
}

function actualizarDashboard() {
    const sueldo = parseInt(document.getElementById('inputSueldo').value.replace(/\./g,'')) || 0;
    const buscadorEl = document.getElementById('inputBuscador');
    const b = buscadorEl ? buscadorEl.value.toLowerCase() : '';
    
    const mesVal = parseInt(document.getElementById('navMesConceptual').value);
    const anioVal = parseInt(document.getElementById('navAnio').value);
    const { T0, TFinal, fechaFinVisual } = calcularFechasCiclo(mesVal, anioVal);
    
    let dataMes = listaMovimientos.filter(x => { let d = new Date(x.fechaISO); return d >= T0 && d < TFinal; });
    dataMes.forEach(x => {
        x.catV = x.categoria || 'Sin Categoría'; if (x.monto <= 1000 && x.catV === 'Sin Categoría') x.catV = "Ruido de Sistema";
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

    if(document.getElementById('txtTotalFijos')) document.getElementById('txtTotalFijos').innerText = tF.toLocaleString('es-CL');
    if(document.getElementById('txtTotalOtros')) document.getElementById('txtTotalOtros').innerText = tO.toLocaleString('es-CL');
    if(document.getElementById('txtTotalIngresos')) document.getElementById('txtTotalIngresos').innerText = tI.toLocaleString('es-CL');
    if(document.getElementById('txtCxC')) document.getElementById('txtCxC').innerText = tC.toLocaleString('es-CL');
    if(document.getElementById('txtSaldo')) document.getElementById('txtSaldo').innerText = saldoAcc.toLocaleString('es-CL');
    
    const saldoProyVal = saldoAcc + tC;
    const txtSaldoProy = document.getElementById('txtProyectado');
    if(txtSaldoProy) {
        if (saldoProyVal < CREDIT_SETPOINT) txtSaldoProy.innerHTML = '<span style="color:var(--color-fuga)">⚠️ ' + saldoProyVal.toLocaleString('es-CL') + '</span>';
        else txtSaldoProy.innerText = saldoProyVal.toLocaleString('es-CL');
    }

    const diasCiclo = Math.round((TFinal - T0) / 86400000); const hoy = new Date();
    let diasT = (hoy >= T0 && hoy < TFinal) ? Math.max(Math.floor((hoy - T0) / 86400000) + 1, 1) : (hoy >= TFinal ? diasCiclo : 0);
    if(document.getElementById('badgeDias')) document.getElementById('badgeDias').innerText = `${Math.max(diasCiclo - diasT, 0)} DÍAS`;
    
    let proyC = saldoAcc - ((tO / Math.max(diasT, 1)) * Math.max(diasCiclo - diasT, 0));
    if(document.getElementById('txtProyeccionCierre')) document.getElementById('txtProyeccionCierre').innerText = Math.round(proyC).toLocaleString('es-CL');

    if(document.getElementById('barFijos')) document.getElementById('barFijos').style.width = Math.min((tF / (sueldo || 1)) * 100, 100) + "%";
    if(document.getElementById('barOtros')) document.getElementById('barOtros').style.width = Math.min((tO / (sueldo || 1)) * 100, 100) + "%";
    
    const pctFugas = sueldo > 0 ? ((tEvitable / sueldo) * 100).toFixed(1) : 0;
    if(document.getElementById('txtPorcentajeFugas')) document.getElementById('txtPorcentajeFugas').innerText = pctFugas + '%';

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
    datos.forEach((x, idx) => { x.indiceVista = datos.length - idx; if (x.esIn) saldoRelativo += x.monto; else if (!x.esNeutro) saldoRelativo -= x.monto; x.saldoCalculadoVista = saldoRelativo; });

    let htmlBuffer = ''; 
    const contenedorEscritorio = document.getElementById('listaDetalle');
    const contenedorMovil = document.getElementById('listaMovilDetalle');

    datos.forEach(x => {
        const em = catEmojis[x.catV] || "❓"; let d = new Date(x.fechaISO);
        let dS = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        let iconImpacto = x.esIn ? `(+)` : x.esNeutro ? `(=)` : `(-)`;
        let colorMonto = x.esIn ? "var(--color-ingresos)" : x.esNeutro ? "#ff9800" : "var(--text-main)";
        
        // Renderizado para PC (Tabla)
        if(contenedorEscritorio) {
            htmlBuffer += `<tr draggable="true" ondragstart="dragStart(event, '${x.firestoreId}')" ondragover="dragOver(event)" ondrop="dropRow(event, '${x.firestoreId}')">
                <td style="cursor: grab; text-align: center; color: var(--text-muted);">☰</td>
                <td style="text-align:center; font-size:0.75rem; color:var(--text-muted);">${x.indiceVista}</td>
                <td style="font-size:0.75rem; color:var(--text-muted);">${dS}</td>
                <td style="font-weight:700;">${x.nombre}</td>
                <td style="font-size:0.75rem;"><span style="padding:2px 6px; border-radius:4px; border:1px solid #30363d;">${em} ${x.catV}</span></td>
                <td style="text-align:right; color:${colorMonto}; font-family:monospace; font-weight:700;">${iconImpacto}$${x.monto.toLocaleString('es-CL')}</td>
                <td style="text-align:right; font-family:monospace;">$${x.saldoCalculadoVista.toLocaleString('es-CL')}</td>
                <td style="text-align:center;"><button onclick="editarMovimiento('${x.firestoreId}')" style="background:transparent; border:1px solid var(--color-edit); color:var(--color-edit); border-radius:4px; cursor:pointer;">✏️ EDIT</button></td>
            </tr>`;
        }
        
        // Renderizado para MÓVIL (Tarjetas Táctiles)
        if(contenedorMovil) {
            htmlBuffer += `<div class="mobile-card" onclick="editarMovimiento('${x.firestoreId}')">
                <div class="mc-icon">${em}</div>
                <div class="mc-body">
                    <div class="mc-title">${x.nombre}</div>
                    <div class="mc-subtitle">${dS} • ${x.catV}</div>
                </div>
                <div class="mc-amount" style="color:${colorMonto}">${iconImpacto}$${x.monto.toLocaleString('es-CL')}</div>
            </div>`;
        }
    });

    if(contenedorEscritorio) contenedorEscritorio.innerHTML = htmlBuffer;
    if(contenedorMovil) contenedorMovil.innerHTML = htmlBuffer;
}

// RESTO DE FUNCIONES BÁSICAS (CRUD, FECHAS, ETC)
function editarMovimiento(id) {
    const mov = listaMovimientos.find(m => m.firestoreId === id);
    if(!mov) return;
    document.getElementById('editId').value = mov.firestoreId; 
    document.getElementById('inputNombre').value = mov.nombre;
    document.getElementById('inputMonto').value = mov.monto.toLocaleString('es-CL');
    document.getElementById('inputCategoria').value = mov.categoria || 'Sin Categoría';
    let tipoC = mov.tipo || 'Gasto'; if (mov.catV === 'Transferencia Recibida' || mov.catV === 'Ingreso Adicional') tipoC = 'Ingreso';
    document.getElementById('inputTipo').value = tipoC;
    try { let d = new Date(mov.fechaISO); document.getElementById('inputFecha').value = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16); } catch(e) {}
    modoEdicionActivo = true; document.getElementById('btnGuardar').innerHTML = "💾 ACTUALIZAR"; document.getElementById('btnGuardar').style.backgroundColor = "var(--color-edit)";
    
    // Si estamos en móvil, saltar a la pestaña de formulario
    if(typeof switchTab === "function") switchTab('add');
}

function agregarMovimiento() {
    const m = parseInt(document.getElementById('inputMonto').value.replace(/\./g, ''));
    const n = document.getElementById('inputNombre').value;
    const fInput = document.getElementById('inputFecha').value;
    const editId = document.getElementById('editId').value;
    if (!m || !n || !fInput) return alert("Faltan datos");

    const dataPayload = { nombre: n, monto: m, categoria: document.getElementById('inputCategoria').value, tipo: document.getElementById('inputTipo').value, fecha: new Date(fInput) };
    let op = (modoEdicionActivo && editId) ? db.collection("movimientos").doc(editId).update(dataPayload) : db.collection("movimientos").add(dataPayload);
    op.then(() => {
        document.getElementById('editId').value = ''; document.getElementById('inputNombre').value = ''; document.getElementById('inputMonto').value = '';
        modoEdicionActivo = false; document.getElementById('btnGuardar').innerHTML = "GUARDAR"; document.getElementById('btnGuardar').style.backgroundColor = "var(--color-guardar)";
        if(typeof switchTab === "function") switchTab('list'); // Volver a lista en móvil
    });
}

function formatearEntradaNumerica(i) { let v = i.value.replace(/\D/g,''); i.value = v ? parseInt(v).toLocaleString('es-CL') : ''; }
function calcularFechasCiclo(mesConceptual, anio) { let mesInicio = mesConceptual - 1; let anioInicio = anio; if (mesInicio < 0) { mesInicio = 11; anioInicio--; } let T0 = new Date(anioInicio, mesInicio, 30); if (T0.getMonth() !== mesInicio) T0 = new Date(anioInicio, mesInicio + 1, 0); let TFinal = new Date(anio, mesConceptual, 30); if (TFinal.getMonth() !== mesConceptual) TFinal = new Date(anio, mesConceptual + 1, 0); return { T0, TFinal, fechaFinVisual: new Date(TFinal.getTime() - 86400000) }; }
function aplicarCicloAlSistema() { const { T0, fechaFinVisual } = calcularFechasCiclo(parseInt(document.getElementById('navMesConceptual').value), parseInt(document.getElementById('navAnio').value)); document.getElementById('navRangoBadge').innerText = `PERIODO: ${T0.toLocaleDateString('es-CL', {day:'2-digit', month:'short'})} - ${fechaFinVisual.toLocaleDateString('es-CL', {day:'2-digit', month:'short'})}`; cargarSueldoVisual(); actualizarDashboard(); }

// ==========================================
// DRAG AND DROP (SOLO PC)
// ==========================================
let draggedRowId = null;
function dragStart(e, id) { draggedRowId = id; e.dataTransfer.effectAllowed = 'move'; }
function dragOver(e) { e.preventDefault(); }
function dropRow(e, targetId) {
    e.preventDefault(); if (!draggedRowId || draggedRowId === targetId) return;
    let vActual = [...datosMesGlobal].sort((a,b) => a.fechaISO > b.fechaISO ? -1 : 1);
    let dIdx = vActual.findIndex(x => x.firestoreId === draggedRowId); let tIdx = vActual.findIndex(x => x.firestoreId === targetId);
    let t1_idx = tIdx > dIdx ? tIdx : tIdx - 1; let t2_idx = tIdx > dIdx ? tIdx + 1 : tIdx;
    let t1 = t1_idx >= 0 ? new Date(vActual[t1_idx].fechaISO).getTime() : null; let t2 = t2_idx < vActual.length ? new Date(vActual[t2_idx].fechaISO).getTime() : null;
    let newTimeMs; if(t1 && t2) newTimeMs = t1 + (t2-t1)/2; else if(!t1) newTimeMs = t2 - 60000; else newTimeMs = t1 + 60000;
    if(confirm("⚙️ ¿Reordenar fecha para cuadrar?")) db.collection("movimientos").doc(draggedRowId).update({ fecha: new Date(newTimeMs) });
}
