// ==========================================================
// 🌐 V14.6: MOTOR SCADA PRO (El Exorcismo de GitHub)
// ==========================================================
window.VALOR_USD = 950;
const BYRON_EMAIL = "bvhcc94@gmail.com"; 
const PRESUPUESTO_BASE_DEFAULT = 3602505;
const catEvitables = ["Dopamina & Antojos"];

// 🧠 INICIALIZACIÓN
async function inicializarSensorDolar() {
    try {
        let r = await fetch('https://mindicador.cl/api/dolar');
        let d = await r.json();
        if(d.serie[0]) window.VALOR_USD = d.serie[0].valor;
    } catch(e) { console.log("Sensor USD Offline"); }
}
document.addEventListener("DOMContentLoaded", inicializarSensorDolar);

firebase.initializeApp({ apiKey: "AIzaSyBiYETN_JipXWhMq9gKz-2Pap-Ce4ZJNAI", authDomain: "finanzas-bcuevas.firebaseapp.com", projectId: "finanzas-bcuevas" });
const db = firebase.firestore(), auth = firebase.auth();

let listaMovimientos = [], sueldosHistoricos = {}, datosMesGlobal = [], datosTCGlobal = [];
let chartBD = null, chartP = null, chartDiario = null, chartRadar = null;

// 🔐 SEGURIDAD
auth.onAuthStateChanged(user => {
    if (user && user.email.toLowerCase() === BYRON_EMAIL) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('reportZone').classList.add('active-app');
        db.collection("parametros").doc("sueldos").onSnapshot(s => { if(s.exists) { sueldosHistoricos = s.data(); cargarSueldoVisual(); actualizarDashboard(); } });
        db.collection("movimientos").onSnapshot(s => {
            listaMovimientos = []; s.forEach(doc => { let d = doc.data(); d.firestoreId = doc.id; d.fechaISO = d.fecha?.toDate ? d.fecha.toDate().toISOString() : d.fecha; listaMovimientos.push(d); });
            aplicarCicloAlSistema();
        });
        inicializarListenerTC();
    }
});

// 💰 GESTIÓN PRESUPUESTO
window.cargarSueldoVisual = function() {
    const m = document.getElementById('navMesConceptual').value, a = document.getElementById('navAnio').value, s = document.getElementById('inputSueldo');
    if(!s) return;
    s.setAttribute('data-mes-ancla', m); s.setAttribute('data-anio-ancla', a);
    if (document.activeElement !== s) {
        let val = sueldosHistoricos[`${a}_${m}`];
        s.value = val ? val.toLocaleString('es-CL') : '';
        s.placeholder = 'NO ASIGNADO';
    }
};

window.guardarSueldoEnNube = function() {
    const s = document.getElementById('inputSueldo');
    if(!s || s.value === '') return;
    let m = s.getAttribute('data-mes-ancla'), a = s.getAttribute('data-anio-ancla'), val = parseInt(s.value.replace(/\./g,''));
    if(!isNaN(val) && val > 0) db.collection("parametros").doc("sueldos").set({ [`${a}_${m}`]: val }, {merge:true});
};

// ⚙️ CICLO DE SISTEMA (Anti-Sangrado Móvil)
window.aplicarCicloAlSistema = function() {
    const s = document.getElementById('inputSueldo');
    if (s) { if(document.activeElement === s) window.guardarSueldoEnNube(); s.blur(); s.value = ''; }
    
    const m = parseInt(document.getElementById('navMesConceptual').value), a = parseInt(document.getElementById('navAnio').value);
    const { T0, fechaFinVisual } = calcularFechasCiclo(m, a);
    const badge = document.getElementById('navRangoBadge');
    if(badge) badge.innerText = `${T0.getDate()}/${T0.getMonth()+1} - ${fechaFinVisual.getDate()}/${fechaFinVisual.getMonth()+1}`;

    setTimeout(() => { cargarSueldoVisual(); actualizarDashboard(); }, 50);
};

function actualizarDashboard() {
    const m = parseInt(document.getElementById('navMesConceptual').value), a = parseInt(document.getElementById('navAnio').value);
    let sueldo = sueldosHistoricos[`${a}_${m}`] || PRESUPUESTO_BASE_DEFAULT;
    let { T0, TFinal } = calcularFechasCiclo(m, a);
    let data = listaMovimientos.filter(x => { let d = new Date(x.fechaISO); return d >= T0 && d <= TFinal; });
    
    let saldo = sueldo, tI = 0, tF = 0, tO = 0, gCat = {};
    data.forEach(x => {
        if(x.categoria === 'Gasto Tarjeta de Crédito') return;
        if(x.tipo === 'Ingreso') { tI += x.monto; saldo += x.monto; }
        else if(x.tipo !== 'Ahorro' && x.tipo !== 'Por Cobrar') {
            saldo -= x.monto; 
            if(x.tipo === 'Gasto Fijo') tF += x.monto; else tO += x.monto;
            gCat[x.categoria] = (gCat[x.categoria] || 0) + x.monto;
        }
    });

    const setT = (id, v) => { if(document.getElementById(id)) document.getElementById(id).innerText = v.toLocaleString('es-CL'); };
    setT('txtSaldo', saldo); setT('txtTotalIngresos', tI);
    if(document.getElementById('txtProyectado')) document.getElementById('txtProyectado').innerText = (saldo - (window.totalTC || 0)).toLocaleString('es-CL');

    dibujarGraficos(sueldo, data, gCat, 30, T0, tF, 0, 0, window.totalTC || 0);
    renderizarListas(sueldo);
}

// 📊 COMPARTIMENTOS ESTANCOS (Si uno falla, el resto vive)
function dibujarGraficos(sueldo, data, cats, dias, T0, tF, tI, tFl, tTC) {
    try { if(chartBD) chartBD.destroy(); if(chartDiario) chartDiario.destroy(); if(chartRadar) chartRadar.destroy(); } catch(e){}
    const cT = "#f0f6fc", cG = "#21262d";

    // 📈 BURN DOWN
    try {
        const ctx = document.getElementById('chartBurnDown');
        if(ctx) chartBD = new Chart(ctx, { type:'line', data:{ labels:Array.from({length:dias},(_,i)=>i+1), datasets:[{label:'Real', data:[sueldo], borderColor:'#1f6feb', fill:true}]}, options:{maintainAspectRatio:false, scales:{y:{grid:{color:cG},ticks:{color:cT}}}}});
    } catch(e){ console.error("Error G1"); }

    // 📈 PULSO VITAL
    try {
        const ctx = document.getElementById('chartDiario');
        if(ctx) chartDiario = new Chart(ctx, { type:'bar', data:{ labels:['Periodo'], datasets:[{data:[tF], backgroundColor:'#1f6feb'}]}, options:{maintainAspectRatio:false}});
    } catch(e){ console.error("Error G2"); }

    // 📈 RADAR TC (Blindado)
    try {
        const ctx = document.getElementById('chartRadar');
        if(ctx) {
            let meses = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
            let labels = [], montos = [], h = new Date();
            for(let i=1; i<=6; i++) {
                let m = (h.getMonth()+i)%12, a = h.getFullYear() + Math.floor((h.getMonth()+i)/12);
                labels.push(meses[m]);
                montos.push(datosTCGlobal.filter(d => { let fc = new Date(d.mesCobro); return fc.getMonth()===m && fc.getFullYear()===a; }).reduce((a,c)=>a+Number(c.monto),0));
            }
            chartRadar = new Chart(ctx, { type:'line', data:{labels, datasets:[{data:montos, borderColor:'#ff5252', fill:true}]}, options:{maintainAspectRatio:false}});
        }
    } catch(e){ console.error("Error G3"); }
}

function calcularFechasCiclo(m, a) {
    let mI = m-1, aI = a; if(mI<0){mI=11; aI--;}
    let T0 = new Date(aI, mI, 30), TFinal = new Date(a, m, 30);
    return { T0, TFinal, fechaFinVisual: new Date(TFinal.getTime()-86400000) };
}

function renderizarListas(sueldo) {
    const body = document.getElementById('listaDetalle'); if(!body) return;
    body.innerHTML = datosMesGlobal.map(x => `<tr><td>${new Date(x.fechaISO).toLocaleDateString()}</td><td>${x.nombre}</td><td>${x.categoria}</td><td style="text-align:right;">$${x.monto.toLocaleString('es-CL')}</td><td style="text-align:center;"><button onclick="editarMovimiento('${x.firestoreId}')">✏️</button></td></tr>`).join('');
}

function inicializarListenerTC() {
    db.collection("deuda_tc").onSnapshot(s => {
        datosTCGlobal = []; let total = 0;
        s.forEach(doc => { let d = doc.data(); d.id = doc.id; datosTCGlobal.push(d); total += Number(d.monto); });
        window.totalTC = total; if(document.getElementById('txtTotalTC')) document.getElementById('txtTotalTC').innerText = total.toLocaleString('es-CL');
        renderizarTablaTC(); actualizarDashboard();
    });
}

function renderizarTablaTC() {
    const b = document.getElementById('listaDetalleTC'); if(!b) return;
    b.innerHTML = datosTCGlobal.slice(0,10).map(x => `<tr><td>${x.cuota}</td><td>${x.nombre}</td><td style="text-align:right;">$${Number(x.monto).toLocaleString('es-CL')}</td></tr>`).join('');
}

window.loginWithGoogle = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
window.logout = () => auth.signOut().then(() => location.reload());
setInterval(() => { if(document.getElementById('cronos')) document.getElementById('cronos').innerText = new Date().toLocaleTimeString(); }, 1000);
