const D = window.DATOS;
const HORIZONTES = [1, 3, 6, 12, 24];
const ORDEN = Object.keys(D.nombres);
const ETIQUETA = {
  dy3: "Variación a 3 meses de la tasa",
  spread: "Spread frente a la política",
  dpol3: "Variación a 3 meses de la política",
  g_m1: "Crecimiento anual de M1",
  g_m2: "Crecimiento anual de M2",
  g_m3: "Crecimiento anual de M3",
};

function coma(valor, decimales = 2) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return "—";
  return Number(valor).toFixed(decimales).replace(".", ",");
}

function textoP(valor) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return "—";
  if (Number(valor) < 0.001) return "< 0,001";
  return coma(valor, 3);
}

function lectura(adf, kpss) {
  const adfR = adf <= 0.05;
  const kpssR = kpss <= 0.05;
  if (!adfR && kpssR) return "Compatible con raíz unitaria";
  if (adfR && !kpssR) return "Compatible con estacionariedad";
  if (adfR && kpssR) return "Señales mixtas";
  return "Ninguna prueba rechaza su nula al 5 %";
}

function buscar(lista, modelo, horizonte) {
  return lista.find((fila) => fila.modelo === modelo && fila.horizonte === horizonte);
}

function senda(modelo) {
  return D.proyeccion.filter((fila) => fila.modelo === modelo).sort((a, b) => a.horizonte - b.horizonte);
}

function mes(fecha) {
  return fecha.slice(0, 7);
}

function enRango(fecha, desde, hasta) {
  return mes(fecha) >= mes(desde) && mes(fecha) <= mes(hasta);
}

function tabla(columnas, filas) {
  const cabeza = columnas.map((columna) => `<th>${columna}</th>`).join("");
  const cuerpo = filas.map((fila) => `<tr>${fila.map((celda) => `<td>${celda}</td>`).join("")}</tr>`).join("");
  return `<table><thead><tr>${cabeza}</tr></thead><tbody>${cuerpo}</tbody></table>`;
}

function colorBanda(tono) {
  return tono;
}

const AZUL = "#0B3A5B";
const ORO = "#A67C2D";
const CAFE = "#9C4A2B";
const VERDE = "#1F6F5B";
const pendientes = [];

function hueco(id) {
  pendientes.push(id);
  return id.clave;
}

function grafico(series, bandas, titulo, ejeY, formato) {
  const clave = `g${pendientes.length}`;
  hueco({ tipo: "lineas", clave, series, bandas, titulo, ejeY, formato });
  return `<div id="${clave}" class="grafico"></div>`;
}

function lineasIndice(series, titulo, ejeX) {
  const clave = `g${pendientes.length}`;
  hueco({ tipo: "indice", clave, series, titulo, ejeX });
  return `<div id="${clave}" class="grafico"></div>`;
}

function barras(pares, titulo) {
  const clave = `g${pendientes.length}`;
  hueco({ tipo: "barras", clave, pares, titulo });
  return `<div id="${clave}" class="grafico"></div>`;
}

function calorPlot(etiquetas, matriz) {
  const clave = `g${pendientes.length}`;
  hueco({ tipo: "calor", clave, etiquetas, matriz });
  return `<div id="${clave}" class="grafico"></div>`;
}

function baseLayout(titulo, alto) {
  return {
    title: { text: titulo, font: { size: 16, color: "#1C1C1C", family: "Source Sans 3, Segoe UI, sans-serif" }, x: 0, xanchor: "left" },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "#ffffff",
    font: { family: "Source Sans 3, Segoe UI, sans-serif", color: "#1C1C1C", size: 13 },
    separators: ",.",
    hovermode: "x unified",
    hoverlabel: { bgcolor: "#ffffff", bordercolor: "#D5D7DA", font: { family: "Source Sans 3, Segoe UI, sans-serif", color: "#1C1C1C" } },
    legend: { orientation: "h", yanchor: "bottom", y: 1.02, x: 0 },
    margin: { l: 64, r: 24, t: 78, b: 48 },
    height: alto,
    xaxis: { gridcolor: "#E8EAEC", zeroline: false, linecolor: "#D5D7DA", automargin: true },
    yaxis: { gridcolor: "#E8EAEC", zeroline: false, linecolor: "#D5D7DA", separatethousands: true, automargin: true },
    transition: { duration: 450, easing: "cubic-in-out" },
  };
}

function trazo(serie) {
  const marca = Boolean(serie.puntos);
  const traza = {
    type: "scatter",
    x: serie.x,
    y: serie.y,
    name: serie.nombre,
    mode: marca ? "markers" : "lines",
    connectgaps: false,
    line: { color: serie.color, width: serie.ancho || 2.2, dash: serie.dash ? "dash" : "solid" },
    hovertemplate: "%{y:.2f}<extra>%{fullData.name}</extra>",
  };
  if (marca) traza.marker = { symbol: serie.simbolo || "diamond", size: 11, color: serie.color, line: { width: 0 } };
  return traza;
}

function dibujarGraficos() {
  const lote = pendientes.splice(0);
  const config = {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ["lasso2d", "select2d"],
  };
  lote.forEach((item) => {
    const nodo = document.getElementById(item.clave);
    if (!nodo || typeof Plotly === "undefined") return;
    if (item.tipo === "lineas") {
      const datos = [];
      (item.bandas || []).forEach((banda) => {
        datos.push({ type: "scatter", x: banda.x, y: banda.alto, mode: "lines", line: { width: 0, color: "rgba(0,0,0,0)" }, hoverinfo: "skip", showlegend: false });
        datos.push({
          type: "scatter",
          x: banda.x,
          y: banda.bajo,
          mode: "lines",
          fill: "tonexty",
          fillcolor: banda.color,
          line: { width: 0, color: "rgba(0,0,0,0)" },
          name: banda.nombre,
          hoverinfo: "skip",
        });
      });
      item.series.forEach((serie) => datos.push(trazo(serie)));
      const layout = baseLayout(item.titulo, 460);
      layout.xaxis.title = "Mes";
      layout.yaxis.title = item.ejeY;
      if (item.formato) layout.yaxis.tickformat = item.formato;
      layout.xaxis.showspikes = true;
      layout.xaxis.spikemode = "across";
      layout.xaxis.spikedash = "dot";
      layout.xaxis.spikethickness = 1;
      layout.xaxis.spikecolor = "#444";
      Plotly.newPlot(nodo, datos, layout, config);
      return;
    }
    if (item.tipo === "indice") {
      const datos = item.series.map((serie) => ({
        x: serie.y.map((_, i) => i),
        y: serie.y,
        name: serie.nombre,
        mode: "lines+markers",
        line: { color: serie.color, width: 2.2 },
        marker: { size: 6, color: serie.color },
        hovertemplate: "Rezago %{x}<br>%{y:.2f}<extra>%{fullData.name}</extra>",
      }));
      const layout = baseLayout(item.titulo, 420);
      layout.xaxis.title = item.ejeX;
      layout.yaxis.title = "Correlación";
      Plotly.newPlot(nodo, datos, layout, config);
      return;
    }
    if (item.tipo === "barras") {
      const layout = baseLayout(item.titulo, 440);
      layout.yaxis.title = "Puntos porcentuales";
      layout.margin.b = 140;
      layout.xaxis.tickangle = -35;
      Plotly.newPlot(nodo, [{
        x: item.pares.map((par) => par.nombre),
        y: item.pares.map((par) => par.valor),
        type: "bar",
        marker: { color: AZUL },
        hovertemplate: "%{y:.3f} pp<extra>%{x}</extra>",
      }], layout, config);
      return;
    }
    const texto = item.matriz.map((fila) => fila.map((valor) => coma(valor, 2)));
    const layout = baseLayout("Correlaciones en la muestra mensual", 520);
    layout.xaxis.side = "bottom";
    delete layout.xaxis.title;
    delete layout.yaxis.title;
    Plotly.newPlot(nodo, [{
      z: item.matriz,
      x: item.etiquetas,
      y: item.etiquetas,
      type: "heatmap",
      zmin: -1,
      zmax: 1,
      colorscale: "Blues",
      text: texto,
      texttemplate: "%{text}",
      hovertemplate: "%{y} · %{x}<br>%{z:.2f}<extra></extra>",
      colorbar: { title: "Correlación" },
    }], layout, config);
  });
}

function mesesEntre(origen, destino) {
  const [oy, om] = origen.split("-").map(Number);
  const [dy, dm] = destino.split("-").map(Number);
  return (dy - oy) * 12 + (dm - om);
}

function horizonteActual() {
  if (document.querySelector('input[name="modo"]:checked').value === "meses") {
    return Number(document.getElementById("horizonte").value);
  }
  const origen = D.panel.fecha[D.panel.fecha.length - 1];
  const destino = document.getElementById("fecha-final").value;
  return Math.min(24, Math.max(1, mesesEntre(origen, destino)));
}

function estado() {
  const fechas = D.panel.fecha;
  const a = Number(document.getElementById("desde-idx").value);
  const b = Number(document.getElementById("hasta-idx").value);
  return {
    modelo: document.getElementById("modelo").value,
    horizonte: horizonteActual(),
    desde: fechas[Math.min(a, b)],
    hasta: fechas[Math.max(a, b)],
    politica: document.getElementById("politica").checked,
    vista: document.querySelector('input[name="vista"]:checked').value,
    seccion: document.querySelector('input[name="seccion"]:checked').value,
  };
}

function recorte(campo) {
  const ui = estado();
  const fechas = [];
  const valores = [];
  D.panel.fecha.forEach((fecha, i) => {
    if (!enRango(fecha, ui.desde, ui.hasta)) return;
    fechas.push(fecha);
    valores.push(D.panel[campo][i]);
  });
  return { x: fechas, y: valores };
}

function seccionHistorial() {
  const ui = estado();
  const tasa = recorte("y");
  const series = [{ nombre: "Crédito de consumo", x: tasa.x, y: tasa.y, color: AZUL }];
  if (ui.politica) {
    const pol = recorte("pol");
    series.push({ nombre: "Tasa de política", x: pol.x, y: pol.y, color: ORO });
  }
  if (mes(ui.hasta) >= "2026-09") {
    series.push({
      nombre: "Octubre 2026, parcial",
      x: ["2026-10-31"],
      y: [D.parcial.tasa],
      color: CAFE,
      puntos: true,
      ancho: 0,
    });
  }
  const crecimiento = ui.vista === "crecimiento";
  const campos = crecimiento
    ? [["g_m1", "M1"], ["g_m2", "M2"], ["g_m3", "M3"]]
    : [["m1", "M1"], ["m2", "M2"], ["m3", "M3"]];
  const colores = [AZUL, VERDE, CAFE];
  const agregados = campos.map(([campo, nombre], i) => {
    const serie = recorte(campo);
    return { nombre, x: serie.x, y: serie.y, color: colores[i] };
  });
  const hayCrecimiento = agregados.some((serie) => serie.y.some((valor) => valor !== null));
  const segundo = crecimiento && !hayCrecimiento
    ? "<p>El crecimiento anual empieza doce meses después del primer saldo. En esta muestra, el primer valor es el de mayo de 2003. Amplíe el rango.</p>"
    : grafico(
      agregados,
      [],
      crecimiento ? "Crecimiento anual de M1, M2 y M3" : "M1, M2 y M3 en niveles",
      crecimiento ? "100 × ln(Mₜ / Mₜ₋₁₂)" : "Miles de millones de pesos",
      crecimiento ? undefined : ",.0f",
    );
  return `
    <h2>Historial</h2>
    <p class="nota">El rango cuenta por mes: cualquier día del mes muestra el cierre de ese mes. No cambia el modelo ni la proyección.</p>
    ${grafico(series, [], "Tasa de crédito de consumo", "Porcentaje efectivo anual")}
    ${segundo}
    <p class="nota">Los niveles están en miles de millones de pesos. M3 es el agregado más grande y por eso marca la escala. El crecimiento es 100 × ln(Mₜ / Mₜ₋₁₂). Octubre de 2026 promedia ${coma(D.parcial.tasa)} % con ${D.parcial.n} viernes. Ese punto, el rombo, solo aparece si el rango llega a septiembre de 2026 y no entra al modelo.</p>`;
}

function seccionProyeccion() {
  const ui = estado();
  const todo = senda(ui.modelo);
  const visible = todo.filter((fila) => fila.horizonte <= ui.horizonte);
  const fila = todo.find((item) => item.horizonte === ui.horizonte);
  const origen = D.panel.fecha[D.panel.fecha.length - 1];
  const tasa = D.panel.y[D.panel.y.length - 1];
  const desdeHistoria = "2018-09-30";
  const historia = { x: [], y: [] };
  D.panel.fecha.forEach((fecha, i) => {
    if (fecha >= desdeHistoria && enRango(fecha, ui.desde, ui.hasta)) {
      historia.x.push(fecha);
      historia.y.push(D.panel.y[i]);
    }
  });
  const fechas = [origen, ...visible.map((item) => item.fecha)];
  const punto = [tasa, ...visible.map((item) => item.proyeccion)];
  const banda = (inferior, superior, nombre, color) => ({
    nombre,
    x: fechas,
    bajo: [tasa, ...visible.map((item) => item[inferior])],
    alto: [tasa, ...visible.map((item) => item[superior])],
    color,
  });
  const filas = visible.map((item) => [
    item.fecha,
    String(item.horizonte),
    coma(item.proyeccion),
    coma(item.banda_80_inferior),
    coma(item.banda_80_superior),
    coma(item.banda_95_inferior),
    coma(item.banda_95_superior),
    coma(item.rmse_historico, 3),
    coma(item.mae_historico, 3),
  ]);
  window.__tablaProyeccion = visible;
  return `
    <h2>Tu proyección desde septiembre de 2026</h2>
    <div class="cifras">
      <div><span>Proyección</span><strong>${coma(fila.proyeccion)} %</strong></div>
      <div><span>Banda 80 %</span><strong>${coma(fila.banda_80_inferior)} a ${coma(fila.banda_80_superior)}</strong></div>
      <div><span>Banda 95 %</span><strong>${coma(fila.banda_95_inferior)} a ${coma(fila.banda_95_superior)}</strong></div>
      <div><span>RMSE de ese horizonte</span><strong>${coma(fila.rmse_historico, 3)} pp</strong></div>
    </div>
    ${grafico(
      [
        { nombre: "Tasa observada", x: historia.x, y: historia.y, color: AZUL, ancho: 2.2 },
        { nombre: "Proyección", x: fechas, y: punto, color: CAFE, dash: "5 4", ancho: 2.2 },
      ],
      [
        banda("banda_95_inferior", "banda_95_superior", "Banda 95 %", "rgba(138,164,181,0.35)"),
        banda("banda_80_inferior", "banda_80_superior", "Banda 80 %", "rgba(11,58,91,0.22)"),
      ],
      `Proyección · ${D.nombres[ui.modelo]}`,
      "Porcentaje efectivo anual",
    )}
    <p>El gráfico muestra los últimos ocho años, o un tramo más corto si el rango empieza después.</p>
    ${tabla(["Fecha", "Meses", "Proyección", "80 % inferior", "80 % superior", "95 % inferior", "95 % superior", "RMSE", "MAE"], filas)}
    <button type="button" id="descarga">Descargar tu proyección (CSV)</button>
    <p>El archivo usa punto y coma y coma decimal. Las bandas suman al pronóstico los cuantiles del error ya realizado.</p>`;
}

function seccionDesempeno() {
  const ui = estado();
  const cabezas = ["Modelo", ...HORIZONTES.map((h) => (h === 1 ? "1 mes" : `${h} meses`))];
  const rmse = ORDEN.map((modelo) => [
    D.nombres[modelo],
    ...HORIZONTES.map((h) => coma(buscar(D.metricas, modelo, h).rmse, 3)),
  ]);
  const razon = ORDEN.map((modelo) => [
    D.nombres[modelo],
    ...HORIZONTES.map((h) => coma(buscar(D.metricas, modelo, h).razon_rmse_paseo, 2)),
  ]);
  const referencia = [1, 3, 6, 12].map((h) => [
    String(h),
    coma(buscar(D.metricas, "ridge_agregados", h).rmse, 3),
    coma(D.referencia.ridge_agregados[h], 2),
    coma(buscar(D.metricas, "ridge_tasa_politica", h).rmse, 3),
    coma(D.referencia.ridge_tasa_politica[h], 2),
    coma(buscar(D.metricas, "paseo_aleatorio", h).rmse, 3),
    coma(D.referencia.paseo_aleatorio[h], 2),
  ]);
  let distancia = 0;
  [1, 3, 6, 12].forEach((h) => {
    ["ridge_agregados", "ridge_tasa_politica", "paseo_aleatorio"].forEach((modelo) => {
      distancia = Math.max(distancia, Math.abs(buscar(D.metricas, modelo, h).rmse - D.referencia[modelo][h]));
    });
  });
  const detalle = HORIZONTES.map((h) => {
    const fila = buscar(D.metricas, ui.modelo, h);
    return [String(h), String(fila.n), coma(fila.rmse, 3), coma(fila.mae, 3), coma(fila.mase, 3), coma(fila.sesgo, 3), coma(fila.dm_stat, 3), textoP(fila.dm_pvalue)];
  });
  const cob = HORIZONTES.map((h) => {
    const fila = buscar(D.cobertura, ui.modelo, h);
    if (!fila) return null;
    return [String(h), String(fila.n), coma(fila.cobertura_80 * 100, 1), coma(fila.cobertura_95 * 100, 1)];
  }).filter(Boolean);
  return `
    <h2>Error fuera de muestra</h2>
    <p>Misma ventana expansiva para todos: 120 meses mínimos, primer objetivo en mayo de 2012 y reajuste cada mes. La razón es el RMSE del modelo dividido por el de la tasa constante. Por debajo de 1, el modelo se equivoca menos.</p>
    <h3>RMSE, en puntos porcentuales</h3>
    ${tabla(cabezas, rmse)}
    <h3>Razón del RMSE frente a la tasa constante</h3>
    ${tabla(cabezas, razon)}
    <h3>Referencia publicada, a tres decimales en el cálculo</h3>
    ${tabla(["Horizonte", "Ridge con agregados", "Referencia con agregados", "Ridge sin agregados", "Referencia sin agregados", "Tasa constante", "Referencia constante"], referencia)}
    <p>La mayor distancia frente a la referencia de 1 a 12 meses es ${coma(distancia, 3)} puntos. La tolerancia de la prueba es 0,05.</p>
    <h3>${D.nombres[ui.modelo]}</h3>
    <p>Diebold-Mariano compara el error cuadrático con la tasa constante. Un estadístico negativo favorece al modelo. En la tasa constante la comparación es contra sí misma y no se reporta.</p>
    ${tabla(["Horizonte", "Evaluaciones", "RMSE", "MAE", "MASE", "Sesgo", "Diebold-Mariano", "Valor p"], detalle)}
    <p>Cobertura de las bandas construidas solo con errores ya conocidos en cada origen. El nominal es 80 % y 95 %.</p>
    ${tabla(["Horizonte", "Evaluaciones", "Cobertura 80 %", "Cobertura 95 %"], cob)}
    ${barras(ORDEN.map((modelo) => ({ nombre: D.nombres[modelo], valor: buscar(D.metricas, modelo, ui.horizonte).rmse })), `RMSE a ${ui.horizonte} ${ui.horizonte === 1 ? "mes" : "meses"}`)}
    <button type="button" id="descarga-metricas">Descargar las métricas (CSV)</button>`;
}

function seccionEstudio() {
  const c = D.calidad;
  const e = D.eda;
  const p = D.pruebas;
  const h12 = (modelo) => buscar(D.metricas, modelo, 12).rmse;
  const valor = (modelo, h) => buscar(D.metricas, modelo, h).rmse;
  const principal = (h) => senda("ridge_agregados").find((fila) => fila.horizonte === h).proyeccion;
  const aporte = HORIZONTES.map((h) => {
    const con = valor("ridge_agregados", h);
    const sin = valor("ridge_tasa_politica", h);
    const paseo = valor("paseo_aleatorio", h);
    return [String(h), coma(sin - con, 3), coma(paseo - con, 3)];
  });
  const atipicos = c.atipicos.map((item) => `${item.fecha} (${coma(item.cambio)} puntos)`).join("; ");
  const resto = c.atipicos_resto ? ` Hay ${c.atipicos_resto} casos más.` : "";
  const vif = p.vif.map((item) => [ETIQUETA[item.nombre] || item.nombre, coma(item.valor, 1)]);
  const raices = p.raices.map((fila) => [fila.serie, textoP(fila.adf), textoP(fila.kpss), lectura(fila.adf, fila.kpss)]);
  const granger = p.granger.map((fila) => [fila.causa, String(fila.rezago), textoP(fila.previo), textoP(fila.completo)]);
  const columnas = ["y", "pol", "spread", "g_m1", "g_m2", "g_m3", "inflacion", "brecha_inflacion"];
  const etiquetas = ["Tasa", "Política", "Spread", "g(M1)", "g(M2)", "g(M3)", "Inflación", "Brecha"];
  const matriz = etiquetas.map((_, i) => etiquetas.map((__, j) => {
    const a = D.panel[columnas[i]];
    const b = D.panel[columnas[j]];
    const xs = [];
    const ys = [];
    a.forEach((valor, k) => {
      if (valor === null || b[k] === null) return;
      xs.push(valor);
      ys.push(b[k]);
    });
    const n = xs.length;
    const mx = xs.reduce((s, v) => s + v, 0) / n;
    const my = ys.reduce((s, v) => s + v, 0) / n;
    let nume = 0;
    let dx = 0;
    let dy = 0;
    for (let k = 0; k < n; k += 1) {
      nume += (xs[k] - mx) * (ys[k] - my);
      dx += (xs[k] - mx) ** 2;
      dy += (ys[k] - my) ** 2;
    }
    return nume / Math.sqrt(dx * dy);
  }));
  const calor = tabla(["", ...etiquetas], matriz.map((fila, i) => [etiquetas[i], ...fila.map((valor) => coma(valor, 2))]));
  const rezagos = ["g_m1", "g_m2", "g_m3"].map((clave) => {
    const nombre = { g_m1: "Crecimiento de M1", g_m2: "Crecimiento de M2", g_m3: "Crecimiento de M3" }[clave];
    return [nombre, String(e.rezago[clave].rezago), coma(e.rezago[clave].correlacion, 2)];
  });
  const coef = HORIZONTES.map((h) => {
    const bloque = D.coeficientes.filter((fila) => fila.horizonte === h);
    const toma = (variable) => bloque.find((fila) => fila.variable === variable).coeficiente;
    return [String(h), coma(bloque[0].intercepto, 3), ...["dy3", "spread", "dpol3", "g_m1", "g_m2", "g_m3"].map((variable) => coma(toma(variable), 3))];
  });
  const regimenes = D.regimenes
    .slice()
    .sort((a, b) => a.regimen.localeCompare(b.regimen) || a.horizonte - b.horizonte || a.modelo.localeCompare(b.modelo))
    .map((fila) => [fila.regimen, fila.diseno, D.nombres[fila.modelo], String(fila.horizonte), String(fila.n), coma(fila.rmse, 2)]);
  return `
    <h2>Lectura</h2>
    <p>La tasa mensual del crédito de consumo cerró septiembre de 2026 en <strong>${coma(c.tasa)} %</strong>. El Ridge con agregados la ubica en <strong>${coma(principal(1))} %</strong> a un mes, <strong>${coma(principal(3))} %</strong> a tres, <strong>${coma(principal(6))} %</strong> a seis y <strong>${coma(principal(12))} %</strong> a doce. A un mes el RMSE es ${coma(valor("ridge_agregados", 1), 3)} con agregados, ${coma(valor("ridge_tasa_politica", 1), 3)} sin ellos y ${coma(valor("paseo_aleatorio", 1), 3)} con la tasa constante. A doce meses: ${coma(valor("ridge_agregados", 12), 3)}, ${coma(valor("ridge_tasa_politica", 12), 3)} y ${coma(valor("paseo_aleatorio", 12), 3)}.</p>
    <h2>Calidad de los datos</h2>
    <p>${c.decision}</p>
    <div class="cifras">
      <div><span>Meses de la muestra</span><strong>${c.observaciones}</strong></div>
      <div><span>Cierre de la tasa</span><strong>${coma(c.tasa)} %</strong></div>
      <div><span>Política de septiembre</span><strong>${coma(c.politica)} %</strong></div>
      <div><span>Política vigente</span><strong>${coma(c.pol_ultimo)} %</strong></div>
    </div>
    <p>La tasa semanal tiene ${c.tasas_filas} viernes, del ${c.tasas_inicio} al ${c.tasas_fin}, sin duplicados y sin huecos distintos de siete días. La política diaria va del ${c.pol_inicio} al ${c.pol_fin}. Falta un día: ${c.pol_falta.join(", ")}, fuera de la muestra. El 12,25 % es el nivel desde el 1 de octubre de 2026, no el promedio de septiembre.</p>
    <p>Los agregados mensuales cubren ${c.ag_filas} cierres, del ${c.ag_inicio} al ${c.ag_fin}, sin meses faltantes. La serie semanal tiene ${c.sem_filas} observaciones y ${c.sem_huecos} saltos distintos de siete días; no entra al modelo. La meta de inflación está vacía en ${c.meta_nula} meses anteriores a 1991 y está completa en la muestra de tasas. En el panel de estimación no hay nulos.</p>
    <p>Cambios mensuales de la tasa con puntuación robusta superior a 3,5: ${atipicos}.${resto} Se conservan: son saltos del ciclo, no huecos de captura.</p>
    <p>Octubre de 2026 tiene ${D.parcial.n} viernes, del ${D.parcial.desde} al ${D.parcial.hasta}, y promedia ${coma(D.parcial.tasa)} % en consumo y ${coma(D.parcial.politica)} % en política. No se usa para entrenar.</p>
    <p>La inflación anual calculada con el IPC correlaciona ${coma(e.ipc.correlacion, 3)} con la serie oficial. La diferencia absoluta máxima es ${coma(e.ipc.max_abs, 2)} puntos.</p>
    <h2>Correlaciones</h2>
    <p>La tasa promedia ${coma(e.descriptivos.y.media)} % (entre ${coma(e.descriptivos.y.minimo)} y ${coma(e.descriptivos.y.maximo)}). La política promedia ${coma(e.descriptivos.pol.media)} % y el spread ${coma(e.descriptivos.spread.media)} puntos. El crecimiento anual medio es ${coma(e.descriptivos.g_m1.media)} % en M1, ${coma(e.descriptivos.g_m2.media)} % en M2 y ${coma(e.descriptivos.g_m3.media)} % en M3.</p>
    <p>Correlación de los crecimientos: M1–M2 ${coma(e.corr.g_m1_g_m2, 2)}, M1–M3 ${coma(e.corr.g_m1_g_m3, 2)} y M2–M3 ${coma(e.corr.g_m2_g_m3, 2)}. M2 y M3 van casi juntos.</p>
    ${tabla(["Variable", "VIF"], vif)}
    <p>Con esos VIF, el coeficiente de M2 o de M3 no se lee como el efecto de ese agregado.</p>
    ${calorPlot(etiquetas, matriz)}
    ${lineasIndice([
      { nombre: "Crecimiento de M1", y: p.cruzada.g_m1, color: AZUL },
      { nombre: "Crecimiento de M2", y: p.cruzada.g_m2, color: VERDE },
      { nombre: "Crecimiento de M3", y: p.cruzada.g_m3, color: CAFE },
    ], "Correlación de la tasa con el crecimiento rezagado", "Rezago del agregado, en meses")}
    ${tabla(["Variable rezagada", "Rezago de mayor correlación", "Correlación"], rezagos)}
    <h2>Pruebas de series</h2>
    <p>ADF usa constante en tasas, crecimientos y diferencias, y constante más tendencia en los niveles de M1, M2 y M3. KPSS recorta su valor p al rango 0,01–0,10. «Compatible con raíz unitaria» significa que ADF no rechaza la nula al 5 % y KPSS sí rechaza la estacionariedad.</p>
    ${tabla(["Serie", "ADF, valor p", "KPSS, valor p", "Lectura"], raices)}
    <p>La tasa y los saldos monetarios se comportan como series integradas. Por eso el modelo usa el crecimiento anual y no el nivel. Los crecimientos de M2 y M3 siguen siendo persistentes.</p>
    <p>Granger se hace sobre la diferencia de la tasa. El valor p de la izquierda usa solo datos hasta abril de 2012, antes de la evaluación. El de la derecha usa toda la muestra y es descriptivo.</p>
    ${tabla(["Causa", "Rezago", "p hasta abril de 2012", "p en toda la muestra"], granger)}
    <p>La variación de la política anticipa la de la tasa. La señal de los agregados depende del rezago.</p>
    <p>Engle-Granger entre la tasa y la política tiene valor p ${textoP(p.eg_politica)}. Entre la tasa y el logaritmo de M2, ${textoP(p.eg_m2)}. Johansen sobre tasa y política: traza ${coma(p.joh_traza, 2)} frente a un crítico del 5 % de ${coma(p.joh_crit, 2)}. Con el logaritmo de M2 la traza es ${coma(p.joh_m_traza, 2)} y el crítico es ${coma(p.joh_m_crit, 2)}. Al 5 % no hay cointegración. El VECM de rango 1 se dejó como contraste, no como modelo mantenido.</p>
    <p>Las dummies de mes sobre el cambio de la tasa, estimadas solo hasta abril de 2012, tienen valor p conjunto ${textoP(p.estacional)}. El SARIMAX no lleva término estacional.</p>
    <h3>Coeficientes del Ridge final, sobre variables estandarizadas</h3>
    ${tabla(["Horizonte", "Intercepto", "dy3", "Spread", "dpol3", "g(M1)", "g(M2)", "g(M3)"], coef)}
    <p>Los signos de los tres crecimientos no son estables. No son una elasticidad.</p>
    <h2>Residuos y regímenes</h2>
    <p>En el error a un mes del Ridge con agregados, Ljung-Box tiene valor p ${textoP(D.residuos.ljung6)} a 6 rezagos y ${textoP(D.residuos.ljung12)} a 12. Jarque-Bera tiene valor p ${textoP(D.residuos.jarque)} (asimetría ${coma(D.residuos.asimetria, 2)}, curtosis ${coma(D.residuos.curtosis, 2)}). El RMSE de la primera mitad de la evaluación es ${coma(D.residuos.rmse1, 2)} y el de la segunda, ${coma(D.residuos.rmse2, 2)}. Hay autocorrelación y colas pesadas. La banda empírica no promete la cobertura nominal.</p>
    ${grafico([{ nombre: "Error a un mes", x: D.residuos.fecha, y: D.residuos.error, color: AZUL, ancho: 1.4 }], [], "Error a un mes: realizada menos pronóstico", "Puntos porcentuales")}
    <p>El backtest principal empieza en mayo de 2012, así que 2008-2009 no tiene error fuera de muestra en ese diseño. La fila de 2008-2009 es un diagnóstico con el primer origen en enero de 2007 y no entra en la tabla de referencia.</p>
    ${tabla(["Régimen", "Diseño", "Modelo", "Horizonte", "Meses", "RMSE"], regimenes)}
    <p>2022-2023 concentra el error: es la subida rápida de la política y de la tasa.</p>
    <h2>Cuánto aportan M1, M2 y M3</h2>
    ${tabla(["Horizonte", "Reducción frente al Ridge sin agregados", "Reducción frente a la tasa constante"], aporte)}
    <p>A un mes la reducción es ${coma(valor("ridge_tasa_politica", 1) - valor("ridge_agregados", 1), 3)} puntos. A tres meses es ${coma(valor("ridge_tasa_politica", 3) - valor("ridge_agregados", 3), 3)}. A seis meses es ${coma(valor("ridge_tasa_politica", 6) - valor("ridge_agregados", 6), 3)} y a doce, ${coma(valor("ridge_tasa_politica", 12) - valor("ridge_agregados", 12), 3)}. A veinticuatro meses llega a ${coma(valor("ridge_tasa_politica", 24) - valor("ridge_agregados", 24), 3)} puntos: ahí el Ridge sin agregados ya no mejora a la tasa constante, y el que lleva M1, M2 y M3 sí. Los agregados aportan sobre todo desde los seis meses y casi nada al mes siguiente.</p>
    <p>Añadir la inflación deja el RMSE de doce meses en ${coma(h12("ridge_inflacion"), 2)}. Añadir la brecha lo deja en ${coma(h12("ridge_brecha"), 2)}. El Ridge sin esas variables está en ${coma(h12("ridge_agregados"), 2)}. Ninguna de las dos lo reduce en los horizontes de 1, 3, 6 y 12 meses. Un componente principal de los tres crecimientos da ${coma(h12("pca_ridge"), 2)} a doce meses, frente a ${coma(h12("ridge_agregados"), 2)} de las tres series. La ganancia es la de un factor común, no la de tres señales separadas.</p>
    <p>Nada de esto identifica cuánto sube la tasa si crece M2. Los tres agregados se mueven juntos y el ejercicio es predictivo. El backtest es la pieza para decidir: el bloque monetario mejora el mediano plazo y no el mes siguiente.</p>
    <h2>Limitaciones</h2>
    <p>El modelo no es una regla de política. No proyecta la senda futura de la política ni del dinero. La media y la desviación de cada origen salen de los pares cuyo objetivo ya se observó.</p>
    <p>Las bandas heredan 2020-2023 y son anchas. 2008-2009 no valida el diseño principal. Octubre de 2026 está incompleto. La frecuencia semanal de los agregados no se modeló.</p>`;
}

function csv(filas) {
  return filas.map((fila) => fila.map((celda) => String(celda).replace(".", ",")).join(";")).join("\n");
}

function descargar(nombre, texto) {
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
  enlace.download = nombre;
  enlace.click();
}

function marcarControles() {
  const desde = document.getElementById("desde-idx");
  const hasta = document.getElementById("hasta-idx");
  if (Number(desde.value) > Number(hasta.value)) {
    const activo = document.activeElement;
    if (activo === desde) hasta.value = desde.value;
    else desde.value = hasta.value;
  }
  const meses = document.querySelector('input[name="modo"]:checked').value === "meses";
  document.getElementById("bloque-meses").hidden = !meses;
  document.getElementById("bloque-fecha").hidden = meses;
  const control = document.getElementById("horizonte");
  const salida = document.getElementById("horizonte-valor");
  const pct = (Number(control.value) - Number(control.min)) / (Number(control.max) - Number(control.min));
  salida.textContent = control.value;
  salida.style.left = `calc(${pct * 100}% - 0.7rem)`;
  const fechas = D.panel.fecha;
  const a = Number(document.getElementById("desde-idx").value);
  const b = Number(document.getElementById("hasta-idx").value);
  document.getElementById("desde-etiq").textContent = fechas[Math.min(a, b)];
  document.getElementById("hasta-etiq").textContent = fechas[Math.max(a, b)];
  const n = fechas.length - 1;
  const relleno = document.getElementById("relleno");
  relleno.style.left = `${(Math.min(a, b) / n) * 100}%`;
  relleno.style.width = `${(Math.abs(b - a) / n) * 100}%`;
  const equiv = document.getElementById("equivale");
  equiv.textContent = `Equivale a ${horizonteActual()} meses desde septiembre de 2026.`;
}

function pintar() {
  pendientes.length = 0;
  marcarControles();
  const ui = estado();
  const url = new URL(location.href);
  if (url.searchParams.get("seccion") !== ui.seccion) {
    url.searchParams.set("seccion", ui.seccion);
    history.replaceState(null, "", url);
  }
  const contenido = document.getElementById("contenido");
  if (ui.seccion === "historial") contenido.innerHTML = seccionHistorial();
  else if (ui.seccion === "proyeccion") contenido.innerHTML = seccionProyeccion();
  else if (ui.seccion === "desempeno") contenido.innerHTML = seccionDesempeno();
  else contenido.innerHTML = seccionEstudio();
  const boton = document.getElementById("descarga");
  if (boton) {
    boton.addEventListener("click", () => {
      const cabezas = ["fecha", "horizonte_meses", "proyeccion_tasa", "banda_80_inferior", "banda_80_superior", "banda_95_inferior", "banda_95_superior", "rmse_historico", "mae_historico"];
      const filas = [cabezas, ...window.__tablaProyeccion.map((fila) => [
        fila.fecha, fila.horizonte, fila.proyeccion, fila.banda_80_inferior, fila.banda_80_superior,
        fila.banda_95_inferior, fila.banda_95_superior, fila.rmse_historico, fila.mae_historico,
      ])];
      descargar(`proyeccion_${ui.modelo}.csv`, `\uFEFF${csv(filas)}`);
    });
  }
  dibujarGraficos();
  const metricas = document.getElementById("descarga-metricas");
  if (metricas) {
    metricas.addEventListener("click", () => {
      const claves = ["modelo", "horizonte", "n", "rmse", "mae", "mase", "sesgo", "razon_rmse_paseo", "dm_stat", "dm_pvalue"];
      descargar("metricas_backtest.csv", `\uFEFF${csv([claves, ...D.metricas.map((fila) => claves.map((clave) => fila[clave] ?? ""))])}`);
    });
  }
}

function iniciar() {
  const modelo = document.getElementById("modelo");
  ORDEN.forEach((clave) => {
    const opcion = document.createElement("option");
    opcion.value = clave;
    opcion.textContent = D.nombres[clave];
    modelo.appendChild(opcion);
  });
  modelo.value = "ridge_agregados";
  const fechas = D.panel.fecha;
  const hasta = document.getElementById("hasta-idx");
  hasta.max = String(fechas.length - 1);
  hasta.value = String(fechas.length - 1);
  document.getElementById("desde-idx").max = String(fechas.length - 1);
  const pedido = new URLSearchParams(location.search).get("seccion");
  const radio = pedido && document.querySelector(`input[name="seccion"][value="${pedido}"]`);
  if (radio) radio.checked = true;
  ["modelo", "horizonte", "fecha-final", "desde-idx", "hasta-idx", "politica"].forEach((id) => {
    document.getElementById(id).addEventListener("input", pintar);
    document.getElementById(id).addEventListener("change", pintar);
  });
  document.querySelectorAll('input[name="vista"], input[name="seccion"], input[name="modo"]').forEach((input) => {
    input.addEventListener("change", pintar);
  });
  pintar();
}

iniciar();
