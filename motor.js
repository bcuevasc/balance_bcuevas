// ==========================================================
// 🧠 BÚNKER SCADA - MOTOR LÓGICO V5.0 (PRO BUILD)
// ==========================================================
const BYRON_EMAIL = "bvhcc94@gmail.com"; 
const CREDIT_SETPOINT = -300000; 
const catEvitables = ["Dopamina & Antojos"]; 

const catEmojis = {
    "Transferencia": "🔄", "Gastos Fijos (Búnker)": "🏠", "Suscripciones": "📱", "Alimentación & Supermercado": "🛒",
    "Dopamina & Antojos": "🍔", "Ocio & Experiencias": "🎸", "Transporte & Logística": "🚗", 
    "Mantenimiento Hardware (Salud)": "💊", "Transferencia Propia / Ahorro": "🏦", "Hogar & Búnker": "🛠️",
    "Red de Apoyo (Familia)": "🫂", "Gasto Tarjeta de Crédito": "💳", "Ingreso Adicional": "💰",
    "Transferencia Recibida": "📲", "Ruido de Sistema": "⚙️", "Sin Categoría": "❓"
};

// 🟢 SMART MATCH V2: BÚSQUEDA DE RAÍZ LÉXICA 🟢
const logosComerciales = {
    "uber": "uber.com", "zapping": "zapping.com", "netflix": "netflix.com",
    "spotify": "spotify.com", "lider": "lider.cl", "jumbo": "jumbo.cl",
    "pedido": "pedidosya.com", "pya": "pedidosya.com", "rappi": "rappi.cl", 
    "copec": "ww2.copec.cl", "shell": "shell.cl", "mcdonald": "mcdonalds.com", 
    "starbucks": "starbucks.cl", "cruz verde": "cruzverde.cl", "sodimac": "sodimac.cl", 
    "mercado": "mercadolibre.cl", "apple": "apple.com", "kupos": "kupos.cl", 
    "unimarc": "unimarc.cl", "vtr": "vtr.com", "entel": "entel.cl", "wom": "wom.cl",
    "santander": "bancosantander.cl", "estado": "bancoestado.cl"
};

function obtenerIconoVisual(nombre, emojiFallback) {
    if(!nombre) return `<span style="font-size:1.4rem;">${emojiFallback}</span>`;
    let n = nombre.toLowerCase();
    for (let marca in logosComerciales) {
        if (n.includes(marca)) {
            let url = `https://logo.clearbit.com/${logosComerciales[marca]}?size=100`;
            return `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; background: white;" onerror="this.outerHTML='<span style=\\'font-size:1.4rem;\\'>${emojiFallback}</span>'">`;
        }
    }
    return `<span style="font-size:1.4rem;">${emojiFallback}</span>`;
}

// 🟢 INICIALIZACIÓN FIREBASE 🟢
firebase.initializeApp({
    apiKey: "AIzaSyBiYETN_JipXWhMq9gKz-2Pap-Ce4ZJNAI",
    authDomain: "finanzas-bcuevas.firebaseapp.com",
    projectId: "finanzas-bcuevas",
    storageBucket: "finanzas-bcuevas.firebasestorage.app"
});

const db = firebase.firestore();
const auth = firebase.auth();

let listaMovimientos = [];
let datosMesGlobal = []; 
let chartBD = null, chartP = null;
let currentSort = { column: 'fechaISO', direction: 'desc' }; 
let modoEdicionActivo = false;
let sueldosHistoricos = {}; 
const SUELDO_BASE_DEFAULT = 3602505;

auth.onAuthStateChanged(user => {
    if (user && user.email.toLowerCase() === BYRON_EMAIL.toLowerCase()) {
        const loginScreen = document.getElementById('login-screen');
        const reportZone = document.getElementById('reportZone');
        if(loginScreen) loginScreen.style.display = 'none';
        if(reportZone) reportZone.classList.add('active-app');
        
        db.collection("parametros").doc("sueldos").onSnapshot(snap => {
            if(snap.exists) sueldosHistoricos = snap.data();
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
    }
});

// 🟢 MOTOR DE CÁLCULO CORE 🟢
function aplicarCicloAlSistema() {
    const mes = document.getElementById('navMesConceptual');
    const anio = document.getElementById('navAnio');
    if(!mes || !anio) return;
    const { T0, TFinal } = calcularFechasCiclo(parseInt(mes.value), parseInt(anio.value));
    
    const badge = document.getElementById('navRangoBadge');
    if(badge) {
        const d1 = T0.toLocaleDateString('es-CL',{day:'2-digit',month:'short'}).toUpperCase();
        const d2 = TFinal.toLocaleDateString('es-CL',{day:'2-digit',month:'short'}).toUpperCase();
        badge.innerText = `${d1} AL ${d2}`;
    }
    
    const llave = `${anio.value}_${mes.value}`;
    const sueldo = sueldosHistoricos[llave] || SUELDO_BASE_DEFAULT;
    
    const inputSueldo = document.getElementById('inputSueldo');
    if(inputSueldo && document.activeElement !== inputSueldo) {
        inputSueldo.value = sueldo.toLocaleString('es-CL');
    }

    actualizarDashboard();
}

function actualizarDashboard() {
    const inputSueldo = document.getElementById('inputSueldo');
    const sueldo = inputSueldo ? (parseInt(inputSueldo.value.replace(/\./g,'')) || 0) : SUELDO_BASE_DEFAULT;
    
    const mesVal = parseInt(document.getElementById('navMesConceptual').value);
    const anioVal = parseInt(document.getElementById('navAnio').value);
    const { T0, TFinal } = calcularFechasCiclo(mesVal, anioVal);
    
    let dataMes = listaMovimientos.filter(x => { let d = new Date(x.fechaISO); return d >= T0 && d < TFinal; });
    
    dataMes.forEach(x => {
        x.catV = x.categoria || 'Sin Categoría';
        x.esIn = x.tipo === 'Ingreso' || x.catV === 'Transferencia Recibida' || x.catV === 'Ingreso Adicional';
        x.esNeutro = x.tipo === 'Por Cobrar' || x.tipo === 'Ahorro' || x.catV === 'Transferencia Propia / Ahorro';
    });

    datosMesGlobal = [...dataMes];
    let saldoAcc = sueldo, tF = 0, tO = 0, gCat = {};
    
    [...dataMes].sort((x,y) => x.fechaISO < y.fechaISO ? -1 : 1).forEach(x => {
        if (x.esIn) saldoAcc += x.monto;
        else if (!x.esNeutro) {
            saldoAcc -= x.monto;
            if (x.tipo === 'Gasto Fijo') tF += x.monto; else tO += x.monto;
            gCat[x.catV] = (gCat[x.catV] || 0) + x.monto;
        }
    });

    const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val.toLocaleString('es-CL'); };
    setTxt('txtTotalFijos', tF);
    setTxt('txtTotalOtros', tO);
    setTxt('txtSaldo', saldoAcc);
    
    renderizarListas(sueldo);
    
    const diasCiclo = Math.round((TFinal - T0) / 86400000);
    if(document.getElementById('chartBurnDown')) {
        dibujarGraficos(sueldo, [...dataMes].sort((x,y) => x.fechaISO < y.fechaISO ? -1 : 1), gCat, diasCiclo, T0);
    }
}    

// 🟢 RENDERIZADO VISUAL 🟢
function renderizarListas(sueldoBase) {
    let datos = [...datosMesGlobal].sort((a,b) => b.fechaISO > a.fechaISO ? 1 : -1);
    const contenedorMovil = document.getElementById('listaMovilDetalle');
    if (!contenedorMovil) return;

    if(datos.length === 0) {
        contenedorMovil.innerHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-dim);"><i>📡</i><br>Sin telemetría en este ciclo.</div>`;
        return;
    }

    let htmlMovil = '';
    datos.forEach(x => {
        const em = catEmojis[x.catV] || "❓";
        const colorMonto = x.esIn ? "var(--accent-blue)" : (x.esNeutro ? "var(--accent-orange)" : "var(--text-main)");
        const iconoVisual = obtenerIconoVisual(x.nombre, em);

        htmlMovil += `
        <div class="mobile-card" onclick="openBottomSheet('${x.firestoreId}', '${(x.nombre||"").replace(/'/g,"\\'")}', ${x.monto})">
            <div style="width: 44px; height: 44px; margin-right: 15px; background: rgba(255,255,255,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);">
                ${iconoVisual}
            </div>
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight:bold; font-size:0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${x.nombre}</div>
                <div style="font-size:0.7rem; color:var(--text-dim);">${new Date(x.fechaISO).toLocaleDateString('es-CL')} • ${x.catV}</div>
            </div>
            <div style="font-weight:900; color:${colorMonto}; flex-shrink: 0;">${x.esIn?'+':(x.esNeutro?'=':'-')}$${x.monto.toLocaleString('es-CL')}</div>
        </div>`;
    });
    contenedorMovil.innerHTML = htmlMovil;
}

// 🟢 TELEMETRÍA GRÁFICA (AUTO-ESCALABLE) 🟢
function dibujarGraficos(sueldo, chronData, cats, diasCiclo, T0) {
    if(chartBD) chartBD.destroy(); if(chartP) chartP.destroy();
    
    let daily = Array(diasCiclo + 1).fill(0);
    chronData.forEach(m => {
        let diff = Math.floor((new Date(m.fechaISO) - T0) / 86400000) + 1;
        if(diff >= 1 && diff <= diasCiclo) { if(m.esIn) daily[diff] += m.monto; else if(!m.esNeutro) daily[diff] -= m.monto; }
    });

    let actual = [sueldo], ideal = [sueldo], labelsX = ["INI"], acc = sueldo;
    let limit = Math.floor((new Date() - T0) / 86400000) + 1;

    for(let i=1; i<=diasCiclo; i++) {
        ideal.push(sueldo - (sueldo/diasCiclo)*i); 
        acc += daily[i]; 
        actual.push(i > limit ? null : acc);
        labelsX.push(String(new Date(T0.getTime() + (i-1)*86400000).getDate()).padStart(2,'0'));
    }

    chartBD = new Chart(document.getElementById('chartBurnDown'), {
        type: 'line', 
        data: { labels: labelsX, datasets: [
            { label: 'Real', data: actual, borderColor: '#1f6feb', borderWidth: 3, fill: false, pointRadius: 2, tension: 0.1 },
            { label: 'Ideal', data: ideal, borderColor: 'rgba(63,185,80,0.3)', borderDash:[5,5], pointRadius:0 }
        ]},
        options: { 
            maintainAspectRatio:false, 
            responsive: true,
            scales:{ 
                x:{ticks:{color:"#8b949e", font:{size:9}}, grid:{display:false}}, 
                y:{ticks:{color:"#8b949e", font:{size:9}}, grid:{color:"rgba(255,255,255,0.05)"}} 
            },
            plugins: { legend: { display: false } }
        }
    });

    const sorted = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,6);
    chartP = new Chart(document.getElementById('chartPareto'), {
        type: 'bar', 
        data: { labels: sorted.map(c => c[0].substring(0,6)), datasets: [{ data: sorted.map(c => c[1]), backgroundColor: '#1f6feb', borderRadius: 4 }] },
        options: { 
            maintainAspectRatio:false, responsive: true,
            plugins:{legend:{display:false}}, 
            scales:{ x:{ticks:{color:"#8b949e", font:{size:9}}, grid:{display:false}}, y:{ticks:{color:"#8b949e", font:{size:9}}, grid:{color:"rgba(255,255,255,0.05)"}} } 
        }
    });
}

function calcularFechasCiclo(mes, anio) {
    let mesI = mes - 1, anioI = anio; if (mesI < 0) { mesI = 11; anioI--; }
    return { T0: new Date(anioI, mesI, 30), TFinal: new Date(anio, mes, 30) };
}

function formatearEntradaNumerica(i) { let v = i.value.replace(/\D/g,''); i.value = v ? parseInt(v).toLocaleString('es-CL') : ''; }

// 🟢 OPERACIONES CRUD 🟢
function editarMovimiento(id) {
    const mov = listaMovimientos.find(m => m.firestoreId === id);
    if(!mov) return;
    document.getElementById('editId').value = mov.firestoreId; 
    document.getElementById('inputNombre').value = mov.nombre;
    document.getElementById('inputMonto').value = mov.monto.toLocaleString('es-CL');
    document.getElementById('inputCategoria').value = mov.categoria || 'Sin Categoría';
    document.getElementById('inputTipo').value = mov.tipo || 'Gasto';
    document.getElementById('btnGuardar').innerHTML = "ACTUALIZAR REGISTRO";
    document.getElementById('btnGuardar').style.backgroundColor = "var(--accent-orange)";
    modoEdicionActivo = true;
    switchTabApp('add', null);
}

function agregarMovimiento() {
    const m = parseInt(document.getElementById('inputMonto').value.replace(/\./g, ''));
    const n = document.getElementById('inputNombre').value;
    const c = document.getElementById('inputCategoria').value;
    const t = document.getElementById('inputTipo').value;
    const fInput = document.getElementById('inputFecha').value;
    const editId = document.getElementById('editId').value;
    if (!m || !n || !fInput) return alert("⚠️ Faltan parámetros críticos.");
    
    document.activeElement.blur(); // Blur preventivo para iOS
    const btn = document.getElementById('btnGuardar');
    const origText = btn.innerHTML;
    btn.innerHTML = "⏳ CERRANDO CICLO..."; btn.disabled = true;

    const data = { nombre: n, monto: m, categoria: c, tipo: t, fecha: new Date(fInput), status: 'Manual' };
    let op = (modoEdicionActivo && editId) ? db.collection("movimientos").doc(editId).update(data) : db.collection("movimientos").add(data);
    
    op.then(() => {
        document.getElementById('editId').value = ''; document.getElementById('inputNombre').value = ''; document.getElementById('inputMonto').value = '';
        btn.innerHTML = "REGISTRAR"; btn.style.backgroundColor = "var(--accent-green)"; btn.disabled = false;
        modoEdicionActivo = false;
        switchTabApp('dash', document.querySelectorAll('.nav-item')[0]); // Redirige al Radar
    }).catch(err => { alert("❌ Error Base de Datos: " + err.message); btn.innerHTML = origText; btn.disabled = false; });
}
