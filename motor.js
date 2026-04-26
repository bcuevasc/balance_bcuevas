// ==========================================================
// 🌐 V14.3: MOTOR SCADA PRO (Sincronización Total)
// ==========================================================
window.VALOR_USD = 950;

async function inicializarSensorDolar() {
    let lbl = document.getElementById('lbl-dolar-actual');
    try {
        let response = await fetch('https://mindicador.cl/api/dolar');
        let data = await response.json();
        if(data && data.serie && data.serie.length > 0) {
            window.VALOR_USD = data.serie[0].valor;
            if(lbl) lbl.innerText = `1 USD = $${Math.round(window.VALOR_USD)} CLP`;
        }
    } catch(e) { window.VALOR_USD = 950; }
    if (typeof calcularDiaCero === 'function') calcularDiaCero();
}
document.addEventListener("DOMContentLoaded", inicializarSensorDolar);

const BYRON_EMAIL = "bvhcc94@gmail.com"; 
const SUELDO_BASE_DEFAULT = 3602505;
const catEvitables = ["Dopamina & Antojos"];

const diccAuto = [
    { keys: ["cargo en cuenta", "comision", "mantencion"], cat: "Gastos Fijos (Búnker)", tipo: "Gasto Fijo", fuga: "0", rename: "MANTENCIÓN BANCARIA" },
    { keys: ["pedidosya", "mcdonalds", "starbucks", "rappi"], cat: "Dopamina & Antojos", tipo: "Gasto", fuga: "100" },
    { keys: ["uber", "didi", "cabify", "pasaje", "metro"], cat: "Transporte & Logística", tipo: "Gasto", fuga: "0" }
];

const catMaestras = [
    { id: "Gastos Fijos (Búnker)", em: "🏠", label: "Carga Fija (Base)" },
    { id: "Infraestructura (Depto)", em: "🏢", label: "Infraestructura" },
    { id: "Flota & Movilidad", em: "🚙", label: "Flota & Vehículo" },
    { id: "Alimentación & Supermercado", em: "🛒", label: "Supermercado" },
    { id: "Dopamina & Antojos", em: "🍔", label: "Fugas (Dopamina)" },
    { id: "Transferencia Propia / Ahorro", em: "🏦", label: "Ahorro / Traspaso" },
    { id: "Sin Categoría", em: "❓", label: "Sin Categoría" }
];

const catEmojis = {}; const aliasMap = {}; 
catMaestras.forEach(c => { catEmojis[c.id] = c.em; aliasMap[c.id] = c.label; });

document.addEventListener("DOMContentLoaded", () => {
    const elSueldo = document.getElementById('inputSueldo');
    if(elSueldo) {
        elSueldo.addEventListener('input', function() {
            let v = this.value.replace(/\D/g,'');
            this.value = v ? parseInt(v).toLocaleString('es-CL') : '';
        });
        elSueldo.addEventListener('blur', () => window.guardarSueldoEnNube());
        elSueldo.addEventListener('keypress', (e) => { if(e.key === 'Enter') elSueldo.blur(); });
    }
});

firebase.initializeApp({ apiKey: "AIzaSyBiYETN_JipXWhMq9gKz-2Pap-Ce4ZJNAI", authDomain: "finanzas-bcuevas.firebaseapp.com", projectId: "finanzas-bcuevas" });
const db = firebase.firestore(), auth = firebase.auth();

let listaMovimientos = [], datosMesGlobal = [], sueldosHistoricos = {}; 
let chartBD = null, chartP = null, chartDiario = null, chartRadar = null;
let currentSort = { column: 'fechaISO', direction: 'desc' }, modoEdicionActivo = false;

auth.onAuthStateChanged(user => {
    if (user && user.email.toLowerCase() === BYRON_EMAIL.toLowerCase()) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('reportZone').classList.add('active-app');
        db.collection("parametros").doc("sueldos").onSnapshot(snap => { 
            if(snap.exists) { sueldosHistoricos = snap.data(); cargarSueldoVisual(); actualizarDashboard(); } 
        });
        db.collection("movimientos").onSnapshot(snap => {
            listaMovimientos = [];
            snap.forEach(doc => {
                let d = doc.data(); d.firestoreId = doc.id;
                d.fechaISO = d.fecha?.toDate ? d.fecha.toDate().toISOString() : (d.fecha || new Date().toISOString());
                listaMovimientos.push(d);
            });
            aplicarCicloAlSistema();
        });
    }
});

window.cargarSueldoVisual = function() {
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio'), elSueldo = document.getElementById('inputSueldo');
    if(!elMes || !elAnio || !elSueldo) return;
    let m = elMes.value, a = elAnio.value, llave = `${a}_${m}`;
    elSueldo.setAttribute('data-mes-ancla', m); elSueldo.setAttribute('data-anio-ancla', a);
    if (document.activeElement !== elSueldo) {
        elSueldo.value = sueldosHistoricos[llave] ? sueldosHistoricos[llave].toLocaleString('es-CL') : '';
        elSueldo.placeholder = 'NO ASIGNADO';
    }
};

window.guardarSueldoEnNube = function() {
    const elSueldo = document.getElementById('inputSueldo');
    if(!elSueldo || elSueldo.value === '') return;
    let m = elSueldo.getAttribute('data-mes-ancla'), a = elSueldo.getAttribute('data-anio-ancla');
    let s = parseInt(elSueldo.value.replace(/\./g, ''));
    if (isNaN(s) || s <= 0) return;
    let llave = `${a}_${m}`;
    if (sueldosHistoricos[llave] !== s) {
        sueldosHistoricos[llave] = s;
        db.collection("parametros").doc("sueldos").set({ [llave]: s }, {merge: true}).then(() => {
            mostrarToast("PRESUPUESTO ASIGNADO"); actualizarDashboard();
        });
    }
};

function aplicarCicloAlSistema() {
    const elSueldo = document.getElementById('inputSueldo');
    if (elSueldo && document.activeElement === elSueldo) elSueldo.blur();
    const navMes = document.getElementById('navMesConceptual'), navAnio = document.getElementById('navAnio');
    const { T0, fechaFinVisual } = calcularFechasCiclo(parseInt(navMes.value), parseInt(navAnio.value));
    const badge = document.getElementById('navRangoBadge');
    if(badge) badge.innerText = `[${T0.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}).toUpperCase()} - ${fechaFinVisual.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}).toUpperCase()}]`;
    cargarSueldoVisual(); actualizarDashboard();
}

function actualizarDashboard() {
    const m = parseInt(document.getElementById('navMesConceptual').value), a = parseInt(document.getElementById('navAnio').value);
    let sueldo = (sueldosHistoricos[`${a}_${m}`]) || PRESUPUESTO_BASE_DEFAULT;
    let { T0, TFinal } = calcularFechasCiclo(m, a);
    let dataMes = listaMovimientos.filter(x => { let d = new Date(x.fechaISO); return d >= T0 && d <= TFinal; });
    
    let saldoAcc = sueldo, tI = 0, tF = 0, tO = 0, gCat = {};
    dataMes.forEach(x => {
        x.catV = x.categoria || 'Sin Categoría';
        if (x.tipo === 'Ingreso') { tI += x.monto; saldoAcc += x.monto; }
        else if (x.tipo !== 'Ahorro' && x.tipo !== 'Por Cobrar') {
            saldoAcc -= x.monto;
            if (x.tipo === 'Gasto Fijo') tF += x.monto; else tO += x.monto;
            gCat[x.catV] = (gCat[x.catV] || 0) + x.monto;
        }
    });

    const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val.toLocaleString('es-CL'); };
    setTxt('txtTotalFijos', tF); setTxt('txtTotalOtros', tO); setTxt('txtTotalIngresos', tI); setTxt('txtSaldo', saldoAcc);
    if (typeof dibujarGraficos === 'function') dibujarGraficos(sueldo, dataMes, gCat, 30, T0, tF);
    if (typeof renderizarListas === 'function') renderizarListas(sueldo);
}

function calcularFechasCiclo(mes, anio) {
    let mesInicio = mes - 1; let anioInicio = anio; if (mesInicio < 0) { mesInicio = 11; anioInicio--; }
    let T0 = new Date(anioInicio, mesInicio, 30);
    let TFinal = new Date(anio, mes, 30);
    return { T0, TFinal, fechaFinVisual: new Date(TFinal.getTime() - 86400000) };
}

window.ejecutarArranque = function() {
    const vM = parseInt(document.getElementById('navMesConceptual').value), vA = parseInt(document.getElementById('navAnio').value);
    let pM = vM + 1; let pA = vA; if (pM > 11) { pM = 0; pA++; }
    const batch = db.batch(), fDestino = new Date(pA, pM, 1, 10, 0, 0);
    // ... (Logica de inyeccion simplificada para ahorrar espacio)
    batch.commit().then(() => { 
        document.getElementById('navMesConceptual').value = pM; document.getElementById('navAnio').value = pA;
        aplicarCicloAlSistema(); mostrarToast("ARRANQUE EXITOSO");
    });
};

function mostrarToast(m) {
    let t = document.getElementById('toast-notif') || document.createElement('div');
    t.id = 'toast-notif'; t.innerText = '⚡ ' + m;
    t.style.cssText = 'position:fixed; bottom:100px; left:50%; transform:translateX(-50%); background:#2ea043; color:white; padding:10px 20px; border-radius:20px; z-index:99999;';
    document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
}
