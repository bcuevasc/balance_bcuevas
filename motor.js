// ==========================================================
// 🧠 BÚNKER SCADA ORACLE - MOTOR LÓGICO COMPLETO V14.7
// ==========================================================

const BYRON_EMAIL = "bvhcc94@gmail.com"; 
const catEvitables = ["Dopamina & Antojos"]; 
const SUELDO_BASE_DEFAULT = 3602505;

let listaMovimientos = [], datosMesGlobal = [], sueldosHistoricos = {}; 
let chartBD = null, chartP = null, chartDiario = null, chartRadar = null, chartTCDist = null;
let currentSort = { column: 'fechaISO', direction: 'desc' }; 
let modoEdicionActivo = false; 

window.totalTC = 0;
window.VALOR_USD = 950; 

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

// UTILIDADES BÁSICAS
let isEng = false;
window.toggleLanguage = function() {
    isEng = !isEng;
    document.querySelectorAll('[data-en]').forEach(el => {
        if (!el.hasAttribute('data-es')) el.setAttribute('data-es', el.innerText);
        el.innerText = isEng ? el.getAttribute('data-en') : el.getAttribute('data-es');
    });
    mostrarToast(isEng ? 'ENGLISH MODE ENGAGED' : 'MODO ESPAÑOL ACTIVADO');
};

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

window.formatearEntradaNumerica = function(i) { let v = i.value.replace(/\D/g,''); i.value = v ? parseInt(v).toLocaleString('es-CL') : ''; };
window.toggleTheme = function() { document.body.classList.toggle('light-theme'); };
setInterval(() => { const c = document.getElementById('cronos'); if(c) c.innerText = new Date().toLocaleString('es-CL').toUpperCase(); }, 1000);

const logosComerciales = { "uber": "uber.com", "pedidosya": "pedidosya.com", "mcdonald": "mcdonalds.com", "starbucks": "starbucks.cl", "jumbo": "jumbo.cl", "lider": "lider.cl" };
function obtenerIconoVisual(nombre, emojiFallback) {
    if(!nombre) return `<span style="font-size:1.4rem;">${emojiFallback}</span>`;
    let n = nombre.toLowerCase();
    for (let marca in logosComerciales) {
        if (n.includes(marca)) return `<img src="https://logo.clearbit.com/${logosComerciales[marca]}?size=100" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; background: white;" onerror="this.outerHTML='<span style=\\'font-size:1.4rem;\\'>${emojiFallback}</span>'">`;
    }
    return `<span style="font-size:1.4rem;">${emojiFallback}</span>`;
}

// INICIALIZACIÓN
async function inicializarSensorDolar() {
    let lbl = document.getElementById('lbl-dolar-actual');
    try {
        let response = await fetch('https://mindicador.cl/api/dolar');
        let data = await response.json();
        if(data && data.serie && data.serie.length > 0) {
            window.VALOR_USD = data.serie[0].valor;
            if(lbl) lbl.innerText = `1 USD = $${Math.round(window.VALOR_USD)} CLP`;
        }
    } catch(e) {
        window.VALOR_USD = 950; 
        if(lbl) lbl.innerText = `Offline (Ref: $950)`;
    }
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

// FIREBASE
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

window.logout = function() { auth.signOut().then(() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }); };

auth.onAuthStateChanged(user => {
    if (user) {
        if (user.email.toLowerCase() === BYRON_EMAIL.toLowerCase()) {
            console.log("%c[ORACLE V14.7] MATRIX ONLINE", "color: #2ea043; font-weight: bold; font-size: 14px;");
            const loginScreen = document.getElementById('login-screen'), reportZone = document.getElementById('reportZone');
            if(loginScreen) loginScreen.style.display = 'none';
            if(reportZone) reportZone.classList.add('active-app');
            
            const userDisplay = document.getElementById('user-display');
            if(userDisplay) userDisplay.innerText = user.displayName.split(" ")[0];
            
            db.collection("parametros").doc("sueldos").onSnapshot(snap => { if(snap.exists) sueldosHistoricos = snap.data(); });

            db.collection("movimientos").onSnapshot(snap => {
                listaMovimientos = [];
                snap.forEach(doc => {
                    let d = doc.data(); d.firestoreId = doc.id;
                    d.fechaISO = d.fecha?.toDate ? d.fecha.toDate().toISOString() : (d.fecha || new Date().toISOString());
                    d.monto = Number(d.monto) || 0;
                    listaMovimientos.push(d);
                });
                window.aplicarCicloAlSistema();
            });
            window.inicializarListenerTC();
        } else {
            auth.signOut(); alert(`⛔ DENEGADO:\nEl correo ${user.email} no tiene permisos.`);
        }
    }
});

// LÓGICA DE TIEMPO Y SUELDOS
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

window.cargarSueldoVisual = function() {
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio'), elSueldo = document.getElementById('inputSueldo');
    if(!elMes || !elAnio || !elSueldo) return;
    let m = elMes.value, a = elAnio.value, llave = `${a}_${m}`;
    elSueldo.setAttribute('data-mes-ancla', m); elSueldo.setAttribute('data-anio-ancla', a);
    if (document.activeElement !== elSueldo) {
        if (sueldosHistoricos[llave]) elSueldo.value = sueldosHistoricos[llave].toLocaleString('es-CL');
        else { elSueldo.value = ''; elSueldo.placeholder = 'PENDIENTE'; }
    }
};

window.guardarSueldoEnNube = function() {
    const elSueldo = document.getElementById('inputSueldo');
    if(!elSueldo) return;
    let m = parseInt(elSueldo.getAttribute('data-mes-ancla')), a = parseInt(elSueldo.getAttribute('data-anio-ancla'));
    if (isNaN(m) || isNaN(a) || elSueldo.value.trim() === '') return; 
    let s = parseInt(elSueldo.value.replace(/\./g, '')); 
    if (isNaN(s) || s <= 0) return;
    let llave = `${a}_${m}`;
    sueldosHistoricos[llave] = s;
    db.collection("parametros").doc("sueldos").set({ [llave]: s }, {merge: true}).then(() => {
        mostrarToast(`SUELDO GUARDADO`); window.actualizarDashboard();
    });
};

function calcularArrastreMesAnterior(anioActual, mesActual) {
    let mesPrev = mesActual - 1; let anioPrev = anioActual;
    if (mesPrev < 0) { mesPrev = 11; anioPrev--; }
    
    const { T0, TFinal } = window.calcularFechasCiclo(mesPrev, anioPrev);
    const sueldoPrev = window.obtenerSueldoMes(anioPrev, mesPrev);
    
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

window.navegarMes = function(direccion) {
    const navMes = document.getElementById('navMesConceptual'), navAnio = document.getElementById('navAnio');
    if(!navMes || !navAnio) return;
    let m = parseInt(navMes.value), a = parseInt(navAnio.value);
    m += direccion;
    if(m > 11) { m = 0; a++; } else if(m < 0) { m = 11; a--; }
    navMes.value = m; navAnio.value = a;
    window.aplicarCicloAlSistema();
};

window.aplicarCicloAlSistema = function() {
    const navMes = document.getElementById('navMesConceptual'), navAnio = document.getElementById('navAnio');
    if(!navMes || !navAnio) return;
    const fD = document.getElementById('filtroDesde'), fH = document.getElementById('filtroHasta');
    if(fD) fD.value = ''; if(fH) fH.value = '';

    let lbl = document.getElementById('lblPeriodoViendo'); if(lbl) lbl.innerText = isEng ? 'FULL PERIOD' : 'PERIODO COMPLETO';
    let cajaPC = document.getElementById('cajaFechasCustom'); if(cajaPC) cajaPC.style.display = 'none';
    let btnPC = document.getElementById('btnToggleFechas'); if(btnPC) btnPC.style.display = 'block';
    let cajaMovil = document.getElementById('cajaFechasCustomMovil'); if(cajaMovil) cajaMovil.style.display = 'none';
    let btnMovil = document.getElementById('btnToggleFechasMovil'); if(btnMovil) btnMovil.style.display = 'block';

    const { T0, fechaFinVisual } = window.calcularFechasCiclo(parseInt(navMes.value), parseInt(navAnio.value));
    const badge = document.getElementById('navRangoBadge');
    if(badge) badge.innerText = `[${T0.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}).toUpperCase()} - ${fechaFinVisual.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}).toUpperCase()}]`;
    window.cargarSueldoVisual(); window.actualizarDashboard();
};

// CEREBRO PRINCIPAL: ACTUALIZAR DASHBOARD
window.actualizarDashboard = function() {
    const elMes = document.getElementById('navMesConceptual'), elAnio = document.getElementById('navAnio');
    if(!elMes || !elAnio) return;
    const mesVal = parseInt(elMes.value), anioVal = parseInt(elAnio.value);
    
    const sueldo = window.obtenerSueldoMes(anioVal, mesVal);
    let { T0, TFinal } = window.calcularFechasCiclo(mesVal, anioVal);
    
    const fDesde = document.getElementById('filtroDesde') ? document.getElementById('filtroDesde').value : '';
    const fHasta = document.getElementById('filtroHasta') ? document.getElementById('filtroHasta').value : '';
    if(fDesde) { let [y,m,d] = fDesde.split('-'); T0 = new Date(y, m-1, d); }
    if(fHasta) { let [y,m,d] = fHasta.split('-'); TFinal = new Date(y, m-1, d, 23, 59, 59); }

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
    setTxt('txtTotalFijos', tF + tInfra + tFlota); 
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

    const buscador = document.getElementById('inputBuscador');
    const b = buscador ? buscador.value.toLowerCase() : '';

    window.renderizarListas(sueldo, b);
    
    let dataGraficos = dataMes.filter(x => x.catV !== 'Gasto Tarjeta de Crédito');
    window.dibujarGraficosFlujo(sueldo, [...dataGraficos].sort((x,y) => x.fechaISO < y.fechaISO ? -1 : 1), gCat, diasCiclo, T0, tF, tInfra, tFlota);
    
    setTxt('txtGastoTramo', tO + tF + tInfra + tFlota);
    setTxt('txtPromedioZoom', Math.round((tO + tF + tInfra + tFlota) / diasCiclo));
};

// RENDERIZADO DE TABLAS Y TARJETAS
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

                htmlPC += `<tr style="${bgEdicion}" draggable="true" ondragstart="dragStart(event, '${x.firestoreId}')" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="dropRow(event, '${x.firestoreId}')">
                    <td style="text-align: center;"><input type="checkbox" class="row-check" value="${x.firestoreId}" onchange="updateMassActions()"></td>
                    <td style="font-size:0.75rem; color:var(--text-muted);">${dateStr} <span class="col-hora">${timeStr}</span></td>
                    <td class="col-desc" title="${nombreSeguro}">${nombreSeguro}</td>
                    <td style="font-size:0.7rem;"><span class="cat-badge">${x.catV.replace(' & ','&')}</span></td>
                    <td class="col-monto" style="color:${colorMonto};">${iconImpacto}$${montoSeguro.toLocaleString('es-CL')}</td>
                    <td class="col-monto hide-mobile" style="color:var(--text-muted); font-size:0.75rem;">$${x.saldoCalculadoVista.toLocaleString('es-CL')}</td>
                    <td style="text-align:center;"><button class="btn-sys" style="padding:2px 6px; border:none; background:transparent; font-size:1rem;" onclick="window.editarMovimiento('${x.firestoreId}')">✏️</button></td>
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
                const clickAction = typeof openBottomSheet === 'function' ? `openBottomSheet('${x.firestoreId}', '${nombreSeguro.replace(/'/g, "\\'")}', ${montoSeguro})` : `window.editarMovimiento('${x.firestoreId}')`;
                
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

window.renderizarTablaTC = function() {
    const tbody = document.getElementById("listaDetalleTC");
    const tbodyMovil = document.getElementById("listaMovilTC");
    
    let htmlTC = '', htmlMovil = '', sumaProximoMes = 0;
    let fechaHoy = new Date(), proximoMes = fechaHoy.getMonth() + 1, proximoAnio = fechaHoy.getFullYear();
    if (proximoMes > 11) { proximoMes = 0; proximoAnio++; }

    if (datosTCGlobal.length === 0) {
        if(tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">MATRIZ SIN DATOS</td></tr>`;
        if(tbodyMovil) tbodyMovil.innerHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-dim);">MATRIZ SIN DATOS</div>`;
        let boxImpacto = document.getElementById('boxImpactoTC'); if(boxImpacto) boxImpacto.style.display = 'none';
        return;
    }

    datosTCGlobal.forEach(doc => {
        let fechaObj = new Date(doc.mesCobro);
        let mesTxt = fechaObj.toLocaleString('es-CL', { month: 'short', year: 'numeric' }).toUpperCase();
        if (fechaObj.getMonth() === proximoMes && fechaObj.getFullYear() === proximoAnio) sumaProximoMes += doc.monto;
        
        // Formato PC
        htmlTC += `<tr>
            <td style="text-align: center;"><input type="checkbox" class="checkItemTC" value="${doc.id}" onclick="window.actualizarBarraTC()" style="accent-color: #ff5252;"></td>
            <td style="font-size: 0.75rem; color: #79c0ff; font-weight: bold;">${mesTxt} (${doc.cuota})</td>
            <td class="col-desc" title="${doc.nombre}">${doc.nombre}</td>
            <td class="col-monto">$${doc.monto.toLocaleString('es-CL')}</td>
        </tr>`;

        // Formato Móvil
        const clickAction = typeof openBottomSheet === 'function' ? `openBottomSheet('${doc.id}', '${doc.nombre.replace(/'/g, "\\'")}', ${doc.monto})` : ``;
        htmlMovil += `
        <div class="mobile-card" onclick="${clickAction}" style="margin-bottom:6px; border-radius:12px !important; background: var(--bg-card) !important; padding: 14px 15px !important; border: 1px solid rgba(255,82,82,0.1) !important;">
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight:bold; font-size:0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-main);">${doc.nombre}</div>
                <div style="font-size:0.7rem; color:var(--accent-red); margin-top:3px; font-weight:800; letter-spacing: 0.5px;">${mesTxt} (${doc.cuota})</div>
            </div>
            <div style="font-weight:900; color:var(--text-main); flex-shrink: 0; font-size:1.15rem; font-family:monospace;">$${doc.monto.toLocaleString('es-CL')}</div>
        </div>`;
    });

    if(tbody) tbody.innerHTML = htmlTC;
    if(tbodyMovil) tbodyMovil.innerHTML = htmlMovil;

    let mesNombreStr = new Date(proximoAnio, proximoMes, 1).toLocaleString('es-CL', { month: 'long' }).toUpperCase();
    let boxImpacto = document.getElementById('boxImpactoTC');
    if (boxImpacto) {
        if (sumaProximoMes > 0) {
            boxImpacto.style.display = 'flex';
            document.getElementById('lblImpactoMes').innerText = `${mesNombreStr}`;
            document.getElementById('txtImpactoMonto').innerText = `$${sumaProximoMes.toLocaleString('es-CL')}`;
        } else { boxImpacto.style.display = 'none'; }
    }
    if(typeof window.actualizarBarraTC === 'function') window.actualizarBarraTC(); 
};

// ==========================================
// ✏️ EDICIÓN Y GUARDADO
// ==========================================
window.sortTable = function(column) {
    if (currentSort.column === column) currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    else { currentSort.column = column; currentSort.direction = 'asc'; }
    document.querySelectorAll('.data-grid th').forEach(th => th.innerHTML = th.innerHTML.replace(/ ▲| ▼/g, ''));
    const activeTh = Array.from(document.querySelectorAll('.data-grid th')).find(th => th.getAttribute('onclick')?.includes(column));
    if (activeTh) activeTh.innerHTML += currentSort.direction === 'asc' ? ' ▲' : ' ▼';
    window.actualizarDashboard();
};

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
    if(btn) { btn.innerHTML = isEng ? "UPDATE" : "ACTUALIZAR"; btn.style.backgroundColor = "var(--color-saldo)"; }
    modoEdicionActivo = true;
    window.actualizarDashboard(); 
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
};

window.toggleAllChecks = function() { const checkEl = document.getElementById('checkAll'); if(!checkEl) return; const check = checkEl.checked; document.querySelectorAll('.row-check').forEach(cb => cb.checked = check); window.updateMassActions(); };
window.updateMassActions = function() { const bar = document.getElementById('massActionsBar'); if(!bar) return; const cnt = document.querySelectorAll('.row-check:not(#checkAll):checked').length; bar.style.display = cnt > 0 ? 'flex' : 'none'; document.getElementById('massCount').innerText = `${cnt} SEL`; if(cnt === 0) document.getElementById('checkAll').checked = false; };
window.massDelete = function() { const ids = Array.from(document.querySelectorAll('.row-check:not(#checkAll):checked')).map(cb => cb.value); if(ids.length === 0 || !confirm(`⚠️ ¿Eliminar ${ids.length} registro(s)?`)) return; const btn = document.querySelector('button[onclick="massDelete()"]'); const orig = btn.innerHTML; btn.innerHTML = '⏳'; Promise.all(ids.map(id => db.collection("movimientos").doc(id).delete())).then(() => { document.getElementById('massActionsBar').style.display = 'none'; document.getElementById('checkAll').checked = false; btn.innerHTML = orig; }); };
window.massCategorize = function() { const ids = Array.from(document.querySelectorAll('.row-check:not(#checkAll):checked')).map(cb => cb.value); const cat = document.getElementById('massCategorySelect').value; if(ids.length === 0 || !cat || !confirm(`¿Categorizar como "${cat}"?`)) return; const btn = document.querySelector('button[onclick="massCategorize()"]'); const orig = btn.innerHTML; btn.innerHTML = '⏳'; Promise.all(ids.map(id => db.collection("movimientos").doc(id).update({categoria: cat}))).then(() => { document.getElementById('massActionsBar').style.display = 'none'; document.getElementById('checkAll').checked = false; document.getElementById('massCategorySelect').value = ''; btn.innerHTML = orig; }); };

// =====================================================================
// 📈 GRÁFICOS FLUJO (NÚMEROS EN BARRAS)
// =====================================================================
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
    const bgColors = ['rgba(31, 111, 235, 0.7)', 'rgba(46, 160, 67, 0.7)', 'rgba(210, 153, 34, 0.7)', 'rgba(255, 82, 82, 0.7)', 'rgba
