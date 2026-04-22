// ==========================================================
// 🧠 BÚNKER SCADA ORACLE - MOTOR LÓGICO V13.1 (STABLE BASE)
// ==========================================================

const BYRON_EMAIL = "bvhcc94@gmail.com"; 
const SUELDO_BASE_DEFAULT = 3602505;

let listaMovimientos = [], datosMesGlobal = [], sueldosHistoricos = {}; 
let chartBD = null, chartP = null, chartDiario = null, chartRadar = null;

const catMaestras = [
    { id: "Gastos Fijos (Búnker)", em: "🏠", label: "Carga Fija (Base)" }, { id: "Infraestructura (Depto)", em: "🏢", label: "Infraestructura (Depto)" },
    { id: "Flota & Movilidad", em: "🚙", label: "Flota & Vehículo" }, { id: "Alimentación & Supermercado", em: "🛒", label: "Supermercado" },
    { id: "Transporte & Logística", em: "🚗", label: "Transporte Público" }, { id: "Dopamina & Antojos", em: "🍔", label: "Fugas (Dopamina)" },
    { id: "Cuentas por Cobrar (Activos)", em: "💸", label: "Me Deben Plata" }, { id: "Transferencia Propia / Ahorro", em: "🏦", label: "Ahorro / Traspaso" },
    { id: "Gasto Tarjeta de Crédito", em: "💳", label: "Compra con TC" }, { id: "Ingreso Adicional", em: "💰", label: "Ingreso Extra" },
    { id: "Suscripciones", em: "📱", label: "Suscripciones" }, { id: "Mantenimiento Hardware (Salud)", em: "💊", label: "Salud" },
    { id: "Hogar & Búnker", em: "🛠️", label: "Compras Hogar" }, { id: "Ocio & Experiencias", em: "🎸", label: "Ocio & Experiencias" },
    { id: "Red de Apoyo (Familia)", em: "🫂", label: "Red de Apoyo" }, { id: "Transferencia Recibida", em: "📲", label: "Transf. Recibida" },
    { id: "Ruido de Sistema", em: "⚙️", label: "Ruido de Sistema" }, { id: "Sin Categoría", em: "❓", label: "Sin Categoría" }
];

window.formatearEntradaNumerica = function(i) { let v = i.value.replace(/\D/g,''); i.value = v ? parseInt(v).toLocaleString('es-CL') : ''; };
setInterval(() => { const c = document.getElementById('cronos'); if(c) c.innerText = new Date().toLocaleString('es-CL').toUpperCase(); }, 1000);

document.addEventListener("DOMContentLoaded", () => {
    const optionsHTML = catMaestras.map(c => `<option value="${c.id}">${c.em} ${c.label}</option>`).join('');
    const selectManual = document.getElementById('inputCategoria');
    if (selectManual) selectManual.innerHTML = optionsHTML;
});

// FIREBASE
firebase.initializeApp({ apiKey: "AIzaSyBiYETN_JipXWhMq9gKz-2Pap-Ce4ZJNAI", authDomain: "finanzas-bcuevas.firebaseapp.com", projectId: "finanzas-bcuevas" });
const db = firebase.firestore(), auth = firebase.auth();

window.loginWithGoogle = function() { 
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => {
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') { auth.signInWithRedirect(provider); } else { alert("❌ ERROR: " + err.message); }
    }); 
};
window.logout = function() { auth.signOut().then(() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }); };

auth.onAuthStateChanged(user => {
    if (user && user.email.toLowerCase() === BYRON_EMAIL.toLowerCase()) {
        const loginScreen = document.getElementById('login-screen'), reportZone = document.getElementById('reportZone');
        if(loginScreen) loginScreen.style.display = 'none'; if(reportZone) reportZone.style.display = 'flex';
        const userDisplay = document.getElementById('user-display'); if(userDisplay) userDisplay.innerText = user.displayName.split(" ")[0];
        
        db.collection("parametros").doc("sueldos").onSnapshot(snap => { if(snap.exists) sueldosHistoricos = snap.data(); });
        db.collection("movimientos").onSnapshot(snap => {
            listaMovimientos = [];
            snap.forEach(doc => { let d = doc.data(); d.firestoreId = doc.id; d.fechaISO = d.fecha?.toDate ? d.fecha.toDate().toISOString() : (d.fecha || new Date().toISOString()); d.monto = Number(d.monto) || 0; listaMovimientos.push(d); });
            window.actualizarDashboard();
        });
    } else if (user) { auth.signOut(); alert(`⛔ DENEGADO.`); }
});

window.calcularFechasCiclo = function(mesConceptual, anio) {
    let mesInicio = mesConceptual - 1; let anioInicio = anio; if (mesInicio < 0) { mesInicio = 11; anioInicio--; }
    let T0 = new Date(anioInicio, mesInicio, 30); if (T0.getMonth() !== mesInicio) T0 = new Date(anioInicio, mesInicio + 1, 0); 
    let TFinal = new Date(anio, mesConceptual, 30); if (TFinal.getMonth() !== mesConceptual) TFinal = new Date(anio, mesConceptual + 1, 0);
    return { T0, TFinal };
};

window.obtenerSueldoMes = function(anio, mes) { let llave = `${anio}_${mes}`; return sueldosHistoricos[llave] || SUELDO_BASE_DEFAULT; };

window.aplicarCicloAlSistema = function() { window.actualizarDashboard(); };

window.actualizarDashboard = function() {
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio');
    if(!elMes || !elAnio) return;
    
    const mesVal = parseInt(elMes.value), anioVal = parseInt(elAnio.value);
    const sueldo = window.obtenerSueldoMes(anioVal, mesVal);
    let { T0, TFinal } = window.calcularFechasCiclo(mesVal, anioVal);
    
    let dataMes = listaMovimientos.filter(x => { let d = new Date(x.fechaISO); return d >= T0 && d <= TFinal; });
    dataMes.forEach(x => { x.catV = x.categoria || 'Sin Categoría'; x.esIn = x.tipo === 'Ingreso' || x.catV === 'Transferencia Recibida'; x.esNeutro = x.tipo === 'Por Cobrar' || x.tipo === 'Ahorro'; });

    datosMesGlobal = [...dataMes];
    let saldoAcc = sueldo, tI = 0, tF = 0, tO = 0;
    
    [...dataMes].sort((x,y) => x.fechaISO < y.fechaISO ? -1 : 1).forEach(x => {
        if (x.catV !== 'Gasto Tarjeta de Crédito') { 
            if (x.esIn) { tI += x.monto; saldoAcc += x.monto; }
            else if (!x.esNeutro) {
                saldoAcc -= x.monto;
                if (x.tipo === 'Gasto Fijo') tF += x.monto; else tO += x.monto;
            }
        }
    });

    const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val.toLocaleString('es-CL'); };
    setTxt('txtTotalFijos', tF); setTxt('txtTotalOtros', tO); setTxt('txtTotalIngresos', tI); setTxt('txtSaldo', saldoAcc);
    
    const diasCiclo = Math.max(1, Math.round((TFinal - T0) / 86400000));
    window.renderizarListas(sueldo);
    window.dibujarGraficos(sueldo, dataMes, diasCiclo, T0);
};

window.renderizarListas = function(sueldoBase) {
    let datos = [...datosMesGlobal].filter(x => x.catV !== 'Gasto Tarjeta de Crédito'); 
    datos.sort((a, b) => a.fechaISO > b.fechaISO ? -1 : 1);

    const contenedorPC = document.getElementById('listaDetalle'); const contenedorMovil = document.getElementById('listaMovilDetalle');

    if (contenedorPC) {
        let htmlPC = '';
        datos.forEach((x) => {
            const d = new Date(x.fechaISO); const dateStr = d.toLocaleDateString('es-CL', {day:'2-digit', month:'2-digit'});
            const colorMonto = x.esIn ? "var(--color-ingresos)" : x.esNeutro ? "#d29922" : "var(--text-main)";
            htmlPC += `<tr>
                <td></td><td>${dateStr}</td><td>${x.nombre}</td><td>${x.catV}</td>
                <td style="text-align:right; font-family:monospace; color:${colorMonto}; font-weight:bold;">$${x.monto.toLocaleString('es-CL')}</td>
                <td></td><td></td>
            </tr>`;
        });
        contenedorPC.innerHTML = htmlPC;
    }

    if (contenedorMovil) {
        let htmlMovil = '';
        datos.forEach((x) => {
            const d = new Date(x.fechaISO); const dateStr = d.toLocaleDateString('es-CL', {day:'2-digit', month:'2-digit'});
            htmlMovil += `
            <div class="mobile-card">
                <div style="font-size:1.5rem; margin-right:15px;">${x.catV === 'Dopamina & Antojos' ? '🍔' : '💸'}</div>
                <div style="flex:1;">
                    <div style="font-weight:bold; font-size:0.9rem;">${x.nombre}</div>
                    <div style="font-size:0.7rem; color:var(--text-dim);">${dateStr} • ${x.catV}</div>
                </div>
                <div style="font-family:monospace; font-weight:bold; font-size:1.1rem; color:${x.esIn ? 'var(--color-ingresos)' : 'white'};">$${Math.round(x.monto/1000)}k</div>
            </div>`;
        });
        contenedorMovil.innerHTML = htmlMovil;
    }
};

window.agregarMovimiento = function() {
    const m = parseInt(document.getElementById('inputMonto').value.replace(/\./g, '')); const n = document.getElementById('inputNombre').value; const c = document.getElementById('inputCategoria').value; const t = document.getElementById('inputTipo').value; const fInput = document.getElementById('inputFecha').value;
    if (!m || !n || !fInput) return alert("Faltan datos");
    
    db.collection("movimientos").add({ nombre: n, monto: m, categoria: c, tipo: t, fecha: new Date(fInput), status: 'Manual', cuotas: 1 })
    .then(() => {
        document.getElementById('inputNombre').value = ''; document.getElementById('inputMonto').value = '';
        alert("Guardado");
    });
};

window.dibujarGraficos = function(sueldo, chronData, diasCiclo, T0) {
    if(chartBD) chartBD.destroy(); if(chartDiario) chartDiario.destroy(); 
    
    let daily = Array(diasCiclo + 1).fill(0), msT0 = T0.getTime();
    chronData.forEach(m => {
        let diff = Math.floor((new Date(m.fechaISO).getTime() - msT0) / 86400000) + 1;
        if(diff >= 1 && diff <= diasCiclo && !m.esIn && !m.esNeutro) daily[diff] += m.monto; 
    });

    let actual = [sueldo], labelsX = ["INI"], acc = sueldo;
    for(let i=1; i<=diasCiclo; i++) { acc -= daily[i]; actual.push(acc); labelsX.push(i); }

    const ctxBD = document.getElementById('chartBurnDown');
    if(ctxBD) {
        chartBD = new Chart(ctxBD, { type: 'line', data: { labels: labelsX, datasets: [ { label: 'Consumo Real', data: actual, borderColor: '#1f6feb', borderWidth: 2 } ]}, options: { maintainAspectRatio:false, plugins:{legend:{display:false}} } });
    }

    const ctxDiario = document.getElementById('chartDiario');
    if(ctxDiario) {
        chartDiario = new Chart(ctxDiario, { type: 'bar', data: { labels: labelsX.slice(1), datasets: [{ label: 'Gasto Diario', data: daily.slice(1), backgroundColor: 'rgba(31, 111, 235, 0.6)' }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } } } });
    }
};

window.abrirPreVuelo = function() {
    document.getElementById('modal-dia-cero').style.display = 'flex';
};
window.cerrarPreVuelo = function() {
    document.getElementById('modal-dia-cero').style.display = 'none';
};
