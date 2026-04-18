// ==========================================================
// 🧠 BÚNKER SCADA - MOTOR LÓGICO V31.9.5 (NÚCLEO ESTABLE)
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
    
    const { T0, TFinal } = calcularFechasCiclo(mesVal, anioVal);
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
    
    const txtSaldoProy = document.getElementById('txtProyectado');
    if(txtSaldoProy) {
        const sP = saldoAcc + tC;
        txtSaldoProy.innerHTML = sP < CREDIT_SETPOINT ? `<span style="color:var(--accent-red)">⚠️ ${sP.toLocaleString('es-CL')}</span>` : sP.toLocaleString('es-CL');
    }

    const diasCiclo = Math.round((TFinal - T0) / 86400000);
    const hoy = new Date();
    let diasT = (hoy >= T0 && hoy < TFinal) ? Math.max(Math.floor((hoy - T0) / 86400000) + 1, 1) : (hoy >= TFinal ? diasCiclo : 0);
    let proyC = saldoAcc - ((tO / Math.max(diasT, 1)) * Math.max(diasCiclo - diasT, 0));
    setTxt('txtProyeccionCierre', Math.round(proyC));

    const setW = (id, val) => { const el = document.getElementById(id); if(el) el.style.width = Math.min(val, 100) + "%"; };
    setW('barFijos', (tF / (sueldo || 1)) * 100); setW('barOtros', (tO / (sueldo || 1)) * 100);
    
    const pctFugas = sueldo > 0 ? ((tEvitable / sueldo) * 100).toFixed(1) : 0;
    const txtPctFugas = document.getElementById('txtPorcentajeFugas');
    const barraEvitable = document.getElementById('barEvitable');
    if(txtPctFugas && barraEvitable) {
        txtPctFugas.innerText = pctFugas + '%';
        barraEvitable.style.width = Math.min(pctFugas, 100) + "%";
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
        let d = new Date(x.fechaISO);
        let dS = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} <span class="col-hora">${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}</span>`;
        let colorMonto = x.esIn ? "var(--accent-blue)" : x.esNeutro ? "var(--accent-orange)" : "var(--text-main)";
        const montoSeguro = x.monto || 0;
        const nombreLimpio = (x.nombre || "Sin descripción").replace(/'/g, "\\'");

        if (contenedorPC) {
            htmlPC += `<tr>
                <td class="hide-mobile"><input type="checkbox" class="row-check" value="${x.firestoreId}"></td>
                <td class="hide-mobile">☰</td><td class="hide-mobile">${x.indiceVista}</td>
                <td>${dS}</td><td>${x.nombre}</td><td class="hide-mobile">${em} ${x.catV}</td>
                <td style="color:${colorMonto}">$${montoSeguro.toLocaleString('es-CL')}</td>
                <td class="hide-mobile">$${x.saldoCalculadoVista.toLocaleString('es-CL')}</td>
                <td class="hide-mobile">${catEvitables.includes(x.catV) ? '100%' : '0%'}</td>
                <td class="hide-mobile">OK</td>
                <td><button onclick="editarMovimiento('${x.firestoreId}')">✏️</button></td>
            </tr>`;
        }

        if (contenedorMovil) {
            const clickAction = typeof openBottomSheet === 'function' ? `openBottomSheet('${x.firestoreId}', '${nombreLimpio}', ${montoSeguro})` : `editarMovimiento('${x.firestoreId}')`;
            htmlMovil += `<div class="mobile-card" onclick="${clickAction}">
                <div style="font-size: 1.5rem; margin-right:15px;">${em}</div>
                <div style="flex: 1;">
                    <div style="font-weight:bold;">${x.nombre}</div>
                    <div style="font-size:0.7rem; color:var(--text-dim);">${dS} • ${x.catV}</div>
                </div>
                <div style="font-weight:900; color:${colorMonto}">${x.esIn?'+':(x.esNeutro?'=':'-')}$${montoSeguro.toLocaleString('es-CL')}</div>
            </div>`;
        }
    });

    if (contenedorPC) contenedorPC.innerHTML = htmlPC; 
    if (contenedorMovil) contenedorMovil.innerHTML = htmlMovil;
}

function dibujarGraficos(sueldo, chronData, cats, diasCiclo, T0) {
    if(chartBD) chartBD.destroy(); if(chartP) chartP.destroy();
    const cT = "#f0f6fc", cG = "#30363d", cF = "#ff5252";
    let daily = Array(diasCiclo + 1).fill(0);
    chronData.forEach(m => {
        let diff = Math.floor((new Date(m.fechaISO) - T0) / 86400000) + 1;
        if(diff >= 1 && diff <= diasCiclo) { if(m.esIn) daily[diff] += m.monto; else if(!m.esNeutro) daily[diff] -= m.monto; }
    });

    let actual = [sueldo], ideal = [sueldo], labelsX = ["INI"], acc = sueldo;
    let limit = Math.floor((new Date() - T0) / 86400000) + 1;
    for(let i=1; i<=diasCiclo; i++) {
        ideal.push(sueldo - (sueldo/diasCiclo)*i); 
        acc += daily[i]; actual.push(i > limit ? null : acc);
        labelsX.push(String(new Date(T0.getTime() + (i-1)*86400000).getDate()).padStart(2,'0'));
    }

    chartBD = new Chart(document.getElementById('chartBurnDown'), {
        type: 'line', data: { labels: labelsX, datasets: [
            { label: 'Real', data: actual, borderColor: '#1f6feb', borderWidth: 3, fill: false },
            { label: 'Ideal', data: ideal, borderColor: 'rgba(63,185,80,0.3)', borderDash:[5,5], pointRadius:0 }
        ]},
        options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{ticks:{color:cT}}, y:{ticks:{color:cT}} } }
    });

    const sorted = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,6);
    chartP = new Chart(document.getElementById('chartPareto'), {
        type: 'bar', data: { labels: sorted.map(c => c[0].substring(0,6)), datasets: [{ data: sorted.map(c => c[1]), backgroundColor: '#1f6feb' }] },
        options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{ticks:{color:cT}}, y:{ticks:{color:cT}} } }
    });
}

function calcularFechasCiclo(mes, anio) {
    let mesI = mes - 1, anioI = anio; if (mesI < 0) { mesI = 11; anioI--; }
    return { T0: new Date(anioI, mesI, 30), TFinal: new Date(anio, mes, 30) };
}

function aplicarCicloAlSistema() {
    const mes = document.getElementById('navMesConceptual');
    const anio = document.getElementById('navAnio');
    if(!mes || !anio) return;
    const { T0, TFinal } = calcularFechasCiclo(parseInt(mes.value), parseInt(anio.value));
    const badge = document.getElementById('navRangoBadge');
    if(badge) badge.innerText = `${T0.getDate()}/${T0.getMonth()+1} - 30/${parseInt(mes.value)+1}`;
    cargarSueldoVisual(); actualizarDashboard();
}

function formatearEntradaNumerica(i) { let v = i.value.replace(/\D/g,''); i.value = v ? parseInt(v).toLocaleString('es-CL') : ''; }
