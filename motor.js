// ==========================================================
// 🌐 V14.2: MOTOR SCADA PRO (Zero-Lag & Strict Budget)
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
        } else { throw new Error("Estructura API inválida"); }
    } catch(e) {
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
    mostrarToast(isEng ? 'ENGLISH MODE ENGAGED' : 'MODO ESPAÑOL ACTIVADO');
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

    // ⚡ V14.2: PURGA DE EVENTOS NATIVOS Y LISTENERS BLINDADOS (ZERO LAG)
    const elSueldo = document.getElementById('inputSueldo');
    if(elSueldo) {
        // Matamos eventos intrusos en el HTML
        elSueldo.removeAttribute('onchange');
        elSueldo.removeAttribute('onblur');
        elSueldo.removeAttribute('oninput');

        // Formateo visual ultraligero mientras tecleas (SIN redibujar gráficos)
        elSueldo.addEventListener('input', function() {
            let v = this.value.replace(/\D/g,'');
            this.value = v ? parseInt(v).toLocaleString('es-CL') : '';
        });

        // Guardado único al quitar el foco o cambiar de mes
        elSueldo.addEventListener('blur', function() {
            window.guardarSueldoEnNube();
        });

        // Guardado al presionar Enter
        elSueldo.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.blur(); 
            }
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

const logosComerciales = { "uber": "uber.com", "pedidosya": "pedidosya.com", "mcdonald": "mcdonalds.com", "starbucks": "starbucks.cl", "jumbo": "jumbo.cl", "lider": "lider.cl" };
function obtenerIconoVisual(nombre, emojiFallback) {
    if(!nombre) return `<span style="font-size:1.4rem;">${emojiFallback}</span>`;
    let n = nombre.toLowerCase();
    for (let marca in logosComerciales) {
        if (n.includes(marca)) return `<img src="https://logo.clearbit.com/${logosComerciales[marca]}?size=100" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; background: white;" onerror="this.outerHTML='<span style=\\'font-size:1.4rem;\\'>${emojiFallback}</span>'">`;
    }
    return `<span style="font-size:1.4rem;">${emojiFallback}</span>`;
}

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
    toast.innerHTML = '⚡ ' + mensaje;
    toast.style.opacity = '1';
    toast.style.bottom = '130px'; 
    setTimeout(() => { toast.style.opacity = '0'; toast.style.bottom = '110px'; }, 3000);
};

window.loginWithGoogle = function() { 
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => {
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
            let btn = document.querySelector('.btn-google');
            if(btn) btn.innerHTML = "⏳ REDIRECCIONANDO...";
            auth.signInWithRedirect(provider);
        } else { alert("❌ ERROR DE CONEXIÓN:\n" + err.message); }
    }); 
};

window.logout = function() { 
    auth.signOut().then(() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }); 
};

auth.onAuthStateChanged(user => {
    if (user) {
        if (user.email.toLowerCase() === BYRON_EMAIL.toLowerCase()) {
            const loginScreen = document.getElementById('login-screen');
            const reportZone = document.getElementById('reportZone');
            if(loginScreen) loginScreen.style.display = 'none';
            if(reportZone) reportZone.classList.add('active-app');
            const userDisplay = document.getElementById('user-display');
            if(userDisplay) userDisplay.innerText = user.displayName.split(" ")[0];
            
            db.collection("parametros").doc("sueldos").onSnapshot(snap => { 
                if(snap.exists) { 
                    sueldosHistoricos = snap.data(); 
                    cargarSueldoVisual(); 
                    actualizarDashboard(); 
                } 
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
            auth.signOut(); alert(`⛔ ACCESO DENEGADO:\nEl correo ${user.email} no tiene permisos de operador.`);
        }
    }
});

// ==========================================================
// ⚡ V14.2 NÚCLEO DE PRESUPUESTO AISLADO Y ROBUSTO
// ==========================================================

window.cargarSueldoVisual = function() {
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio'), elSueldo = document.getElementById('inputSueldo');
    if(!elMes || !elAnio || !elSueldo) return;
    
    let m = parseInt(elMes.value), a = parseInt(elAnio.value), llave = `${a}_${m}`;
    
    // Siempre anclamos la caja de texto al nuevo mes
    elSueldo.setAttribute('data-mes-ancla', m); 
    elSueldo.setAttribute('data-anio-ancla', a);
    
    // SOLO actualizamos visualmente si el usuario NO está escribiendo ahí
    if (document.activeElement !== elSueldo) {
        if (sueldosHistoricos && sueldosHistoricos[llave]) { 
            elSueldo.value = sueldosHistoricos[llave].toLocaleString('es-CL'); 
        } else { 
            elSueldo.value = ''; elSueldo.placeholder = 'NO ASIGNADO'; 
        }
    }
};

window.obtenerSueldoMes = function(anio, mes) {
    let llave = `${anio}_${mes}`;
    if (sueldosHistoricos && sueldosHistoricos[llave]) return sueldosHistoricos[llave];
    return PRESUPUESTO_BASE_DEFAULT; 
};

window.guardarSueldoEnNube = function() {
    const elSueldo = document.getElementById('inputSueldo');
    if(!elSueldo) return;
    
    // Leemos el mes EXACTO donde el usuario estaba escribiendo
    let m = parseInt(elSueldo.getAttribute('data-mes-ancla'));
    let a = parseInt(elSueldo.getAttribute('data-anio-ancla'));
    if (isNaN(m) || isNaN(a) || elSueldo.value.trim() === '') return; 

    let s = parseInt(elSueldo.value.replace(/\./g, '')); 
    if (isNaN(s) || s <= 0) return;
    
    let llave = `${a}_${m}`;
    if (sueldosHistoricos[llave] === s) return; // Evita gastos de red innecesarios

    sueldosHistoricos[llave] = s;
    db.collection("parametros").doc("sueldos").set({ [llave]: s }, {merge: true}).then(() => {
        const nombresMes = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
        mostrarToast(`PRESUPUESTO ${nombresMes[m]} ACTUALIZADO`); 
    });
};

function aplicarCicloAlSistema() {
    // ⚡ V14.2 KILL SWITCH: Si estaba editando y giró la rueda, guardamos y matamos el foco antes del salto
    const elSueldo = document.getElementById('inputSueldo');
    if (elSueldo && document.activeElement === elSueldo) {
        elSueldo.blur(); 
    }
    
    const navMes = document.getElementById('navMesConceptual'), navAnio = document.getElementById('navAnio');
    if(!navMes || !navAnio) return;
    
    if(document.getElementById('filtroDesde')) document.getElementById('filtroDesde').value = ''; 
    if(document.getElementById('filtroHasta')) document.getElementById('filtroHasta').value = '';

    let lbl = document.getElementById('lblPeriodoViendo'); if(lbl) lbl.innerText = isEng ? 'FULL PERIOD' : 'PERIODO COMPLETO';
    let cajaPC = document.getElementById('cajaFechasCustom'); if(cajaPC) cajaPC.style.display = 'none';
    let btnPC = document.getElementById('btnToggleFechas'); if(btnPC) btnPC.style.display = 'block';

    const { T0, fechaFinVisual } = calcularFechasCiclo(parseInt(navMes.value), parseInt(navAnio.value));
    const badge = document.getElementById('navRangoBadge');
    if(badge) badge.innerText = `[${T0.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}).toUpperCase()} - ${fechaFinVisual.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}).toUpperCase()}]`;
    
    cargarSueldoVisual(); 
    actualizarDashboard();
}

let alarmLogCache = "";
window.abrirHistorian = function() {
    document.getElementById('historian-content').innerHTML = alarmLogCache || "<div style='color:var(--color-saldo); font-weight:bold; text-align:center; padding:20px;'>SYSTEM NOMINAL.<br>NO BREACHES DETECTED.</div>";
    document.getElementById('modal-historian').style.display = 'flex';
};

function actualizarDashboard() {
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio');
    const mesVal = parseInt(elMes.value), anioVal = parseInt(elAnio.value);
    
    // Obtenemos el presupuesto consolidado
    let sueldo = obtenerSueldoMes(anioVal, mesVal);
    
    const buscador = document.getElementById('inputBuscador');
    const b = buscador ? buscador.value.toLowerCase() : '';
    let { T0, TFinal } = calcularFechasCiclo(mesVal, anioVal);
    
    const fDesde = document.getElementById('filtroDesde')?.value;
    const fHasta = document.getElementById('filtroHasta')?.value;
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

    let dataGraficos = dataMes.filter(x => x.catV !== 'Gasto Tarjeta de Crédito');
    if (typeof renderizarListas === 'function') renderizarListas(sueldo, b);
    if (typeof dibujarGraficos === 'function') dibujarGraficos(sueldo, [...dataGraficos].sort((x,y) => x.fechaISO < y.fechaISO ? -1 : 1), gCat, diasCiclo, T0, tF, tInfra, tFlota, deudaAprox);
    
    const kpiSalida = document.getElementById('txtGastoTotalPeriodo');
    if (kpiSalida) kpiSalida.innerText = '$' + (tO + tF).toLocaleString('es-CL');
    setTxt('txtGastoTramo', tO + tF);
    setTxt('txtPromedioZoom', Math.round((tO + tF) / diasCiclo));
}

window.renderizarListas = function(sueldoBase, filtroBuscador) {
    let datos = [...datosMesGlobal].filter(x => x.catV !== 'Gasto Tarjeta de Crédito'); 
    if (filtroBuscador) datos = datos.filter(x => x.nombre?.toLowerCase().includes(filtroBuscador) || x.catV.toLowerCase().includes(filtroBuscador));

    datos.sort((a, b) => new Date(a.fechaISO) - new Date(b.fechaISO));
    let saldoRelativo = sueldoBase;
    datos.forEach(x => {
        if (x.esIn) saldoRelativo += x.monto; else if (!x.esNeutro) saldoRelativo -= x.monto;
        x.saldoCalculadoVista = saldoRelativo;
    });

    datos.sort((a, b) => {
        let valA = a[currentSort.column], valB = b[currentSort.column];
        if (currentSort.column === 'nombre' || currentSort.column === 'catV') { valA = valA?.toLowerCase() || ''; valB = valB?.toLowerCase() || ''; }
        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const contenedorPC = document.getElementById('listaDetalle'); 
    if (!contenedorPC) return;
    if(datos.length === 0) return contenedorPC.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted); font-family:monospace;">MATRIZ SIN DATOS</td></tr>`;

    let htmlPC = '';
    datos.forEach((x) => {
        const d = new Date(x.fechaISO);
        const colorMonto = x.esIn ? "var(--color-ingresos)" : x.esNeutro ? "#d29922" : "var(--text-main)";
        const colorSaldo = x.saldoCalculadoVista < 0 ? 'var(--color-fuga)' : 'var(--text-muted)';
        let iconImpacto = x.esIn ? `<span class="impact-icon impact-pos">+</span>` : x.esNeutro ? `<span class="impact-icon impact-neu">=</span>` : `<span class="impact-icon impact-neg">-</span>`;
        let esEditando = (document.getElementById('editId')?.value === x.firestoreId);
        let bgEdicion = esEditando ? 'background-color: rgba(210, 153, 34, 0.15); border-left: 3px solid var(--color-edit);' : (x.catV === 'Dopamina & Antojos' ? 'background: linear-gradient(90deg, rgba(255,255,255,0.01) 60%, rgba(255,82,82,0.15) 100%); border-right: 2px solid #ff5252;' : '');

        htmlPC += `<tr style="${bgEdicion}" draggable="true" ondragstart="dragStart(event, '${x.firestoreId}')" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="dropRow(event, '${x.firestoreId}')">
            <td style="text-align: center;"><input type="checkbox" class="row-check" value="${x.firestoreId}" onchange="updateMassActions()"></td>
            <td style="font-size:0.75rem; color:var(--text-muted);">${d.toLocaleDateString('es-CL', {day:'2-digit', month:'2-digit'})} <span class="col-hora">${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}</span></td>
            <td class="col-desc" title="${x.nombre || 'Dato no identificado'}">${x.nombre || 'Dato no identificado'}</td>
            <td style="font-size:0.7rem;"><span class="cat-badge">${x.catV.replace(' & ','&')}</span></td>
            <td class="col-monto" style="color:${colorMonto};">${iconImpacto}$${x.monto.toLocaleString('es-CL')}</td>
            <td class="col-monto hide-mobile" style="color:${colorSaldo}; font-size:0.75rem;">$${x.saldoCalculadoVista.toLocaleString('es-CL')}</td>
            <td style="text-align:center;"><button class="btn-sys" style="padding:2px 6px; border:none; background:transparent; font-size:1rem;" onclick="editarMovimiento('${x.firestoreId}')">✏️</button></td>
        </tr>`;
    });
    contenedorPC.innerHTML = htmlPC;
}

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
    
    modoEdicionActivo = true; 
    if(document.getElementById('editId')) document.getElementById('editId').value = mov.firestoreId; 
    
    const inputNombre = document.getElementById('inputNombre');
    if(inputNombre) {
        inputNombre.value = mov.nombre;
        if (window.innerWidth > 768) {
            inputNombre.focus();
            setTimeout(() => inputNombre.select(), 50); 
        }
    }
    
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
        document.getElementById('inputFecha').value = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    } catch(e) {}
    
    const btn = document.getElementById('btnGuardar');
    if(btn) { btn.innerHTML = isEng ? "UPDATE" : "ACTUALIZAR"; btn.style.backgroundColor = "var(--color-saldo)"; }
    
    actualizarDashboard(); 

    if (typeof closeBottomSheet === 'function') closeBottomSheet(); 
    if (typeof switchTabApp === 'function') {
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems.length >= 3) switchTabApp('add', navItems[2]); 
    } else if (typeof window.switchTab === 'function') {
        window.switchTab('add');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function procesarCompraTCManual(nombre, montoTotal, cuotas, fechaStr) {
    const batch = db.batch(); const diaCorte = 20;
    let fCompra = new Date(fechaStr); let dia = fCompra.getDate();
    let montoCuota = Math.round(montoTotal / cuotas);

    for (let i = 1; i <= cuotas; i++) {
        let mesesDesfase = (dia > diaCorte || cuotas > 1) ? 2 : 1; 
        let fCobro = new Date(fCompra.getFullYear(), fCompra.getMonth() + mesesDesfase + (i - 1), 15);
        batch.set(db.collection("deuda_tc").doc(), {
            nombre: `${nombre.toUpperCase()} (MANUAL)`, monto: montoCuota, cuota: `${i}/${cuotas}`,
            mesCobro: fCobro.toISOString(), status: "Proyectado"
        });
    }
    batch.commit().then(() => {
        mostrarToast(`TC: ${cuotas} CUOTAS DESPLEGADAS`);
        limpiarFormulario();
    }).catch(e => alert("Error TC: " + e));
}

window.agregarMovimiento = function() {
    const m = parseInt(document.getElementById('inputMonto').value.replace(/\./g, ''));
    const n = document.getElementById('inputNombre').value;
    const c = document.getElementById('inputCategoria').value;
    const t = document.getElementById('inputTipo').value;
    const fInput = document.getElementById('inputFecha').value;
    const editId = document.getElementById('editId').value;
    const cantCuotas = parseInt(document.getElementById('inputCuotas')?.value || 1);
    const pctFuga = parseInt(document.getElementById('inputFuga')?.value || (catEvitables.includes(c) ? 100 : 0));

    if (!m || !n || !fInput) return alert("⚠️ Faltan parámetros en la consola.");

    if (c === "Gasto Tarjeta de Crédito" && !modoEdicionActivo) {
        procesarCompraTCManual(n, m, cantCuotas, fInput);
        return; 
    }

    const btn = document.getElementById('btnGuardar');
    btn.innerHTML = isEng ? "INJECTING..." : "INYECTANDO..."; btn.disabled = true;
    
    const payload = { nombre: n, monto: m, categoria: c, tipo: t, fecha: new Date(fInput), status: 'Manual', innecesarioPct: pctFuga, cuotas: cantCuotas };
    let op = (modoEdicionActivo && editId) ? db.collection("movimientos").doc(editId).update(payload) : db.collection("movimientos").add(payload);
        
    op.then(() => {
        limpiarFormulario();
        mostrarToast("REGISTRO CONFIRMADO");
    }).catch(err => { alert("Error de Matriz: " + err.message); btn.innerHTML = "ERROR"; btn.disabled = false; });
}

function limpiarFormulario() {
    document.getElementById('editId').value = ''; 
    document.getElementById('inputNombre').value = ''; 
    document.getElementById('inputMonto').value = '';
    const btn = document.getElementById('btnGuardar');
    btn.innerHTML = isEng ? "INJECT" : "INYECTAR"; 
    btn.style.backgroundColor = "var(--color-edit)"; 
    btn.disabled = false; modoEdicionActivo = false;
    actualizarDashboard();
}

function formatearEntradaNumerica(i) { let v = i.value.replace(/\D/g,''); i.value = v ? parseInt(v).toLocaleString('es-CL') : ''; }
function toggleTheme() { document.body.classList.toggle('light-theme'); }
setInterval(() => { const c = document.getElementById('cronos'); if(c) c.innerText = new Date().toLocaleString('es-CL').toUpperCase(); }, 1000);
function toggleAllChecks() { const check = document.getElementById('checkAll')?.checked; document.querySelectorAll('.row-check').forEach(cb => cb.checked = check); updateMassActions(); }
function updateMassActions() { const bar = document.getElementById('massActionsBar'); if(!bar) return; const cnt = document.querySelectorAll('.row-check:not(#checkAll):checked').length; bar.style.display = cnt > 0 ? 'flex' : 'none'; document.getElementById('massCount').innerText = `${cnt} SEL`; if(cnt === 0 && document.getElementById('checkAll')) document.getElementById('checkAll').checked = false; }
function massDelete() { const ids = Array.from(document.querySelectorAll('.row-check:not(#checkAll):checked')).map(cb => cb.value); if(ids.length === 0 || !confirm(`⚠️ ¿Eliminar ${ids.length} registro(s)?`)) return; const btn = document.querySelector('button[onclick="massDelete()"]'); const orig = btn.innerHTML; btn.innerHTML = '⏳'; Promise.all(ids.map(id => db.collection("movimientos").doc(id).delete())).then(() => { document.getElementById('massActionsBar').style.display = 'none'; document.getElementById('checkAll').checked = false; btn.innerHTML = orig; }); }
function massCategorize() { const ids = Array.from(document.querySelectorAll('.row-check:not(#checkAll):checked')).map(cb => cb.value); const cat = document.getElementById('massCategorySelect').value; if(ids.length === 0 || !cat || !confirm(`¿Categorizar como "${cat}"?`)) return; const btn = document.querySelector('button[onclick="massCategorize()"]'); const orig = btn.innerHTML; btn.innerHTML = '⏳'; Promise.all(ids.map(id => db.collection("movimientos").doc(id).update({categoria: cat}))).then(() => { document.getElementById('massActionsBar').style.display = 'none'; document.getElementById('checkAll').checked = false; document.getElementById('massCategorySelect').value = ''; btn.innerHTML = orig; }); }

function dibujarGraficos(sueldo, chronData, cats, diasCiclo, T0, totalFijosMes, tInfra, tFlota, deudaAprox) {
    if(chartBD) chartBD.destroy(); if(chartP) chartP.destroy(); 
    if(chartDiario) chartDiario.destroy(); if(chartRadar) chartRadar.destroy();
    
    const cT = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || "#f0f6fc"; 
    const cG = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || "#21262d"; 
    
    const labelsPlugin = {
        id: 'labelsPlugin',
        afterDatasetsDraw(chart) {
            const ctx = chart.ctx;
            ctx.font = 'bold 10px monospace';
            ctx.fillStyle = '#ffffff'; 
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            
            if (chart.config.type === 'bar') {
                const datasets = chart.data.datasets;
                chart.data.labels.forEach((_, index) => {
                    let total = 0; let lastY = null; let xPos = null;
                    datasets.forEach((dataset, i) => {
                        const meta = chart.getDatasetMeta(i);
                        if (!meta.hidden && dataset.data[index] > 0) {
                            total += dataset.data[index];
                            lastY = meta.data[index].y;
                            xPos = meta.data[index].x;
                        }
                    });
                    if (total > 0 && lastY !== null) {
                        ctx.fillText(Math.round(total / 1000) + 'k', xPos, lastY - 4);
                    }
                });
            } else if (chart.config.type === 'line') {
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    if (!meta.hidden) {
                        meta.data.forEach((element, index) => {
                            const data = dataset.data[index];
                            if (data > 0) {
                                ctx.fillText(Math.round(data / 1000) + 'k', element.x, element.y - 6);
                            }
                        });
                    }
                });
            }
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

    const ctxBD = document.getElementById('chartBurnDown');
    if(ctxBD) {
        let grad = ctxBD.getContext('2d').createLinearGradient(0, 0, 0, 400);
        grad.addColorStop(0, 'rgba(31, 111, 235, 0.4)'); grad.addColorStop(1, 'rgba(31, 111, 235, 0)');
        chartBD = new Chart(ctxBD, {
            type: 'line', data: { labels: labelsX, datasets: [
                { label: 'Consumo Real', data: actual, borderColor: '#1f6feb', backgroundColor: grad, borderWidth: 3, fill: true, pointRadius: 0, tension: 0.2 },
                { label: 'Proyección', data: proyeccion, borderColor: '#d29922', borderDash: [5, 5], borderWidth: 2, fill: false, pointRadius: 0, tension: 0.2 },
                { label: 'Ideal', data: ideal, borderColor: 'rgba(46, 160, 67, 0.4)', borderDash: [5, 5], borderWidth: 2, fill: false, pointRadius: 0 }
            ]},
            options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales: { x: { ticks: { color: cT, font: {size: 9} }, grid:{color:cG} }, y: { grid: { color: cG }, ticks: { color: cT, callback: v => '$' + Math.round(v/1000) + 'k' } } }, layout: { padding: 0 } }
        });
    }

    const sorted = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,6);
    chartP = new Chart(document.getElementById('chartPareto'), {
        type: 'polarArea', 
        data: { labels: sorted.map(c => aliasMap[c[0]] || c[0].split(' ')[0]), datasets: [{ data: sorted.map(c => c[1]), backgroundColor: ['rgba(31, 111, 235, 0.7)', 'rgba(46, 160, 67, 0.7)', 'rgba(210, 153, 34, 0.7)', 'rgba(255, 82, 82, 0.7)', 'rgba(163, 113, 247, 0.7)', 'rgba(0, 188, 212, 0.7)'], borderColor: ['#1f6feb', '#2ea043', '#d29922', '#ff5252', '#a371f7', '#00bcd4'], borderWidth: 2 }] },
        options: { maintainAspectRatio:false, plugins:{legend:{position: 'right', labels:{color:cT, font:{size:10, family:'monospace'}}}}, scales:{ r:{ticks:{display:false}, grid:{color:cG}, angleLines:{color:cG}} } }
    });

    const ctxDiario = document.getElementById('chartDiario');
    let limiteDiarioIdeal = Math.max((sueldo - totalFijosMes - tInfra - tFlota) / diasCiclo, 0);
    alarmLogCache = deudaAprox > sueldo * 0.15 ? `<div class='log-item critical'><div class='log-icon'>🛑</div><div class='log-content'><strong>SOBRECARGA TC</strong><div class='log-date'>Riesgo Pasivos > 15%</div><span>$${deudaAprox.toLocaleString('es-CL')}</span></div></div>` : "";

    if(ctxDiario) {
        let lastDayWithData = diasCiclo;
        while(lastDayWithData > 0 && (dailyNecesario[lastDayWithData] === 0 && dailyFugas[lastDayWithData] === 0)) lastDayWithData--;
        let startDayForBars = Math.max(1, lastDayWithData - 14); 
        for(let i=startDayForBars; i<=lastDayWithData; i++) {
            if (dailyFugas[i] > 0) alarmLogCache += `<div class='log-item warning'><div class='log-icon'>🍔</div><div class='log-content'><strong>FUGA DOPAMINA</strong><div class='log-date'>${labelsFechas[i]}</div><span>$${dailyFugas[i].toLocaleString('es-CL')}</span></div></div>`;
            if ((dailyNecesario[i] + dailyFugas[i]) > limiteDiarioIdeal) alarmLogCache += `<div class='log-item critical'><div class='log-icon'>🔥</div><div class='log-content'><strong>LÍMITE ROTO</strong><div class='log-date'>${labelsFechas[i]}</div><span>$${(dailyNecesario[i]+dailyFugas[i]).toLocaleString('es-CL')}</span></div></div>`;
        }

        chartDiario = new Chart(ctxDiario, {
            type: 'bar',
            data: { labels: labelsFechas.slice(startDayForBars, lastDayWithData + 1), datasets: [
                { label: 'Gasto Base', data: dailyNecesario.slice(startDayForBars, lastDayWithData + 1), backgroundColor: 'rgba(31, 111, 235, 0.6)', borderRadius: 2 },
                { label: 'Fuga (Dopamina)', data: dailyFugas.slice(startDayForBars, lastDayWithData + 1), backgroundColor: 'rgba(255, 82, 82, 0.9)', borderRadius: 2 }
            ]},
            options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { stacked: true, ticks: { color: cT, font:{size:8} }, grid: { display:false } }, y: { stacked: true, ticks: { color: cT, callback: v => '$' + Math.round(v / 1000) + 'k' }, grid: { color: cG } } } },
            plugins: [
                { id: 'limiteDiarioPlugin', afterDraw: (chart) => { if(limiteDiarioIdeal <= 0) return; const ctx = chart.ctx, xAxis = chart.scales.x, yAxis = chart.scales.y, yPos = yAxis.getPixelForValue(limiteDiarioIdeal); if(yPos >= yAxis.top && yPos <= yAxis.bottom) { ctx.save(); ctx.beginPath(); ctx.moveTo(xAxis.left, yPos); ctx.lineTo(xAxis.right, yPos); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(210, 153, 34, 0.8)'; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.restore(); } } },
                labelsPlugin
            ]
        });
    }

    const ctxProyeccion = document.getElementById('chartRadar');
    if(ctxProyeccion) {
        let mesesLabels = [], montosProyectados = [], fechaHoy = new Date();
        for(let i=1; i<=6; i++) {
            let f = new Date(fechaHoy.getFullYear(), fechaHoy.getMonth() + i, 1);
            mesesLabels.push(f.toLocaleString('es-CL', { month: 'short' }).toUpperCase());
            montosProyectados.push(datosTCGlobal.filter(d => { let fC = new Date(d.mesCobro); return fC.getMonth() === f.getMonth() && fC.getFullYear() === f.getFullYear(); }).reduce((a, c) => a + c.monto, 0));
        }
        let grad = ctxProyeccion.getContext('2d').createLinearGradient(0, 0, 0, 300); grad.addColorStop(0, 'rgba(255, 82, 82, 0.6)'); grad.addColorStop(1, 'rgba(255, 82, 82, 0.05)');
        chartRadar = new Chart(ctxProyeccion, {
            type: 'line', data: { labels: mesesLabels, datasets: [{ label: 'Deuda TC', data: montosProyectados, backgroundColor: grad, borderColor: '#ff5252', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#030508', pointBorderColor: '#ff5252' }] },
            options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: cT, callback: v => '$' + Math.round(v/1000) + 'k' }, grid: { color: cG } }, x: { ticks: { color: cT, font: {size: 10, weight: 'bold'} }, grid: { display: false } } } },
            plugins: [
                { id: 'setpointTCPlugin', afterDraw: (chart) => { const ctx = chart.ctx, xAxis = chart.scales.x, yAxis = chart.scales.y, umbralSeguridad = sueldo * 0.15; if(yAxis.max > umbralSeguridad) { const yPos = yAxis.getPixelForValue(umbralSeguridad); ctx.save(); ctx.beginPath(); ctx.moveTo(xAxis.left, yPos); ctx.lineTo(xAxis.right, yPos); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255, 82, 82, 0.8)'; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.fillStyle = '#ff5252'; ctx.font = 'bold 10px monospace'; ctx.fillText('MAX (15%)', xAxis.left + 5, yPos - 5); ctx.restore(); } } },
                labelsPlugin
            ]
        });
    }
}

function calcularFechasCiclo(mesConceptual, anio) {
    let mesInicio = mesConceptual - 1; let anioInicio = anio; if (mesInicio < 0) { mesInicio = 11; anioInicio--; }
    let T0 = new Date(anioInicio, mesInicio, 30); if (T0.getMonth() !== mesInicio) T0 = new Date(anioInicio, mesInicio + 1, 0); 
    let TFinal = new Date(anio, mesConceptual, 30); if (TFinal.getMonth() !== mesConceptual) TFinal = new Date(anio, mesConceptual + 1, 0);
    return { T0, TFinal, fechaFinVisual: new Date(TFinal.getTime() - 86400000) };
}

window.navegarMes = function(direccion) {
    const navMes = document.getElementById('navMesConceptual'), navAnio = document.getElementById('navAnio');
    if(!navMes || !navAnio) return;
    let m = parseInt(navMes.value), a = parseInt(navAnio.value);
    m += direccion; if(m > 11) { m = 0; a++; } else if(m < 0) { m = 11; a--; }
    navMes.value = m; navAnio.value = a; aplicarCicloAlSistema();
};

function inicializarListenerTC() {
    db.collection("deuda_tc").orderBy("mesCobro", "asc").onSnapshot(snapshot => {
        datosTCGlobal = []; let totalDeuda = 0;
        snapshot.forEach(doc => { let data = doc.data(); data.id = doc.id; datosTCGlobal.push(data); totalDeuda += data.monto; });
        const txtTotalTC = document.getElementById("txtTotalTC");
        if(txtTotalTC) txtTotalTC.innerText = totalDeuda.toLocaleString('es-CL');
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
            let f = new Date(doc.mesCobro), key = f.getFullYear() + "-" + String(f.getMonth()).padStart(2, '0');
            if (!agrupado[key]) agrupado[key] = { label: f.toLocaleString('es-CL', { month: 'long', year: 'numeric' }).toUpperCase(), total: 0, items: [] };
            agrupado[key].items.push(doc); agrupado[key].total += doc.monto;
        });

        Object.keys(agrupado).sort().forEach(key => {
            let g = agrupado[key];
            tbody.innerHTML += `<tr style="background:rgba(255,82,82,0.15); border-top:2px solid rgba(255,82,82,0.5);">
                <td></td><td colspan="2" style="font-weight:900; color:#ff5252; font-size:0.85rem; letter-spacing:1px;">🗓️ ${g.label}</td>
                <td class="col-monto" style="color:#ff5252; font-weight:900;">$${g.total.toLocaleString('es-CL')}</td>
            </tr>`;
            g.items.forEach(doc => {
                let op = (doc.nombre.includes("PROYECCIÓN") || doc.nombre.includes("FACTURADA")) ? "1" : "0.7";
                tbody.innerHTML += `<tr>
                    <td style="text-align: center;"><input type="checkbox" class="checkItemTC" value="${doc.id}" onclick="actualizarBarraTC()" style="accent-color: #ff5252;"></td>
                    <td style="font-size: 0.7rem; color: #79c0ff; opacity:${op};">Cuota: ${doc.cuota}</td>
                    <td class="col-desc" title="${doc.nombre}" style="opacity:${op}; font-size:0.75rem;">${doc.nombre}</td>
                    <td class="col-monto" style="opacity:${op};">$${doc.monto.toLocaleString('es-CL')}</td>
                </tr>`;
            });
        });

        let fHoy = new Date(), pHoyMes = fHoy.getMonth() + 1, pHoyAnio = fHoy.getFullYear();
        if (pHoyMes > 11) { pHoyMes = 0; pHoyAnio++; }
        let kProx = pHoyAnio + "-" + String(pHoyMes).padStart(2, '0');
        let bImp = document.getElementById('boxImpactoTC');
        if (bImp) {
            if (agrupado[kProx]) { bImp.style.display = 'flex'; document.getElementById('lblImpactoMes').innerText = agrupado[kProx].label; document.getElementById('txtImpactoMonto').innerText = `$${agrupado[kProx].total.toLocaleString('es-CL')}`; } 
            else { bImp.style.display = 'none'; }
        }
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

window.abrirPreVuelo = function() {
    const modal = document.getElementById('modal-dia-cero'); if(!modal) return;
    let vM = parseInt(document.getElementById('navMesConceptual').value), vA = parseInt(document.getElementById('navAnio').value);
    
    // Calculamos el mes y año destino (Mes + 1)
    let pM = vM + 1, pA = vA; if (pM > 11) { pM = 0; pA++; }

    document.getElementById('pv-mes-label').innerText = new Date(pA, pM).toLocaleString('es-CL', {month:'long', year:'numeric'}).toUpperCase();
    
    // ⚡ FIX: Consultamos a la nube el presupuesto del MES SIGUIENTE
    let sueldoProximoMes = window.obtenerSueldoMes(pA, pM);
    document.getElementById('pv-sueldo').value = sueldoProximoMes.toLocaleString('es-CL');
    
    let sumaTCMes = 0;
    datosTCGlobal.forEach(d => { let f = new Date(d.mesCobro); if (f.getMonth() === pM && f.getFullYear() === pA) sumaTCMes += d.monto; });
    
    let elTcNac = document.getElementById('pv-tc-nac');
    if(elTcNac && elTcNac.getAttribute('data-estado') !== 'pag') elTcNac.value = sumaTCMes > 0 ? sumaTCMes.toLocaleString('es-CL') : "";
    
    calcularDiaCero(); modal.style.display = 'flex';
}

window.cerrarPreVuelo = function() { document.getElementById('modal-dia-cero').style.display = 'none'; actualizarDashboard(); };

window.toggleEstadoPV = function(btn, idInput) {
    const estados = ['est', 'real', 'pag'];
    let curr = btn.getAttribute('data-estado') || 'est';
    let next = estados[(estados.indexOf(curr) + 1) % estados.length];

    btn.classList.remove('est', 'real', 'pag');
    btn.classList.add(next);
    btn.innerText = next.toUpperCase();
    btn.setAttribute('data-estado', next);
    
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
    
    let pM = vM + 1;
    let pA = vA;
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
            // ⚡ FIX: Salto automático al mes inyectado
            document.getElementById('navMesConceptual').value = pM;
            document.getElementById('navAnio').value = pA;
            aplicarCicloAlSistema();
            mostrarToast(`ÉXITO: ${inyectados} REGISTROS INYECTADOS EN ${new Date(pA, pM).toLocaleString('es-CL', {month:'long'}).toUpperCase()}`);
        }).catch(err => alert("Error: " + err.message));
    } else {
        alert("Nada que inyectar.");
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
            cerrarPreVuelo(); document.getElementById('navMesConceptual').value = pM; document.getElementById('navAnio').value = pA;
            aplicarCicloAlSistema(); mostrarToast(`ÉXITO: ${inyectados} REGISTROS INYECTADOS EN ${new Date(pA, pM).toLocaleString('es-CL', {month:'long'}).toUpperCase()}`);
        }).catch(err => alert("Error: " + err.message));
    } else { alert("Nada que inyectar."); }
};
