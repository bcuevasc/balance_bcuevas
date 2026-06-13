# 🏦 ByFINANCE SCADA (Búnker Engine)

![Version](https://img.shields.io/badge/Version-V15.0+-purple.svg)
![Status](https://img.shields.io/badge/Status-Active-success.svg)
![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Mobile-blue.svg)

**ByFINANCE SCADA** (también conocido como *Búnker Engine*) es un sistema de control de supervisión y adquisición de datos (SCADA) diseñado exclusivamente para la gestión, proyección y telemetría de finanzas personales. 

A diferencia de las aplicaciones de presupuesto tradicionales, este sistema aplica lógica de control industrial para monitorear la liquidez, proyectar "burn-rates" (tasas de quema) diarios y gestionar matrices de deuda con sincronización en tiempo real entre múltiples dispositivos.

---

## ⚙️ Arquitectura y Stack Tecnológico

El sistema opera bajo una arquitectura *Serverless* de lazo cerrado, garantizando alta velocidad de respuesta y seguridad de datos:

* **Frontend (HMI):** HTML5, CSS3 avanzado (Glassmorphism, diseño responsivo nativo), y Vanilla JavaScript puro para el motor lógico.
* **Base de Datos & Auth:** Firebase / Cloud Firestore (NoSQL) para almacenamiento persistente y sincronización en tiempo real. Autenticación restringida por usuario.
* **Telemetría y Automatización:** Google Apps Script (GAS). Actúa como un *backend* invisible que realiza barridos automatizados sobre Gmail para detectar, extraer e inyectar comprobantes de gastos y transferencias directamente a Firestore.

---

## 🚀 Módulos Principales (Core Modules)

### 1. 📊 Flujo Presente (Libro Diario)
El centro de mando principal que monitorea la liquidez operativa del ciclo actual.
* **Gráfico de Trayectoria:** Visualización del *Burn-Rate* contrastado con un límite teórico diario.
* **Pulso Vital:** Gráfico de barras que contrasta el gasto base vs. fugas financieras.
* **Gestor de Ciclos (Cloud-Synced):** Permite aislar ciclos financieros personalizados (ej. de pago a pago) y sincronizar la vista instantáneamente entre el PC y el teléfono móvil.

### 2. 💳 Matriz de Tarjeta de Crédito (TC)
Motor de proyección de pas
