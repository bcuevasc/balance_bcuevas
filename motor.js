// ==========================================================
// 🧠 BÚNKER SCADA ORACLE - MOTOR LÓGICO COMPLETO V14.6
// ==========================================================

// 1. CONSTANTES GLOBALES Y ESTADO (Declaradas UNA sola vez)
const BYRON_EMAIL = "bvhcc94@gmail.com"; 
const catEvitables = ["Dopamina & Antojos"]; 
const SUELDO_BASE_DEFAULT = 3602505;

let listaMovimientos = [], datosMesGlobal = [], sueldosHistoricos = {}; 
let chartBD = null, chartP = null, chartDiario = null, chartRadar = null, chartTCDist = null;
let currentSort = { column: 'fechaISO', direction: 'desc' }; 
let modoEdicionActivo = false; 
let datosPatrimonio = { inyectado: 0, tir: 8, auto: 0, otrosActivos: 0, cae: 0, hipotecario: 0, otrosPasivos: 0 };
window.totalTC = 0;
window.VALOR_USD = 950; 

// 2. DICCIONARIOS DE IA Y CATEGORÍAS
const diccAuto = [
    { keys: ["prestamo", "debe", "pagar dps", "por cobrar", "cuota de"], cat: "Cuentas por Cobrar (Activos)", tipo: "Por Cobrar", fuga: "0" },
    { keys: ["uber", "didi", "cabify", "pasaje", "buses", "turbus", "metro"], cat: "Transporte & Logística", tipo: "Gasto", fuga: "0" },
    { keys: ["copec", "shell", "autopase", "revision tecnica", "lavado auto", "mecanico", "peaje", "seguro auto", "permiso circulacion"], cat: "Flota & Movilidad", tipo: "Gasto Fijo", fuga: "0" },
    { keys: ["dividendo", "arriendo", "gastos comunes", "ggcc", "contribuciones", "hipotecario", "departamento", "luz", "agua", "gas", "internet", "udec", "cae"], cat: "Infraestructura (Depto)", tipo: "Gasto Fijo", fuga: "0" },
    { keys: ["pedidosya", "mcdonalds", "burger king", "starbucks", "rappi", "helado", "cine", "concierto", "fother muckers", "mall plaza", "los angeles"], cat: "Dopamina & Antojos", tipo: "Gasto", fuga: "100" },
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

// 3. INICIALIZACIÓN API Y EVENTOS BASE
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

document.addEventListener("DOMContentLoaded", () => {
    inicializarSensorDolar();
    
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

    const inputNombre = document.getElementById('inputNombre');
    const inputMonto = document.getElementById('inputMonto');
    
    if(inputNombre) {
        inputNombre.addEventListener('keypress', e => { if(e.key === 'Enter') { e.preventDefault(); if(inputMonto && !inputMonto.value) inputMonto.focus(); else document.getElementById('btnGuardar').click(); } });
        inputNombre.addEventListener('input', (e) => {
            if(modoEdicionActivo) return; 
            let texto = e.target.value.toLowerCase();
            for(let dict of diccAuto) {
                if(dict.keys.some(k => texto.includes(k))) {
                    document.getElementById('inputCategoria').value = dict.cat;
                    document.getElementById('inputTipo').value = dict.tipo;
                    let fEl = document.getElementById('inputFuga');
                    if(fEl) fEl.value = dict.fuga;
                    inputNombre.style.borderBottom = "2px solid #2ea043";
                    setTimeout(() => inputNombre.style.borderBottom = "2px solid var(--accent-blue)", 1000);
                    break;
                }
            }
        });
    }
    if(inputMonto) {
        inputMonto.addEventListener('keypress', e => { if(e.key === 'Enter') { e.preventDefault(); if(inputNombre && !inputNombre.value) inputNombre.focus(); else document.getElementById('btnGuardar').click(); } });
    }
});

// 4. FIREBASE Y AUTH
firebase.initializeApp({ apiKey: "AIzaSyBiYETN_JipXWhMq9gKz-2Pap-Ce4ZJNAI", authDomain: "finanzas-bcuevas.firebaseapp.com", projectId: "finanzas-bcuevas" });
const db = firebase.firestore(), auth = firebase.auth();

window.loginWithGoogle = function() { 
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => {
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
            let btn = document.querySelector('.btn-google');
            if(btn) btn.innerHTML = "⏳ REDIRECCIONANDO...";
            auth.signInWithRedirect(provider);
        } else {
            alert("❌ ERROR DE CONEXIÓN:\n" + err.message);
        }
    }); 
};

window.logout = function() { 
    auth.signOut().then(() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }); 
};

auth.onAuthStateChanged(user => {
    if (user) {
        if (user.email.toLowerCase() === BYRON_EMAIL.toLowerCase()) {
            console.log("%c[ORACLE V14.6] MATRIX ONLINE", "color: #2ea043; font-weight: bold; font-size: 14px;");
            const loginScreen = document.getElementById('login-screen'), reportZone = document.getElementById('reportZone');
            if(loginScreen) loginScreen.style.display = 'none';
            if(reportZone) reportZone.classList.add('active-app');
            
            const userDisplay = document.getElementById('user-display');
            if(userDisplay) userDisplay.innerText = user.displayName.split(" ")[0];
            
            db.collection("parametros").doc("sueldos").onSnapshot(snap => { if(snap.exists) sueldosHistoricos = snap.data(); });
            db.collection("parametros").doc("patrimonio").onSnapshot(snap => { 
                if(snap.exists) { datosPatrimonio = snap.data(); if(typeof renderizarPatrimonioVisual === 'function') renderizarPatrimonioVisual(); }
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
        } else {
            auth.signOut(); alert(`⛔ DENEGADO:\nEl correo ${user.email} no tiene permisos.`);
        }
    }
});

// 5. NÚCLEO LÓGICO DE FECHAS Y ARRASTRE
window.calcularFechasCiclo = function(mesConceptual, anio) {
    let mesInicio = mesConceptual - 1; let anioInicio = anio; if (mesInicio < 0) { mesInicio = 11; anioInicio--; }
    let T0 = new Date(anioInicio, mesInicio, 30); if (T0.getMonth() !== mesInicio) T0 = new Date(anioInicio, mesInicio + 1, 0); 
    let TFinal = new Date(anio, mesConceptual, 30); if (TFinal.getMonth() !== mesConceptual) TFinal = new Date(anio, mesConceptual + 1, 0);
    return { T0, TFinal, fechaFinVisual: new Date(TFinal.getTime() - 86400000) };
};

window.obtenerSueldoMes = function(anio, mes) {
    let llave = `${anio}_${mes}`;
    if (sueldosHistoricos[llave]) return sueldosHistoricos[llave];
    return SUELDO_BASE_DEFAULT;
};

function calcularArrastreMesAnterior(anioActual, mesActual) {
    let mesPrev = mesActual - 1; let anioPrev = anioActual;
    if (mesPrev < 0) { mesPrev = 11; anioPrev--; }
    
    const { T0, TFinal } = calcularFechasCiclo(mesPrev, anioPrev);
    const sueldoPrev = obtenerSueldoMes(anioPrev, mesPrev);
    
    let balancePrev = sueldoPrev;
    listaMovimientos.forEach(x => {
        let d = new Date(x.fechaISO);
        if (d >= T0 && d <= TFinal && x.categoria !== 'Gasto Tarjeta de Crédito') {
            const esIn = x.tipo === 'Ingreso' || x.categoria === 'Transferencia Recibida';
            const esNeutro = x.tipo === 'Por Cobrar' || x.tipo === 'Ahorro';
            if (esIn) balancePrev += x.monto;
            else if (!esNeutro) balancePrev -= x.monto;
        }
    });
    
    return balancePrev < 0 ? Math.abs(balancePrev) : 0;
}

window.aplicarCicloAlSistema = function() {
    const navMes = document.getElementById('navMesConceptual'), navAnio = document.getElementById('navAnio');
    if(!navMes || !navAnio) return;
    const fD = document.getElementById('filtroDesde'), fH = document.getElementById('filtroHasta');
    if(fD) fD.value = ''; if(fH) fH.value = '';

    let lbl = document.getElementById('lblPeriodoViendo'); if(lbl) lbl.innerText = isEng ? 'FULL PERIOD' : 'PERIODO COMPLETO';
    let cajaPC = document.getElementById('cajaFechasCustom'); if(cajaPC) cajaPC.style.display = 'none';
    let btnPC = document.getElementById('btnToggleFechas'); if(btnPC) btnPC.style.display = 'block';

    const { T0, fechaFinVisual } = calcularFechasCiclo(parseInt(navMes.value), parseInt(navAnio.value));
    const badge = document.getElementById('navRangoBadge');
    if(badge) badge.innerText = `[${T0.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}).toUpperCase()} - ${fechaFinVisual.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}).toUpperCase()}]`;
    
    if(typeof cargarSueldoVisual === 'function') cargarSueldoVisual(); 
    actualizarDashboard();
};

window.actualizarDashboard = function() {
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio');
    if(!elMes || !elAnio) return;
    const mesVal = parseInt(elMes.value), anioVal = parseInt(elAnio.value);
    
    const sueldo = obtenerSueldoMes(anioVal, mesVal);
    let { T0, TFinal } = calcularFechasCiclo(mesVal, anioVal);
    
    const fDesde = document.getElementById('filtroDesde') ? document.getElementById('filtroDesde').value : '';
    const fHasta = document.getElementById('filtroHasta') ? document.getElementById('filtroHasta').value : '';
    if(fDesde) { let [y,m,d] = fDesde.split('-'); T0 = new Date(y, m-1, d); }
    if(fHasta) { let [y,m,d] = fHasta.split('-'); TFinal = new Date(y, m-1, d, 23, 59, 59); }

    // Calcular Arrastre
    const montoArrastre = calcularArrastreMesAnterior(anioVal, mesVal);
    const elArrastre = document.getElementById('txtArrastreLinea');
    if(elArrastre) elArrastre.innerText = montoArrastre.toLocaleString('es-CL');
    const cardArrastre = document.getElementById('cardArrastre');
    if(cardArrastre) cardArrastre.style.display = montoArrastre > 0 ? 'block' : 'none';

    let dataMes = listaMovimientos.filter(x => { let d = new Date(x.fechaISO); return d >= T0 && d <= TFinal; });
    
    // Normalizar atributos
    dataMes.forEach(x => {
        x.catV = x.categoria || 'Sin Categoría';
        if (x.monto <= 1000 && x.catV === 'Sin Categoría') x.catV = "Ruido de Sistema";
        x.esIn = x.tipo === 'Ingreso' || x.catV === 'Transferencia Recibida' || x.catV === 'Ingreso Adicional';
        x.esNeutro = x.tipo === 'Por Cobrar' || x.tipo === 'Ahorro' || x.catV === 'Transferencia Propia / Ahorro';
    });

    datosMesGlobal = [...dataMes];
    let saldoAcc = sueldo - montoArrastre; // Restar deuda previa al saldo
    let tI = 0, tF = 0, tO = 0, tC = 0, tEvitable = 0, tInfra = 0, tFlota = 0, gCat = {};
    
    [...dataMes].sort((x,y) => x.fechaISO < y.fechaISO ? -1 : 1).forEach(x => {
        if (x.catV !== 'Gasto Tarjeta de Crédito') { 
            if (x.esIn) { tI += x.monto; saldoAcc += x.monto; }
            else if (x.tipo === 'Por Cobrar' || x.catV === 'Cuentas por Cobrar (Activos)') tC += x.monto;
            else if (!x.esNeutro) {
                saldoAcc -= x.monto;
                if (x.catV === 'Infraestructura (Depto)') { tInfra += x.monto; }
                else if (x.catV === 'Flota & Movilidad') { tFlota += x.monto; }
                else if (x.tipo === 'Gasto Fijo') { tF += x.monto; } 
                else { tO += x.monto; }
                
                gCat[x.catV] = (gCat[x.catV] || 0) + x.monto;
                let pctFuga = x.innecesarioPct !== undefined ? x.innecesarioPct : (catEvitables.includes(x.catV) ? 100 : 0);
                tEvitable += (x.monto * (pctFuga / 100));
            }
        }
    });

    const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val.toLocaleString('es-CL'); };
    setTxt('txtTotalFijos', tF + tInfra + tFlota); // Fijos agrupa todo lo duro
    setTxt('txtTotalOtros', tO); 
    setTxt('txtTotalIngresos', tI);
    setTxt('txtSaldo', saldoAcc);
    
    const diasCiclo = Math.max(1, Math.round((TFinal - T0) / 86400000));
    const hoy = new Date();
    let diasT = (hoy >= T0 && hoy <= TFinal) ? Math.max(Math.floor((hoy - T0) / 86400000) + 1, 1) : (hoy > TFinal ? diasCiclo : 0);
    
    const badgeDias = document.getElementById('badgeDias');
    if(badgeDias) badgeDias.innerText = `${Math.max(diasCiclo - diasT, 0)} DÍAS`;
    
    setTxt('txtTotalEvitable', Math.round(tEvitable));
    const txtPctFugas = document.getElementById('txtPorcentajeFugas');
    if(txtPctFugas) {
        const pctFugas = sueldo > 0 ? ((tEvitable / sueldo) * 100).toFixed(1) : 0;
        txtPctFugas.innerText = pctFugas + '%';
    }

    const txtProyectado = document.getElementById('txtProyectado');
    if(txtProyectado) {
        let proyVal = saldoAcc - (window.totalTC || 0);
        txtProyectado.innerText = proyVal.toLocaleString('es-CL');
        txtProyectado.style.color = proyVal < 0 ? "var(--color-fuga)" : "#79c0ff";
    }

    let dataGraficos = dataMes.filter(x => x.catV !== 'Gasto Tarjeta de Crédito');
    if (typeof renderizarListas === 'function') renderizarListas(sueldo, b);
    if (typeof dibujarGraficosFlujo === 'function') dibujarGraficosFlujo(sueldo, [...dataGraficos].sort((x,y) => x.fechaISO < y.fechaISO ? -1 : 1), gCat, diasCiclo, T0, tF, tInfra, tFlota);
    
    setTxt('txtGastoTramo', tO + tF + tInfra + tFlota);
    setTxt('txtPromedioZoom', Math.round((tO + tF + tInfra + tFlota) / diasCiclo));
};

// 6. RENDERIZADO DE TABLAS Y TARJETAS
window.renderizarListas = function(sueldoBase, filtroBuscador) {
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
    datos.forEach((x) => {
        if (x.esIn) saldoRelativo += x.monto; else if (!x.esNeutro) saldoRelativo -= x.monto;
        x.saldoCalculadoVista = saldoRelativo;
    });

    const contenedorPC = document.getElementById('listaDetalle'); 
    const contenedorMovil = document.getElementById('listaMovilDetalle');

    if (contenedorPC) {
        if(datos.length === 0) { contenedorPC.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">MATRIZ SIN DATOS</td></tr>`; }
        else {
            let htmlPC = ''; let now = new Date(); now.setHours(0,0,0,0); let yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
            datos.forEach((x) => {
                const d = new Date(x.fechaISO);
                const dateStr = d.toLocaleDateString('es-CL', {day:'2-digit', month:'2-digit'});
                const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                const colorMonto = x.esIn ? "var(--color-ingresos)" : x.esNeutro ? "#d29922" : "var(--text-main)";
                const nombreSeguro = x.nombre || "Desconocido";
                const montoSeguro = x.monto || 0;
                let iconImpacto = x.esIn ? `<span class="impact-icon" style="color:var(--color-ingresos)">+</span>` : x.esNeutro ? `<span class="impact-icon" style="color:#d29922">=</span>` : `<span class="impact-icon" style="color:var(--color-fuga)">-</span>`;
                
                let editIdVal = document.getElementById('editId') ? document.getElementById('editId').value : '';
                let bgEdicion = (editIdVal === x.firestoreId) ? 'background-color: rgba(210, 153, 34, 0.15); border-left: 3px solid var(--color-edit);' : (x.catV === 'Dopamina & Antojos' ? 'background: linear-gradient(90deg, rgba(255,255,255,0.01) 60%, rgba(255,82,82,0.15) 100%);' : '');

                htmlPC += `<tr style="${bgEdicion}">
                    <td style="text-align: center;"><input type="checkbox" class="row-check" value="${x.firestoreId}" onchange="updateMassActions()"></td>
                    <td style="font-size:0.75rem; color:var(--text-muted);">${dateStr} <span class="col-hora">${timeStr}</span></td>
                    <td class="col-desc" title="${nombreSeguro}">${nombreSeguro}</td>
                    <td style="font-size:0.7rem;"><span class="cat-badge">${x.catV.replace(' & ','&')}</span></td>
                    <td class="col-monto" style="color:${colorMonto};">${iconImpacto}$${montoSeguro.toLocaleString('es-CL')}</td>
                    <td class="col-monto hide-mobile" style="color:var(--text-muted); font-size:0.75rem;">$${x.saldoCalculadoVista.toLocaleString('es-CL')}</td>
                    <td style="text-align:center;"><button class="btn-sys" style="padding:2px 6px; border:none; background:transparent; font-size:1rem;" onclick="editarMovimiento('${x.firestoreId}')">✏️</button></td>
                </tr>`;
            });
            contenedorPC.innerHTML = htmlPC;
        }
    }

    if (contenedorMovil) {
        if(datos.length === 0) { contenedorMovil.innerHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-dim);">MATRIZ SIN DATOS</div>`; }
        else {
            let htmlMovil = ''; let currentDayGroup = ""; let now = new Date(); now.setHours(0,0,0,0); let yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
            datos.forEach((x) => {
                const d = new Date(x.fechaISO); let dClean = new Date(d); dClean.setHours(0,0,0,0);
                const dateStr = d.toLocaleDateString('es-CL'), timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                
                if (currentSort.column === 'fechaISO' && currentSort.direction === 'desc' && dateStr !== currentDayGroup) {
                    let labelText = dateStr;
                    if (dClean.getTime() === now.getTime()) labelText = "HOY"; else if (dClean.getTime() === yesterday.getTime()) labelText = "AYER"; else { const meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"]; labelText = `${d.getDate()} ${meses[d.getMonth()]}`; }
                    htmlMovil += `<div class="date-header">${labelText}</div>`; currentDayGroup = dateStr;
                }

                const em = catEmojis[x.catV] || "❓", colorMonto = x.esIn ? "var(--accent-green)" : x.esNeutro ? "#d29922" : "var(--text-main)", iconoVisual = obtenerIconoVisual(x.nombre, em);
                const nombreSeguro = x.nombre || "Desc", montoSeguro = x.monto || 0;
                let styleExtra = x.catV === 'Dopamina & Antojos' ? 'background: linear-gradient(90deg, rgba(255,255,255,0.01) 30%, rgba(255, 82, 82, 0.15) 100%) !important; border-right: 2px solid var(--accent-red) !important;' : '';
                const clickAction = typeof openBottomSheet === 'function' ? `openBottomSheet('${x.firestoreId}', '${nombreSeguro.replace(/'/g, "\\'")}', ${montoSeguro})` : `editarMovimiento('${x.firestoreId}')`;
                
                htmlMovil += `
                <div class="mobile-card" onclick="${clickAction}" style="${styleExtra}">
                    <div style="width: 46px; height: 46px; margin-right: 12px; background: var(--bg-elevated); border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; border: 1px solid var(--border-subtle); box-shadow: inset 0 2px 5px rgba(0,0,0,0.5);">${iconoVisual}</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight:bold; font-size:0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-main); letter-spacing: 0.5px;">${nombreSeguro}</div>
                        <div style="font-size:0.7rem; color:var(--text-dim); margin-top:3px;">${timeStr} • ${x.catV.replace(' & ','&')}</div>
                    </div>
                    <div style="font-weight:900; color:${colorMonto}; flex-shrink: 0; font-size:1.15rem; font-family:monospace;">${x.esIn?'+':(x.esNeutro?'=':'-')}$${Math.round(montoSeguro/1000)}k</div>
                </div>`;
            });
            contenedorMovil.innerHTML = htmlMovil;
        }
    }
};

const logosComerciales = { "uber": "uber.com", "pedidosya": "pedidosya.com", "mcdonald": "mcdonalds.com", "starbucks": "starbucks.cl", "jumbo": "jumbo.cl", "lider": "lider.cl" };
function obtenerIconoVisual(nombre, emojiFallback) {
    if(!nombre) return `<span style="font-size:1.4rem;">${emojiFallback}</span>`;
    let n = nombre.toLowerCase();
    for (let marca in logosComerciales) {
        if (n.includes(marca)) return `<img src="https://logo.clearbit.com/${logosComerciales[marca]}?size=100" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; background: white;" onerror="this.outerHTML='<span style=\\'font-size:1.4rem;\\'>${emojiFallback}</span>'">`;
    }
    return `<span style="font-size:1.4rem;">${emojiFallback}</span>`;
}

// 7. EDICIÓN E INYECCIÓN DE DATOS
window.editarMovimiento = function(id) {
    const mov = listaMovimientos.find(m => m.firestoreId === id);
    if(!mov) return alert("Registro no encontrado.");
    if(document.getElementById('editId')) document.getElementById('editId').value = mov.firestoreId; 
    if(document.getElementById('inputNombre')) document.getElementById('inputNombre').value = mov.nombre;
    if(document.getElementById('inputMonto')) document.getElementById('inputMonto').value = mov.monto.toLocaleString('es-CL');
    if(document.getElementById('inputCategoria')) {
        document.getElementById('inputCategoria').value = mov.categoria || 'Sin Categoría';
        const boxC = document.getElementById('boxCuotas');
        if(boxC) boxC.style.display = (mov.categoria === "Gasto Tarjeta de Crédito") ? "block" : "none";
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
    if(btn) { btn.innerHTML = "ACTUALIZAR"; btn.style.backgroundColor = "var(--color-saldo)"; }
    modoEdicionActivo = true;
    actualizarDashboard(); 
};

window.agregarMovimiento = function() {
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

    if (!m || !n || !fInput) return alert("⚠️ Faltan parámetros.");
    const btn = document.getElementById('btnGuardar');
    btn.innerHTML = "INYECTANDO..."; btn.disabled = true;
    const dataPayload = { nombre: n, monto: m, categoria: c, tipo: t, fecha: new Date(fInput), status: 'Manual', innecesarioPct: pctFuga, cuotas: cantCuotas };
    
    let op = (modoEdicionActivo && editId) ? db.collection("movimientos").doc(editId).update(dataPayload) : db.collection("movimientos").add(dataPayload);
    op.then(() => {
        document.getElementById('editId').value = ''; document.getElementById('inputNombre').value = ''; document.getElementById('inputMonto').value = '';
        btn.innerHTML = "INYECTAR"; btn.style.backgroundColor = "var(--color-edit)"; btn.disabled = false; modoEdicionActivo = false;
        mostrarToast("REGISTRO CONFIRMADO");
    }).catch(err => { alert("❌ Error: " + err.message); btn.innerHTML = "ERROR"; btn.disabled = false; });
};

window.formatearEntradaNumerica = function(i) { let v = i.value.replace(/\D/g,''); i.value = v ? parseInt(v).toLocaleString('es-CL') : ''; };
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

// 8. TELEMETRÍA (GRÁFICOS CON NÚMEROS FLOTANTES)
window.dibujarGraficosFlujo = function(sueldo, chronData, cats, diasCiclo, T0, totalFijosMes, tInfra, tFlota) {
    if(chartBD) chartBD.destroy(); if(chartP) chartP.destroy(); if(chartDiario) chartDiario.destroy(); 
    const cT = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || "#f0f6fc"; 
    const cG = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || "#21262d"; 
    
    let daily = Array(diasCiclo + 1).fill(0), dailyNecesario = Array(diasCiclo + 1).fill(0), dailyFugas = Array(diasCiclo + 1).fill(0), msT0 = T0.getTime();

    chronData.forEach(m => {
        let d = new Date(m.fechaISO);
        let diff = Math.floor((d.getTime() - msT0) / 86400000) + 1;
        if(diff >= 1 && diff <= diasCiclo) { 
            if(m.esIn) daily[diff] += m.monto; 
            else if(!m.esNeutro) { 
                daily[diff] -= m.monto; 
                if(m.catV !== 'Infraestructura (Depto)' && m.catV !== 'Flota & Movilidad' && m.tipo !== 'Gasto Fijo') {
                    if(catEvitables.includes(m.catV)) dailyFugas[diff] += m.monto;
                    else dailyNecesario[diff] += m.monto;
                }
            } 
        }
    });

    let actual = [sueldo], ideal = [sueldo], proyeccion = Array(diasCiclo + 1).fill(null);
    let labelsX = ["INI"], labelsFechas = ["INI"]; 
    let acc = sueldo, limit = Math.floor((Date.now() - msT0) / 86400000) + 1;
    const nombresMes = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

    for(let i=1; i<=diasCiclo; i++) {
        ideal.push(sueldo - (sueldo/diasCiclo)*i); acc += daily[i]; actual.push(i > limit ? null : acc);
        let f = new Date(msT0 + (i-1)*86400000), dia = String(f.getDate()).padStart(2, '0'), mesStr = nombresMes[f.getMonth()];
        labelsFechas.push(`${dia} ${mesStr}`); labelsX.push(f.getDate() === 1 ? `${dia} ${mesStr}` : dia); 
    }

    if(limit > 1 && limit <= diasCiclo) {
        let gastoAcumulado = sueldo - actual[limit];
        let promedioGastoDiario = gastoAcumulado / limit;
        proyeccion[limit] = actual[limit];
        for(let i = limit + 1; i <= diasCiclo; i++) proyeccion[i] = proyeccion[i-1] - promedioGastoDiario;
    }

    const ctxBD = document.getElementById('chartBurnDown');
    if(ctxBD) {
        let grad = ctxBD.getContext('2d').createLinearGradient(0, 0, 0, 400);
        grad.addColorStop(0, 'rgba(31, 111, 235, 0.4)'); grad.addColorStop(1, 'rgba(31, 111, 235, 0)');
        chartBD = new Chart(ctxBD, {
            type: 'line', 
            data: { labels: labelsX, datasets: [
                { label: 'Consumo Real', data: actual, borderColor: '#1f6feb', backgroundColor: grad, borderWidth: 3, fill: true, pointRadius: 0, tension: 0.2 },
                { label: 'Proyección', data: proyeccion, borderColor: '#d29922', borderDash: [5, 5], borderWidth: 2, fill: false, pointRadius: 0, tension: 0.2 },
                { label: 'Ideal', data: ideal, borderColor: 'rgba(46, 160, 67, 0.4)', borderDash: [5, 5], borderWidth: 2, fill: false, pointRadius: 0 }
            ]},
            options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales: { x: { ticks: { color: cT, font: {size: 9} }, grid:{color:cG} }, y: { grid: { color: cG }, ticks: { color: cT, callback: v => '$' + Math.round(v/1000) + 'k' } } }, layout: { padding: 0 } }
        });
    }

    const sorted = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,6);
    const bgColors = ['rgba(31, 111, 235, 0.7)', 'rgba(46, 160, 67, 0.7)', 'rgba(210, 153, 34, 0.7)', 'rgba(255, 82, 82, 0.7)', 'rgba(163, 113, 247, 0.7)', 'rgba(0, 188, 212, 0.7)'];
    const borderColors = ['#1f6feb', '#2ea043', '#d29922', '#ff5252', '#a371f7', '#00bcd4'];
    
    const ctxPareto = document.getElementById('chartPareto');
    if(ctxPareto) {
        chartP = new Chart(ctxPareto, {
            type: 'polarArea', 
            data: { labels: sorted.map(c => aliasMap[c[0]] || c[0].split(' ')[0]), datasets: [{ data: sorted.map(c => c[1]), backgroundColor: bgColors, borderColor: borderColors, borderWidth: 2 }] },
            options: { maintainAspectRatio:false, plugins:{legend:{position: 'right', labels:{color:cT, font:{size:10, family:'monospace'}}}}, scales:{ r:{ticks:{display:false}, grid:{color:cG}, angleLines:{color:cG}} } }
        });
    }

    const ctxDiario = document.getElementById('chartDiario');
    let limiteDiarioIdeal = Math.max((sueldo - totalFijosMes - tInfra - tFlota) / diasCiclo, 0);

    if(ctxDiario) {
        let lastDayWithData = diasCiclo;
        while(lastDayWithData > 0 && (dailyNecesario[lastDayWithData] === 0 && dailyFugas[lastDayWithData] === 0)) lastDayWithData--;
        let startDayForBars = Math.max(1, lastDayWithData - 14); 
        let barLabels = labelsFechas.slice(startDayForBars, lastDayWithData + 1); 
        let barNecesario = dailyNecesario.slice(startDayForBars, lastDayWithData + 1);
        let barFugas = dailyFugas.slice(startDayForBars, lastDayWithData + 1);

        const diarioEnhancementsPlugin = {
            id: 'diarioEnhancementsPlugin',
            afterDraw: (chart) => {
                const ctx = chart.ctx; const xAxis = chart.scales.x; const yAxis = chart.scales.y;
                if(limiteDiarioIdeal > 0) {
                    const yPos = yAxis.getPixelForValue(limiteDiarioIdeal);
                    if(yPos >= yAxis.top && yPos <= yAxis.bottom) {
                        ctx.save(); ctx.beginPath(); ctx.moveTo(xAxis.left, yPos); ctx.lineTo(xAxis.right, yPos);
                        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(210, 153, 34, 0.8)'; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.restore();
                    }
                }
                ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#e6edf3';
                const metaBase = chart.getDatasetMeta(0);
                for (let i = 0; i < chart.data.labels.length; i++) {
                    let total = (chart.data.datasets[0].data[i] || 0) + (chart.data.datasets[1].data[i] || 0);
                    if (total > 0 && !metaBase.hidden) {
                        let text = (total >= 1000) ? Math.round(total / 1000) + 'k' : total;
                        ctx.fillText(text, metaBase.data[i].x, chart.scales.y.getPixelForValue(total) - 3);
                    }
                }
                ctx.restore();
            }
        };

        chartDiario = new Chart(ctxDiario, {
            type: 'bar',
            data: { labels: barLabels, datasets: [{ label: 'Gasto Base', data: barNecesario, backgroundColor: 'rgba(31, 111, 235, 0.6)', borderRadius: 2 }, { label: 'Fuga (Dopamina)', data: barFugas, backgroundColor: 'rgba(255, 82, 82, 0.9)', borderRadius: 2 }] },
            options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { stacked: true, ticks: { color: cT, font:{size:8} }, grid: { display:false } }, y: { stacked: true, ticks: { color: cT, callback: v => '$' + Math.round(v / 1000) + 'k' }, grid: { color: cG } } } },
            plugins: [diarioEnhancementsPlugin]
        });
    }
};

window.dibujarGraficosTC = function(sueldo) {
    if(chartRadar) chartRadar.destroy(); if(chartTCDist) chartTCDist.destroy();
    const cT = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || "#f0f6fc"; 
    const cG = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || "#21262d"; 
    
    const ctxProyeccion = document.getElementById('chartRadar');
    if(ctxProyeccion) {
        let mesesLabels = []; let montosProyectados = []; let fechaHoy = new Date();
        for(let i=1; i<=6; i++) {
            let f = new Date(fechaHoy.getFullYear(), fechaHoy.getMonth() + i, 1);
            mesesLabels.push(f.toLocaleString('es-CL', { month: 'short' }).toUpperCase());
            let sumaMes = datosTCGlobal.filter(d => { let fCobro = new Date(d.mesCobro); return fCobro.getMonth() === f.getMonth() && fCobro.getFullYear() === f.getFullYear(); }).reduce((acc, curr) => acc + curr.monto, 0);
            montosProyectados.push(sumaMes);
        }
        
        let grad = ctxProyeccion.getContext('2d').createLinearGradient(0, 0, 0, 300);
        grad.addColorStop(0, 'rgba(255, 82, 82, 0.6)'); grad.addColorStop(1, 'rgba(255, 82, 82, 0.05)');

        const tcEnhancementsPlugin = {
            id: 'tcEnhancementsPlugin',
            afterDraw: (chart) => {
                const ctx = chart.ctx; const xAxis = chart.scales.x; const yAxis = chart.scales.y;
                const umbralSeguridad = sueldo * 0.15;
                if(yAxis.max > umbralSeguridad) {
                    const yPos = yAxis.getPixelForValue(umbralSeguridad);
                    ctx.save(); ctx.beginPath(); ctx.moveTo(xAxis.left, yPos); ctx.lineTo(xAxis.right, yPos);
                    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255, 82, 82, 0.8)'; ctx.setLineDash([5, 5]); ctx.stroke();
                    ctx.fillStyle = '#ff5252'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left'; ctx.textBaseline='bottom'; ctx.fillText('MAX (15%)', xAxis.left + 5, yPos - 5); ctx.restore();
                }
                ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#ff5252';
                const dataset = chart.data.datasets[0]; const meta = chart.getDatasetMeta(0);
                meta.data.forEach((point, index) => {
                    let val = dataset.data[index];
                    if (val > 0) { ctx.fillText('$' + Math.round(val / 1000) + 'k', point.x, point.y - 8); }
                });
                ctx.restore();
            }
        };

        chartRadar = new Chart(ctxProyeccion, {
            type: 'line',
            data: { labels: mesesLabels, datasets: [{ label: 'Deuda TC', data: montosProyectados, backgroundColor: grad, borderColor: '#ff5252', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#030508', pointBorderColor: '#ff5252' }] },
            options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: cT, callback: v => '$' + Math.round(v/1000) + 'k' }, grid: { color: cG } }, x: { ticks: { color: cT, font: {size: 10, weight: 'bold'} }, grid: { display: false } } } },
            plugins: [tcEnhancementsPlugin]
        });
    }

    const ctxDist = document.getElementById('chartTCDist');
    if(ctxDist) {
        let tcComercios = {};
        datosTCGlobal.forEach(d => { let n = d.nombre.split(' ')[0]; tcComercios[n] = (tcComercios[n] || 0) + d.monto; });
        let sortedTC = Object.entries(tcComercios).sort((a,b)=>b[1]-a[1]).slice(0,5); 
        const bgColorsTC = ['rgba(255, 82, 82, 0.8)', 'rgba(255, 152, 0, 0.8)', 'rgba(210, 153, 34, 0.8)', 'rgba(163, 113, 247, 0.8)', 'rgba(31, 111, 235, 0.8)'];
        chartTCDist = new Chart(ctxDist, {
            type: 'doughnut',
            data: { labels: sortedTC.map(c => c[0]), datasets: [{ data: sortedTC.map(c => c[1]), backgroundColor: bgColorsTC, borderWidth: 1, borderColor: '#030508' }] },
            options: { maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'right', labels: { color: cT, font: { size: 9, family: 'monospace' } } } } }
        });
    }
};

// 9. LISTENERS DE DATOS Y UTILIDADES DE TABLA
window.inicializarListenerTC = function() {
    db.collection("deuda_tc").orderBy("mesCobro", "asc").onSnapshot(snapshot => {
        datosTCGlobal = []; let totalDeuda = 0;
        snapshot.forEach(doc => { let data = doc.data(); data.id = doc.id; datosTCGlobal.push(data); totalDeuda += data.monto; });
        window.totalTC = totalDeuda;
        if(typeof renderizarTablaTC === 'function') renderizarTablaTC();
        const elAnio = document.getElementById('navAnio'), elMes = document.getElementById('navMesConceptual');
        let sueldo = 3602505; if(elAnio && elMes) sueldo = obtenerSueldoMes(parseInt(elAnio.value), parseInt(elMes.value));
        if(typeof dibujarGraficosTC === 'function') dibujarGraficosTC(sueldo); 
        if(typeof actualizarDashboard === 'function') actualizarDashboard();
    });
};

window.sortTable = function(column) {
    if (currentSort.column === column) currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc'; else { currentSort.column = column; currentSort.direction = 'asc'; }
    document.querySelectorAll('.data-grid th').forEach(th => th.innerHTML = th.innerHTML.replace(/ ▲| ▼/g, ''));
    const activeTh = Array.from(document.querySelectorAll('.data-grid th')).find(th => th.getAttribute('onclick')?.includes(column));
    if (activeTh) activeTh.innerHTML += currentSort.direction === 'asc' ? ' ▲' : ' ▼';
    actualizarDashboard();
};

window.toggleAllChecks = function() { const checkEl = document.getElementById('checkAll'); if(!checkEl) return; const check = checkEl.checked; document.querySelectorAll('.row-check').forEach(cb => cb.checked = check); updateMassActions(); };
window.updateMassActions = function() { const bar = document.getElementById('massActionsBar'); if(!bar) return; const cnt = document.querySelectorAll('.row-check:not(#checkAll):checked').length; bar.style.display = cnt > 0 ? 'flex' : 'none'; document.getElementById('massCount').innerText = `${cnt} SEL`; if(cnt === 0) document.getElementById('checkAll').checked = false; };
window.massDelete = function() { const ids = Array.from(document.querySelectorAll('.row-check:not(#checkAll):checked')).map(cb => cb.value); if(ids.length === 0 || !confirm(`⚠️ ¿Eliminar ${ids.length} registro(s)?`)) return; Promise.all(ids.map(id => db.collection("movimientos").doc(id).delete())).then(() => { document.getElementById('massActionsBar').style.display = 'none'; document.getElementById('checkAll').checked = false; }); };

// Evasión Global
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const hist = document.getElementById('modal-historian'); if(hist) hist.style.display = 'none';
        const pv = document.getElementById('modal-dia-cero'); if(pv) pv.style.display = 'none';
    }
});
