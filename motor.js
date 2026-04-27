// ==========================================================
// 🌐 V15.1: MOTOR SCADA PRO (Base Estable + UI/UX & Prevuelo)
// ==========================================================
window.VALOR_USD = 950; 

async function inicializarSensorDolar() {
    let lbl = document.getElementById('lbl-dolar-actual');
    try {
        let response = await fetch('https://mindicador.cl/api/dolar');
        let data = await response.json();
        if(data && data.serie && data.serie.length > 0) {
            window.VALOR_USD = data.serie[0].valor;
            console.log("[SYS] DÓLAR SINCRONIZADO: $" + window.VALOR_USD);
            if(lbl) lbl.innerText = `1 USD = $${Math.round(window.VALOR_USD)} CLP`;
        } else { throw new Error("Estructura API inválida"); }
    } catch(e) {
        console.warn("[SYS] Fallo API Dólar, usando fallback: $950");
        window.VALOR_USD = 950; 
        if(lbl) lbl.innerText = `Offline (Ref: $950)`;
    }
    if (typeof calcularDiaCero === 'function') calcularDiaCero();
}
document.addEventListener("DOMContentLoaded", inicializarSensorDolar);

const BYRON_EMAIL = "bvhcc94@gmail.com"; 
const CREDIT_SETPOINT = -300000; 
const catEvitables = ["Dopamina & Antojos"]; 
const PRESUPUESTO_BASE_DEFAULT = 3602505;

const diccAuto = [
    { keys: ["cargo en cuenta", "comision", "mantencion"], cat: "Gastos Fijos (Búnker)", tipo: "Gasto Fijo", fuga: "0", rename: "MANTENCIÓN BANCARIA" },
    { keys: ["prestamo", "debe", "pagar dps", "por cobrar", "cuota de"], cat: "Cuentas por Cobrar (Activos)", tipo: "Por Cobrar", fuga: "0" },
    { keys: ["uber", "didi", "cabify", "pasaje", "buses", "turbus", "metro"], cat: "Transporte & Logística", tipo: "Gasto", fuga: "0" },
    { keys: ["copec", "shell", "autopase", "revision tecnica", "lavado auto", "mecanico", "peaje", "seguro auto", "permiso circulacion"], cat: "Flota & Movilidad", tipo: "Gasto Fijo", fuga: "0" },
    { keys: ["dividendo", "arriendo", "gastos comunes", "ggcc", "contribuciones", "hipotecario", "departamento", "luz", "agua", "gas", "internet", "udec", "cae"], cat: "Infraestructura (Depto)", tipo: "Gasto Fijo", fuga: "0" },
    { keys: ["pedidosya", "mcdonalds", "burger king", "starbucks", "rappi", "helado", "cine", "concierto", "mall plaza"], cat: "Dopamina & Antojos", tipo: "Gasto", fuga: "100" },
    { keys: ["netflix", "spotify", "hbo", "prime", "icloud", "google", "vtr", "wom", "entel", "movistar"], cat: "Suscripciones", tipo: "Gasto Fijo", fuga: "0" },
    { keys: ["jumbo", "lider", "unimarc", "santa isabel", "panaderia", "carniceria", "feria", "minimarket", "tottus"], cat: "Alimentación & Supermercado", tipo: "Gasto", fuga: "0" },
    { keys: ["farmacia", "cruz verde", "salcobrand", "doctor", "consulta", "integramedica", "medico", "ahumada"], cat: "Mantenimiento Hardware (Salud)", tipo: "Gasto", fuga: "0" },
    { keys: ["ahorro", "inversion", "fintual", "deposito", "traspaso"], cat: "Transferencia Propia / Ahorro", tipo: "Ahorro", fuga: "0" }
];

const catMaestras = [
    { id: "Gastos Fijos (Búnker)", em: "🏠", label: "Carga Fija (Base)" },
    { id: "Infraestructura (Depto)", em: "🏢", label: "Infraestructura (Depto)" },
    { id: "Flota & Movilidad", em: "🚙", label: "Flota & Vehículo" },
    { id: "Alimentación & Supermercado", em: "🛒", label: "Supermercado" },
    { id: "Transporte & Logística", em: "🚗", label: "Transporte Público" },
    { id: "Dopamina & Antojos", em: "🍔", label: "Fugas (Dopamina)" },
    { id: "Cuentas por Cobrar (Activos)", em: "💸", label: "Me Deben Plata" },
    { id: "Transferencia Propia / Ahorro", em: "🏦", label: "Ahorro / Traspaso" },
    { id: "Gasto Tarjeta de Crédito", em: "💳", label: "Compra con TC" },
    { id: "Ingreso Adicional", em: "💰", label: "Ingreso Extra" },
    { id: "Suscripciones", em: "📱", label: "Suscripciones" },
    { id: "Mantenimiento Hardware (Salud)", em: "💊", label: "Salud" },
    { id: "Hogar & Búnker", em: "🛠️", label: "Compras Hogar" },
    { id: "Ocio & Experiencias", em: "🎸", label: "Ocio & Experiencias" },
    { id: "Red de Apoyo (Familia)", em: "🫂", label: "Red de Apoyo" },
    { id: "Transferencia Recibida", em: "📲", label: "Transf. Recibida" },
    { id: "Ruido de Sistema", em: "⚙️", label: "Ruido de Sistema" },
    { id: "Sin Categoría", em: "❓", label: "Sin Categoría" }
];

const catEmojis = {}; const aliasMap = {}; 
catMaestras.forEach(c => { catEmojis[c.id] = c.em; aliasMap[c.id] = c.label; });

let isEng = false;
window.toggleLanguage = function() {
    isEng = !isEng;
    document.querySelectorAll('[data-en]').forEach(el => {
        if (!el.hasAttribute('data-es')) el.setAttribute('data-es', el.innerText);
        el.innerText = isEng ? el.getAttribute('data-en') : el.getAttribute('data-es');
    });
};

document.addEventListener("DOMContentLoaded", () => {
    const optionsHTML = catMaestras.map(c => `<option value="${c.id}">${c.em} ${c.label}</option>`).join('');
    const selectManual = document.getElementById('inputCategoria');
    if (selectManual) {
        selectManual.innerHTML = optionsHTML;
        selectManual.addEventListener('change', (e) => {
            const fEl = document.getElementById('inputFuga');
            if(fEl) fEl.value = (e.target.value === "Dopamina & Antojos") ? "100" : "0";
            const boxC = document.getElementById('boxCuotas');
            if(boxC) boxC.style.display = (e.target.value === "Gasto Tarjeta de Crédito") ? "block" : "none";
        });
    }
    const selectMass = document.getElementById('massCategorySelect');
    if (selectMass) selectMass.innerHTML = `<option value="">-- Recategorizar a --</option>` + optionsHTML;

    // ⚡ LÓGICA DINÁMICA DE SUELDO (SIN LAG)
    const elSueldo = document.getElementById('inputSueldo');
    if(elSueldo) {
        elSueldo.addEventListener('input', function() {
            let v = this.value.replace(/\D/g,'');
            this.value = v ? parseInt(v).toLocaleString('es-CL') : '';
        });
        elSueldo.addEventListener('blur', function() {
            window.guardarSueldoEnNube();
            actualizarDashboard();
        });
        elSueldo.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); this.blur(); }
        });
    }

    const inputNombre = document.getElementById('inputNombre');
    const inputMonto = document.getElementById('inputMonto');
    
    if(inputNombre) {
        inputNombre.addEventListener('keypress', e => {
            if(e.key === 'Enter') { e.preventDefault(); if(inputMonto && !inputMonto.value) inputMonto.focus(); else document.getElementById('btnGuardar').click(); }
        });
        inputNombre.addEventListener('input', (e) => {
            if(modoEdicionActivo) return; 
            let texto = e.target.value.toLowerCase();
            for(let dict of diccAuto) {
                if(dict.keys.some(k => texto.includes(k))) {
                    document.getElementById('inputCategoria').value = dict.cat;
                    document.getElementById('inputTipo').value = dict.tipo;
                    let fEl = document.getElementById('inputFuga');
                    if(fEl) fEl.value = dict.fuga;
                    if(dict.rename && texto !== dict.rename.toLowerCase()) { e.target.value = dict.rename; }
                    inputNombre.style.borderBottom = "2px solid #2ea043";
                    setTimeout(() => inputNombre.style.borderBottom = "2px solid var(--border-color)", 1000);
                    break;
                }
            }
        });
    }
    if(inputMonto) {
        inputMonto.addEventListener('keypress', e => {
            if(e.key === 'Enter') { e.preventDefault(); if(inputNombre && !inputNombre.value) inputNombre.focus(); else document.getElementById('btnGuardar').click(); }
        });
    }
});

firebase.initializeApp({ apiKey: "AIzaSyBiYETN_JipXWhMq9gKz-2Pap-Ce4ZJNAI", authDomain: "finanzas-bcuevas.firebaseapp.com", projectId: "finanzas-bcuevas" });
const db = firebase.firestore(), auth = firebase.auth();

let listaMovimientos = [], datosMesGlobal = []; 
let chartBD = null, chartP = null, chartDiario = null, chartRadar = null;
let currentSort = { column: 'fechaISO', direction: 'desc' }; 
let modoEdicionActivo = false, sueldosHistoricos = {}; 
let datosTCGlobal = [];

window.mostrarToast = function(mensaje) {
    let toast = document.getElementById('toast-notif');
    if(!toast) {
        toast = document.createElement('div'); toast.id = 'toast-notif';
        toast.style.cssText = 'position:fixed; bottom:110px; left:50%; transform:translateX(-50%); background:rgba(46, 160, 67, 0.95); color:#fff; padding:12px 28px; border-radius:30px; font-weight:900; font-size:0.85rem; font-family:monospace; z-index:99999; transition:all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow:0 10px 30px rgba(0,0,0,0.5); text-transform:uppercase; letter-spacing:1px; opacity:0; pointer-events:none; white-space:nowrap; border: 2px solid #2ea043;';
        document.body.appendChild(toast);
    }
    toast.innerHTML = '⚡ ' + mensaje; toast.style.opacity = '1'; toast.style.bottom = '130px'; 
    setTimeout(() => { toast.style.opacity = '0'; toast.style.bottom = '110px'; }, 3000);
};

window.loginWithGoogle = function() { 
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => {
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
            auth.signInWithRedirect(provider);
        } else { alert("❌ ERROR DE CONEXIÓN:\n" + err.message); }
    }); 
};

window.logout = function() { auth.signOut().then(() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }); };

auth.onAuthStateChanged(user => {
    if (user && user.email.toLowerCase() === BYRON_EMAIL.toLowerCase()) {
        const loginScreen = document.getElementById('login-screen'), reportZone = document.getElementById('reportZone');
        if(loginScreen) loginScreen.style.display = 'none';
        if(reportZone) reportZone.classList.add('active-app');
        const userDisplay = document.getElementById('user-display');
        if(userDisplay) userDisplay.innerText = user.displayName.split(" ")[0];
        
        db.collection("parametros").doc("sueldos").onSnapshot(snap => { 
            if(snap.exists) { sueldosHistoricos = snap.data(); cargarSueldoVisual(); actualizarDashboard(); } 
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
        inicializarListenerTC();
    }
});

window.cargarSueldoVisual = function() {
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio'), elSueldo = document.getElementById('inputSueldo');
    if(!elMes || !elAnio || !elSueldo) return;
    let m = parseInt(elMes.value), a = parseInt(elAnio.value), llave = `${a}_${m}`;
    elSueldo.setAttribute('data-mes-ancla', m); elSueldo.setAttribute('data-anio-ancla', a);
    
    if (document.activeElement !== elSueldo) {
        if (sueldosHistoricos[llave]) elSueldo.value = sueldosHistoricos[llave].toLocaleString('es-CL'); 
        else { elSueldo.value = ''; elSueldo.placeholder = 'NO ASIGNADO'; }
    }
};

window.obtenerSueldoMes = function(anio, mes) {
    let llave = `${anio}_${mes}`;
    return sueldosHistoricos[llave] || PRESUPUESTO_BASE_DEFAULT; 
};

window.guardarSueldoEnNube = function() {
    const elSueldo = document.getElementById('inputSueldo');
    if(!elSueldo) return;
    let m = parseInt(elSueldo.getAttribute('data-mes-ancla')), a = parseInt(elSueldo.getAttribute('data-anio-ancla'));
    if (isNaN(m) || isNaN(a) || elSueldo.value.trim() === '') return; 
    let s = parseInt(elSueldo.value.replace(/\./g, '')); 
    if (isNaN(s) || s <= 0) return;
    let llave = `${a}_${m}`;
    if (sueldosHistoricos[llave] === s) return; 
    sueldosHistoricos[llave] = s;
    db.collection("parametros").doc("sueldos").set({ [llave]: s }, {merge: true}).then(()=> mostrarToast(`PRESUPUESTO ACTUALIZADO`));
};

window.aplicarCicloAlSistema = function() {
    const elSueldo = document.getElementById('inputSueldo');
    if (elSueldo && document.activeElement === elSueldo) { window.guardarSueldoEnNube(); elSueldo.blur(); elSueldo.value = ''; }
    
    const navMes = document.getElementById('navMesConceptual'), navAnio = document.getElementById('navAnio');
    if(!navMes || !navAnio) return;
    
    if(document.getElementById('filtroDesde')) document.getElementById('filtroDesde').value = ''; 
    if(document.getElementById('filtroHasta')) document.getElementById('filtroHasta').value = '';

    const { T0, fechaFinVisual } = calcularFechasCiclo(parseInt(navMes.value), parseInt(navAnio.value));
    const badge = document.getElementById('navRangoBadge');
    if(badge) badge.innerText = `[${T0.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}).toUpperCase()} - ${fechaFinVisual.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}).toUpperCase()}]`;
    
    setTimeout(() => { cargarSueldoVisual(); actualizarDashboard(); }, 50);
};

function actualizarDashboard() {
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio');
    const mesVal = parseInt(elMes.value), anioVal = parseInt(elAnio.value);
    const inputSueldo = document.getElementById('inputSueldo');
    
    let sueldo = obtenerSueldoMes(anioVal, mesVal);
    if (inputSueldo && inputSueldo.value) { sueldo = parseInt(inputSueldo.value.replace(/\./g,'')) || sueldo; }
    
    let { T0, TFinal } = calcularFechasCiclo(mesVal, anioVal);
    const fDesde = document.getElementById('filtroDesde')?.value, fHasta = document.getElementById('filtroHasta')?.value;
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
    let saldoAcc = sueldo, tI = 0, tF = 0, tO = 0, tC = 0, tEvitable = 0, tInfra = 0, tFlota = 0, gCat = {};
    
    [...dataMes].sort((x,y) => x.fechaISO < y.fechaISO ? -1 : 1).forEach(x => {
        if (x.catV !== 'Gasto Tarjeta de Crédito') { 
            if (x.esIn) { tI += x.monto; saldoAcc += x.monto; }
            else if (x.tipo === 'Por Cobrar' || x.categoria === 'Cuentas por Cobrar (Activos)') tC += x.monto;
            else if (!x.esNeutro) {
                saldoAcc -= x.monto;
                if (x.catV === 'Infraestructura (Depto)') tInfra += x.monto;
                else if (x.catV === 'Flota & Movilidad') tFlota += x.monto;
                else if (x.tipo === 'Gasto Fijo') tF += x.monto; 
                else tO += x.monto; 
                gCat[x.catV] = (gCat[x.catV] || 0) + x.monto;
                let pctFuga = x.innecesarioPct !== undefined ? x.innecesarioPct : (catEvitables.includes(x.catV) ? 100 : 0);
                tEvitable += (x.monto * (pctFuga / 100));
            }
        }
    });

    const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val.toLocaleString('es-CL'); };
    setTxt('txtTotalFijos', tF); setTxt('txtTotalOtros', tO); setTxt('txtTotalIngresos', tI);
    setTxt('txtCxC', tC); setTxt('txtSaldo', saldoAcc); setTxt('txtTotalInfra', tInfra); setTxt('txtTotalFlota', tFlota); 
    
    const diasCiclo = Math.max(1, Math.round((TFinal - T0) / 86400000));
    const hoy = new Date();
    let diasT = (hoy >= T0 && hoy <= TFinal) ? Math.max(Math.floor((hoy - T0) / 86400000) + 1, 1) : (hoy > TFinal ? diasCiclo : 0);
    
    const badgeDias = document.getElementById('badgeDias');
    if(badgeDias) badgeDias.innerText = `${Math.max(diasCiclo - diasT, 0)} DÍAS`;
    
    const setW = (id, val) => { const el = document.getElementById(id); if(el) el.style.width = Math.min(val, 100) + "%"; };
    let sueldoOperativoBase = sueldo - tInfra - tFlota;
    setW('barFijos', (tF / (sueldoOperativoBase || 1)) * 100); setW('barOtros', (tO / (sueldoOperativoBase || 1)) * 100);
    setTxt('txtTotalEvitable', Math.round(tEvitable));
    
    const pctFugas = sueldo > 0 ? ((tEvitable / sueldo) * 100).toFixed(1) : 0;
    const txtPctFugas = document.getElementById('txtPorcentajeFugas');
    if(txtPctFugas) {
        txtPctFugas.innerText = pctFugas + '%';
        txtPctFugas.style.color = pctFugas < 5 ? "var(--color-saldo)" : (pctFugas <= 10 ? "#d29922" : "var(--color-fuga)");
    }

    let deudaAprox = window.totalTC || 0; 
    const txtProyectado = document.getElementById('txtProyectado');
    if(txtProyectado) {
        let proyVal = saldoAcc - deudaAprox;
        txtProyectado.innerText = proyVal.toLocaleString('es-CL');
        txtProyectado.style.color = proyVal < 0 ? "var(--color-fuga)" : "#79c0ff";
    }

    let b = document.getElementById('inputBuscador') ? document.getElementById('inputBuscador').value.toLowerCase() : '';
    let dataGraficos = dataMes.filter(x => x.catV !== 'Gasto Tarjeta de Crédito');
    
    if (typeof renderizarListas === 'function') renderizarListas(sueldo, b);
    if (typeof dibujarGraficos === 'function') dibujarGraficos(sueldo, [...dataGraficos].sort((x,y) => x.fechaISO < y.fechaISO ? -1 : 1), gCat, diasCiclo, T0, tF, tInfra, tFlota, deudaAprox);
    
    const kpiSalida = document.getElementById('txtGastoTotalPeriodo');
    if (kpiSalida) kpiSalida.innerText = '$' + (tO + tF).toLocaleString('es-CL');
    setTxt('txtGastoTramo', tO + tF);
    setTxt('txtPromedioZoom', Math.round((tO + tF) / diasCiclo));
}

// ⚡ V15.0: COMPARTIMENTACIÓN Y DATA LABELS EN GRÁFICOS
function dibujarGraficos(sueldo, chronData, cats, diasCiclo, T0, totalFijosMes, tInfra, tFlota, deudaAprox) {
    try { if(chartBD) chartBD.destroy(); } catch(e){}
    try { if(chartP) chartP.destroy(); } catch(e){}
    try { if(chartDiario) chartDiario.destroy(); } catch(e){}
    try { if(chartRadar) chartRadar.destroy(); } catch(e){}
    
    const cT = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || "#f0f6fc"; 
    const cG = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || "#21262d"; 
    
    // 🏷️ DATA LABELS: Dibuja números sobre barras y líneas
    const labelsPlugin = {
        id: 'labelsPlugin',
        afterDatasetsDraw(chart) {
            try {
                const ctx = chart.ctx; ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    if (meta.hidden) return;
                    meta.data.forEach((element, index) => {
                        const dataVal = dataset.data[index];
                        if (dataVal && dataVal > 0 && element && typeof element.x === 'number' && typeof element.y === 'number') {
                            ctx.fillText('$' + Math.round(dataVal / 1000) + 'k', element.x, element.y - 5);
                        }
                    });
                });
            } catch(e) {}
        }
    };
    
    let daily = Array(diasCiclo + 1).fill(0), dailyNecesario = Array(diasCiclo + 1).fill(0), dailyFugas = Array(diasCiclo + 1).fill(0); 
    let msT0 = T0.getTime();

    chronData.forEach(m => {
        let diff = Math.floor((new Date(m.fechaISO).getTime() - msT0) / 86400000) + 1;
        if(diff >= 1 && diff <= diasCiclo) { 
            if(m.esIn) daily[diff] += m.monto; 
            else if(!m.esNeutro) { 
                daily[diff] -= m.monto; 
                if(!['Infraestructura (Depto)', 'Flota & Movilidad'].includes(m.catV) && m.tipo !== 'Gasto Fijo') {
                    if(catEvitables.includes(m.catV)) dailyFugas[diff] += m.monto; else dailyNecesario[diff] += m.monto;
                }
            } 
        }
    });

    let actual = [sueldo], ideal = [sueldo], proyeccion = Array(diasCiclo + 1).fill(null);
    let labelsX = ["INI"], labelsFechas = ["INI"], acc = sueldo, limit = Math.floor((Date.now() - msT0) / 86400000) + 1;
    const nombresMes = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

    for(let i=1; i<=diasCiclo; i++) {
        ideal.push(sueldo - (sueldo/diasCiclo)*i); acc += daily[i]; actual.push(i > limit ? null : acc);
        let f = new Date(msT0 + (i-1)*86400000); let dia = String(f.getDate()).padStart(2, '0');
        labelsFechas.push(`${dia} ${nombresMes[f.getMonth()]}`); labelsX.push(f.getDate() === 1 ? `${dia} ${nombresMes[f.getMonth()]}` : dia); 
    }

    if(limit > 1 && limit <= diasCiclo) {
        let promedioGastoDiario = (sueldo - actual[limit]) / limit;
        proyeccion[limit] = actual[limit];
        for(let i = limit + 1; i <= diasCiclo; i++) proyeccion[i] = proyeccion[i-1] - promedioGastoDiario;
    }

    try {
        const ctxBD = document.getElementById('chartBurnDown');
        if(ctxBD) {
            let grad = ctxBD.getContext('2d').createLinearGradient(0, 0, 0, 400); grad.addColorStop(0, 'rgba(31, 111, 235, 0.4)'); grad.addColorStop(1, 'rgba(31, 111, 235, 0)');
            chartBD = new Chart(ctxBD, {
                type: 'line', data: { labels: labelsX, datasets: [ { label: 'Consumo Real', data: actual, borderColor: '#1f6feb', backgroundColor: grad, borderWidth: 3, fill: true, pointRadius: 0, tension: 0.2 }, { label: 'Proyección', data: proyeccion, borderColor: '#d29922', borderDash: [5, 5], borderWidth: 2, fill: false, pointRadius: 0, tension: 0.2 }, { label: 'Ideal', data: ideal, borderColor: 'rgba(46, 160, 67, 0.4)', borderDash: [5, 5], borderWidth: 2, fill: false, pointRadius: 0 } ]},
                options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales: { x: { ticks: { color: cT, font: {size: 9} }, grid:{color:cG} }, y: { grid: { color: cG }, ticks: { color: cT, callback: v => '$' + Math.round(v/1000) + 'k' } } }, layout: { padding: 0 } }
            });
        }
    } catch(e) {}

    try {
        const sorted = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,6);
        const ctxP = document.getElementById('chartPareto');
        if(ctxP) {
            chartP = new Chart(ctxP, {
                type: 'polarArea', 
                data: { labels: sorted.map(c => aliasMap[c[0]] || c[0].split(' ')[0]), datasets: [{ data: sorted.map(c => c[1]), backgroundColor: ['rgba(31, 111, 235, 0.7)', 'rgba(46, 160, 67, 0.7)', 'rgba(210, 153, 34, 0.7)', 'rgba(255, 82, 82, 0.7)', 'rgba(163, 113, 247, 0.7)', 'rgba(0, 188, 212, 0.7)'], borderColor: ['#1f6feb', '#2ea043', '#d29922', '#ff5252', '#a371f7', '#00bcd4'], borderWidth: 2 }] },
                options: { maintainAspectRatio:false, plugins:{legend:{position: 'right', labels:{color:cT, font:{size:10, family:'monospace'}}}}, scales:{ r:{ticks:{display:false}, grid:{color:cG}, angleLines:{color:cG}} } }
            });
        }
    } catch(e) {}

    try {
        const ctxDiario = document.getElementById('chartDiario');
        let limiteDiarioIdeal = Math.max((sueldo - totalFijosMes - tInfra - tFlota) / diasCiclo, 0);

        if(ctxDiario) {
            let lastDayWithData = diasCiclo; while(lastDayWithData > 0 && (dailyNecesario[lastDayWithData] === 0 && dailyFugas[lastDayWithData] === 0)) lastDayWithData--; let startDayForBars = Math.max(1, lastDayWithData - 14); 
            let alarmLogCache = "";
            for(let i=startDayForBars; i<=lastDayWithData; i++) {
                if (dailyFugas[i] > 0) alarmLogCache += `<div class='log-item warning'><div class='log-icon'>🍔</div><div class='log-content'><strong>FUGA DOPAMINA</strong><div class='log-date'>${labelsFechas[i]}</div><span>$${dailyFugas[i].toLocaleString('es-CL')}</span></div></div>`;
            }
            chartDiario = new Chart(ctxDiario, {
                type: 'bar',
                data: { labels: labelsFechas.slice(startDayForBars, lastDayWithData + 1), datasets: [ { label: 'Gasto Base', data: dailyNecesario.slice(startDayForBars, lastDayWithData + 1), backgroundColor: 'rgba(31, 111, 235, 0.6)', borderRadius: 2 }, { label: 'Fuga', data: dailyFugas.slice(startDayForBars, lastDayWithData + 1), backgroundColor: 'rgba(255, 82, 82, 0.9)', borderRadius: 2 } ]},
                options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { stacked: true, ticks: { color: cT, font:{size:8} }, grid: { display:false } }, y: { stacked: true, ticks: { color: cT, callback: v => '$' + Math.round(v / 1000) + 'k' }, grid: { color: cG } } } },
                plugins: [ { id: 'limiteDiarioPlugin', afterDraw: (chart) => { try { if(limiteDiarioIdeal <= 0) return; const ctx = chart.ctx, xAxis = chart.scales.x, yAxis = chart.scales.y, yPos = yAxis.getPixelForValue(limiteDiarioIdeal); if(yPos >= yAxis.top && yPos <= yAxis.bottom) { ctx.save(); ctx.beginPath(); ctx.moveTo(xAxis.left, yPos); ctx.lineTo(xAxis.right, yPos); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(210, 153, 34, 0.8)'; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.restore(); } } catch(e){} } }, labelsPlugin ]
            });
        }
    } catch(e) {}

    try {
        const ctxProyeccion = document.getElementById('chartRadar');
        if(ctxProyeccion) {
            let mesesLabels = [], montosProyectados = [], fechaHoy = new Date();
            const nombresMesesFijos = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
            
            for(let i=1; i<=6; i++) {
                let mIndex = (fechaHoy.getMonth() + i) % 12;
                let anioTemp = fechaHoy.getFullYear() + Math.floor((fechaHoy.getMonth() + i) / 12);
                mesesLabels.push(nombresMesesFijos[mIndex]);
                
                let sumaMes = datosTCGlobal.filter(d => { 
                    if (!d.mesCobro) return false;
                    let fC = new Date(d.mesCobro); 
                    return fC.getMonth() === mIndex && fC.getFullYear() === anioTemp; 
                }).reduce((a, c) => a + (Number(c.monto) || 0), 0);
                montosProyectados.push(sumaMes);
            }
            
            let bgFill = 'rgba(255, 82, 82, 0.15)';
            try { let grad = ctxProyeccion.getContext('2d').createLinearGradient(0, 0, 0, 300); grad.addColorStop(0, 'rgba(255, 82, 82, 0.6)'); grad.addColorStop(1, 'rgba(255, 82, 82, 0.05)'); bgFill = grad; } catch(e){}
            
            chartRadar = new Chart(ctxProyeccion, {
                type: 'line', 
                data: { labels: mesesLabels, datasets: [{ label: 'Deuda TC', data: montosProyectados, backgroundColor: bgFill, borderColor: '#ff5252', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#030508', pointBorderColor: '#ff5252' }] },
                options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: cT, callback: v => '$' + Math.round(v/1000) + 'k' }, grid: { color: cG } }, x: { ticks: { color: cT, font: {size: 10, weight: 'bold'} }, grid: { display: false } } } },
                plugins: [ { id: 'setpointTCPlugin', afterDraw: (chart) => { try { const ctx = chart.ctx, xAxis = chart.scales.x, yAxis = chart.scales.y; const umbralSeguridad = (Number(sueldo) || 0) * 0.15; if(yAxis && yAxis.max !== undefined && yAxis.max > umbralSeguridad) { const yPos = yAxis.getPixelForValue(umbralSeguridad); ctx.save(); ctx.beginPath(); ctx.moveTo(xAxis.left, yPos); ctx.lineTo(xAxis.right, yPos); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255, 82, 82, 0.8)'; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.fillStyle = '#ff5252'; ctx.font = 'bold 10px monospace'; ctx.fillText('MAX (15%)', xAxis.left + 5, yPos - 5); ctx.restore(); } } catch(e){} } }, labelsPlugin ]
            });
        }
    } catch(e) {}
}

function calcularFechasCiclo(mesConceptual, anio) {
    let mesInicio = mesConceptual - 1; let anioInicio = anio; if (mesInicio < 0) { mesInicio = 11; anioInicio--; }
    let T0 = new Date(anioInicio, mesInicio, 30); if (T0.getMonth() !== mesInicio) T0 = new Date(anioInicio, mesInicio + 1, 0); 
    let TFinal = new Date(anio, mesConceptual, 30); if (TFinal.getMonth() !== mesConceptual) TFinal = new Date(anio, mesConceptual + 1, 0);
    return { T0, TFinal, fechaFinVisual: new Date(TFinal.getTime() - 86400000) };
}

// 💳 MATRIZ TC
function inicializarListenerTC() {
    db.collection("deuda_tc").orderBy("mesCobro", "asc").onSnapshot(snapshot => {
        datosTCGlobal = []; let totalDeuda = 0;
        snapshot.forEach(doc => { let data = doc.data(); data.id = doc.id; datosTCGlobal.push(data); totalDeuda += (Number(data.monto) || 0); });
        if(document.getElementById("txtTotalTC")) document.getElementById("txtTotalTC").innerText = totalDeuda.toLocaleString('es-CL');
        if(typeof renderizarTablaTC === 'function') renderizarTablaTC();
        window.totalTC = totalDeuda; 
        if(typeof actualizarDashboard === 'function') actualizarDashboard();
    });
}

if (typeof window.renderizarTablaTC === 'undefined') {
    window.renderizarTablaTC = function() {
        const tbody = document.getElementById("listaDetalleTC"); if (!tbody) return;
        tbody.innerHTML = "";
        if (datosTCGlobal.length === 0) return tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted); font-family:monospace;">MATRIZ SIN DATOS</td></tr>`;

        let agrupado = {};
        datosTCGlobal.forEach(doc => {
            if(!doc.mesCobro) return;
            let f = new Date(doc.mesCobro), key = f.getFullYear() + "-" + String(f.getMonth()).padStart(2, '0');
            if (!agrupado[key]) agrupado[key] = { label: f.toLocaleString('es-CL', { month: 'long', year: 'numeric' }).toUpperCase(), total: 0, items: [] };
            agrupado[key].items.push(doc); agrupado[key].total += (Number(doc.monto) || 0);
        });

        Object.keys(agrupado).sort().forEach(key => {
            let g = agrupado[key];
            tbody.innerHTML += `<tr style="background:rgba(255,82,82,0.15); border-top:2px solid rgba(255,82,82,0.5);">
                <td></td><td colspan="2" style="font-weight:900; color:#ff5252; font-size:0.85rem; letter-spacing:1px;">🗓️ ${g.label}</td>
                <td class="col-monto" style="color:#ff5252; font-weight:900;">$${g.total.toLocaleString('es-CL')}</td>
            </tr>`;
            g.items.forEach(doc => {
                let op = (doc.nombre && (doc.nombre.includes("PROYECCIÓN") || doc.nombre.includes("FACTURADA"))) ? "1" : "0.7";
                tbody.innerHTML += `<tr>
                    <td style="text-align: center;"><input type="checkbox" class="checkItemTC" value="${doc.id}" onclick="actualizarBarraTC()" style="accent-color: #ff5252;"></td>
                    <td style="font-size: 0.7rem; color: #79c0ff; opacity:${op};">Cuota: ${doc.cuota || '1/1'}</td>
                    <td class="col-desc" title="${doc.nombre || 'N/A'}" style="opacity:${op}; font-size:0.75rem;">${doc.nombre || 'N/A'}</td>
                    <td class="col-monto" style="opacity:${op};">$${(Number(doc.monto)||0).toLocaleString('es-CL')}</td>
                </tr>`;
            });
        });
        actualizarBarraTC(); 
    }
}

window.cargarCSV_TC = function() {
    let fileInputTC = document.createElement('input'); fileInputTC.type = 'file'; fileInputTC.accept = '.csv';
    fileInputTC.onchange = e => {
        let file = e.target.files[0];
        let montoFacturado = parseInt(prompt("💰 ANCLA DE FACTURACIÓN:\nMonto Total FACTURADO a pagar el próximo mes (ej: 441332).\nPon 0 si no hay boleta aún.", "0").replace(/[^0-9]/g, '')) || 0;
        let diaCorte = parseInt(prompt("📅 CORTAFUEGOS:\nDÍA DE CIERRE de tarjeta (ej: 20).", "20")) || 20;

        let reader = new FileReader();
        reader.onload = async ev => {
            try {
                let text = ev.target.result, lineas = text.split('\n'), batch = db.batch(), cuotasProcesadas = 0;
                
                if (montoFacturado > 0) {
                    let mVisor = parseInt(document.getElementById('navMesConceptual').value), aVisor = parseInt(document.getElementById('navAnio').value);
                    let mPago = mVisor + 1, aPago = aVisor; if (mPago > 11) { mPago = 0; aPago++; }
                    batch.set(db.collection("deuda_tc").doc("FACTURADO_BASE_OFICIAL"), { nombre: "⚠️ BOLETA FACTURADA OFICIAL", monto: montoFacturado, cuota: "1/1", mesCobro: new Date(aPago, mPago, 15).toISOString(), status: "Facturado" });
                }
                
                for(let i = 1; i < lineas.length; i++) {
                    if(lineas[i].trim() === '') continue; 
                    let cols = lineas[i].split(lineas[i].includes(';') ? ';' : ','); if(cols.length < 4) continue; 
                    let fecha = cols[0].trim(); if(!fecha.includes('/')) continue; 
                    let nombre = cols[1] ? cols[1].trim().replace(/\s+/g, ' ').toUpperCase() : "DESCONOCIDO"; 
                    let cuotasInfo = (cols.find(c => c.includes('/') && c.length <= 5 && c !== fecha) || "01/01").trim().split('/'); 
                    
                    let montoTotal = 0;
                    for (let j = cols.length - 1; j >= 2; j--) { let numStr = cols[j].replace(/[^0-9]/g, ''); if (numStr.length > 0) { montoTotal = parseInt(numStr); break; } }
                    if(isNaN(montoTotal) || montoTotal <= 0 || ["REV.COMPRAS", "PAGO PESOS", "TEF", "PAGO EN LINEA"].some(x => nombre.includes(x))) continue;
                    
                    let cuotaActual = parseInt(cuotasInfo[0]) || 1, totalCuotas = parseInt(cuotasInfo[1]) || 1; 
                    let montoMensual = totalCuotas > 1 ? Math.round(montoTotal / totalCuotas) : montoTotal;
                    let partesF = fecha.replace(/-/g, '/').split('/'); if (partesF.length !== 3) continue; 
                    
                    for(let c = cuotaActual; c <= totalCuotas; c++) {
                        let mesesDesfase = (parseInt(partesF[0]) > diaCorte || totalCuotas > 1) ? 2 : 1;
                        let fCobro = new Date(parseInt(partesF[2]), parseInt(partesF[1]) - 1 + mesesDesfase + (c - cuotaActual), 15);
                        batch.set(db.collection("deuda_tc").doc(`${fecha.replace(/[^0-9]/g, '')}-${nombre.replace(/[^A-Z0-9]/g, '').substring(0,10)}-C${c}de${totalCuotas}`), { nombre: nombre, monto: montoMensual, cuota: `${c}/${totalCuotas}`, mesCobro: fCobro.toISOString(), status: "Proyectado" });
                        cuotasProcesadas++;
                    }
                }
                await batch.commit(); mostrarToast(`ANCLA FIJADA Y ${cuotasProcesadas} CUOTAS INYECTADAS`); 
            } catch (error) { alert("❌ ERROR DE CÁLCULO: " + error.message); }
        };
        reader.readAsText(file, 'UTF-8');
    };
    fileInputTC.click();
};

function actualizarBarraTC() {
    const sel = document.querySelectorAll('.checkItemTC:checked'), barra = document.getElementById('barraAccionesTC'), txt = document.getElementById('txtSeleccionadosTC');
    if (sel.length > 0) { if(barra) barra.style.display = 'flex'; if(txt) txt.innerText = `${sel.length} SEL`; } 
    else { if(barra) barra.style.display = 'none'; let m = document.getElementById('checkMaestroTC'); if(m) m.checked = false; }
}

function toggleTodosTC(maestro) { document.querySelectorAll('.checkItemTC').forEach(c => c.checked = maestro.checked); actualizarBarraTC(); }
async function ejecutarPurgaMasivaTC() {
    const sel = document.querySelectorAll('.checkItemTC:checked'); if (!confirm(`⚠️ ¿Borrar ${sel.length} registros permanentemente?`)) return;
    const batch = db.batch(); sel.forEach(cb => { batch.delete(db.collection("deuda_tc").doc(cb.value)); });
    try { await batch.commit(); mostrarToast("PURGA COMPLETADA"); } catch (error) { alert("❌ Error Net."); }
}

// 🚀 SIMULADOR DÍA CERO Y PRE-VUELO (Lógica Temporal Mes + 1)
window.abrirPreVuelo = function() {
    const modal = document.getElementById('modal-dia-cero'); if(!modal) return;
    let vM = parseInt(document.getElementById('navMesConceptual').value), vA = parseInt(document.getElementById('navAnio').value);
    
    // ⚡ FIX: Proyección hacia el Mes Siguiente
    let pM = vM + 1, pA = vA; 
    if (pM > 11) { pM = 0; pA++; }

    const nombresMes = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById('pv-mes-label').innerText = `${nombresMes[pM]} ${pA}`.toUpperCase();
    
    let sueldoProximoMes = window.obtenerSueldoMes(pA, pM);
    document.getElementById('pv-sueldo').value = sueldoProximoMes.toLocaleString('es-CL');
    
    let sumaTCMes = 0;
    datosTCGlobal.forEach(d => { 
        if(!d.mesCobro) return;
        let f = new Date(d.mesCobro); 
        if (f.getMonth() === pM && f.getFullYear() === pA) sumaTCMes += (Number(d.monto) || 0); 
    });
    
    let elTcNac = document.getElementById('pv-tc-nac');
    if(elTcNac && elTcNac.getAttribute('data-estado') !== 'pag') {
        elTcNac.value = sumaTCMes > 0 ? sumaTCMes.toLocaleString('es-CL') : "0";
    }
    
    calcularDiaCero(); 
    modal.style.display = 'flex';
}

window.cerrarPreVuelo = function() { document.getElementById('modal-dia-cero').style.display = 'none'; actualizarDashboard(); };

window.toggleEstadoPV = function(btn, idInput) {
    const estados = ['est', 'real', 'pag'];
    let curr = btn.getAttribute('data-estado') || 'est';
    let next = estados[(estados.indexOf(curr) + 1) % estados.length];

    btn.classList.remove('est', 'real', 'pag'); btn.classList.add(next); btn.innerText = next.toUpperCase(); btn.setAttribute('data-estado', next);
    
    const input = document.getElementById(idInput);
    if (next === 'pag') { input.classList.add('pagado'); input.disabled = true; } 
    else { input.classList.remove('pagado'); input.disabled = false; }
    calcularDiaCero(); 
};

window.calcularDiaCero = function() {
    const valSiNoPagado = (id) => { let el = document.getElementById(id); return (el && el.getAttribute('data-estado') !== 'pag') ? (parseInt(el.value.replace(/\./g, '')) || 0) : 0; };
    let sueldo = parseInt((document.getElementById('pv-sueldo').value || "0").replace(/\./g, '')) || 0;
    let tcNac = valSiNoPagado('pv-tc-nac');
    let elTcInt = document.getElementById('pv-tc-int');
    let tcIntUSD = (elTcInt && elTcInt.getAttribute('data-estado') !== 'pag') ? (parseInt(elTcInt.value.replace(/\./g, '')) || 0) : 0;
    let tcIntCLP = Math.round(tcIntUSD * (isNaN(window.VALOR_USD) ? 950 : window.VALOR_USD)); 
    let elTcIntCLP = document.getElementById('pv-tc-int-clp');
    if (elTcIntCLP) {
        if (elTcInt && elTcInt.getAttribute('data-estado') === 'pag') { elTcIntCLP.innerText = "✔️ PAGADO"; elTcIntCLP.style.color = "var(--color-saldo)"; } 
        else { elTcIntCLP.innerText = `~ $${tcIntCLP.toLocaleString('es-CL')} CLP`; elTcIntCLP.style.color = "var(--accent-red)"; }
    }
    
    let deudasDuras = tcNac + tcIntCLP + valSiNoPagado('pv-linea');
    let estructural = valSiNoPagado('pv-arriendo') + valSiNoPagado('pv-udec') + valSiNoPagado('pv-cae') + valSiNoPagado('pv-ggcc') + valSiNoPagado('pv-luz') + valSiNoPagado('pv-agua') + valSiNoPagado('pv-gas') + valSiNoPagado('pv-celu') + valSiNoPagado('pv-madre') + valSiNoPagado('pv-subs') + valSiNoPagado('pv-seguro');
    
    document.getElementById('pv-txt-liquidez').innerText = (sueldo - deudasDuras - estructural).toLocaleString('es-CL');
    
    if (sueldo > 0) {
        let pR = Math.min((deudasDuras / sueldo) * 100, 100), pN = Math.min((estructural / sueldo) * 100, 100 - pR), pV = Math.max(100 - pR - pN, 0);
        document.getElementById('pv-barra-roja').style.width = pR + '%'; document.getElementById('pv-barra-naranja').style.width = pN + '%'; document.getElementById('pv-barra-verde').style.width = pV + '%';
    }

    let tgls = document.querySelectorAll('.btn-estado'), conf = 0;
    tgls.forEach(b => { if(b.classList.contains('real') || b.classList.contains('pag')) conf++; });
    let cer = tgls.length > 0 ? Math.round((conf / tgls.length) * 100) : 0;
    let elCer = document.getElementById('pv-certeza-pct');
    if(elCer) { elCer.innerText = cer + '%'; elCer.style.color = cer < 40 ? '#ff5252' : (cer < 80 ? '#ff9800' : '#2ea043'); }
}

window.ejecutarArranque = function() {
    if(!confirm("⚠️ INYECCIÓN DE PLANILLA\n\n¿Estás seguro de inyectar estos gastos en el MES SIGUIENTE?")) return;
    
    const vM = parseInt(document.getElementById('navMesConceptual').value);
    const vA = parseInt(document.getElementById('navAnio').value);
    
    let pM = vM + 1; let pA = vA;
    if (pM > 11) { pM = 0; pA++; }

    const batch = db.batch();
    const fDestino = new Date(pA, pM, 1, 10, 0, 0);
    let inyectados = 0;
    
    const procesar = (id, nom, cat) => {
        let el = document.getElementById(id);
        if (!el) return;
        let estado = el.getAttribute('data-estado') || 'est';
        if (estado === 'pag') return; 
        let monto = parseInt(el.value.replace(/\./g, '')) || 0;
        if (monto > 0) {
            let ref = db.collection("movimientos").doc();
            batch.set(ref, {
                monto: monto, nombre: nom, categoria: cat, tipo: "Gasto Fijo",
                fecha: fDestino, status: estado === 'real' ? 'Real' : 'Estimado',
                innecesarioPct: 0, cuotas: 1
            });
            inyectados++;
        }
    };
    
    procesar('pv-tc-nac', "PAGO TC NACIONAL (DÍA CERO)", "Gastos Fijos (Búnker)"); 
    procesar('pv-tc-int', "PAGO TC INTERNACIONAL (DÍA CERO)", "Gastos Fijos (Búnker)"); 
    procesar('pv-linea', "PAGO LÍNEA CRÉDITO (DÍA CERO)", "Gastos Fijos (Búnker)");
    procesar('pv-arriendo', "ARRIENDO / DIVIDENDO", "Infraestructura (Depto)");
    procesar('pv-udec', "PAGO UDEC 2024", "Infraestructura (Depto)");
    procesar('pv-cae', "PAGO CAE", "Infraestructura (Depto)");
    procesar('pv-ggcc', "GASTOS COMUNES", "Infraestructura (Depto)");
    procesar('pv-luz', "LUZ / ELECTRICIDAD", "Infraestructura (Depto)");
    procesar('pv-agua', "AGUA / SANEAMIENTO", "Infraestructura (Depto)");
    procesar('pv-gas', "GAS", "Infraestructura (Depto)");
    procesar('pv-celu', "CELU MIO PLAN", "Suscripciones");
    procesar('pv-madre', "MOVISTAR MADRE", "Red de Apoyo (Familia)");
    procesar('pv-subs', "PACK SUSCRIPCIONES", "Suscripciones");
    procesar('pv-seguro', "SEGURO AUTO", "Flota & Movilidad");
    
    if (inyectados > 0) {
        batch.commit().then(() => {
            cerrarPreVuelo();
            document.getElementById('navMesConceptual').value = pM;
            document.getElementById('navAnio').value = pA;
            aplicarCicloAlSistema();
            mostrarToast(`ÉXITO: ${inyectados} REGISTROS INYECTADOS EN ${new Date(pA, pM).toLocaleString('es-CL', {month:'long'}).toUpperCase()}`);
        }).catch(err => alert("Error: " + err.message));
    } else {
        alert("Nada que inyectar.");
    }
};

// ☁️ SYNC Y EXPORTACIÓN
window.triggerSync = function() {
    fetch("https://script.google.com/macros/s/AKfycbwKlub0qrv8_d24ZuyKKNryqOw1E68xv1_JvPOoEUc6W8TICllFfodNcwkigQE_7AuoNg/exec", {mode:'no-cors'})
    .then(()=>mostrarToast("SYNC COMPLETADA"))
    .catch(e => alert("Error Net: " + e));
};

window.exportarDataLink = function() {
    try {
        if (!datosMesGlobal || datosMesGlobal.length === 0) { mostrarToast("MATRIZ VACÍA: NO HAY DATOS PARA EXPORTAR"); return; }
        let csv = "ISO_DATE,YEAR,MONTH,DAY,CATEGORY,TYPE,AMOUNT_CLP,DETAIL,ML_FLAG\n";
        datosMesGlobal.forEach(x => {
            let d = x.fechaISO ? new Date(x.fechaISO) : new Date();
            let catV = x.catV || x.categoria || 'Sin Categoría';
            let tipo = x.tipo || 'Gasto Variable';
            let monto = Number(x.monto) || 0;
            let nombreLimpio = (x.nombre || "Unknown").replace(/(\r\n|\n|\r)/gm, " ").replace(/"/g, '""').trim();
            let flag = catEvitables.includes(catV) ? 'DOPAMINA_LEAK' : (tipo === 'Gasto Fijo' ? 'STRUCTURAL' : 'STANDARD');
            csv += `${x.fechaISO || d.toISOString()},${d.getFullYear()},${d.getMonth()+1},${d.getDate()},"${catV}","${tipo}",${monto},"${nombreLimpio}",${flag}\n`;
        });
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Bunker_DataLink_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        mostrarToast("EXPORTACIÓN DATA-LINK EXITOSA");
    } catch (error) { console.error("Error Export:", error); }
};

window.exportarTablaBunker = function(idTabla, nombreArchivo) {
    const tabla = document.getElementById(idTabla); if (!tabla) return alert("Error SYS: Tabla no hallada.");
    let csv = ''; const filas = tabla.querySelectorAll("tr");
    filas.forEach(fila => {
        let celdas = Array.from(fila.querySelectorAll("th, td"));
        celdas = celdas.filter(c => !c.classList.contains('col-check') && !c.classList.contains('col-drag') && !c.querySelector('button'));
        const datosFila = celdas.map(celda => `"${celda.innerText.replace(/(\r\n|\n|\r)/gm, " - ").replace(/"/g, '""').trim()}"`);
        if (datosFila.length > 0) csv += datosFila.join(";") + "\n";
    });
    try {
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${nombreArchivo}_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (e) { console.error("Error Export:", e); }
};
