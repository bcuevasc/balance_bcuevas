// ==========================================================
// 🧠 BÚNKER SCADA - MOTOR LÓGICO V8.0 (CLEAN AXIS & ALIAS)
// ==========================================================
const BYRON_EMAIL = "bvhcc94@gmail.com"; 
const SUELDO_BASE_DEFAULT = 3602505;

const catMaestras = [
    { id: "Gastos Fijos (Búnker)", em: "🏠", label: "Fijos" },
    { id: "Suscripciones", em: "📱", label: "Subs" },
    { id: "Alimentación & Supermercado", em: "🛒", label: "Super" },
    { id: "Dopamina & Antojos", em: "🍔", label: "Dopa" },
    { id: "Ocio & Experiencias", em: "🎸", label: "Ocio" },
    { id: "Transporte & Logística", em: "🚗", label: "Trans" },
    { id: "Mantenimiento Hardware (Salud)", em: "💊", label: "Salud" },
    { id: "Hogar & Búnker", em: "🛠️", label: "Hogar" },
    { id: "Red de Apoyo (Familia)", em: "🫂", label: "Apoyo" },
    { id: "Gasto Tarjeta de Crédito", em: "💳", label: "TC" },
    { id: "Transferencia Propia / Ahorro", em: "🏦", label: "Ahorro" },
    { id: "Transferencia Recibida", em: "📲", label: "Recibo" },
    { id: "Ingreso Adicional", em: "💰", label: "Extra" },
    { id: "Ruido de Sistema", em: "⚙️", label: "Ruido" },
    { id: "Sin Categoría", em: "❓", label: "S.C." }
];

const aliasMap = {}; catMaestras.forEach(c => aliasMap[c.id] = c.label.toUpperCase());
const catEmojis = {}; catMaestras.forEach(c => catEmojis[c.id] = c.em);

firebase.initializeApp({ apiKey: "AIzaSyBiYETN_JipXWhMq9gKz-2Pap-Ce4ZJNAI", authDomain: "finanzas-bcuevas.firebaseapp.com", projectId: "finanzas-bcuevas" });
const db = firebase.firestore(), auth = firebase.auth();
let listaMovimientos = [], datosMesGlobal = [], chartBD = null, chartP = null, chartDiario = null, chartRadar = null;
let sueldosHistoricos = {};

auth.onAuthStateChanged(user => {
    if (user && user.email.toLowerCase() === BYRON_EMAIL) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('reportZone').classList.add('active-app');
        if(document.getElementById('user-display')) document.getElementById('user-display').innerText = user.displayName.split(' ')[0];
        db.collection("parametros").doc("sueldos").onSnapshot(snap => { if(snap.exists) sueldosHistoricos = snap.data(); });
        db.collection("movimientos").onSnapshot(snap => {
            listaMovimientos = [];
            snap.forEach(doc => {
                let d = doc.data(); d.firestoreId = doc.id;
                let fObj = d.fecha?.toDate ? d.fecha.toDate() : new Date(d.fecha || Date.now());
                d.fechaISO = fObj.toISOString();
                d.monto = Number(d.monto) || 0;
                listaMovimientos.push(d);
            });
            aplicarCicloAlSistema();
        });
    }
});

function aplicarCicloAlSistema() {
    const mes = document.getElementById('navMesConceptual').value, anio = document.getElementById('navAnio').value;
    const { T0, fechaFinVisual } = calcularFechasCiclo(parseInt(mes), parseInt(anio));
    if(document.getElementById('navRangoBadge')) document.getElementById('navRangoBadge').innerText = `${T0.toLocaleDateString('es-CL', {day:'2-digit', month:'short'})} - ${fechaFinVisual.toLocaleDateString('es-CL', {day:'2-digit', month:'short'})}`.toUpperCase();
    const sueldo = sueldosHistoricos[`${anio}_${mes}`] || SUELDO_BASE_DEFAULT;
    if (document.activeElement !== document.getElementById('inputSueldo')) document.getElementById('inputSueldo').value = sueldo.toLocaleString('es-CL');
    actualizarDashboard();
}

function actualizarDashboard() {
    const sueldo = parseInt(document.getElementById('inputSueldo').value.replace(/\./g,'')) || 0;
    let { T0, TFinal } = calcularFechasCiclo(parseInt(document.getElementById('navMesConceptual').value), parseInt(document.getElementById('navAnio').value));
    
    // Filtro dinámico
    const fD = document.getElementById('filtroDesde').value, fH = document.getElementById('filtroHasta').value;
    if(fD) T0 = new Date(fD + "T00:00:00"); if(fH) TFinal = new Date(fH + "T23:59:59");

    let data = listaMovimientos.filter(x => { let d = new Date(x.fechaISO); return d >= T0 && d <= TFinal; });
    let saldoAcc = sueldo, tF = 0, tO = 0, tI = 0, tC = 0, gCat = {};
    const diasTotal = Math.max(1, Math.round((TFinal - T0) / 86400000));
    let daily = Array(diasTotal + 1).fill(0), dailyVar = Array(diasTotal + 1).fill(0);

    data.sort((a,b)=> a.fechaISO < b.fechaISO ? -1 : 1).forEach(x => {
        let idx = Math.floor((new Date(x.fechaISO) - T0) / 86400000) + 1;
        if(idx < 0) idx = 0; if(idx > diasTotal) idx = diasTotal;
        if (x.tipo === 'Ingreso' || x.categoria === 'Transferencia Recibida') { tI += x.monto; saldoAcc += x.monto; daily[idx] += x.monto; }
        else if (x.tipo === 'Por Cobrar') tC += x.monto;
        else if (x.tipo !== 'Ahorro' && x.categoria !== 'Transferencia Propia / Ahorro') {
            saldoAcc -= x.monto; daily[idx] -= x.monto;
            if (x.tipo === 'Gasto Fijo') tF += x.monto; else { tO += x.monto; dailyVar[idx] += x.monto; }
            gCat[x.categoria] = (gCat[x.categoria] || 0) + x.monto;
        }
    });

    const setT = (id, v) => { const el = document.getElementById(id); if(el) el.innerText = v.toLocaleString('es-CL'); };
    setT('txtTotalFijos', tF); setT('txtTotalOtros', tO); setT('txtTotalIngresos', tI); setT('txtCxC', tC); setT('txtSaldo', saldoAcc);
    
    let diasT = (new Date() >= T0 && new Date() <= TFinal) ? Math.floor((new Date() - T0) / 86400000) + 1 : (new Date() > TFinal ? diasTotal : 0);
    if(document.getElementById('badgeDias')) document.getElementById('badgeDias').innerText = Math.max(diasTotal - diasT, 0);
    setT('txtProyeccionCierre', Math.round(saldoAcc - ((tO / Math.max(diasT, 1)) * (diasTotal - diasT))));
    
    setT('txtGastoTramo', tO + tF); setT('txtPromedioZoom', Math.round((tO + tF) / diasTotal));

    renderizarListas(data);
    dibujarGraficos(sueldo, daily, dailyVar, gCat, T0, diasTotal);
}

function renderizarListas(data) {
    const contM = document.getElementById('listaMovilDetalle');
    let htmlM = '', currentD = "";
    data.sort((a,b)=> b.fechaISO > a.fechaISO ? 1 : -1).forEach(x => {
        const d = new Date(x.fechaISO); const dS = d.toLocaleDateString('es-CL');
        if (dS !== currentD) { htmlM += `<div class="date-header">${dS === new Date().toLocaleDateString('es-CL') ? 'HOY' : dS}</div>`; currentD = dS; }
        htmlM += `<div class="mobile-card" onclick="openBottomSheet('${x.firestoreId}', '${x.nombre}', ${x.monto})">
            <div style="font-size:1.4rem; margin-right:12px;">${catEmojis[x.categoria] || "❓"}</div>
            <div style="flex:1;"><b>${x.nombre}</b><div style="font-size:0.65rem; color:var(--dim);">${x.categoria}</div></div>
            <div style="font-weight:900;">$${x.monto.toLocaleString('es-CL')}</div>
        </div>`;
    });
    if(contM) contM.innerHTML = htmlM;
}

function dibujarGraficos(sueldo, daily, dailyVar, gCat, T0, dias) {
    [chartBD, chartP, chartDiario, chartRadar].forEach(c => c && c.destroy());
    const cT = "#8b949e", cG = "#30363d", meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
    let actual = [sueldo], ideal = [sueldo], labels = ["INI"], acc = sueldo;

    for(let i=1; i<=dias; i++) {
        ideal.push(sueldo - (sueldo/dias)*i);
        acc += daily[i]; actual.push(i > (new Date() < T0 ? 0 : Math.floor((new Date()-T0)/86400000)+1) ? null : acc);
        let f = new Date(T0.getTime() + (i-1)*86400000); labels.push(`${f.getDate()} ${meses[f.getMonth()]}`);
    }

    chartBD = new Chart(document.getElementById('chartBurnDown'), {
        type: 'line', data: { labels, datasets: [{ data: actual, borderColor: '#1f6feb', borderWidth: 3, fill: false }, { data: ideal, borderColor: 'rgba(63,185,80,0.2)', borderDash: [5,5], pointRadius: 0 }] },
        options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{max: sueldo, ticks:{color:cT}}, x:{ticks:{color:cT, font:{size:8}, maxRotation:45}} } }
    });

    chartDiario = new Chart(document.getElementById('chartDiario'), {
        type: 'bar', data: { labels: labels.slice(-7), data: dailyVar.slice(-7) }, // 7 Días reales
        options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{ticks:{display:false}}, x:{ticks:{color:cT, font:{size:8}}} } }
    });

    const sorted = Object.entries(gCat).sort((a,b)=>b[1]-a[1]).slice(0,6);
    chartP = new Chart(document.getElementById('chartPareto'), {
        type: 'bar', data: { labels: sorted.map(c => aliasMap[c[0]] || "S.C."), datasets: [{ data: sorted.map(c=>c[1]), backgroundColor: '#1f6feb' }] },
        options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{ticks:{display:false}}, x:{ticks:{color:cT, font:{size:7}, autoSkip:false}} } }
    });

    chartRadar = new Chart(document.getElementById('chartRadar'), {
        type: 'radar', data: { labels: sorted.map(c => aliasMap[c[0]]), datasets: [{ data: sorted.map(c=>c[1]), borderColor: '#ff9800', backgroundColor: 'rgba(255,152,0,0.1)' }] },
        options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ r:{ticks:{display:false}, pointLabels:{color:cT, font:{size:8}}} } }
    });
}

function calcularFechasCiclo(m, a) {
    let mI = m - 1, aI = a; if(mI < 0) { mI = 11; aI--; }
    let T0 = new Date(aI, mI, 30); let TFinal = new Date(a, m, 30);
    return { T0, TFinal, fechaFinVisual: new Date(TFinal.getTime() - 86400000) };
}
function triggerSync() { fetch("https://script.google.com/macros/s/AKfycbwKlub0qrv8_d24ZuyKKNryqOw1E68xv1_JvPOoEUc6W8TICllFfodNcwkigQE_7AuoNg/exec", {mode:'no-cors'}).then(()=>alert("Sync OK")); }
function logout() { auth.signOut().then(() => window.location.reload()); }
function loginWithGoogle() { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
function formatearEntradaNumerica(i) { let v = i.value.replace(/\D/g,''); i.value = v ? parseInt(v).toLocaleString('es-CL') : ''; }
function toggleTheme() { document.body.classList.toggle('light-theme'); }
setInterval(() => { let c = document.getElementById('cronos'); if(c) c.innerText = new Date().toLocaleString('es-CL').toUpperCase(); }, 1000);
