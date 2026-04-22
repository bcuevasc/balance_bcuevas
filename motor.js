// ==========================================================
// 🌐 SENSOR DE DIVISAS BLINDADO (API MINDICADOR)
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

// ==========================================================
// 🧠 BÚNKER SCADA ORACLE - MOTOR LÓGICO MAESTRO V14.6 FIX
// ==========================================================
const BYRON_EMAIL = "bvhcc94@gmail.com"; 
const catEvitables = ["Dopamina & Antojos"]; 
const SUELDO_BASE_DEFAULT = 3602505;

let listaMovimientos = [], datosMesGlobal = [], sueldosHistoricos = {}; 
let chartBD = null, chartP = null, chartDiario = null, chartRadar = null, chartTCDist = null;
let currentSort = { column: 'fechaISO', direction: 'desc' }; 
let modoEdicionActivo = false; 
let datosPatrimonio = { inyectado: 0, tir: 8, auto: 0, otrosActivos: 0, cae: 0, hipotecario: 0, otrosPasivos: 0 };
window.totalTC = 0;

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

let isEng = false;
function toggleLanguage() {
    isEng = !isEng;
    document.querySelectorAll('[data-en]').forEach(el => {
        if (!el.hasAttribute('data-es')) el.setAttribute('data-es', el.innerText);
        el.innerText = isEng ? el.getAttribute('data-en') : el.getAttribute('data-es');
    });
    mostrarToast(isEng ? 'ENGLISH MODE ENGAGED' : 'MODO ESPAÑOL ACTIVADO');
}

const logosComerciales = { "uber": "uber.com", "pedidosya": "pedidosya.com", "mcdonald": "mcdonalds.com", "starbucks": "starbucks.cl", "jumbo": "jumbo.cl", "lider": "lider.cl" };
function obtenerIconoVisual(nombre, emojiFallback) {
    if(!nombre) return `<span style="font-size:1.4rem;">${emojiFallback}</span>`;
    let n = nombre.toLowerCase();
    for (let marca in logosComerciales) {
        if (n.includes(marca)) return `<img src="https://logo.clearbit.com/${logosComerciales[marca]}?size=100" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; background: white;" onerror="this.outerHTML='<span style=\\'font-size:1.4rem;\\'>${emojiFallback}</span>'">`;
    }
    return `<span style="font-size:1.4rem;">${emojiFallback}</span>`;
}

// ==========================================
// FIREBASE E INICIALIZACIÓN
// ==========================================
firebase.initializeApp({ apiKey: "AIzaSyBiYETN_JipXWhMq9gKz-2Pap-Ce4ZJNAI", authDomain: "finanzas-bcuevas.firebaseapp.com", projectId: "finanzas-bcuevas" });
const db = firebase.firestore(), auth = firebase.auth();

function loginWithGoogle() { 
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
}

function logout() { 
    auth.signOut().then(() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }); 
}

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
                if(snap.exists) { datosPatrimonio = snap.data(); renderizarPatrimonioVisual(); }
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
            iniciarRelojRendimiento();
        } else {
            auth.signOut(); alert(`⛔ DENEGADO:\nEl correo ${user.email} no tiene permisos.`);
        }
    }
});

document.addEventListener("DOMContentLoaded", () => {
    inicializarSensorDolar();
    
    // Reloj del Dashboard
    setInterval(() => { const c = document.getElementById('cronos'); if(c) c.innerText = new Date().toLocaleString('es-CL').toUpperCase(); }, 1000);

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

// ==========================================
// 📅 LÓGICA DE TIEMPO Y ARRASTRE (V14.6)
// ==========================================
function calcularFechasCiclo(mesConceptual, anio) {
    let mesInicio = mesConceptual - 1; let anioInicio = anio; if (mesInicio < 0) { mesInicio = 11; anioInicio--; }
    let T0 = new Date(anioInicio, mesInicio, 30); if (T0.getMonth() !== mesInicio) T0 = new Date(anioInicio, mesInicio + 1, 0); 
    let TFinal = new Date(anio, mesConceptual, 30); if (TFinal.getMonth() !== mesConceptual) TFinal = new Date(anio, mesConceptual + 1, 0);
    return { T0, TFinal, fechaFinVisual: new Date(TFinal.getTime() - 86400000) };
}

function obtenerSueldoMes(anio, mes) {
    let llave = `${anio}_${mes}`;
    if (sueldosHistoricos[llave]) return sueldosHistoricos[llave];
    return SUELDO_BASE_DEFAULT;
}

function cargarSueldoVisual() {
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio'), elSueldo = document.getElementById('inputSueldo');
    if(!elMes || !elAnio || !elSueldo) return;
    let m = elMes.value, a = elAnio.value, llave = `${a}_${m}`;
    elSueldo.setAttribute('data-mes-ancla', m); elSueldo.setAttribute('data-anio-ancla', a);
    if (document.activeElement !== elSueldo) {
        if (sueldosHistoricos[llave]) elSueldo.value = sueldosHistoricos[llave].toLocaleString('es-CL');
        else { elSueldo.value = ''; elSueldo.placeholder = 'PENDIENTE'; }
    }
}

function guardarSueldoEnNube() {
    const elSueldo = document.getElementById('inputSueldo');
    if(!elSueldo) return;
    let m = parseInt(elSueldo.getAttribute('data-mes-ancla')), a = parseInt(elSueldo.getAttribute('data-anio-ancla'));
    if (isNaN(m) || isNaN(a) || elSueldo.value.trim() === '') return; 
    let s = parseInt(elSueldo.value.replace(/\./g, '')); 
    if (isNaN(s) || s <= 0) return;
    let llave = `${a}_${m}`;
    sueldosHistoricos[llave] = s;
    db.collection("parametros").doc("sueldos").set({ [llave]: s }, {merge: true}).then(() => {
        mostrarToast(`SUELDO GUARDADO`); actualizarDashboard();
    });
}

function navegarMes(direccion) {
    const navMes = document.getElementById('navMesConceptual'), navAnio = document.getElementById('navAnio');
    if(!navMes || !navAnio) return;
    let m = parseInt(navMes.value), a = parseInt(navAnio.value);
    m += direccion;
    if(m > 11) { m = 0; a++; } else if(m < 0) { m = 11; a--; }
    navMes.value = m; navAnio.value = a;
    aplicarCicloAlSistema();
}

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
            const esNeutro = x.tipo === 'Por Cobrar' || x.tipo === 'Ahorro' || x.categoria === 'Transferencia Propia / Ahorro';
            if (esIn) balancePrev += x.monto;
            else if (!esNeutro) balancePrev -= x.monto;
        }
    });
    
    return balancePrev < 0 ? Math.abs(balancePrev) : 0;
}

function aplicarCicloAlSistema() {
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
    
    cargarSueldoVisual(); 
    actualizarDashboard();
}

// ==========================================
// 📊 DASHBOARD Y RENDERIZADO GLOBAL
// ==========================================
function actualizarDashboard() {
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio');
    if(!elMes || !elAnio) return;
    const mesVal = parseInt(elMes.value), anioVal = parseInt(elAnio.value);
    
    const sueldo = obtenerSueldoMes(anioVal, mesVal);
    let { T0, TFinal } = calcularFechasCiclo(mesVal, anioVal);
    
    const fDesde = document.getElementById('filtroDesde') ? document.getElementById('filtroDesde').value : '';
    const fHasta = document.getElementById('filtroHasta') ? document.getElementById('filtroHasta').value : '';
    if(fDesde) { let [y,m,d] = fDesde.split('-'); T0 = new Date(y, m-1, d); }
    if(fHasta) { let [y,m,d] = fHasta.split('-'); TFinal = new Date(y, m-1, d, 23, 59, 59); }

    // Arrastre Automático de Línea
    const montoArrastre = calcularArrastreMesAnterior(anioVal, mesVal);
    const elArrastre = document.getElementById('txtArrastreLinea');
    if(elArrastre) elArrastre.innerText = montoArrastre.toLocaleString('es-CL');
    const cardArrastre = document.getElementById('cardArrastre');
    if(cardArrastre) cardArrastre.style.display = montoArrastre > 0 ? 'block' : 'none';

    let dataMes = listaMovimientos.filter(x => { let d = new Date(x.fechaISO); return d >= T0 && d <= TFinal; });
    
    dataMes.forEach(x => {
        x.catV = x.categoria || 'Sin Categoría';
        if (x.monto <= 1000 && x.catV === 'Sin Categoría') x.catV = "Ruido de Sistema";
        x.esIn = x.tipo === 'Ingreso' || x.catV === 'Transferencia Recibida' || x.catV === 'Ingreso Adicional';
        x.esNeutro = x.tipo === 'Por Cobrar' || x.tipo === 'Ahorro' || x.catV === 'Transferencia Propia / Ahorro';
    });

    datosMesGlobal = [...dataMes];
    let saldoAcc = sueldo - montoArrastre; 
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
    setTxt('txtTotalFijos', tF + tInfra + tFlota); // Concentra la carga fija en PC
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

    const b = document.getElementById('inputBuscador') ? document.getElementById('inputBuscador').value.toLowerCase() : '';
    let dataGraficos = dataMes.filter(x => x.catV !== 'Gasto Tarjeta de Crédito');
    
    renderizarListas(sueldo, b);
    dibujarGraficosFlujo(sueldo, [...dataGraficos].sort((x,y) => x.fechaISO < y.fechaISO ? -1 : 1), gCat, diasCiclo, T0, tF, tInfra, tFlota);
    
    setTxt('txtGastoTramo', tO + tF + tInfra + tFlota);
    setTxt('txtPromedioZoom', Math.round((tO + tF + tInfra + tFlota) / diasCiclo));
    
    calcularPatrimonioGlobal();
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
}

// ==========================================
// ✏️ EDICIÓN Y GUARDADO
// ==========================================
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
    if(btn) { btn.innerHTML = isEng ? "UPDATE" : "ACTUALIZAR"; btn.style.backgroundColor = "var(--color-saldo)"; }
    modoEdicionActivo = true;
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

    if (!m || !n || !fInput) return alert("⚠️ Faltan parámetros en la consola.");
    const btn = document.getElementById('btnGuardar');
    btn.innerHTML = isEng ? "INJECTING..." : "INYECTANDO..."; btn.disabled = true;
    const dataPayload = { nombre: n, monto: m, categoria: c, tipo: t, fecha: new Date(fInput), status: 'Manual', innecesarioPct: pctFuga, cuotas: cantCuotas };
    
    let op = (modoEdicionActivo && editId) ? db.collection("movimientos").doc(editId).update(dataPayload) : db.collection("movimientos").add(dataPayload);
    op.then(() => {
        document.getElementById('editId').value = ''; document.getElementById('inputNombre').value = ''; document.getElementById('inputMonto').value = '';
        btn.innerHTML = isEng ? "INJECT" : "INYECTAR"; btn.style.backgroundColor = "var(--color-edit)"; btn.disabled = false; modoEdicionActivo = false;
        mostrarToast("REGISTRO CONFIRMADO");
    }).catch(err => { alert("❌ Error de Matriz: " + err.message); btn.innerHTML = "ERROR"; btn.disabled = false; });
}

function formatearEntradaNumerica(i) { let v = i.value.replace(/\D/g,''); i.value = v ? parseInt(v).toLocaleString('es-CL') : ''; }
function toggleTheme() { document.body.classList.toggle('light-theme'); }
function toggleAllChecks() { const checkEl = document.getElementById('checkAll'); if(!checkEl) return; const check = checkEl.checked; document.querySelectorAll('.row-check').forEach(cb => cb.checked = check); updateMassActions(); }
function updateMassActions() { const bar = document.getElementById('massActionsBar'); if(!bar) return; const cnt = document.querySelectorAll('.row-check:not(#checkAll):checked').length; bar.style.display = cnt > 0 ? 'flex' : 'none'; document.getElementById('massCount').innerText = `${cnt} SEL`; if(cnt === 0) document.getElementById('checkAll').checked = false; }
function massDelete() { const ids = Array.from(document.querySelectorAll('.row-check:not(#checkAll):checked')).map(cb => cb.value); if(ids.length === 0 || !confirm(`⚠️ ¿Eliminar ${ids.length} registro(s)?`)) return; const btn = document.querySelector('button[onclick="massDelete()"]'); const orig = btn.innerHTML; btn.innerHTML = '⏳'; Promise.all(ids.map(id => db.collection("movimientos").doc(id).delete())).then(() => { document.getElementById('massActionsBar').style.display = 'none'; document.getElementById('checkAll').checked = false; btn.innerHTML = orig; }); }
function massCategorize() { const ids = Array.from(document.querySelectorAll('.row-check:not(#checkAll):checked')).map(cb => cb.value); const cat = document.getElementById('massCategorySelect').value; if(ids.length === 0 || !cat || !confirm(`¿Categorizar como "${cat}"?`)) return; const btn = document.querySelector('button[onclick="massCategorize()"]'); const orig = btn.innerHTML; btn.innerHTML = '⏳'; Promise.all(ids.map(id => db.collection("movimientos").doc(id).update({categoria: cat}))).then(() => { document.getElementById('massActionsBar').style.display = 'none'; document.getElementById('checkAll').checked = false; document.getElementById('massCategorySelect').value = ''; btn.innerHTML = orig; }); }

// =====================================================================
// 📈 GRÁFICOS FLUJO
// =====================================================================
function dibujarGraficosFlujo(sueldo, chronData, cats, diasCiclo, T0, totalFijosMes, tInfra, tFlota) {
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
                { label: 'Proyección (Oráculo)', data: proyeccion, borderColor: '#d29922', borderDash: [5, 5], borderWidth: 2, fill: false, pointRadius: 0, tension: 0.2 },
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
}

// =====================================================================
// 💳 GRÁFICOS TC
// =====================================================================
function dibujarGraficosTC(sueldo) {
    if(chartRadar) chartRadar.destroy(); 
    if(chartTCDist) chartTCDist.destroy();
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
}

// ==========================================
// ☁️ SYNC, TABLAS TC Y EXPORTACIÓN
// ==========================================
window.inicializarListenerTC = function() {
    db.collection("deuda_tc").orderBy("mesCobro", "asc").onSnapshot(snapshot => {
        datosTCGlobal = []; let totalDeuda = 0;
        snapshot.forEach(doc => { let data = doc.data(); data.id = doc.id; datosTCGlobal.push(data); totalDeuda += data.monto; });
        window.totalTC = totalDeuda;
        const txtTotalTC = document.getElementById("txtTotalTC");
        if(txtTotalTC) txtTotalTC.innerText = totalDeuda.toLocaleString('es-CL');
        if(typeof renderizarTablaTC === 'function') renderizarTablaTC();
        
        const elAnio = document.getElementById('navAnio'), elMes = document.getElementById('navMesConceptual');
        let sueldo = 3602505; if(elAnio && elMes) sueldo = obtenerSueldoMes(parseInt(elAnio.value), parseInt(elMes.value));
        if(typeof dibujarGraficosTC === 'function') dibujarGraficosTC(sueldo); 
        if(typeof actualizarDashboard === 'function') actualizarDashboard();
    }, error => { console.error("🛑 FIREWALL TC:", error); });
};

window.renderizarTablaTC = function() {
    const tbody = document.getElementById("listaDetalleTC"); const tbodyMovil = document.getElementById("listaMovilTC");
    
    let sumaProximoMes = 0; let fechaHoy = new Date(); let proximoMes = fechaHoy.getMonth() + 1; let proximoAnio = fechaHoy.getFullYear();
    if (proximoMes > 11) { proximoMes = 0; proximoAnio++; }

    if (tbody) {
        tbody.innerHTML = "";
        if (datosTCGlobal.length === 0) tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">MATRIZ SIN DATOS</td></tr>`;
        else {
            datosTCGlobal.forEach(doc => {
                let fechaObj = new Date(doc.mesCobro); let mesTxt = fechaObj.toLocaleString('es-CL', { month: 'short', year: 'numeric' }).toUpperCase();
                if (fechaObj.getMonth() === proximoMes && fechaObj.getFullYear() === proximoAnio) sumaProximoMes += doc.monto;
                let tr = document.createElement("tr");
                tr.innerHTML = `<td style="text-align: center;"><input type="checkbox" class="checkItemTC" value="${doc.id}" onclick="actualizarBarraTC()" style="accent-color: #ff5252;"></td>
                <td style="font-size: 0.75rem; color: #79c0ff; font-weight: bold;">${mesTxt} (${doc.cuota})</td>
                <td class="col-desc">${doc.nombre}</td><td class="col-monto">$${doc.monto.toLocaleString('es-CL')}</td>`;
                tbody.appendChild(tr);
            });
        }
    }
    
    if (tbodyMovil) {
        tbodyMovil.innerHTML = "";
        if (datosTCGlobal.length === 0) tbodyMovil.innerHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-dim);">MATRIZ SIN DATOS</div>`;
        else {
            let htmlMovil = '';
            datosTCGlobal.forEach(doc => {
                let fechaObj = new Date(doc.mesCobro); let mesTxt = fechaObj.toLocaleString('es-CL', { month: 'short', year: 'numeric' }).toUpperCase();
                htmlMovil += `<div class="mobile-card" style="margin-bottom:6px; border-radius:12px !important; padding: 14px 15px !important; border: 1px solid rgba(255,82,82,0.1) !important;">
                <div style="flex: 1; min-width: 0;"><div style="font-weight:bold; font-size:0.85rem; color: var(--text-main);">${doc.nombre}</div>
                <div style="font-size:0.7rem; color:var(--accent-red); margin-top:3px; font-weight:800;">${mesTxt} (${doc.cuota})</div></div>
                <div style="font-weight:900; color:var(--text-main); flex-shrink: 0; font-size:1.15rem; font-family:monospace;">$${doc.monto.toLocaleString('es-CL')}</div></div>`;
            });
            tbodyMovil.innerHTML = htmlMovil;
        }
    }

    let mesNombreStr = new Date(proximoAnio, proximoMes, 1).toLocaleString('es-CL', { month: 'long' }).toUpperCase();
    let boxImpacto = document.getElementById('boxImpactoTC');
    if (boxImpacto) {
        if (sumaProximoMes > 0) { boxImpacto.style.display = 'flex'; document.getElementById('lblImpactoMes').innerText = `${mesNombreStr}`; document.getElementById('txtImpactoMonto').innerText = `$${sumaProximoMes.toLocaleString('es-CL')}`; }
        else { boxImpacto.style.display = 'none'; }
    }
};

window.cargarCSV_TC = function() {
    let fileInputTC = document.createElement('input'); fileInputTC.type = 'file'; fileInputTC.accept = '.csv';
    fileInputTC.onchange = e => {
        let file = e.target.files[0];
        let esFacturado = confirm("💳 PARÁMETRO DE INGESTA\n\n¿Corresponde a movimientos FACTURADOS?\n\n[OK] = Sí, se cobra este ciclo.\n[Cancelar] = No, es proyección futura.");
        let reader = new FileReader();
        reader.onload = async ev => {
            try {
                let text = ev.target.result; let lineas = text.split('\n'); let batch = db.batch(); let cuotasProcesadas = 0;
                for(let i = 1; i < lineas.length; i++) {
                    if(lineas[i].trim() === '') continue; 
                    let separador = lineas[i].includes(';') ? ';' : ',';
                    let cols = lineas[i].split(separador); if(cols.length < 4) continue; 
                    let fecha = cols[0].trim(); let nombre = cols[1].trim().replace(/\s+/g, ' ').toUpperCase(); 
                    let colCuotas = cols.find(c => c.includes('/') && c.length <= 5) || "01/01";
                    let cuotasInfo = colCuotas.trim().split('/'); 
                    let montoStr = cols[cols.length - 1].replace(/[^0-9-]/g, '');
                    if(!montoStr && cols.length > 1) montoStr = cols[cols.length - 2].replace(/[^0-9-]/g, '');
                    let montoTotal = parseInt(montoStr);

                    if(isNaN(montoTotal) || montoTotal <= 0) continue;
                    if(nombre.includes("REV.COMPRAS") || nombre.includes("PAGO PESOS") || nombre.includes("TEF") || nombre.includes("PAGO EN LINEA")) continue;

                    let cuotaActual = parseInt(cuotasInfo[0]) || 1; let totalCuotas = parseInt(cuotasInfo[1]) || 1;
                    let montoMensual = totalCuotas > 1 ? Math.round(montoTotal / totalCuotas) : montoTotal;
                    let partesF = fecha.replace(/-/g, '/').split('/'); if (partesF.length !== 3) continue; 
                    let fechaCompra = new Date(partesF[2], partesF[1] - 1, partesF[0]); let hoy = new Date();

                    for(let c = cuotaActual; c <= totalCuotas; c++) {
                        let fechaCobro;
                        if (esFacturado) fechaCobro = new Date(hoy.getFullYear(), hoy.getMonth() + (c - cuotaActual), 15);
                        else { let mesesDesfase = totalCuotas > 1 ? 2 : 1; fechaCobro = new Date(fechaCompra); fechaCobro.setMonth(fechaCobro.getMonth() + mesesDesfase + (c - cuotaActual)); }
                        let docId = `${fecha.replace(/[^0-9]/g, '')}-${nombre.replace(/[^A-Z0-9]/g, '').substring(0,10)}-C${c}de${totalCuotas}`;
                        let ref = db.collection("deuda_tc").doc(docId);
                        batch.set(ref, { nombre: nombre, monto: montoMensual, cuota: `${c}/${totalCuotas}`, mesCobro: fechaCobro.toISOString(), status: esFacturado ? "Facturado" : "Proyectado" });
                        cuotasProcesadas++;
                    }
                }
                if (cuotasProcesadas === 0) alert("⚠️ RECHAZO:\nNo hay cuotas válidas.");
                else { await batch.commit(); mostrarToast(`${cuotasProcesadas} INYECTADAS`); }
            } catch (error) { console.error("Error:", error); alert("❌ SYS ERROR: " + error.message); }
        };
        reader.readAsText(file, 'UTF-8');
    };
    fileInputTC.click();
};

window.actualizarBarraTC = function() {
    const seleccionados = document.querySelectorAll('.checkItemTC:checked');
    const barra = document.getElementById('barraAccionesTC'), txt = document.getElementById('txtSeleccionadosTC');
    if (seleccionados.length > 0) { if(barra) barra.style.display = 'flex'; if(txt) txt.innerText = `${seleccionados.length} SEL`; } 
    else { if(barra) barra.style.display = 'none'; let maestro = document.getElementById('checkMaestroTC'); if(maestro) maestro.checked = false; }
};

window.ejecutarPurgaMasivaTC = async function() {
    const seleccionados = document.querySelectorAll('.checkItemTC:checked');
    if (!confirm(`⚠️ WARNING: Borrar ${seleccionados.length} registros permanentemente?`)) return;
    const batch = db.batch(); seleccionados.forEach(cb => { batch.delete(db.collection("deuda_tc").doc(cb.value)); });
    try { await batch.commit(); mostrarToast("PURGA COMPLETADA"); } catch (error) { alert("❌ Error Net."); }
};

// ==========================================
// ⚙️ FUNCIONES DÍA CERO (SIMULADOR)
// ==========================================
window.abrirPreVuelo = function() {
    const modal = document.getElementById('modal-dia-cero'); if(!modal) return;
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio');
    const nombresMes = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById('pv-mes-label').innerText = `${nombresMes[parseInt(elMes.value)]} ${elAnio.value}`.toUpperCase();
    const sueldoInput = document.getElementById('inputSueldo');
    document.getElementById('pv-sueldo').value = sueldoInput ? sueldoInput.value : "3.602.505";
    
    let mesVal = parseInt(elMes.value), anioVal = parseInt(elAnio.value), sumaTCMes = 0;
    datosTCGlobal.forEach(doc => {
        let fCobro = new Date(doc.mesCobro);
        if (fCobro.getMonth() === mesVal && fCobro.getFullYear() === anioVal) sumaTCMes += doc.monto;
    });
    
    let elTcNac = document.getElementById('pv-tc-nac');
    if(elTcNac && elTcNac.getAttribute('data-estado') === 'est') elTcNac.value = sumaTCMes > 0 ? sumaTCMes.toLocaleString('es-CL') : "";
    calcularDiaCero(); modal.style.display = 'flex';
};

window.cerrarPreVuelo = function() { const modal = document.getElementById('modal-dia-cero'); if(modal) modal.style.display = 'none'; };

window.toggleEstadoPV = function(btn, inputId) {
    const input = document.getElementById(inputId); if(!input) return;
    if (navigator.vibrate) navigator.vibrate(15); 
    
    let estadoActual = input.getAttribute('data-estado') || 'est';
    if (estadoActual === 'est') { input.setAttribute('data-estado', 'real'); btn.className = "btn-estado real"; btn.innerText = "📄"; input.classList.remove('pagado'); input.readOnly = false; } 
    else if (estadoActual === 'real') { input.setAttribute('data-estado', 'pag'); btn.className = "btn-estado pag"; btn.innerText = "✔️"; input.classList.add('pagado'); input.readOnly = true; } 
    else { input.setAttribute('data-estado', 'est'); btn.className = "btn-estado est"; btn.innerText = "EST"; input.classList.remove('pagado'); input.readOnly = false; }
    calcularDiaCero(); 
};

window.calcularDiaCero = function() {
    const valSiNoPagado = (id) => { let el = document.getElementById(id); if (!el || el.getAttribute('data-estado') === 'pag') return 0; return parseInt(el.value.replace(/\./g, '')) || 0; };
    let sueldo = parseInt((document.getElementById('pv-sueldo').value || "0").replace(/\./g, '')) || 0;
    let tcNac = valSiNoPagado('pv-tc-nac');
    
    let elTcInt = document.getElementById('pv-tc-int'), tcIntUSD = 0;
    if (elTcInt && elTcInt.getAttribute('data-estado') !== 'pag') { tcIntUSD = parseInt(elTcInt.value.replace(/\./g, '')) || 0; }
    let valorDolarSeguro = isNaN(window.VALOR_USD) ? 950 : window.VALOR_USD;
    let tcIntCLP = Math.round(tcIntUSD * valorDolarSeguro); 
    let elTcIntCLP = document.getElementById('pv-tc-int-clp');
    if (elTcIntCLP) {
        if (elTcInt && elTcInt.getAttribute('data-estado') === 'pag') { elTcIntCLP.innerText = "✔️ PAGADO"; elTcIntCLP.style.color = "var(--color-saldo)"; } 
        else { elTcIntCLP.innerText = `~ $${tcIntCLP.toLocaleString('es-CL')} CLP`; elTcIntCLP.style.color = "var(--accent-red)"; }
    }

    let linea = valSiNoPagado('pv-linea'), arr = valSiNoPagado('pv-arriendo'), udec = valSiNoPagado('pv-udec'), cae = valSiNoPagado('pv-cae');
    let ggcc = valSiNoPagado('pv-ggcc'), luz = valSiNoPagado('pv-luz'), agua = valSiNoPagado('pv-agua'), gas = valSiNoPagado('pv-gas');
    let celu = valSiNoPagado('pv-celu'), madre = valSiNoPagado('pv-madre'), subs = valSiNoPagado('pv-subs'), seguro = valSiNoPagado('pv-seguro');
    
    let deudasDuras = tcNac + tcIntCLP + linea;
    let estructural = arr + udec + cae + ggcc + luz + agua + gas + celu + madre + subs + seguro;
    let liquidez = sueldo - deudasDuras - estructural;
    
    document.getElementById('pv-txt-liquidez').innerText = liquidez.toLocaleString('es-CL');
    
    if (sueldo > 0) {
        let pctRojo = Math.min((deudasDuras / sueldo) * 100, 100);
        let pctNaranja = Math.min((estructural / sueldo) * 100, 100 - pctRojo);
        let pctVerde = Math.max(100 - pctRojo - pctNaranja, 0);
        document.getElementById('pv-barra-roja').style.width = pctRojo + '%';
        document.getElementById('pv-barra-naranja').style.width = pctNaranja + '%';
        document.getElementById('pv-barra-verde').style.width = pctVerde + '%';
    }

    let toggles = document.querySelectorAll('.btn-estado'), confirmados = 0;
    toggles.forEach(btn => { if(btn.classList.contains('real') || btn.classList.contains('pag')) confirmados++; });
    let certeza = toggles.length > 0 ? Math.round((confirmados / toggles.length) * 100) : 0;
    let elCertezaPct = document.getElementById('pv-certeza-pct');
    if(elCertezaPct) { elCertezaPct.innerText = certeza + '%'; elCertezaPct.style.color = certeza < 40 ? '#ff5252' : (certeza < 80 ? '#ff9800' : '#2ea043'); }
};

window.ejecutarArranque = function() {
    if(!confirm("⚠️ INYECCIÓN CRÍTICA V14.6\n\n¿Estás seguro de inyectar la Operativa en la Matriz?")) return;
    
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio');
    let fechaDestino = new Date(parseInt(elAnio.value), parseInt(elMes.value), 1, 10, 0, 0);
    const batch = db.batch(); let inyectados = 0;
    
    const procesarInyeccion = (idInput, nombre, cat) => {
        let el = document.getElementById(idInput); if (!el) return;
        let estado = el.getAttribute('data-estado') || 'est'; if (estado === 'pag') return; 
        
        let monto = 0;
        if (idInput === 'pv-tc-int') {
            let tcIntUSD = parseInt(el.value.replace(/\./g, '')) || 0; let valorDolarSeguro = isNaN(window.VALOR_USD) ? 950 : window.VALOR_USD;
            monto = Math.round(tcIntUSD * valorDolarSeguro);
        } else { monto = parseInt(el.value.replace(/\./g, '')) || 0; }
        
        if (monto > 0) {
            let ref = db.collection("movimientos").doc();
            batch.set(ref, { monto: monto, nombre: nombre, categoria: cat, tipo: "Gasto Fijo", fecha: fechaDestino, status: estado === 'real' ? 'Real' : 'Estimado', innecesarioPct: 0, cuotas: 1 });
            inyectados++;
        }
    };
    
    procesarInyeccion('pv-tc-nac', "PAGO TC NACIONAL (DÍA CERO)", "Gastos Fijos (Búnker)"); 
    procesarInyeccion('pv-tc-int', "PAGO TC INTERNACIONAL (DÍA CERO)", "Gastos Fijos (Búnker)"); 
    procesarInyeccion('pv-linea', "PAGO LÍNEA CRÉDITO (DÍA CERO)", "Gastos Fijos (Búnker)");
    procesarInyeccion('pv-arriendo', "ARRIENDO / DIVIDENDO", "Infraestructura (Depto)");
    procesarInyeccion('pv-udec', "PAGO UDEC 2024", "Infraestructura (Depto)");
    procesarInyeccion('pv-cae', "PAGO CAE", "Infraestructura (Depto)");
    procesarInyeccion('pv-ggcc', "GASTOS COMUNES", "Infraestructura (Depto)");
    procesarInyeccion('pv-luz', "LUZ / ELECTRICIDAD", "Infraestructura (Depto)");
    procesarInyeccion('pv-agua', "AGUA / SANEAMIENTO", "Infraestructura (Depto)");
    procesarInyeccion('pv-gas', "GAS", "Infraestructura (Depto)");
    procesarInyeccion('pv-celu', "CELU MIO PLAN", "Suscripciones");
    procesarInyeccion('pv-madre', "MOVISTAR MADRE", "Red de Apoyo (Familia)");
    procesarInyeccion('pv-subs', "PACK SUSCRIPCIONES (YT, Disney, etc)", "Suscripciones");
    procesarInyeccion('pv-seguro', "SEGURO AUTO", "Flota & Movilidad");
    
    if (inyectados > 0) { batch.commit().then(() => { cerrarPreVuelo(); mostrarToast(`ARRANQUE COMPLETADO: ${inyectados} REG. INYECTADOS.`); actualizarDashboard(); }).catch(err => { alert("❌ Error: " + err.message); }); } 
    else { alert("No se inyectaron registros."); cerrarPreVuelo(); }
};

// ==========================================
// 🛑 LISTENER DE EVASIÓN GLOBAL (TECLA ESC)
// ==========================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if(typeof cerrarPreVuelo === 'function') cerrarPreVuelo();
        const hist = document.getElementById('modal-historian'); if(hist) hist.style.display = 'none';
        if(typeof closeBottomSheet === 'function') closeBottomSheet();
        console.log("%c[SYS] COMANDO ESCAPE DETECTADO: CERRANDO VENTANAS", "color: #ff5252;");
    }
});
