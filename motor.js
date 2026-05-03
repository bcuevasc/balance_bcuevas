// ==========================================================
// 🌐 V15.2: MOTOR SCADA PRO (Restauración Matriz TC)
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
const PRESUPUESTO_BASE_DEFAULT = 3602505;
const catEvitables = ["Dopamina & Antojos"];

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

const aliasMap = {}; 
catMaestras.forEach(c => { aliasMap[c.id] = c.label; });

let isEng = false;
window.toggleLanguage = function() {
    isEng = !isEng;
    document.querySelectorAll('[data-en]').forEach(el => {
        if (!el.hasAttribute('data-es')) el.setAttribute('data-es', el.innerText);
        el.innerText = isEng ? el.getAttribute('data-en') : el.getAttribute('data-es');
    });
};

document.addEventListener("DOMContentLoaded", () => {
    // 🛠️ PARCHE 1: Sincronización Temporal de Arranque
    const hoy = new Date();
    const navAnio = document.getElementById('navAnio');
    const navMes = document.getElementById('navMesConceptual');

    if (navAnio && navMes) {
        navAnio.value = hoy.getFullYear().toString();
        navMes.value = hoy.getMonth().toString(); // En JS, los meses van de 0 a 11
    }

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

    const elSueldo = document.getElementById('inputSueldo');
    if(elSueldo) {
        elSueldo.removeAttribute('onchange');
        elSueldo.removeAttribute('onblur');
        elSueldo.removeAttribute('oninput');
        
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
        inputNombre.addEventListener('keydown', e => {
            if(e.key === 'Enter') { 
                e.preventDefault(); 
                if(inputMonto && !inputMonto.value) {
                    inputMonto.focus(); 
                } else { 
                    inputNombre.blur(); 
                    document.getElementById('btnGuardar').click(); 
                }
            }
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
        inputMonto.addEventListener('keydown', e => {
            if(e.key === 'Enter') { 
                e.preventDefault(); 
                if(inputNombre && !inputNombre.value) {
                    inputNombre.focus(); 
                } else { 
                    inputMonto.blur(); 
                    document.getElementById('btnGuardar').click(); 
                }
            }
        });
    }
});

firebase.initializeApp({ apiKey: "AIzaSyBiYETN_JipXWhMq9gKz-2Pap-Ce4ZJNAI", authDomain: "finanzas-bcuevas.firebaseapp.com", projectId: "finanzas-bcuevas" });
const db = firebase.firestore(), auth = firebase.auth();

let listaMovimientos = [], datosMesGlobal = [], sueldosHistoricos = {}, datosTCGlobal = [];
let chartBD = null, chartP = null, chartDiario = null, chartRadar = null;
let currentSort = { column: 'fechaISO', direction: 'desc' }, modoEdicionActivo = false; 

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

window.loginWithGoogle = () => { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(err => { if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider()); }); };
window.logout = () => { auth.signOut().then(() => location.reload()); };

// 🛠️ PARCHE 2: Gatillo Refresco Inicial
auth.onAuthStateChanged(user => {
    if (user && user.email.toLowerCase() === BYRON_EMAIL.toLowerCase()) {
        const loginScreen = document.getElementById('login-screen'), reportZone = document.getElementById('reportZone');
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
            // Esto asegura que cada vez que cambien los datos, el ciclo se aplique
            aplicarCicloAlSistema(); 
        });
        
        inicializarListenerTC();
        
        // Disparo secundario forzado para asegurar la pintura en móvil
        setTimeout(() => { aplicarCicloAlSistema(); }, 500); 
    }
});

// 💰 GESTIÓN PRESUPUESTO
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
    db.collection("parametros").doc("sueldos").set({ [llave]: s }, {merge: true}).then(()=>mostrarToast(`PRESUPUESTO ACTUALIZADO`));
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
    
    // 🛠️ MEJORA 4: Activar Alarma Crítica si el Balance Real cae bajo cero
    const txtSaldoEl = document.getElementById('txtSaldo');
    if(txtSaldoEl) {
        const cardSaldo = txtSaldoEl.closest('.kpi-card');
        if(cardSaldo) {
            if(saldoAcc < 0) cardSaldo.classList.add('alarma-critica');
            else cardSaldo.classList.remove('alarma-critica');
        }
    }
    
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
        if (pctFugas < 5) txtPctFugas.style.color = "var(--color-saldo)";
        else if (pctFugas <= 10) txtPctFugas.style.color = "#d29922";
        else txtPctFugas.style.color = "var(--color-fuga)";
    }

    let deudaAprox = typeof window.totalTC !== 'undefined' ? window.totalTC : 0; 
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
    // (Añadir al final de actualizarDashboard)
    setTxt('txtPromedioZoom', Math.round((tO + tF) / diasCiclo));
    
    // 🛠️ Gatillo del Widget Lateral
    if (typeof sincronizarWidgetPreVuelo === 'function') sincronizarWidgetPreVuelo();
}

// ==========================================
// 📝 RENDERIZAR LISTAS PC
// ==========================================
if (typeof window.renderizarListas === 'undefined') {
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
        datos.forEach((x, idx) => {
            if (x.esIn) saldoRelativo += x.monto; else if (!x.esNeutro) saldoRelativo -= x.monto;
            x.saldoCalculadoVista = saldoRelativo;
        });

        const contenedorPC = document.getElementById('listaDetalle'); 
        if (!contenedorPC) return;

        if(datos.length === 0) {
            contenedorPC.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted); font-family:monospace;">MATRIZ SIN DATOS</td></tr>`;
            return;
        }

        // 🛠️ MEJORA 1: Recuperador seguro de iconos
        const getEmoji = (catId) => {
            if (typeof catMaestras !== 'undefined') {
                const found = catMaestras.find(c => c.id === catId);
                if (found) return found.em;
            }
            return "❓";
        };

        let htmlPC = '';
        datos.forEach((x) => {
            const d = new Date(x.fechaISO);
            const dateStr = d.toLocaleDateString('es-CL', {day:'2-digit', month:'2-digit'});
            const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

            const colorMonto = x.esIn ? "var(--color-ingresos)" : x.esNeutro ? "#d29922" : "var(--text-main)";
            const nombreSeguro = x.nombre || "Dato no identificado";
            const montoSeguro = (typeof x.monto === 'number' && !isNaN(x.monto)) ? x.monto : 0;
            const colorSaldo = x.saldoCalculadoVista < 0 ? 'var(--color-fuga)' : 'var(--text-muted)';
            let iconImpacto = x.esIn ? `<span class="impact-icon impact-pos">+</span>` : x.esNeutro ? `<span class="impact-icon impact-neu">=</span>` : `<span class="impact-icon impact-neg">-</span>`;
            
            let editIdVal = document.getElementById('editId') ? document.getElementById('editId').value : '';
            let esEditando = (editIdVal === x.firestoreId);
            
            let cssFuga = x.catV === 'Dopamina & Antojos' && !esEditando ? 'background: linear-gradient(90deg, rgba(255,255,255,0.01) 60%, rgba(248, 81, 73, 0.08) 100%); border-right: 3px solid var(--color-fuga);' : '';
            let bgEdicion = esEditando ? 'background-color: rgba(210, 153, 34, 0.15); border-left: 3px solid var(--color-edit);' : cssFuga;

            // 🛠️ EXPANSIÓN DE TELEMETRÍA: Sparklines de Eficiencia
            let pctFuga = x.innecesarioPct !== undefined ? x.innecesarioPct : (catEvitables.includes(x.catV) ? 100 : 0);
            let visualSparkline = '';
            
            if (pctFuga > 0 && !x.esIn && !x.esNeutro) {
                // Barra de Fuga (Roja)
                visualSparkline = `
                <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
                    <div style="flex:1; background:rgba(255,255,255,0.05); height:4px; border-radius:2px; overflow:hidden; border: 1px solid var(--border-color);">
                        <div style="width:${pctFuga}%; background:var(--color-fuga); height:100%; box-shadow:0 0 8px var(--color-fuga);"></div>
                    </div>
                    <span style="font-size:0.6rem; color:var(--color-fuga); font-weight:900; font-family:monospace;">${pctFuga}% FUGA</span>
                </div>`;
            } else if (x.tipo === 'Ahorro' || x.esIn) {
                // Barra de Optimización (Verde)
                visualSparkline = `
                <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
                    <div style="flex:1; background:rgba(255,255,255,0.05); height:4px; border-radius:2px; overflow:hidden; border: 1px solid var(--border-color);">
                        <div style="width:100%; background:var(--color-saldo); height:100%; box-shadow:0 0 8px var(--color-saldo);"></div>
                    </div>
                    <span style="font-size:0.6rem; color:var(--color-saldo); font-weight:900; font-family:monospace;">ACTIVO</span>
                </div>`;
            }

            htmlPC += `<tr style="${bgEdicion}" draggable="true" ondragstart="dragStart(event, '${x.firestoreId}')" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="dropRow(event, '${x.firestoreId}')">
                <td style="text-align: center;"><input type="checkbox" class="row-check" value="${x.firestoreId}" onchange="updateMassActions()"></td>
                <td style="font-size:0.75rem; color:var(--text-muted); font-weight:bold;">${dateStr} <span class="col-hora">${timeStr}</span></td>
                <td class="col-desc" title="${nombreSeguro}" style="font-size: 0.85rem;">${nombreSeguro}</td>
                <td style="font-size:0.75rem; padding-top: 12px; padding-bottom: 12px;">
                    <span class="cat-badge">${getEmoji(x.catV)} ${x.catV.replace(' & ','&')}</span>
                    ${visualSparkline}
                </td>
                <td class="col-monto" style="color:${colorMonto}; font-size: 1rem;">${iconImpacto}$${montoSeguro.toLocaleString('es-CL')}</td>
                <td class="col-monto hide-mobile" style="color:${colorSaldo}; font-size:0.8rem;">$${x.saldoCalculadoVista.toLocaleString('es-CL')}</td>
                <td style="text-align:center;"><button class="btn-sys" style="padding:4px 8px; border:none; background:transparent; font-size:1.1rem;" onclick="editarMovimiento('${x.firestoreId}')">✏️</button></td>
            </tr>`;
        });
        contenedorPC.innerHTML = htmlPC;
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

// ==========================================
// ✏️ EDICIÓN Y GUARDADO (CON SOPORTE MÓVIL)
// ==========================================
function editarMovimiento(id) {
    const mov = listaMovimientos.find(m => m.firestoreId === id);
    if(!mov) return alert("Registro no encontrado.");
    
    // Activar modo edición y cargar ID
    modoEdicionActivo = true; 
    if(document.getElementById('editId')) document.getElementById('editId').value = mov.firestoreId; 
    
    // Cargar Nombre
    if(document.getElementById('inputNombre')) {
        document.getElementById('inputNombre').value = mov.nombre;
        if (window.innerWidth > 768) { 
            document.getElementById('inputNombre').focus(); 
            setTimeout(() => document.getElementById('inputNombre').select(), 50); 
        }
    }
    
    // Cargar Monto
    if(document.getElementById('inputMonto')) {
        document.getElementById('inputMonto').value = mov.monto.toLocaleString('es-CL');
    }
    
    // Cargar Categoría y gestionar display de Cuotas
    if(document.getElementById('inputCategoria')) {
        document.getElementById('inputCategoria').value = mov.categoria || 'Sin Categoría';
        const boxC = document.getElementById('boxCuotas');
        if(boxC) boxC.style.display = (mov.categoria === "Gasto Tarjeta de Crédito") ? "block" : "none";
    }
    
    // Cargar Fuga y Cuotas
    if(document.getElementById('inputFuga')) document.getElementById('inputFuga').value = mov.innecesarioPct !== undefined ? mov.innecesarioPct : "0";
    if(document.getElementById('inputCuotas')) document.getElementById('inputCuotas').value = mov.cuotas !== undefined ? mov.cuotas : "1";

    // Cargar Tipo de Flujo
    let tipoC = mov.tipo || 'Gasto';
    if (mov.catV === 'Transferencia Recibida' || mov.catV === 'Ingreso Adicional') tipoC = 'Ingreso';
    if (mov.catV === 'Transferencia Propia / Ahorro') tipoC = 'Ahorro';
    if(document.getElementById('inputTipo')) document.getElementById('inputTipo').value = tipoC;
    
    // Cargar Fecha
    try {
        let d = new Date(mov.fechaISO);
        let dLocal = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        if(document.getElementById('inputFecha')) document.getElementById('inputFecha').value = dLocal;
    } catch(e) {}

    // Ajustar Botón de Guardado
    const btn = document.getElementById('btnGuardar');
    if(btn) { 
        btn.innerHTML = isEng ? "UPDATE DATA" : "ACTUALIZAR DATOS"; 
        btn.style.backgroundColor = "var(--color-saldo)"; 
    }
    
    // 👇 ESTA ES LA LÍNEA QUE HACE APARECER EL BOTÓN ESC 👇
    const btnCancelPC = document.getElementById('btnCancelarPC');
    if(btnCancelPC) btnCancelPC.style.display = 'inline-block';
    
    actualizarDashboard();
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
        procesarCompraTCManual(n, m, cantCuotas, fInput); return; 
    }

    const btn = document.getElementById('btnGuardar');
    btn.innerHTML = isEng ? "INJECTING..." : "INYECTANDO..."; btn.disabled = true;
    const payload = { nombre: n, monto: m, categoria: c, tipo: t, fecha: new Date(fInput), status: 'Manual', innecesarioPct: pctFuga, cuotas: cantCuotas };
    
    let op = (modoEdicionActivo && editId) ? db.collection("movimientos").doc(editId).update(payload) : db.collection("movimientos").add(payload);
    op.then(() => {
        limpiarFormulario(); mostrarToast("REGISTRO CONFIRMADO");
    }).catch(err => { alert("Error: " + err.message); btn.innerHTML = "ERROR"; btn.disabled = false; });
}

function limpiarFormulario() {
    document.getElementById('editId').value = ''; 
    if(document.getElementById('inputNombre')) document.getElementById('inputNombre').value = ''; 
    if(document.getElementById('inputMonto')) document.getElementById('inputMonto').value = '';
    
    const btn = document.getElementById('btnGuardar');
    if(btn) { 
        btn.innerHTML = isEng ? "INJECT" : "INYECTAR"; 
        btn.style.backgroundColor = "var(--color-edit)"; 
        btn.disabled = false; 
    }
    modoEdicionActivo = false;

    // 🛠️ MEJORA 3: Ocultar botón de abortar en PC y Móvil
    const btnCancelPC = document.getElementById('btnCancelarPC');
    if(btnCancelPC) btnCancelPC.style.display = 'none';
    const btnCancelMovil = document.getElementById('btnCancelarEdicion');
    if(btnCancelMovil) btnCancelMovil.style.display = 'none';

    actualizarDashboard();
}

function formatearEntradaNumerica(i) { let v = i.value.replace(/\D/g,''); i.value = v ? parseInt(v).toLocaleString('es-CL') : ''; }
function toggleTheme() { document.body.classList.toggle('light-theme'); }
setInterval(() => { const c = document.getElementById('cronos'); if(c) c.innerText = new Date().toLocaleString('es-CL').toUpperCase(); }, 1000);
function toggleAllChecks() { const check = document.getElementById('checkAll')?.checked; document.querySelectorAll('.row-check').forEach(cb => cb.checked = check); updateMassActions(); }
function updateMassActions() { const bar = document.getElementById('massActionsBar'); if(!bar) return; const cnt = document.querySelectorAll('.row-check:not(#checkAll):checked').length; bar.style.display = cnt > 0 ? 'flex' : 'none'; document.getElementById('massCount').innerText = `${cnt} SEL`; if(cnt === 0 && document.getElementById('checkAll')) document.getElementById('checkAll').checked = false; }
function massDelete() { const ids = Array.from(document.querySelectorAll('.row-check:not(#checkAll):checked')).map(cb => cb.value); if(ids.length === 0 || !confirm(`⚠️ ¿Eliminar ${ids.length} registro(s)?`)) return; const btn = document.querySelector('button[onclick="massDelete()"]'); const orig = btn.innerHTML; btn.innerHTML = '⏳'; Promise.all(ids.map(id => db.collection("movimientos").doc(id).delete())).then(() => { document.getElementById('massActionsBar').style.display = 'none'; document.getElementById('checkAll').checked = false; btn.innerHTML = orig; }); }
function massCategorize() { const ids = Array.from(document.querySelectorAll('.row-check:not(#checkAll):checked')).map(cb => cb.value); const cat = document.getElementById('massCategorySelect').value; if(ids.length === 0 || !cat || !confirm(`¿Categorizar como "${cat}"?`)) return; const btn = document.querySelector('button[onclick="massCategorize()"]'); const orig = btn.innerHTML; btn.innerHTML = '⏳'; Promise.all(ids.map(id => db.collection("movimientos").doc(id).update({categoria: cat}))).then(() => { document.getElementById('massActionsBar').style.display = 'none'; document.getElementById('checkAll').checked = false; document.getElementById('massCategorySelect').value = ''; btn.innerHTML = orig; }); }

// =====================================================================
// 📊 GRÁFICOS (ETIQUETAS VISUALES INTEGRADAS)
// =====================================================================
function dibujarGraficos(sueldo, chronData, cats, diasCiclo, T0, totalFijosMes, tInfra, tFlota, deudaAprox) {
    // 🛠️ MEJORA 2: Failsafe para gráficos sin datos (No Signal)
    const noSignalPlugin = {
        id: 'noSignalPlugin',
        afterDraw: (chart) => {
            let hasData = false;
            chart.data.datasets.forEach(ds => {
                if (ds.data && ds.data.some(v => v > 0 || v < 0)) hasData = true;
            });
            if (!hasData) {
                const ctx = chart.ctx;
                const width = chart.width;
                const height = chart.height;
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = 'bold 13px monospace';
                ctx.fillStyle = 'rgba(139, 148, 158, 0.5)'; // Tono text-muted
                ctx.fillText('[ NO SIGNAL / MATRIZ VACÍA ]', width / 2, height / 2);
                ctx.restore();
            }
        }
    };

    try { if(chartBD) chartBD.destroy(); } catch(e){}
    try { if(chartP) chartP.destroy(); } catch(e){}
    try { if(chartDiario) chartDiario.destroy(); } catch(e){}
    try { if(chartRadar) chartRadar.destroy(); } catch(e){}
    
    const cT = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || "#f0f6fc"; 
    const cG = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || "#21262d"; 
    
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

    if(limit >= 1 && limit <= diasCiclo) {
        // 🛠️ CALIBRACIÓN V14.8: Proyección basada solo en Tasa de Consumo Variable
        // Ignoramos la perturbación (escalón) de la Carga Fija del Día 1
        let gastoVariableAcumulado = 0;
        for(let i = 1; i <= limit; i++) {
            gastoVariableAcumulado += dailyNecesario[i] + dailyFugas[i];
        }
        
        // Pendiente (Slope) de quema diaria
        let tasaVariableDiaria = limit > 0 ? (gastoVariableAcumulado / limit) : 0;
        
        proyeccion[limit] = actual[limit];
        for(let i = limit + 1; i <= diasCiclo; i++) {
            proyeccion[i] = proyeccion[i-1] - tasaVariableDiaria;
        }
    }
    try {
        const ctxBD = document.getElementById('chartBurnDown');
        if(ctxBD) {
            let grad = ctxBD.getContext('2d').createLinearGradient(0, 0, 0, 400); grad.addColorStop(0, 'rgba(31, 111, 235, 0.4)'); grad.addColorStop(1, 'rgba(31, 111, 235, 0)');
            chartBD = new Chart(ctxBD, {
                type: 'line', data: { labels: labelsX, datasets: [ { label: 'Consumo Real', data: actual, borderColor: '#1f6feb', backgroundColor: grad, borderWidth: 3, fill: true, pointRadius: 0, tension: 0.2 }, { label: 'Proyección', data: proyeccion, borderColor: '#d29922', borderDash: [5, 5], borderWidth: 2, fill: false, pointRadius: 0, tension: 0.2 }, { label: 'Ideal', data: ideal, borderColor: 'rgba(46, 160, 67, 0.4)', borderDash: [5, 5], borderWidth: 2, fill: false, pointRadius: 0 } ]},
                options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales: { x: { ticks: { color: cT, font: {size: 9} }, grid:{color:cG} }, y: { grid: { color: cG }, ticks: { color: cT, callback: v => '$' + Math.round(v/1000) + 'k' } } }, layout: { padding: 0 } },
                plugins: [noSignalPlugin] // <-- INYECTADO AQUÍ
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
                options: { maintainAspectRatio:false, plugins:{legend:{position: 'right', labels:{color:cT, font:{size:10, family:'monospace'}}}}, scales:{ r:{ticks:{display:false}, grid:{color:cG}, angleLines:{color:cG}} } },
                plugins: [noSignalPlugin] // <-- INYECTADO AQUÍ
            });
        }
    } catch(e) {}

    try {
        const ctxDiario = document.getElementById('chartDiario');
        let limiteDiarioIdeal = Math.max((sueldo - totalFijosMes - tInfra - tFlota) / diasCiclo, 0);

        if(ctxDiario) {
            let lastDayWithData = diasCiclo; while(lastDayWithData > 0 && (dailyNecesario[lastDayWithData] === 0 && dailyFugas[lastDayWithData] === 0)) lastDayWithData--; let startDayForBars = Math.max(1, lastDayWithData - 14); 
            
            chartDiario = new Chart(ctxDiario, {
                type: 'bar',
                data: { labels: labelsFechas.slice(startDayForBars, lastDayWithData + 1), datasets: [ { label: 'Gasto Base', data: dailyNecesario.slice(startDayForBars, lastDayWithData + 1), backgroundColor: 'rgba(31, 111, 235, 0.6)', borderRadius: 2 }, { label: 'Fuga', data: dailyFugas.slice(startDayForBars, lastDayWithData + 1), backgroundColor: 'rgba(255, 82, 82, 0.9)', borderRadius: 2 } ]},
                options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { stacked: true, ticks: { color: cT, font:{size:8} }, grid: { display:false } }, y: { stacked: true, ticks: { color: cT, callback: v => '$' + Math.round(v / 1000) + 'k' }, grid: { color: cG } } } },
                plugins: [ { id: 'limiteDiarioPlugin', afterDraw: (chart) => { try { if(limiteDiarioIdeal <= 0) return; const ctx = chart.ctx, xAxis = chart.scales.x, yAxis = chart.scales.y, yPos = yAxis.getPixelForValue(limiteDiarioIdeal); if(yPos >= yAxis.top && yPos <= yAxis.bottom) { ctx.save(); ctx.beginPath(); ctx.moveTo(xAxis.left, yPos); ctx.lineTo(xAxis.right, yPos); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(210, 153, 34, 0.8)'; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.restore(); } } catch(e){} } }, labelsPlugin, noSignalPlugin ] // <-- INYECTADO AQUÍ
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
            
            let bgFill = 'rgba(248, 81, 73, 0.15)'; // Ajustado a paleta roja
            try { let grad = ctxProyeccion.getContext('2d').createLinearGradient(0, 0, 0, 300); grad.addColorStop(0, 'rgba(248, 81, 73, 0.6)'); grad.addColorStop(1, 'rgba(248, 81, 73, 0.05)'); bgFill = grad; } catch(e){}
            
            // 🛠️ Módulo de Inyección Dual de Datasets (Real vs Simulación)
            let datasetsRadar = [{ 
                label: 'Deuda TC', 
                data: montosProyectados, 
                backgroundColor: bgFill, 
                borderColor: '#ff5252', 
                borderWidth: 3, 
                fill: true, 
                tension: 0.4, 
                pointRadius: 4, 
                pointBackgroundColor: '#030508', 
                pointBorderColor: '#ff5252' 
            }];

            if (window.simulacionTC) {
                datasetsRadar.push({
                    label: 'Trayectoria Simulada (What-If)',
                    data: window.simulacionTC,
                    borderColor: '#2ea043', // Verde Saldo
                    borderDash: [5, 5],
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: '#030508',
                    pointBorderColor: '#2ea043'
                });
            }
            
            chartRadar = new Chart(ctxProyeccion, {
                type: 'line', 
                data: { labels: mesesLabels, datasets: datasetsRadar },
                options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: cT, callback: v => '$' + Math.round(v/1000) + 'k' }, grid: { color: cG } }, x: { ticks: { color: cT, font: {size: 10, weight: 'bold'} }, grid: { display: false } } } },
                plugins: [ { id: 'setpointTCPlugin', afterDraw: (chart) => { try { const ctx = chart.ctx, xAxis = chart.scales.x, yAxis = chart.scales.y; const umbralSeguridad = (Number(sueldo) || 0) * 0.15; if(yAxis && yAxis.max !== undefined && yAxis.max > umbralSeguridad) { const yPos = yAxis.getPixelForValue(umbralSeguridad); ctx.save(); ctx.beginPath(); ctx.moveTo(xAxis.left, yPos); ctx.lineTo(xAxis.right, yPos); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255, 82, 82, 0.8)'; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.fillStyle = '#ff5252'; ctx.font = 'bold 10px monospace'; ctx.fillText('MAX (15%)', xAxis.left + 5, yPos - 5); ctx.restore(); } } catch(e){} } }, labelsPlugin, noSignalPlugin ] // <-- INYECTADO AQUÍ
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

// ==========================================
// 💳 LÓGICA MATRIZ TC (RESTAURADA CON AGRUPACIÓN)
// ==========================================
function inicializarListenerTC() {
    db.collection("deuda_tc").orderBy("mesCobro", "asc").onSnapshot(snapshot => {
        datosTCGlobal = []; let totalDeuda = 0;
        snapshot.forEach(doc => { let data = doc.data(); data.id = doc.id; datosTCGlobal.push(data); totalDeuda += (Number(data.monto) || 0); });
        const txtTotalTC = document.getElementById("txtTotalTC");
        if(txtTotalTC) txtTotalTC.innerText = totalDeuda.toLocaleString('es-CL');
        if(typeof renderizarTablaTC === 'function') renderizarTablaTC();
        window.totalTC = totalDeuda; 
        if(typeof actualizarDashboard === 'function') actualizarDashboard();
    });
}

window.renderizarTablaTC = function() {
    if (typeof datosTCGlobal === 'undefined') return;
    
    // Detectamos entorno (PC o Móvil)
    const tbodyPC = document.getElementById("listaDetalleTC"); 
    const tbodyMovil = document.getElementById("listaMovilTC");
    
    if (!tbodyPC && !tbodyMovil) return;
    
    if (datosTCGlobal.length === 0) {
        if (tbodyPC) tbodyPC.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted); font-family:monospace;">MATRIZ SIN DATOS</td></tr>`;
        if (tbodyMovil) tbodyMovil.innerHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-dim);"><i>📡</i><br>MATRIZ TC SIN DATOS</div>`;
        let boxImpacto = document.getElementById('boxImpactoTC'); if(boxImpacto) boxImpacto.style.display = 'none';
        return;
    }

    let agrupado = {};
    let sumaProximoMes = 0; 
    let fechaHoy = new Date();
    let proximoMes = fechaHoy.getMonth() + 1; 
    let proximoAnio = fechaHoy.getFullYear();
    if (proximoMes > 11) { proximoMes = 0; proximoAnio++; }

    // 1. Árbol Lógico agrupado por Mes
    datosTCGlobal.forEach(doc => {
        if(!doc.mesCobro) return;
        let f = new Date(doc.mesCobro);
        let key = f.getFullYear() + "-" + String(f.getMonth() + 1).padStart(2, '0');
        
        if (!agrupado[key]) agrupado[key] = { label: f.toLocaleString('es-CL', { month: 'long', year: 'numeric' }).toUpperCase(), total: 0, items: [] };
        
        agrupado[key].items.push(doc); 
        agrupado[key].total += (Number(doc.monto) || 0);
        
        if (f.getMonth() === proximoMes && f.getFullYear() === proximoAnio) {
            sumaProximoMes += (Number(doc.monto) || 0);
        }
    });

    let htmlPC = "";
    let htmlMovil = "";

    // 2. Construcción de Nodos
    Object.keys(agrupado).sort().forEach(key => {
        let g = agrupado[key];
        
        // PADRE PC
        htmlPC += `<tr style="background:rgba(255,82,82,0.15); border-top:2px solid rgba(255,82,82,0.5);">
            <td style="text-align: center; width: 30px; position: relative; z-index: 10;">
                <input type="checkbox" class="checkMesTC" value="${key}" onclick="toggleMesTC(this, '${key}')" style="accent-color: #ff5252; cursor: pointer;">
            </td>
            <td colspan="2" style="font-weight:900; color:#ff5252; font-size:0.85rem; letter-spacing:1px; pointer-events: none;">🗓️ ${g.label}</td>
            <td class="col-monto" style="color:#ff5252; font-weight:900; pointer-events: none;">$${g.total.toLocaleString('es-CL')}</td>
        </tr>`;
        
        // PADRE MÓVIL
        htmlMovil += `<div style="background:rgba(255,82,82,0.1); padding: 12px 15px; margin: 15px 0 10px 0; border-radius: 8px; border-left: 3px solid var(--accent-red); display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="color:var(--accent-red); font-weight:900; font-size: 0.85rem; letter-spacing: 1px;">🗓️ ${g.label}</span>
                <span style="color:var(--text-main); font-weight:900; font-size: 1.1rem; font-family:monospace;">$${g.total.toLocaleString('es-CL')}</span>
            </div>
            <button onclick="purgarMesTCMovil('${key}')" style="background:var(--accent-red); color:white; border:none; padding:8px 12px; border-radius:8px; font-weight:900; font-size:0.7rem; box-shadow:0 4px 10px rgba(255,82,82,0.3); transition:transform 0.1s;">🗑️ PURGAR</button>
        </div>`;

        // HIJOS
        g.items.forEach(doc => {
            let op = (doc.nombre && (doc.nombre.includes("PROYECCIÓN") || doc.nombre.includes("FACTURADA"))) ? "1" : "0.7";
            let colorIconoInfo = (doc.nombre && doc.nombre.includes("FACTURADA")) ? "⚠️" : "⚙️";
            
            // Hijo PC
            htmlPC += `<tr class="fila-hijo-${key}" style="background-color: transparent;">
                <td style="text-align: center; width: 30px; position: relative; z-index: 10;">
                    <input type="checkbox" class="checkItemTC checkItemTC-${key}" value="${doc.id}" onclick="actualizarBarraTC()" style="accent-color: #ff5252; cursor: pointer;">
                </td>
                <td style="font-size: 0.7rem; color: #79c0ff; opacity:${op}; width: 20%; padding-left: 20px;">Cuota: ${doc.cuota || '1/1'}</td>
                <td class="col-desc" title="${doc.nombre || 'N/A'}" style="opacity:${op}; font-size:0.75rem; width: 50%;">${colorIconoInfo} ${doc.nombre || 'N/A'}</td>
                <td class="col-monto" style="opacity:${op}; width: 30%;">$${(Number(doc.monto)||0).toLocaleString('es-CL')}</td>
            </tr>`;
            
            // Hijo Móvil
            const clickAction = typeof openBottomSheet === 'function' ? `openBottomSheet('${doc.id}', '${(doc.nombre || '').replace(/'/g, "\\'")}', ${doc.monto}, 'deuda_tc')` : ``;
            htmlMovil += `
            <div class="mobile-card is-fuga" onclick="${clickAction}" style="opacity: ${op}; margin-bottom: 6px; padding: 12px !important;">
                <div class="mc-icon" style="font-size: 1rem; width: 36px; height: 36px;">💳</div>
                <div class="mc-body">
                    <div class="mc-title" style="font-size: 0.85rem;">${doc.nombre || 'N/A'}</div>
                    <div class="mc-subtitle" style="color: var(--accent-red);"><span>Cuota: ${doc.cuota || '1/1'}</span></div>
                </div>
                <div class="mc-amount" style="font-size: 1rem;">$${(Number(doc.monto)||0).toLocaleString('es-CL')}</div>
            </div>`;
        });
    });

    if (tbodyPC) tbodyPC.innerHTML = htmlPC;
    if (tbodyMovil) tbodyMovil.innerHTML = htmlMovil; 
    
    // Configuración de Alarmas
    let mesNombreStr = new Date(proximoAnio, proximoMes, 1).toLocaleString('es-CL', { month: 'long' }).toUpperCase();
    let boxImpacto = document.getElementById('boxImpactoTC');
    if (boxImpacto) {
        if (sumaProximoMes > 0) {
            boxImpacto.style.display = 'flex';
            let elMes = document.getElementById('lblImpactoMes'); if(elMes) elMes.innerText = `${mesNombreStr}`;
            let elMonto = document.getElementById('txtImpactoMonto'); if(elMonto) elMonto.innerText = `$${sumaProximoMes.toLocaleString('es-CL')}`;
        } else { 
            boxImpacto.style.display = 'none'; 
        }
    }

    if(typeof actualizarBarraTC === 'function') actualizarBarraTC(); 
};

// Actuador Maestro de Mes para PC
window.toggleMesTC = function(checkboxMes, key) {
    document.querySelectorAll(`.checkItemTC-${key}`).forEach(c => c.checked = checkboxMes.checked);
    actualizarBarraTC();
};

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
                    let fecha = cols[0].trim(); let nombre = cols[1] ? cols[1].trim().replace(/\s+/g, ' ').toUpperCase() : "DESCONOCIDO"; 
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

// ==========================================
// 🚀 SIMULADOR DÍA CERO (PROYECCIÓN MES + 1)
// ==========================================
window.abrirPreVuelo = function() {
    const modal = document.getElementById('modal-dia-cero'); if(!modal) return;
    
    // ⚡ FIX: Proyección Temporal Mes + 1
    let vM = parseInt(document.getElementById('navMesConceptual').value);
    let vA = parseInt(document.getElementById('navAnio').value);
    
    let pM = vM + 1; let pA = vA; 
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
    if(elTcNac && elTcNac.getAttribute('data-estado') !== 'pag') { elTcNac.value = sumaTCMes > 0 ? sumaTCMes.toLocaleString('es-CL') : "0"; }
    
    calcularDiaCero(); modal.style.display = 'flex';
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
    
    // 🛠️ PRECISIÓN DECIMAL TC INTERNACIONAL
    let elTcInt = document.getElementById('pv-tc-int');
    let valTcIntRaw = elTcInt ? elTcInt.value.replace(/\$/g, '').replace(/,/g, '.') : "0";
    let tcIntUSD = (elTcInt && elTcInt.getAttribute('data-estado') !== 'pag') ? (parseFloat(valTcIntRaw) || 0) : 0;
    
    let tcIntCLP = Math.round(tcIntUSD * (isNaN(window.VALOR_USD) ? 950 : window.VALOR_USD)); 
    let elTcIntCLP = document.getElementById('pv-tc-int-clp');
    if (elTcIntCLP) {
        if (elTcInt && elTcInt.getAttribute('data-estado') === 'pag') { elTcIntCLP.innerText = "✔️ PAGADO"; elTcIntCLP.style.color = "var(--color-saldo)"; } 
        else { elTcIntCLP.innerText = `~ $${tcIntCLP.toLocaleString('es-CL')} CLP`; elTcIntCLP.style.color = "var(--accent-red)"; }
    }
    
    let deudasDuras = tcNac + tcIntCLP + valSiNoPagado('pv-linea');
    let estructural = valSiNoPagado('pv-arriendo') + valSiNoPagado('pv-udec') + valSiNoPagado('pv-cae') + valSiNoPagado('pv-ggcc') + valSiNoPagado('pv-luz') + valSiNoPagado('pv-agua') + valSiNoPagado('pv-gas') + valSiNoPagado('pv-celu') + valSiNoPagado('pv-madre') + valSiNoPagado('pv-subs') + valSiNoPagado('pv-seguro');
    
    let liquidezNeta = sueldo - deudasDuras - estructural;
    
    // Modal principal
    let txtLiq = document.getElementById('pv-txt-liquidez');
    if (txtLiq) txtLiq.innerText = liquidezNeta.toLocaleString('es-CL');
    
    let pR = 0, pN = 0, pV = 100;
    if (sueldo > 0) {
        pR = Math.min((deudasDuras / sueldo) * 100, 100);
        pN = Math.min((estructural / sueldo) * 100, 100 - pR);
        pV = Math.max(100 - pR - pN, 0);
        
        let bR = document.getElementById('pv-barra-roja'); if(bR) bR.style.width = pR + '%';
        let bN = document.getElementById('pv-barra-naranja'); if(bN) bN.style.width = pN + '%';
        let bV = document.getElementById('pv-barra-verde'); if(bV) bV.style.width = pV + '%';
    }

    // 🛠️ Sincronización visual del Widget
    let wTxtLiq = document.getElementById('widget-txt-liquidez');
    if (wTxtLiq) {
        wTxtLiq.innerText = liquidezNeta.toLocaleString('es-CL');
        let wbR = document.getElementById('widget-barra-roja'); if(wbR) wbR.style.width = pR + '%'; 
        let wbN = document.getElementById('widget-barra-naranja'); if(wbN) wbN.style.width = pN + '%'; 
        let wbV = document.getElementById('widget-barra-verde'); if(wbV) wbV.style.width = pV + '%';
    }

    let tgls = document.querySelectorAll('.btn-estado'), conf = 0;
    tgls.forEach(b => { if(b.classList.contains('real') || b.classList.contains('pag')) conf++; });
    let cer = tgls.length > 0 ? Math.round((conf / tgls.length) * 100) : 0;
    let elCer = document.getElementById('pv-certeza-pct');
    if(elCer) { elCer.innerText = cer + '%'; elCer.style.color = cer < 40 ? '#ff5252' : (cer < 80 ? '#ff9800' : '#2ea043'); }
};
// 🚀 SIMULADOR DÍA CERO (MODO GEMELO DIGITAL PURO)
window.ejecutarArranque = function() {
    // LOBOTOMÍA: Actuador de base de datos desconectado. 
    // Solo evalúa impacto local sin escritura en Firestore.
    mostrarToast("SIMULACIÓN FINALIZADA: GEMELO DIGITAL SEGURO (NO SE INYECTÓ DATA)");
    cerrarPreVuelo();
};

// ☁️ SINC Y EXPORTACIÓN (PUENTE REST)
window.triggerSync = async function() {
    // ⚠️ REEMPLAZA ESTA URL POR LA URL WEB APP DE TU APPS SCRIPT
    const urlWebApp = "https://script.google.com/macros/s/AKfycbwKlub0qrv8_d24ZuyKKNryqOw1E68xv1_JvPOoEUc6W8TICllFfodNcwkigQE_7AuoNg/exec";
    
    mostrarToast("INICIANDO BARRIDO GMAIL...");
    
    try {
        // En Apps Script, los requests CORS a veces sufren redirecciones opacas.
        // Usamos no-cors pero controlamos el flujo para no congelar la UI.
        fetch(urlWebApp, { mode: 'no-cors' })
        .then(() => {
            // Como es 'no-cors', no podemos leer el JSON de vuelta por seguridad del navegador,
            // pero sabemos que el disparo llegó a la RTU.
            setTimeout(() => {
                mostrarToast("BARRIDO COMPLETADO. MATRIZ SINCRONIZADA.");
                // Forzamos la actualización visual
                aplicarCicloAlSistema();
            }, 2000);
        })
        .catch(e => {
            alert("❌ Falla de Telemetría: " + e);
        });
    } catch (err) {
        alert("❌ Error Crítico de Red.");
    }
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
// ==========================================
// 🛠️ MEJORAS UX: CONTROL DE TECLADO (ESC)
// ==========================================
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        const modalDiaCero = document.getElementById('modal-dia-cero');
        const modalHistorian = document.getElementById('modal-historian');
        
        // Cerrar Día Cero
        if (modalDiaCero && modalDiaCero.style.display === 'flex') {
            cerrarPreVuelo();
        }
        // Cerrar Historian/Logs
        if (modalHistorian && modalHistorian.style.display === 'flex') {
            modalHistorian.style.display = 'none';
        }
        
        // Abortar edición en la consola de comandos
        if (typeof modoEdicionActivo !== 'undefined' && modoEdicionActivo) {
            limpiarFormulario();
        }
    }
});

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
// ==========================================
// 🧠 MÓDULO DE CONTROL PREDICTIVO (WHAT-IF)
// ==========================================
window.simulacionTC = null;

window.ejecutarSimulacionTC = function() {
    const inputEl = document.getElementById('inputSimuladorTC');
    if (!inputEl || !inputEl.value) return;
    
    let capitalPrepago = parseInt(inputEl.value.replace(/\./g, '')) || 0;
    if (capitalPrepago <= 0) return;

    // 1. Extraer la proyección actual de la Matriz TC a 6 meses
    let montosOriginales = [];
    let fechaHoy = new Date();
    
    for(let i=1; i<=6; i++) {
        let mIndex = (fechaHoy.getMonth() + i) % 12;
        let anioTemp = fechaHoy.getFullYear() + Math.floor((fechaHoy.getMonth() + i) / 12);
        
        let sumaMes = datosTCGlobal.filter(d => { 
            if (!d.mesCobro) return false;
            let fC = new Date(d.mesCobro); 
            return fC.getMonth() === mIndex && fC.getFullYear() === anioTemp; 
        }).reduce((a, c) => a + (Number(c.monto) || 0), 0);
        
        montosOriginales.push(sumaMes);
    }

    // 2. Lógica de Prepago en Cascada (Mata la deuda del mes más cercano al más lejano)
    let trayectoriaSimulada = [...montosOriginales];
    let capitalRestante = capitalPrepago;

    for(let i = 0; i < trayectoriaSimulada.length; i++) {
        if (capitalRestante <= 0) break;
        if (trayectoriaSimulada[i] > 0) {
            if (capitalRestante >= trayectoriaSimulada[i]) {
                capitalRestante -= trayectoriaSimulada[i];
                trayectoriaSimulada[i] = 0;
            } else {
                trayectoriaSimulada[i] -= capitalRestante;
                capitalRestante = 0;
            }
        }
    }

    // 3. Guardar vector simulado en memoria global y repintar HMI
    window.simulacionTC = trayectoriaSimulada;
    actualizarDashboard();
    mostrarToast("SIMULACIÓN WHAT-IF APLICADA");
};
// 🛠️ MÓDULO DE SINCRONIZACIÓN SILENCIOSA WIDGET PRE-VUELO
window.sincronizarWidgetPreVuelo = function() {
    const navMes = document.getElementById('navMesConceptual');
    const navAnio = document.getElementById('navAnio');
    if (!navMes || !navAnio) return;

    let vM = parseInt(navMes.value);
    let vA = parseInt(navAnio.value);
    let pM = vM + 1; let pA = vA; 
    if (pM > 11) { pM = 0; pA++; }

    let sueldoProximoMes = window.obtenerSueldoMes(pA, pM);
    let elSueldo = document.getElementById('pv-sueldo');
    if (elSueldo) elSueldo.value = sueldoProximoMes.toLocaleString('es-CL');

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

    if (typeof window.calcularDiaCero === 'function') {
        window.calcularDiaCero();
    }
};
window.resetearSimulacionTC = function() {
    const inputEl = document.getElementById('inputSimuladorTC');
    if (inputEl) inputEl.value = '';
    window.simulacionTC = null;
    actualizarDashboard();
    mostrarToast("MATRIZ RESTAURADA A CONDICIÓN BASE");
};
// ==========================================
// ⚠️ MÓDULO DE ALARMAS (HISTORIAN LOG)
// ==========================================
window.abrirHistorian = function() {
    const content = document.getElementById('historian-content');
    const modal = document.getElementById('modal-historian');
    if (!content || !modal) return;

    // Filtramos movimientos buscando Fugas explícitas o de la categoría Dopamina
    let fugas = datosMesGlobal.filter(x => catEvitables.includes(x.catV) || (x.innecesarioPct && x.innecesarioPct > 0));
    
    // Ordenamos de más reciente a más antigua
    fugas.sort((a, b) => new Date(b.fechaISO) - new Date(a.fechaISO));

    if (fugas.length === 0) {
        content.innerHTML = `<div style="text-align:center; padding:50px 20px; color:var(--text-muted); font-family:monospace; font-size: 1.1rem; line-height: 1.5;">🟢 SISTEMA ESTABLE<br><br>Cero fugas de dopamina detectadas en este ciclo.</div>`;
    } else {
        let html = '';
        fugas.forEach(f => {
            let d = new Date(f.fechaISO);
            let fechaTxt = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} • ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            let pct = f.innecesarioPct !== undefined ? f.innecesarioPct : 100;
            
            html += `
            <div class="log-item critical">
                <div class="log-icon">🍔</div>
                <div class="log-content">
                    <div class="log-date">${fechaTxt} | IMPACTO: ${pct}%</div>
                    <strong>${f.nombre || 'Fuga no identificada'}</strong>
                </div>
                <span>-$${f.monto.toLocaleString('es-CL')}</span>
            </div>`;
        });
        content.innerHTML = html;
    }
    modal.style.display = 'flex';
};
// =====================================================================
// 🔄 MÓDULO DE REORDENAMIENTO DINÁMICO (DRAG & DROP CRONOLÓGICO)
// =====================================================================
let dragSourceId = null;

window.dragStart = function(event, id) {
    dragSourceId = id;
    event.dataTransfer.effectAllowed = 'move';
    // Efecto visual: atenuamos la fila mientras se arrastra
    event.target.style.opacity = '0.4';
};

window.dragOver = function(event) {
    event.preventDefault(); // Condición vital para permitir el Drop
    let tr = event.target.closest('tr');
    // Indicador táctico de inserción
    if (tr) tr.style.borderTop = "2px dashed var(--color-edit)";
};

window.dragLeave = function(event) {
    let tr = event.target.closest('tr');
    if (tr) tr.style.borderTop = "";
};

window.dropRow = function(event, targetId) {
    event.preventDefault();
    let tr = event.target.closest('tr');
    if (tr) tr.style.borderTop = "";

    // Restaurar opacidad a todos los elementos del DOM
    document.querySelectorAll('.data-grid tbody tr').forEach(row => row.style.opacity = '1');

    // Failsafe: Si soltamos en el mismo lugar o fuera de rango, abortar
    if (!dragSourceId || dragSourceId === targetId) return;

    // Localizar los nodos en la memoria local (RAM)
    const sourceNode = listaMovimientos.find(m => m.firestoreId === dragSourceId);
    const targetNode = listaMovimientos.find(m => m.firestoreId === targetId);

    if (!sourceNode || !targetNode) return;

    mostrarToast("RECALCULANDO CRONOLOGÍA Y CASCADA DE SALDOS...");

    // 🛠️ MANIPULACIÓN DEL TIMESTAMP
    // Extraemos el tiempo base del objetivo y le sumamos 1000 milisegundos (1 segundo)
    // Esto fuerza un Offset cronológico para que el elemento arrastrado quede justo arriba
    let targetTime = new Date(targetNode.fechaISO).getTime();
    let nuevoTiempoCronologico = new Date(targetTime + 1000); 

    // Actuador: Inyección de la nueva estampa de tiempo al Firestore.
    // El listener onSnapshot detectará este cambio y redibujará la cascada de saldos sola.
    db.collection("movimientos").doc(dragSourceId).update({
        fecha: nuevoTiempoCronologico
    }).then(() => {
        dragSourceId = null; // Purgar variable global
    }).catch(err => {
        alert("❌ Error de Sincronización Cronológica: " + err.message);
    });
};
