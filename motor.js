// ==========================================================
// 🧠 BÚNKER SCADA ORACLE - MOTOR LÓGICO V12.4.3 (FINAL TUNED)
// ==========================================================

// --- CONFIGURACIÓN ESTRUCTURAL ---
const BYRON_EMAIL = "bvhcc94@gmail.com"; 
const SUELDO_BASE_DEFAULT = 3602505;
const catEvitables = ["Dopamina & Antojos"]; 

// 🟢 MÓDULO A.C.E. (Auto-Categorización Experta) - TUNING V12.4
const diccAuto = [
    { keys: ["prestamo", "debe", "pagar dps", "por cobrar", "cuota de"], cat: "Cuentas por Cobrar (Activos)", tipo: "Por Cobrar", fuga: "0" },
    { keys: ["uber", "didi", "cabify", "pasaje", "buses", "turbus", "metro"], cat: "Transporte & Logística", tipo: "Gasto", fuga: "0" },
    { keys: ["copec", "shell", "autopase", "revision tecnica", "lavado auto", "mecanico", "peaje", "seguro auto", "permiso circulacion"], cat: "Flota & Movilidad", tipo: "Gasto Fijo", fuga: "0" },
    { keys: ["dividendo", "arriendo", "gastos comunes", "ggcc", "contribuciones", "hipotecario", "departamento", "luz", "agua", "gas", "internet", "udec", "cae"], cat: "Infraestructura (Depto)", tipo: "Gasto Fijo", fuga: "0" },
    { keys: ["pedidosya", "mcdonalds", "burger king", "starbucks", "rappi", "helado", "cine", "concierto", "fother muckers", "mall plaza", "los angeles", "tottus food"], cat: "Dopamina & Antojos", tipo: "Gasto", fuga: "100" },
    { keys: ["netflix", "spotify", "hbo", "prime", "icloud", "google", "vtr", "wom", "entel", "movistar", "celu mio plan", "movistar madre", "pack suscripciones"], cat: "Suscripciones", tipo: "Gasto Fijo", fuga: "0" },
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

// --- INICIALIZACIÓN DE ENLACE ---
firebase.initializeApp({ apiKey: "AIzaSyBiYETN_JipXWhMq9gKz-2Pap-Ce4ZJNAI", authDomain: "finanzas-bcuevas.firebaseapp.com", projectId: "finanzas-bcuevas" });
const db = firebase.firestore(), auth = firebase.auth();

let listaMovimientos = [], datosMesGlobal = [], datosTCGlobal = [], sueldosHistoricos = {}; 
let chartBD = null, chartP = null, chartDiario = null, chartRadar = null;
let currentSort = { column: 'fechaISO', direction: 'desc' }; 
let modoEdicionActivo = false, isEng = false, totalTC = 0, alarmLogCache = "";

// 🟢 MEJORA V12.4.3: BLINDAJE DE SUELDOS 🟢

window.obtenerSueldoMes = function(anio, mes) {
    let llave = `${anio}_${mes}`;
    if (sueldosHistoricos[llave]) return sueldosHistoricos[llave];
    
    // Fallback hacia atrás para no mostrar $0 si no hay registro
    let iterAnio = anio, iterMes = mes;
    for(let i=0; i<12; i++) {
        iterMes--;
        if(iterMes < 0) { iterMes = 11; iterAnio--; }
        let k = `${iterAnio}_${iterMes}`;
        if(sueldosHistoricos[k]) return sueldosHistoricos[k];
    }
    return SUELDO_BASE_DEFAULT; 
};

window.cargarSueldoVisual = function() {
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio'), elSueldo = document.getElementById('inputSueldo');
    if(!elMes || !elAnio || !elSueldo) return;
    
    let llave = `${elAnio.value}_${elMes.value}`;
    if (document.activeElement !== elSueldo) {
        if (sueldosHistoricos[llave]) {
            elSueldo.value = sueldosHistoricos[llave].toLocaleString('es-CL');
        } else {
            elSueldo.value = '';
            elSueldo.placeholder = "INGRESE SUELDO " + (parseInt(elMes.value)+1);
        }
    }
};

window.guardarSueldoEnNube = function() {
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio'), elSueldo = document.getElementById('inputSueldo');
    if(!elMes || !elAnio || !elSueldo || elSueldo.value === '') return;
    
    let m = elMes.value, a = elAnio.value, s = parseInt(elSueldo.value.replace(/\./g, ''));
    let llave = `${a}_${m}`;
    
    db.collection("parametros").doc("sueldos").set({ [llave]: s }, {merge: true}).then(() => {
        sueldosHistoricos[llave] = s;
        mostrarToast(`SUELDO ${parseInt(m)+1}/${a} FIJADO`);
        actualizarDashboard();
    });
};

// --- CORE: ACTUALIZACIÓN DE DASHBOARD ---

window.actualizarDashboard = function() {
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio'), inputSueldo = document.getElementById('inputSueldo');
    if(!elMes) return;

    const mesVal = parseInt(elMes.value), anioVal = parseInt(elAnio.value);
    const buscador = document.getElementById('inputBuscador');
    const b = buscador ? buscador.value.toLowerCase() : '';

    let sueldoActual;
    if (document.activeElement === inputSueldo && inputSueldo.value !== '') {
        sueldoActual = parseInt(inputSueldo.value.replace(/\./g,'')) || 0;
    } else {
        sueldoActual = obtenerSueldoMes(anioVal, mesVal);
    }

    let { T0, TFinal } = calcularFechasCiclo(mesVal, anioVal);
    
    // Filtros Custom
    const fDesde = document.getElementById('filtroDesde') ? document.getElementById('filtroDesde').value : '';
    const fHasta = document.getElementById('filtroHasta') ? document.getElementById('filtroHasta').value : '';
    if(fDesde) { let [y,m,d] = fDesde.split('-'); T0 = new Date(y, m-1, d); }
    if(fHasta) { let [y,m,d] = fHasta.split('-'); TFinal = new Date(y, m-1, d, 23, 59, 59); }
    
    let dataMes = listaMovimientos.filter(x => { let d = new Date(x.fechaISO); return d >= T0 && d <= TFinal; });
    dataMes.forEach(x => {
        x.catV = x.categoria || 'Sin Categoría';
        x.esIn = x.tipo === 'Ingreso' || x.catV === 'Transferencia Recibida' || x.catV === 'Ingreso Adicional';
        x.esNeutro = x.tipo === 'Por Cobrar' || x.tipo === 'Ahorro' || x.catV === 'Transferencia Propia / Ahorro';
    });

    datosMesGlobal = [...dataMes];
    let saldoAcc = sueldoActual, tI = 0, tF = 0, tO = 0, tC = 0, tEvitable = 0, tInfra = 0, tFlota = 0, gCat = {};
    
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
    setTxt('txtSaldo', saldoAcc); setTxt('txtTotalInfra', tInfra); setTxt('txtTotalFlota', tFlota);
    
    const diasCiclo = Math.max(1, Math.round((TFinal - T0) / 86400000));
    const hoy = new Date();
    let diasT = (hoy >= T0 && hoy <= TFinal) ? Math.max(Math.floor((hoy - T0) / 86400000) + 1, 1) : (hoy > TFinal ? diasCiclo : 0);
    const badgeDias = document.getElementById('badgeDias');
    if(badgeDias) badgeDias.innerText = `${Math.max(diasCiclo - diasT, 0)} DÍAS RESTANTES`;
    
    const setW = (id, val) => { const el = document.getElementById(id); if(el) el.style.width = Math.min(val, 100) + "%"; };
    let sueldoOperativoBase = sueldoActual - tInfra - tFlota;
    setW('barFijos', (tF / (sueldoOperativoBase || 1)) * 100); setW('barOtros', (tO / (sueldoOperativoBase || 1)) * 100);
    setTxt('txtTotalEvitable', Math.round(tEvitable));
    
    const pctFugas = sueldoActual > 0 ? ((tEvitable / sueldoActual) * 100).toFixed(1) : 0;
    const txtPctFugas = document.getElementById('txtPorcentajeFugas');
    if(txtPctFugas) {
        txtPctFugas.innerText = pctFugas + '%';
        txtPctFugas.style.color = pctFugas < 5 ? "var(--color-saldo)" : (pctFugas <= 10 ? "#d29922" : "var(--color-fuga)");
    }

    const txtProyectado = document.getElementById('txtProyectado');
    if(txtProyectado) {
        let proyVal = saldoAcc - totalTC;
        txtProyectado.innerText = proyVal.toLocaleString('es-CL');
        txtProyectado.style.color = proyVal < 0 ? "var(--color-fuga)" : "#79c0ff";
    }

    if (typeof renderizarListas === 'function') renderizarListas(sueldoActual, b);
    if (typeof dibujarGraficos === 'function') dibujarGraficos(sueldoActual, [...dataMes].sort((x,y) => x.fechaISO < y.fechaISO ? -1 : 1), gCat, diasCiclo, T0, tF, tInfra, tFlota, totalTC);
    
    setTxt('txtGastoTramo', tO + tF);
    setTxt('txtPromedioZoom', Math.round((tO + tF) / (diasT || 1)));
    cargarSueldoVisual();
}

// --- TELEMETRÍA: GRÁFICOS ORÁCULO ---

function dibujarGraficos(sueldo, chronData, cats, diasCiclo, T0, totalFijosMes, tInfra, tFlota, deudaTC) {
    if(chartBD) chartBD.destroy(); if(chartP) chartP.destroy(); 
    if(chartDiario) chartDiario.destroy(); if(chartRadar) chartRadar.destroy();
    
    const cT = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || "#f0f6fc"; 
    const cG = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || "#21262d"; 
    
    let dailyNecesario = Array(diasCiclo + 1).fill(0), dailyFugas = Array(diasCiclo + 1).fill(0), msT0 = T0.getTime();

    chronData.forEach(m => {
        let d = new Date(m.fechaISO), diff = Math.floor((d.getTime() - msT0) / 86400000) + 1;
        if(diff >= 1 && diff <= diasCiclo && !m.esIn && !m.esNeutro && m.catV !== 'Gasto Tarjeta de Crédito') { 
            if(m.catV !== 'Infraestructura (Depto)' && m.catV !== 'Flota & Movilidad' && m.tipo !== 'Gasto Fijo') {
                if(catEvitables.includes(m.catV)) dailyFugas[diff] += m.monto; else dailyNecesario[diff] += m.monto;
            }
        }
    });

    let actual = [sueldo], ideal = [sueldo], proyeccion = Array(diasCiclo + 1).fill(null), labelsX = ["INI"], labelsFechas = ["INI"], acc = sueldo;
    let limit = Math.floor((Date.now() - msT0) / 86400000) + 1;

    for(let i=1; i<=diasCiclo; i++) {
        ideal.push(sueldo - (sueldo/diasCiclo)*i); 
        acc -= (dailyNecesario[i] + dailyFugas[i]); 
        actual.push(i > limit ? null : acc);
        let f = new Date(msT0 + (i-1)*86400000);
        labelsFechas.push(f.toLocaleDateString('es-CL', {day:'2-digit', month:'short'})); 
        labelsX.push(f.getDate());
    }

    // Burn-Rate Projection
    if(limit > 1 && limit <= diasCiclo) {
        let gastoRealAcum = sueldo - actual[limit];
        let promGasto = gastoRealAcum / limit;
        proyeccion[limit] = actual[limit];
        for(let i = limit + 1; i <= diasCiclo; i++) { proyeccion[i] = proyeccion[i-1] - promGasto; }
    }

    const ctxBD = document.getElementById('chartBurnDown');
    if(ctxBD) {
        chartBD = new Chart(ctxBD, {
            type: 'line', 
            data: { labels: labelsX, datasets: [
                { data: actual, borderColor: '#1f6feb', borderWidth: 3, fill: true, pointRadius: 0, tension: 0.2, backgroundColor: 'rgba(31, 111, 235, 0.1)' },
                { data: proyeccion, borderColor: '#d29922', borderDash: [5, 5], borderWidth: 2, fill: false, pointRadius: 0 },
                { data: ideal, borderColor: 'rgba(46, 160, 67, 0.4)', borderDash: [5, 5], borderWidth: 2, fill: false, pointRadius: 0 }
            ]},
            options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales: { x: { ticks: { color: cT, font: {size: 9} }, grid:{color:cG} }, y: { grid: { color: cG }, ticks: { color: cT, callback: v => '$' + Math.round(v/1000) + 'k' } } } }
        });
    }

    // 🟢 HISTORIAN LOG GENERATOR V12.4 🟢
    alarmLogCache = "";
    if (deudaTC > sueldo * 0.15) {
        alarmLogCache += `<div class='log-item critical'><div class='log-icon'>🛑</div><div class='log-content'><strong>SOBRECARGA TC</strong><div class='log-date'>Liabilities > 15%</div><span>$${deudaTC.toLocaleString('es-CL')}</span></div></div>`;
    }

    const ctxDiario = document.getElementById('chartDiario');
    let limiteDiario = Math.max((sueldo - totalFijosMes - tInfra - tFlota) / diasCiclo, 0);

    if(ctxDiario) {
        let lastDay = Math.min(limit, diasCiclo), startDay = Math.max(1, lastDay - 14);
        for(let i=startDay; i<=lastDay; i++) {
            if (dailyFugas[i] > 0) alarmLogCache += `<div class='log-item warning'><div class='log-icon'>🍔</div><div class='log-content'><strong>FUGA</strong><div class='log-date'>${labelsFechas[i]}</div><span>$${dailyFugas[i].toLocaleString('es-CL')}</span></div></div>`;
            if ((dailyNecesario[i] + dailyFugas[i]) > limiteDiario) alarmLogCache += `<div class='log-item critical'><div class='log-icon'>🔥</div><div class='log-content'><strong>EXCESO</strong><div class='log-date'>${labelsFechas[i]}</div><span>$${(dailyNecesario[i]+dailyFugas[i]).toLocaleString('es-CL')}</span></div></div>`;
        }
        chartDiario = new Chart(ctxDiario, {
            type: 'bar',
            data: { labels: labelsFechas.slice(startDay, lastDay + 1), datasets: [
                { label: 'Base', data: dailyNecesario.slice(startDay, lastDay + 1), backgroundColor: 'rgba(31, 111, 235, 0.6)' },
                { label: 'Fuga', data: dailyFugas.slice(startDay, lastDay + 1), backgroundColor: 'rgba(255, 82, 82, 0.9)' }
            ]},
            options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { stacked: true, ticks: { color: cT, font:{size:8} }, grid: { display:false } }, y: { stacked: true, ticks: { color: cT, callback: v => '$' + Math.round(v / 1000) + 'k' }, grid: { color: cG } } } }
        });
    }

    // Polar Area & TC Horizon (Radar) - Simplificado por espacio
    const sorted = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,6);
    chartP = new Chart(document.getElementById('chartPareto'), {
        type: 'polarArea', 
        data: { labels: sorted.map(c => aliasMap[c[0]] || c[0].split(' ')[0]), datasets: [{ data: sorted.map(c => c[1]), backgroundColor: ['#1f6feb', '#2ea043', '#d29922', '#ff5252', '#a371f7', '#00bcd4'] }] },
        options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ r:{ticks:{display:false}, grid:{color:cG}} } }
    });

    const ctxRadar = document.getElementById('chartRadar');
    if(ctxRadar) {
        let mLabels = [], mValues = [], fHoy = new Date();
        for(let i=1; i<=6; i++) {
            let f = new Date(fHoy.getFullYear(), fHoy.getMonth() + i, 1);
            mLabels.push(f.toLocaleString('es-CL', { month: 'short' }).toUpperCase());
            mValues.push(datosTCGlobal.filter(d => { let fc = new Date(d.mesCobro); return fc.getMonth() === f.getMonth() && fc.getFullYear() === f.getFullYear(); }).reduce((acc, cur) => acc + cur.monto, 0));
        }
        chartRadar = new Chart(ctxRadar, {
            type: 'line',
            data: { labels: mLabels, datasets: [{ data: mValues, borderColor: '#ff5252', backgroundColor: 'rgba(255,82,82,0.1)', fill: true, tension: 0.4 }] },
            options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{ticks:{color:cT}}, x:{ticks:{color:cT}} } }
        });
    }
}

// --- MÓDULO PRE-VUELO (DÍA CERO) ---

window.toggleEstadoPV = function(btn, inputId) {
    const input = document.getElementById(inputId);
    let est = input.getAttribute('data-estado') || 'est';
    if (est === 'est') { input.setAttribute('data-estado', 'real'); btn.className = "btn-estado real"; btn.innerText = "📄"; input.classList.remove('pagado'); input.readOnly = false; }
    else if (est === 'real') { input.setAttribute('data-estado', 'pag'); btn.className = "btn-estado pag"; btn.innerText = "✔️"; input.classList.add('pagado'); input.readOnly = true; }
    else { input.setAttribute('data-estado', 'est'); btn.className = "btn-estado est"; btn.innerText = "EST"; input.classList.remove('pagado'); input.readOnly = false; }
    calcularDiaCero(); 
};

function calcularDiaCero() {
    const valSiNoPagado = (id) => {
        let el = document.getElementById(id);
        if (!el || el.getAttribute('data-estado') === 'pag') return 0; 
        return parseInt(el.value.replace(/\./g, '')) || 0;
    };
    let sueldo = parseInt((document.getElementById('pv-sueldo').value || "0").replace(/\./g, '')) || 0;
    let deudas = valSiNoPagado('pv-tc-nac') + valSiNoPagado('pv-tc-int') + valSiNoPagado('pv-linea');
    let fijos = valSiNoPagado('pv-arriendo') + valSiNoPagado('pv-udec') + valSiNoPagado('pv-cae') + valSiNoPagado('pv-ggcc') + valSiNoPagado('pv-luz') + valSiNoPagado('pv-agua') + valSiNoPagado('pv-gas') + valSiNoPagado('pv-celu') + valSiNoPagado('pv-madre') + valSiNoPagado('pv-subs') + valSiNoPagado('pv-seguro');
    let liquidez = sueldo - deudas - fijos;
    document.getElementById('pv-txt-liquidez').innerText = liquidez.toLocaleString('es-CL');
    if (sueldo > 0) {
        document.getElementById('pv-barra-roja').style.width = (deudas/sueldo)*100 + '%';
        document.getElementById('pv-barra-naranja').style.width = (fijos/sueldo)*100 + '%';
        document.getElementById('pv-barra-verde').style.width = Math.max(0, 100 - ((deudas+fijos)/sueldo)*100) + '%';
    }
    let toggles = document.querySelectorAll('.btn-estado'), conf = 0;
    toggles.forEach(b => { if(b.classList.contains('real') || b.classList.contains('pag')) conf++; });
    let certe = Math.round((conf / toggles.length) * 100);
    let elC = document.getElementById('pv-certeza-pct');
    if(elC) { elC.innerText = certe + '%'; elC.style.color = certe < 40 ? '#ff5252' : (certe < 80 ? '#ff9800' : '#2ea043'); }
}

function ejecutarArranque() {
    if(!confirm("⚠️ INYECCIÓN CRÍTICA V12.4\n¿Inyectar planilla? (Pagados se ignoran)")) return;
    const elM = document.getElementById('navMesConceptual'), elA = document.getElementById('navAnio');
    let fDest = new Date(parseInt(elA.value), parseInt(elM.value), 1, 10, 0, 0), batch = db.batch(), iny = 0;
    const proc = (id, nom, cat) => {
        let el = document.getElementById(id);
        if (el && el.getAttribute('data-estado') !== 'pag') {
            let m = parseInt(el.value.replace(/\./g, '')) || 0;
            if (m > 0) {
                batch.set(db.collection("movimientos").doc(), { monto: m, nombre: nom, categoria: cat, tipo: "Gasto Fijo", fecha: fDest, status: el.getAttribute('data-estado') === 'real' ? 'Real' : 'Estimado', innecesarioPct: 0, cuotas: 1 });
                iny++;
            }
        }
    };
    proc('pv-tc-nac', "PAGO TC NACIONAL", "Gastos Fijos (Búnker)"); proc('pv-tc-int', "PAGO TC INTERNACIONAL", "Gastos Fijos (Búnker)"); proc('pv-linea', "PAGO LÍNEA CRÉDITO", "Gastos Fijos (Búnker)");
    proc('pv-arriendo', "ARRIENDO", "Infraestructura (Depto)"); proc('pv-udec', "UDEC 2024", "Infraestructura (Depto)"); proc('pv-cae', "PAGO CAE", "Infraestructura (Depto)");
    proc('pv-ggcc', "GASTOS COMUNES", "Infraestructura (Depto)"); proc('pv-luz', "LUZ", "Infraestructura (Depto)"); proc('pv-agua', "AGUA", "Infraestructura (Depto)");
    proc('pv-gas', "GAS", "Infraestructura (Depto)"); proc('pv-celu', "CELU MIO", "Suscripciones"); proc('pv-madre', "MOVISTAR MADRE", "Red de Apoyo (Familia)");
    proc('pv-subs', "PACK SUBS", "Suscripciones"); proc('pv-seguro', "SEGURO AUTO", "Flota & Movilidad");
    if (iny > 0) batch.commit().then(() => { document.getElementById('modal-dia-cero').style.display='none'; mostrarToast(`${iny} INYECTADOS`); actualizarDashboard(); });
}

// --- UTILIDADES ---
function calcularFechasCiclo(mes, anio) {
    let mI = mes - 1, aI = anio; if (mI < 0) { mI = 11; aI--; }
    let T0 = new Date(aI, mI, 30); if (T0.getMonth() !== mI) T0 = new Date(aI, mI + 1, 0); 
    let TF = new Date(anio, mes, 30); if (TF.getMonth() !== mes) TF = new Date(anio, mes + 1, 0);
    return { T0, TFinal: TF, fechaFinVisual: new Date(TF.getTime() - 86400000) };
}
function formatearEntradaNumerica(i) { let v = i.value.replace(/\D/g,''); i.value = v ? parseInt(v).toLocaleString('es-CL') : ''; }
function triggerSync() { fetch("https://script.google.com/macros/s/AKfycbwKlub0qrv8_d24ZuyKKNryqOw1E68xv1_JvPOoEUc6W8TICllFfodNcwkigQE_7AuoNg/exec", {mode:'no-cors'}).then(()=>mostrarToast("SYNC COMPLETA")); }
function inicializarListenerTC() {
    db.collection("deuda_tc").orderBy("mesCobro", "asc").onSnapshot(snap => {
        datosTCGlobal = []; totalTC = 0;
        snap.forEach(doc => { let d = doc.data(); d.id = doc.id; datosTCGlobal.push(d); totalTC += d.monto; });
        actualizarDashboard();
    });
}
function aplicarCicloAlSistema() { cargarSueldoVisual(); actualizarDashboard(); }
window.toggleLanguage = function() { isEng = !isEng; mostrarToast(isEng ? 'ENGLISH MODE' : 'MODO ESPAÑOL'); };
function loginWithGoogle() { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
function logout() { auth.signOut().then(() => window.location.reload()); }
setInterval(() => { const c = document.getElementById('cronos'); if(c) c.innerText = new Date().toLocaleString('es-CL').toUpperCase(); }, 1000);

// ==========================================================
