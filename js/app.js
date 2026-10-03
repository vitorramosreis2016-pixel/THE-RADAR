const canvas = document.getElementById('radarCanvas');
const ctx = canvas.getContext('2d');

const slDbz = document.getElementById('sl-dbz');
const slVento = document.getElementById('sl-vento');
const slDesloc = document.getElementById('sl-desloc');
const seCouplet = document.getElementById('se-couplet');

const lblDbz = document.getElementById('lbl-dbz');
const lblVento = document.getElementById('lbl-vento');
const lblDesloc = document.getElementById('lbl-desloc');
const alertsList = document.getElementById('alerts-list');

function processarAlertas() {
    if (!slDbz || !slVento || !slDesloc || !seCouplet) return;

    const dbz = parseInt(slDbz.value);
    const vento = parseInt(slVento.value);
    const desloc = parseInt(slDesloc.value);
    const temCouplet = seCouplet.value === "1";

    let alertasHTML = [];

    if (vento >= 58 || dbz > 55) {
        alertasHTML.push('<div class="alerta severe">⚠️ SEVERE THUNDERSTORM WARNING</div>');
    }
    if (desloc < 20) {
        alertasHTML.push('<div class="alerta flood">🌊 FLASH FLOOD WARNING</div>');
    }
    if (temCouplet) {
        alertasHTML.push('<div class="alerta tornado">🌪️ TORNADO WARNING</div>');
    }

    if (alertasHTML.length === 0) {
        alertsList.innerHTML = '<span style="color: #10b981;">Atmosfera Monitorada. Sem avisos.</span>';
    } else {
        alertsList.innerHTML = alertasHTML.join('');
    }
}

function atualizarLabels() {
    if (!slDbz || !slVento || !slDesloc) return;
    lblDbz.innerText = slDbz.value;
    lblVento.innerText = slVento.value;
    lblDesloc.innerText = slDesloc.value;
}

let anguloVarredura = 0;

function desenharRadar() {
    if (!canvas) return;

    ctx.fillStyle = '#000800';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centroX = canvas.width / 2;
    const centroY = canvas.height / 2;

    ctx.strokeStyle = '#002600';
    ctx.lineWidth = 1;
    for (let r = 40; r < centroX; r += 40) {
        ctx.beginPath();
        ctx.arc(centroX, centroY, r, 0, 2 * Math.PI);
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(centroX, 0); ctx.lineTo(centroX, canvas.height);
    ctx.moveTo(0, centroY); ctx.lineTo(canvas.width, centroY);
    ctx.stroke();

    const dbz = parseInt(slDbz.value);
    if (dbz > 15) {
        ctx.fillStyle = obterCorRadar(dbz);
        ctx.beginPath();
        if (seCouplet.value === "1") {
            ctx.arc(centroX + 50, centroY - 50, 30, 0, Math.PI * 1.3);
        } else {
            ctx.arc(centroX + 50, centroY - 50, 35, 0, 2 * Math.PI);
        }
        ctx.fill();
    }

    ctx.strokeStyle = 'rgba(0, 255, 0, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centroX, centroY);
    ctx.lineTo(
        centroX + centroX * Math.cos(anguloVarredura),
        centroY + centroY * Math.sin(anguloVarredura)
    );
    ctx.stroke();

    anguloVarredura += 0.025;
}

function obterCorRadar(dbz) {
    if (dbz > 55) return '#ff00ff';
    if (dbz > 45) return '#ff0000';
    if (dbz > 30) return '#ffff00';
    return '#00ff00';
}

function loopJogo() {
    atualizarLabels();
    processarAlertas();
    desenharRadar();
    requestAnimationFrame(loopJogo);
}

loopJogo();