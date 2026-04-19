// ==========================================================
// 🧠 BÚNKER SCADA - MOTOR LÓGICO V31.9.6 (FASE 3: KPI AVANZADO)
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
    const sM = document.getElementById('inputCategoria'); if(sM) sM.innerHTML = optionsHTML;
    const sA = document.getElementById('massCategorySelect'); if(sA) sA.innerHTML = `<option value="">-- Recategorizar a --</option>` + optionsHTML;
});

firebase.initializeApp({
    apiKey: "AIzaSyBiYETN_JipXWhMq9gKz-2Pap-Ce4ZJNAI",
    authDomain: "finanzas-bcuevas.firebaseapp.com",
    projectId: "finanzas-bcuevas",
    storageBucket: "finanzas-bcuevas.firebasestorage.app"
});

const db = firebase.firestore();
const auth = firebase.auth();
let listaMovimientos = [], datosMesGlobal = [], chartBD = null, chartP = null, bdDataMaster = null;
let currentSort = { column: 'fechaISO', direction: 'desc' };
let sueldosHistoricos = {}, modoEdicionActivo = false;
const SUELDO_BASE_DEFAULT = 3602505;

function loginWithGoogle() { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
function logout() { auth.signOut().then(() => window.location.reload()); }

auth.onAuthStateChanged(user => {
    if (user && user.email.toLowerCase() === BYRON_EMAIL.toLowerCase()) {
        const loginScreen = document.getElementById('login-screen');
        const reportZone = document.getElementById('reportZone');
        if(loginScreen) loginScreen.style.display = 'none';
        if(reportZone) reportZone.classList.add('active-app');
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

function aplicarCicloAlSistema() {
    const mes = document.getElementById('navMesConceptual'), anio = document.getElementById('navAnio');
    if(!mes || !anio) return;
    const { T0, TFinal, fechaFinVisual } = calcularFechasCiclo(parseInt(mes.value), parseInt(anio.value));
    const badge = document.getElementById('navRangoBadge');
    if(badge) badge.innerText = `PERIODO: ${T0.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}).toUpperCase()} - ${fechaFinVisual.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}).toUpperCase()}`;
    const llave = `${anio.value}_${mes.value}`;
    const sueldo = sueldosHistoricos[llave] || SUELDO_BASE_DEFAULT;
    const inputSueldo = document.getElementById('inputSueldo');
    if(inputSueldo && document.activeElement !== inputSueldo) inputSueldo.value = sueldo.toLocaleString('es-CL');
    actualizarDashboard();
}

function actualizarDashboard() {
    const inputSueldo = document.getElementById('inputSueldo');
    const sueldo = inputSueldo ? (parseInt(inputSueldo.value.replace(/\./g,'')) || 0) : SUELDO_BASE_DEFAULT;
    const mesVal = parseInt(document.getElementById('navMesConceptual').value);
    const anioVal = parseInt(document.getElementById('navAnio').value);
    const { T0, TFinal } = calcularFechasCiclo(mesVal, anioVal);
    let dataMes = listaMovimientos.filter(x => { let d = new Date(x.fechaISO); return d >= T0 && d < TFinal; });
    dataMes.forEach(x => {
        x.catV = x.categoria || 'Sin Categoría';
        x.esIn = x.tipo === 'Ingreso' || x.catV === 'Transferencia Recibida' || x.catV === 'Ingreso Adicional';
        x.esNeutro = x.tipo === 'Por Cobrar' || x.tipo === 'Ahorro' || x.catV === 'Transferencia Propia / Ahorro';
    });
    datosMesGlobal = [...dataMes];
    let saldoAcc = sueldo, tI = 0, tF = 0, tO = 0, tC = 0, tEvitable = 0, gCat = {}, daily = Array(32).fill(0);
    dataMes.sort((a,b)=> a.fechaISO < b.fechaISO ? -1 : 1).forEach(x => {
        let dia = new Date(x.fechaISO).getDate();
        if (x.esIn) { tI += x.monto; saldoAcc += x.monto; daily[dia] += x.monto; }
        else if (x.tipo === 'Por Cobrar') tC += x.monto;
        else if (!x.esNeutro) {
            saldoAcc -= x.monto; daily[dia] -= x.monto;
            if (x.tipo === 'Gasto Fijo') tF += x.monto; else tO += x.monto;
            gCat[x.catV] = (gCat[x.catV] || 0) + x.monto;
        }
        if (catEvitables.includes(x.catV)) tEvitable += x.monto;
    });
    const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val.toLocaleString('es-CL'); };
    setTxt('txtTotalFijos', tF); setTxt('txtTotalOtros', tO); setTxt('txtTotalIngresos', tI);
    setTxt('txtCxC', tC); setTxt('txtSaldo', saldoAcc);
    const sP = saldoAcc + tC;
    const elP = document.getElementById('txtProyectado'); if(elP) elP.innerText = sP.toLocaleString('es-CL');
    renderizarListas(sueldo);
    if(document.getElementById('chartBurnDown')) dibujarGraficos(sueldo, dataMes, gCat, 30, T0, daily);
}

function renderizarListas(sueldoBase) {
    let datos = [...datosMesGlobal].sort((a,b) => b.fechaISO > a.fechaISO ? 1 : -1);
    const contM = document.getElementById('listaMovilDetalle'), contP = document.getElementById('listaDetalle');
    if (!contM && !contP) return;
    let htmlM = '', htmlP = '', currentDay = "";
    datos.forEach((x, idx) => {
        const d = new Date(x.fechaISO); const dStr = d.toLocaleDateString('es-CL');
        const tStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        if (dStr !== currentDay) {
            htmlM += `<div class="date-header">${dStr === new Date().toLocaleDateString('es-CL') ? 'HOY' : dStr}</div>`;
            currentDay = dStr;
        }
        const em = catEmojis[x.catV] || "❓", color = x.esIn ? "var(--accent-blue)" : x.esNeutro ? "var(--accent-orange)" : "var(--text-main)";
        htmlM += `<div class="mobile-card" onclick="openBottomSheet('${x.firestoreId}', '${x.nombre}', ${x.monto})">
            <div class="card-icon">${em}</div>
            <div style="flex:1; min-width:0;"><div class="card-title">${x.nombre}</div><div class="card-sub">${tStr} • ${x.catV}</div></div>
            <div style="font-weight:900; color:${color}">${x.esIn?'+':(x.esNeutro?'=':'-')}$${x.monto.toLocaleString('es-CL')}</div>
        </div>`;
    });
    if(contM) contM.innerHTML = htmlM;
}

function dibujarGraficos(sueldo, chronData, cats, dias, T0, dailyArr) {
    if(chartBD) chartBD.destroy(); if(chartP) chartP.destroy();
    let actual = [sueldo], ideal = [sueldo], labels = ["INI"], acc = sueldo;
    for(let i=1; i<=30; i++) {
        ideal.push(sueldo - (sueldo/30)*i); acc += (dailyArr[i] || 0);
        actual.push(i > new Date().getDate() && T0.getMonth() === new Date().getMonth() ? null : acc);
        labels.push(String(i).padStart(2,'0'));
    }
    bdDataMaster = { labels, actual, ideal, daily: dailyArr };
    chartBD = new Chart(document.getElementById('chartBurnDown'), {
        type: 'line', data: { labels, datasets: [
            { label: 'Real', data: actual, borderColor: '#1f6feb', borderWidth: 3, fill: false },
            { label: 'Ideal', data: ideal, borderColor: 'rgba(63,185,80,0.3)', borderDash:[5,5], pointRadius:0 }
        ]},
        options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{max: sueldo, ticks:{color:'#8b949e'}}, x:{ticks:{color:'#8b949e'}} } }
    });
}

window.hacerZoomGrafico = function(diaIn, diaFin) {
    if(!chartBD || !bdDataMaster) return;
    let i = parseInt(diaIn), f = parseInt(diaFin);
    let sA = bdDataMaster.actual.slice(i, f+1), sI = bdDataMaster.ideal.slice(i, f+1), sL = bdDataMaster.labels.slice(i, f+1);
    let valid = sA.filter(v => v !== null);
    if(valid.length > 0) {
        let maxR = Math.max(...valid), sueldo = parseInt(document.getElementById('inputSueldo').value.replace(/\./g,'')) || 0;
        chartBD.options.scales.y.max = maxR > (sueldo * 0.8) ? sueldo : maxR * 1.1;
    }
    chartBD.data.labels = sL; chartBD.data.datasets[0].data = sA; chartBD.data.datasets[1].data = sI; chartBD.update();
    
    let totalG = 0; for(let j=i+1; j<=f; j++) { if(bdDataMaster.daily[j] < 0) totalG += Math.abs(bdDataMaster.daily[j]); }
    let prom = Math.round(totalG / ((f-i)||1));
    const elG = document.getElementById('txtGastoTramo'), elP = document.getElementById('txtPromedioZoom');
    if(elG) elG.innerText = '$' + totalG.toLocaleString('es-CL'); if(elP) elP.innerText = '$' + prom.toLocaleString('es-CL');
};

function calcularFechasCiclo(m, a) {
    let mI = m - 1, aI = a; if(mI < 0) { mI = 11; aI--; }
    return { T0: new Date(aI, mI, 30), TFinal: new Date(a, m, 30), fechaFinVisual: new Date(a, m, 29) };
}
function triggerSync() { fetch("https://script.google.com/macros/s/AKfycbwKlub0qrv8_d24ZuyKKNryqOw1E68xv1_JvPOoEUc6W8TICllFfodNcwkigQE_7AuoNg/exec", {mode:'no-cors'}).then(()=>alert("Sincronizado")); }
function enviarReporteTelegram() {
    const msg = `🏭 BÚNKER\n💰 Saldo: $${document.getElementById('txtSaldo').innerText}`;
    fetch(`https://api.telegram.org/bot8614679709:AAEJGy9yAlKnhjVmJ0VUZpT-YmZQ6J5IOps/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: "1484213465", text: msg }) }).then(()=>alert("Telegram Enviado"));
}
function formatearEntradaNumerica(i) { let v = i.value.replace(/\D/g,''); i.value = v ? parseInt(v).toLocaleString('es-CL') : ''; }
