// ==========================================================
// 🧠 BÚNKER SCADA - MOTOR LÓGICO V8.3 (DRAG & DROP ENTRE PANELES)
// ==========================================================
const BYRON_EMAIL = "bvhcc94@gmail.com"; 
const CREDIT_SETPOINT = -300000; 
const catEvitables = ["Dopamina & Antojos"]; 
const SUELDO_BASE_DEFAULT = 3602505;

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
const aliasMap = {}; 
catMaestras.forEach(c => { catEmojis[c.id] = c.em; aliasMap[c.id] = c.label; });

document.addEventListener("DOMContentLoaded", () => {
    const optionsHTML = catMaestras.map(c => `<option value="${c.id}">${c.em} ${c.label}</option>`).join('');
    const selectManual = document.getElementById('inputCategoria');
    if (selectManual) {
        selectManual.innerHTML = optionsHTML;
        
        selectManual.addEventListener('change', (e) => {
            const fEl = document.getElementById('inputFuga');
            if(fEl) fEl.value = (e.target.value === "Dopamina & Antojos") ? "100" : "0";
            
            const boxC = document.getElementById('boxCuotas');
            if(boxC) boxC.style.display = (e.target.value === "Gasto Tarjeta de Crédito") ? "grid" : "none";
        });
    }
    const selectMass = document.getElementById('massCategorySelect');
    if (selectMass) selectMass.innerHTML = `<option value="">-- Recategorizar a --</option>` + optionsHTML;
});

const logosComerciales = { "uber": "uber.com", "pedidosya": "pedidosya.com", "mcdonald": "mcdonalds.com", "starbucks": "starbucks.cl", "jumbo": "jumbo.cl", "lider": "lider.cl" };
function obtenerIconoVisual(nombre, emojiFallback) {
    if(!nombre) return `<span style="font-size:1.4rem;">${emojiFallback}</span>`;
    let n = nombre.toLowerCase();
    for (let marca in logosComerciales) {
        if (n.includes(marca)) return `<img src="https://logo.clearbit.com/${logosComerciales[marca]}?size=100" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; background: white;" onerror="this.outerHTML='<span style=\\'font-size:1.4rem;\\'>${emojiFallback}</span>'">`;
    }
    return `<span style="font-size:1.4rem;">${emojiFallback}</span>`;
}

let bdDataMaster = null; 
firebase.initializeApp({ apiKey: "AIzaSyBiYETN_JipXWhMq9gKz-2Pap-Ce4ZJNAI", authDomain: "finanzas-bcuevas.firebaseapp.com", projectId: "finanzas-bcuevas" });
const db = firebase.firestore(), auth = firebase.auth();

let listaMovimientos = [], datosMesGlobal = []; 
let chartBD = null, chartP = null, chartDiario = null, chartRadar = null;
let currentSort = { column: 'fechaISO', direction: 'desc' }; 
let modoEdicionActivo = false, sueldosHistoricos = {}; 

function obtenerSueldoMes(anio, mes) {
    let llave = `${anio}_${mes}`;
    if (sueldosHistoricos[llave]) return sueldosHistoricos[llave];
    let prevMes = mes - 1; let prevAnio = anio;
    if(prevMes < 0) { prevMes = 11; prevAnio--; }
    let llavePrev = `${prevAnio}_${prevMes}`;
    return sueldosHistoricos[llavePrev] || SUELDO_BASE_DEFAULT;
}

window.mostrarToast = function(mensaje) {
    let toast = document.getElementById('toast-notif');
    if(!toast) {
        toast = document.createElement('div'); toast.id = 'toast-notif';
        toast.style.cssText = 'position:fixed; top:-100px; left:50%; transform:translateX(-50%); background:var(--color-ingresos, #1f6feb); color:#fff; padding:12px 24px; border-radius:30px; font-weight:900; font-size:0.85rem; z-index:10000; transition:top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow:0 10px 25px rgba(31,111,235,0.4); text-transform:uppercase; letter-spacing:0.5px; pointer-events:none;';
        document.body.appendChild(toast);
    }
    toast.innerHTML = '✅ ' + mensaje;
    toast.style.top = 'max(20px, env(safe-area-inset-top))';
    setTimeout(() => { toast.style.top = '-100px'; }, 3500);
};

function loginWithGoogle() { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
function logout() { auth.signOut().then(() => window.location.reload()); }

auth.onAuthStateChanged(user => {
    if (user && user.email.toLowerCase() === BYRON_EMAIL.toLowerCase()) {
        const loginScreen = document.getElementById('login-screen'), reportZone = document.getElementById('reportZone');
        if(loginScreen) loginScreen.style.display = 'none';
        if(reportZone) reportZone.classList.add('active-app');
        
        const userDisplay = document.getElementById('user-display');
        if(userDisplay) userDisplay.innerText = user.displayName.split(" ")[0];
        
        db.collection("parametros").doc("sueldos").onSnapshot(snap => { if(snap.exists) sueldosHistoricos = snap.data(); });

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
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio'), elSueldo = document.getElementById('inputSueldo');
    if(!elMes || !elAnio || !elSueldo) return;
    const sueldoActivo = obtenerSueldoMes(parseInt(elAnio.value), parseInt(elMes.value));
    if (document.activeElement !== elSueldo) elSueldo.value = sueldoActivo.toLocaleString('es-CL');
}

function guardarSueldoEnNube() {
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio'), elSueldo = document.getElementById('inputSueldo');
    if(!elMes || !elAnio || !elSueldo) return;
    const valor = parseInt(elSueldo.value.replace(/\./g,'')) || 0;
    elSueldo.style.color = "var(--color-saldo)"; setTimeout(() => elSueldo.style.color = "inherit", 800);
    db.collection("parametros").doc("sueldos").set({ [`${elAnio.value}_${elMes.value}`]: valor }, { merge: true });
    actualizarDashboard();
}

function actualizarDashboard() {
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio');
    const mesVal = parseInt(elMes.value), anioVal = parseInt(elAnio.value);
    
    const inputSueldo = document.getElementById('inputSueldo');
    const sueldo = inputSueldo && document.activeElement === inputSueldo ? parseInt(inputSueldo.value.replace(/\./g,'')) : obtenerSueldoMes(anioVal, mesVal);
    
    const buscador = document.getElementById('inputBuscador');
    const b = buscador ? buscador.value.toLowerCase() : '';
    let { T0, TFinal } = calcularFechasCiclo(mesVal, anioVal);
    
    const fDesde = document.getElementById('filtroDesde') ? document.getElementById('filtroDesde').value : '';
    const fHasta = document.getElementById('filtroHasta') ? document.getElementById('filtroHasta').value : '';
    if(fDesde) { let [y,m,d] = fDesde.split('-'); T0 = new Date(y, m-1, d); }
    if(fHasta) { let [y,m,d] = fHasta.split('-'); TFinal = new Date(y, m-1, d, 23, 59, 59); }
    
    let dataMes = listaMovimientos.filter(x => { let d = new Date(x.fechaISO); return d >= T0 && d <= TFinal; });
    dataMes.forEach(x => {
        x.catV = x.categoria || 'Sin Categoría';
        if (x.monto <= 1000 && x.catV === 'Sin Categoría') x.catV = "Ruido de Sistema";
        x.esIn = x.tipo === 'Ingreso' || x.catV === 'Transferencia Recibida' || x.catV === 'Ingreso Adicional';
        x.esNeutro = x.tipo === 'Por Cobrar' || x.tipo === 'Ahorro' || x.catV === 'Transferencia Propia / Ahorro';
    });

    datosMesGlobal = [...dataMes];
    let saldoAcc = sueldo, tI = 0, tF = 0, tO = 0, tC = 0, tEvitable = 0, gCat = {};
    let datosTC = [], totalTC = 0;
    
    [...dataMes].sort((x,y) => x.fechaISO < y.fechaISO ? -1 : 1).forEach(x => {
        if (x.catV === 'Gasto Tarjeta de Crédito') {
            datosTC.push(x);
            totalTC += x.monto;
        } 
        else { 
            if (x.esIn) { tI += x.monto; saldoAcc += x.monto; }
            else if (x.tipo === 'Por Cobrar') tC += x.monto;
            else if (!x.esNeutro) {
                saldoAcc -= x.monto;
                if (x.tipo === 'Gasto Fijo') tF += x.monto; else tO += x.monto;
                gCat[x.catV] = (gCat[x.catV] || 0) + x.monto;
                
                let pctFuga = x.innecesarioPct !== undefined ? x.innecesarioPct : (catEvitables.includes(x.catV) ? 100 : 0);
                tEvitable += (x.monto * (pctFuga / 100));
            }
        }
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

    const diasCiclo = Math.max(1, Math.round((TFinal - T0) / 86400000));
    const hoy = new Date();
    let diasT = (hoy >= T0 && hoy <= TFinal) ? Math.max(Math.floor((hoy - T0) / 86400000) + 1, 1) : (hoy > TFinal ? diasCiclo : 0);
    
    const badgeDias = document.getElementById('badgeDias');
    if(badgeDias) badgeDias.innerText = `${Math.max(diasCiclo - diasT, 0)}`;
    
    let proyC = saldoAcc - ((tO / Math.max(diasT, 1)) * Math.max(diasCiclo - diasT, 0));
    setTxt('txtProyeccionCierre', Math.round(proyC));

    const setW = (id, val) => { const el = document.getElementById(id); if(el) el.style.width = Math.min(val, 100) + "%"; };
    setW('barFijos', (tF / (sueldo || 1)) * 100); setW('barOtros', (tO / (sueldo || 1)) * 100);
    setTxt('txtTotalEvitable', Math.round(tEvitable));
    const pctFugas = sueldo > 0 ? ((tEvitable / sueldo) * 100).toFixed(1) : 0;
    
    const txtPctFugas = document.getElementById('txtPorcentajeFugas');
    const barraEvitable = document.getElementById('barEvitable');
    if(txtPctFugas && barraEvitable) {
        txtPctFugas.innerText = pctFugas + '%'; barraEvitable.style.width = Math.min(pctFugas, 100) + "%";
        if (pctFugas < 5) { txtPctFugas.style.color = "var(--color-saldo)"; barraEvitable.style.backgroundColor = "var(--color-saldo)"; } 
        else if (pctFugas <= 10) { txtPctFugas.style.color = "#ff9800"; barraEvitable.style.backgroundColor = "#ff9800"; } 
        else { txtPctFugas.style.color = "var(--color-fuga)"; barraEvitable.style.backgroundColor = "var(--color-fuga)"; }
    }

    let dataGraficos = dataMes.filter(x => x.catV !== 'Gasto Tarjeta de Crédito');
    
    renderizarListas(sueldo, b);
    renderizarListaTC(datosTC); 
    
    if(document.getElementById('chartBurnDown')) dibujarGraficos(sueldo, [...dataGraficos].sort((x,y) => x.fechaISO < y.fechaISO ? -1 : 1), gCat, diasCiclo, T0);
    
    setTxt('txtGastoTramo', tO + tF);
    setTxt('txtPromedioZoom', Math.round((tO + tF) / diasCiclo));
}    

function renderizarListaTC(datos) {
    const contenedorPC = document.getElementById('listaDetalleTC');
    const contenedorMovil = document.getElementById('listaMovilTC');
    let htmlPC = '', htmlMovil = '';
    
    datos.sort((a,b)=> b.fechaISO > a.fechaISO ? 1 : -1).forEach(x => {
        const d = new Date(x.fechaISO);
        const dateStr = d.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}).toUpperCase();
        const cuotas = x.cuotas || 1;
        const valorCuota = Math.round(x.monto / cuotas);
        const cuotaStr = cuotas > 1 ? `${cuotas}x $${valorCuota.toLocaleString('es-CL')}` : '1 Cuota';
        
        const clickAction = `editarMovimiento('${x.firestoreId}')`;
        
        if(contenedorPC) {
            // Fíjate que añadimos draggable="true" aquí también
            htmlPC += `<tr style="border-bottom:1px solid var(--border-color); cursor:pointer;" draggable="true" ondragstart="dragStart(event, '${x.firestoreId}')" onclick="${clickAction}">
                <td style="font-size:0.65rem; color:var(--text-muted); padding:6px 4px;">${dateStr}</td>
                <td style="font-size:0.75rem; font-weight:700; padding:6px 4px;">${x.nombre}</td>
                <td style="font-size:0.65rem; color:var(--accent-blue); padding:6px 4px; text-align:center;">${cuotaStr}</td>
                <td style="font-size:0.8rem; font-weight:bold; color:var(--color-fuga); text-align:right; padding:6px 4px;">$${x.monto.toLocaleString('es-CL')}</td>
            </tr>`;
        }
        if(contenedorMovil) {
            htmlMovil += `
            <div class="mobile-card" style="background:var(--bg-card) !important; border:1px solid rgba(31,111,235,0.2) !important; margin-bottom:8px;" onclick="${typeof openBottomSheet === 'function' ? `openBottomSheet('${x.firestoreId}', '${x.nombre.replace(/'/g, "\\'")}', ${x.monto})` : clickAction}">
                <div style="font-size:1.5rem; margin-right:15px; text-shadow: 0 2px 5px rgba(0,0,0,0.5);">💳</div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight:bold; font-size:0.95rem; color: var(--text-main);">${x.nombre}</div>
                    <div style="font-size:0.7rem; color:var(--accent-blue); margin-top:2px;">${dateStr} • ${cuotaStr}</div>
                </div>
                <div style="font-weight:900; color:var(--color-fuga); font-size:1.05rem;">$${x.monto.toLocaleString('es-CL')}</div>
            </div>`;
        }
    });

    if(contenedorPC) {
        if(datos.length === 0) contenedorPC.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.7rem;">Sin movimientos TC este periodo</td></tr>`;
        else contenedorPC.innerHTML = htmlPC;
    }
    if(contenedorMovil) {
        if(datos.length === 0) contenedorMovil.innerHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-dim);">💳<br>Sin deuda registrada este periodo.</div>`;
        else contenedorMovil.innerHTML = htmlMovil;
    }
    
    const txtTotalTC = document.getElementById('txtTotalTC');
    if(txtTotalTC) txtTotalTC.innerText = datos.reduce((sum, x) => sum + x.monto, 0).toLocaleString('es-CL');
}

function renderizarListas(sueldoBase, filtroBuscador) {
    let datos = [...datosMesGlobal].filter(x => x.catV !== 'Gasto Tarjeta de Crédito'); 
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
        if(contenedorMovil) contenedorMovil.innerHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-dim);"><i>📡</i><br>Sin telemetría en este periodo.</div>`;
        if(contenedorPC) contenedorPC.innerHTML = `<tr><td colspan="11" style="text-align:center;">Sin telemetría en este periodo.</td></tr>`;
        return;
    }

    let htmlMovil = ''; let htmlPC = '';
    let currentDayGroup = ""; 
    
    let now = new Date(); now.setHours(0,0,0,0);
    let yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);

    datos.forEach((x, idx) => {
        const d = new Date(x.fechaISO);
        let dClean = new Date(d); dClean.setHours(0,0,0,0);
        const dateStr = d.toLocaleDateString('es-CL');
        const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        
        if (currentSort.column === 'fechaISO' && currentSort.direction === 'desc' && dateStr !== currentDayGroup) {
            let labelText = dateStr;
            if (dClean.getTime() === now.getTime()) labelText = "HOY";
            else if (dClean.getTime() === yesterday.getTime()) labelText = "AYER";
            else {
                const meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
                labelText = `${d.getDate()} ${meses[d.getMonth()]}`;
            }
            if (contenedorMovil) htmlMovil += `<div class="date-header">${labelText}</div>`;
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
            let pctFugaStr = x.innecesarioPct !== undefined ? x.innecesarioPct + '%' : (catEvitables.includes(x.catV) ? '100%' : '0%');
            htmlPC += `<tr style="${bgEdicion}" draggable="true" ondragstart="dragStart(event, '${x.firestoreId}')" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="dropRow(event, '${x.firestoreId}')">
                <td class="col-check hide-mobile"><input type="checkbox" class="row-check" value="${x.firestoreId}" onchange="updateMassActions()"></td>
                <td class="col-drag hide-mobile" style="cursor: grab; text-align: center; color: var(--text-muted); font-size: 1.2rem;">☰</td>
                <td class="hide-mobile" style="text-align:center; font-size:0.75rem; font-weight:800; color:var(--text-muted);">${x.indiceVista}</td>
                <td style="font-size:0.75rem; color:var(--text-muted);">${dateStr} <span class="col-hora">${timeStr}</span></td>
                <td class="col-desc" style="font-weight:700;" title="${nombreSeguro}">${nombreSeguro}</td>
                <td class="hide-mobile" style="font-size:0.75rem;"><span class="cat-badge">${em} ${x.catV}</span></td>
                <td class="col-monto" style="color:${colorMonto};">${iconImpacto}$${montoSeguro.toLocaleString('es-CL')}</td>
                <td class="col-monto hide-mobile" style="color:${colorSaldo};">$${x.saldoCalculadoVista.toLocaleString('es-CL')}</td>
                <td class="hide-mobile" style="text-align:center; font-size:0.7rem; color:var(--text-muted);">${pctFugaStr}</td>
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
    if(document.getElementById('inputCategoria')) {
        document.getElementById('inputCategoria').value = mov.categoria || 'Sin Categoría';
        const boxC = document.getElementById('boxCuotas');
        if(boxC) boxC.style.display = (mov.categoria === "Gasto Tarjeta de Crédito") ? "grid" : "none";
    }
    if(document.getElementById('inputFuga')) document.getElementById('inputFuga').value = mov.innecesarioPct !== undefined ? mov.innecesarioPct : "0";
    if(document.getElementById('inputCuotas')) document.getElementById('inputCuotas').value = mov.cuotas !== undefined ? mov.cuotas : "1";

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
    
    const iFugaEl = document.getElementById('inputFuga');
    const pctFuga = iFugaEl ? parseInt(iFugaEl.value) : (catEvitables.includes(c) ? 100 : 0);
    
    const cuotasEl = document.getElementById('inputCuotas');
    const cantCuotas = (cuotasEl && c === "Gasto Tarjeta de Crédito") ? parseInt(cuotasEl.value) : 1;

    if (!m || !n || !fInput) return alert("⚠️ Faltan datos críticos.");
    const btn = document.getElementById('btnGuardar');
    btn.innerHTML = "⏳ GUARDANDO..."; btn.disabled = true;
    const dataPayload = { nombre: n, monto: m, categoria: c, tipo: t, fecha: new Date(fInput), status: 'Manual', innecesarioPct: pctFuga, cuotas: cantCuotas };
    let op = (modoEdicionActivo && editId) ? db.collection("movimientos").doc(editId).update(dataPayload) : db.collection("movimientos").add(dataPayload);
    op.then(() => {
        document.getElementById('editId').value = ''; document.getElementById('inputNombre').value = ''; document.getElementById('inputMonto').value = '';
        btn.innerHTML = "GUARDAR EN BÚNKER"; btn.style.backgroundColor = "var(--color-guardar)"; btn.disabled = false; modoEdicionActivo = false;
        
        if (typeof mostrarToast === "function") mostrarToast("REGISTRO GUARDADO EN EL BÚNKER");
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
        let f = new Date(msT0 + (i-1)*86400000); let dia = String(f.getDate()).padStart(2, '0');
        let mesStr = nombresMes[f.getMonth()];
        labelsFechas.push(`${dia} ${mesStr}`); 
        
        if (f.getDate() === 1) { labelsX.push(`${dia} ${mesStr}`); colorLabelsX.push('#ff9800'); colorGridX.push('#ff9800'); } 
        else { labelsX.push(dia); colorLabelsX.push(cT); colorGridX.push(cG); }
    }

    bdDataMaster = { labels: [...labelsX], labelsFechas: [...labelsFechas], actual: [...actual], ideal: [...ideal], daily: [...daily], dailyGastosVar: [...dailyGastosVar], colorsX: [...colorLabelsX], colorsG: [...colorGridX] };

    let maxReal = Math.max(...actual.filter(v => v !== null));
    let yMax = maxReal > sueldo ? Math.ceil(maxReal * 1.05) : sueldo;

    chartBD = new Chart(document.getElementById('chartBurnDown'), {
        type: 'line', 
        data: { labels: labelsX, datasets: [
            { label: 'Consumo Real', data: actual, borderColor: '#1f6feb', borderWidth: 3, fill: false, pointRadius: 2 },
            { label: 'Gasto Ideal', data: ideal, borderColor: 'rgba(63,185,80,0.3)', borderDash:[5,5], pointRadius:0 }
        ]},
        options: { 
            maintainAspectRatio:false, plugins:{legend:{display:false}}, 
            scales:{ 
                x:{ticks:{color: colorLabelsX, maxRotation: 45, minRotation: 45, font: (c) => ({ weight: colorLabelsX[c.index] === '#ff9800' ? '900' : 'bold', size: 9 }) }, grid:{color: colorGridX, drawBorder:false, lineWidth: (c) => colorGridX[c.index] === '#ff9800' ? 2 : 1 } }, 
                y:{ max: yMax, ticks:{color:cT, callback:v=>'$'+Math.round(v/1000)+'k'}, grid:{color: c => c.tick.value === 0 ? cF : cG} } 
            },
            layout: { padding: { bottom: 0, top: 0, left:0, right:0 } }
        }
    });

    const sorted = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,8); const totalTop8 = sorted.reduce((sum, val) => sum + val[1], 0) || 1;
    let acumulado = 0; const dataAcumulada = sorted.map(c => { acumulado += c[1]; return (acumulado / totalTop8) * 100; });

    chartP = new Chart(document.getElementById('chartPareto'), {
        type: 'bar', 
        data: { labels: sorted.map(c => aliasMap[c[0]] || c[0].split(' ')[0]), datasets: [
            { type: 'line', label: '% Acumulado', data: dataAcumulada, borderColor: '#ff9800', borderWidth: 2, borderDash: [5, 5], pointBackgroundColor: '#ff9800', pointRadius: 3, fill: false, yAxisID: 'y1' },
            { type: 'bar', label: 'Gasto', data: sorted.map(c => c[1]), backgroundColor: '#1f6feb', borderRadius: 4, yAxisID: 'y' }
        ]},
        options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{ticks:{color:cT, font:{size:9}}}, y:{ type: 'linear', position: 'left', ticks:{color:cT, callback:v=>'$'+Math.round(v/1000)+'k'} }, y1:{ type: 'linear', position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false }, ticks:{color:'#ff9800', callback:v=>Math.round(v)+'%', font:{weight:'bold'}} } } }
    });

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
            data: { labels: rLabels, datasets: [{ label: 'Perfil de Gasto', data: rData, borderColor: '#ff9800', backgroundColor: 'rgba(255,152,0,0.2)', borderWidth: 2 }] },
            options: { maintainAspectRatio: false, scales: { r: { ticks: { display: false }, grid: { color: cG }, angleLines: { color: cG }, pointLabels: { color: cT, font: {size: 9, weight: 'bold'} } } }, plugins: { legend: { display: false } } }
        });
    }
}

function calcularFechasCiclo(mesConceptual, anio) {
    let mesInicio = mesConceptual - 1; let anioInicio = anio; if (mesInicio < 0) { mesInicio = 11; anioInicio--; }
    let T0 = new Date(anioInicio, mesInicio, 30); if (T0.getMonth() !== mesInicio) T0 = new Date(anioInicio, mesInicio + 1, 0); 
    let TFinal = new Date(anio, mesConceptual, 30); if (TFinal.getMonth() !== mesConceptual) TFinal = new Date(anio, mesConceptual + 1, 0);
    return { T0, TFinal, fechaFinVisual: new Date(TFinal.getTime() - 86400000) };
}

window.navegarMes = function(direccion) {
    const navMes = document.getElementById('navMesConceptual'), navAnio = document.getElementById('navAnio');
    if(!navMes || !navAnio) return;
    let m = parseInt(navMes.value), a = parseInt(navAnio.value);
    m += direccion;
    if(m > 11) { m = 0; a++; } else if(m < 0) { m = 11; a--; }
    navMes.value = m; navAnio.value = a;
    aplicarCicloAlSistema();
};

function aplicarCicloAlSistema() {
    const navMes = document.getElementById('navMesConceptual'), navAnio = document.getElementById('navAnio');
    if(!navMes || !navAnio) return;
    const fD = document.getElementById('filtroDesde'), fH = document.getElementById('filtroHasta');
    if(fD) fD.value = ''; if(fH) fH.value = '';
    
    const { T0, fechaFinVisual } = calcularFechasCiclo(parseInt(navMes.value), parseInt(navAnio.value));
    const badge = document.getElementById('navRangoBadge');
    if(badge) badge.innerText = `PERIODO: ${T0.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}).toUpperCase()} - ${fechaFinVisual.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}).toUpperCase()}`;
    cargarSueldoVisual(); actualizarDashboard();
}

// 🟢 LÓGICA DE DRAG AND DROP (TABLA Y PANELES) 🟢
let draggedRowId = null;

window.dragStart = function(e, id) { 
    draggedRowId = id; 
    e.dataTransfer.effectAllowed = 'move'; 
    setTimeout(() => e.target.style.opacity = '0.4', 0); 
}

window.dragOverPanel = function(e, tipo) {
    e.preventDefault();
    const panel = e.currentTarget;
    panel.style.transition = "border-color 0.2s, box-shadow 0.2s";
    if (tipo === 'tc') {
        panel.style.borderColor = "var(--color-fuga)";
        panel.style.boxShadow = "0 0 15px rgba(218, 54, 51, 0.2)";
    } else {
        panel.style.borderColor = "var(--color-ingresos)";
        panel.style.boxShadow = "0 0 15px rgba(31, 111, 235, 0.2)";
    }
}

window.dragLeavePanel = function(e, tipo) {
    const panel = e.currentTarget;
    if (tipo === 'tc') {
        panel.style.borderColor = "rgba(218, 54, 51, 0.3)";
    } else {
        panel.style.borderColor = "var(--border-color)";
    }
    panel.style.boxShadow = "none";
}

window.dropOnPanel = function(e, tipo) {
    e.preventDefault();
    dragLeavePanel(e, tipo); // Resetea los colores
    if (!draggedRowId) return;

    const mov = listaMovimientos.find(m => m.firestoreId === draggedRowId);
    if (!mov) return;

    if (tipo === 'tc' && mov.catV !== 'Gasto Tarjeta de Crédito') {
        if(confirm("💳 ¿Transferir este gasto a la Deuda de Tarjeta de Crédito?")) {
            db.collection("movimientos").doc(draggedRowId).update({
                categoria: "Gasto Tarjeta de Crédito",
                tipo: "Gasto"
            });
            if(typeof mostrarToast === 'function') mostrarToast("TRANSFERIDO A TARJETA DE CRÉDITO");
        }
    } else if (tipo === 'main' && mov.catV === 'Gasto Tarjeta de Crédito') {
        if(confirm("🔄 ¿Devolver a Flujo de Efectivo (Como Ruido de Sistema)?")) {
            db.collection("movimientos").doc(draggedRowId).update({
                categoria: "Ruido de Sistema",
                tipo: "Gasto",
                cuotas: 1
            });
            if(typeof mostrarToast === 'function') mostrarToast("DEVUELTO A FLUJO DE EFECTIVO");
        }
    }
    draggedRowId = null;
}

window.dragOver = function(e) { 
    e.preventDefault(); 
    e.currentTarget.style.borderTop = '3px solid var(--color-ingresos)'; 
}

window.dragLeave = function(e) { 
    e.currentTarget.style.borderTop = ''; 
}

window.dropRow = function(e, targetId) {
    e.preventDefault(); 
    e.stopPropagation(); // 🟢 CRÍTICO: Evita que el panel reciba el drop si lo sueltas en una fila
    e.currentTarget.style.borderTop = '';
    
    if (!draggedRowId || draggedRowId === targetId) return;
    if (currentSort.column !== 'fechaISO') return alert("⚠️ ALARMA: Para recalibrar el tiempo, la tabla debe estar ordenada por Fecha.");
    
    let vistaActual = [...datosMesGlobal].sort((a, b) => { if (a.fechaISO < b.fechaISO) return currentSort.direction === 'asc' ? -1 : 1; if (a.fechaISO > b.fechaISO) return currentSort.direction === 'asc' ? 1 : -1; return 0; });
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

window.triggerSync = function() {
    fetch("https://script.google.com/macros/s/AKfycbwKlub0qrv8_d24ZuyKKNryqOw1E68xv1_JvPOoEUc6W8TICllFfodNcwkigQE_7AuoNg/exec", {mode:'no-cors'})
    .then(()=>alert("✅ Base de datos Sincronizada."))
    .catch(e => alert("Error de red: " + e));
};

window.enviarReporteTelegram = function() {
    const txtSaldo = document.getElementById('txtSaldo');
    const badge = document.getElementById('navRangoBadge');
    const saldo = txtSaldo ? txtSaldo.innerText : '0';
    const periodo = badge ? badge.innerText : 'Periodo Actual';
    
    const msg = `🏭 *BÚNKER SCADA*\n💰 Saldo: $${saldo}\n🗓️ Periodo: ${periodo}`;
    
    fetch(`https://api.telegram.org/bot8614679709:AAEJGy9yAlKnhjVmJ0VUZpT-YmZQ6J5IOps/sendMessage`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ chat_id: "1484213465", text: msg, parse_mode: 'Markdown' }) 
    })
    .then(r => r.ok ? alert("✅ Telemetría Transmitida a Telegram.") : alert("❌ Error API Telegram"))
    .catch(e => alert("Error de red: " + e));
};
