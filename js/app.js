const canvas = document.getElementById('radarCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

const slDbz = document.getElementById('sl-dbz');
const slVento = document.getElementById('sl-vento');
const slDesloc = document.getElementById('sl-desloc');
const seCouplet = document.getElementById('se-couplet');

const lblDbz = document.getElementById('lbl-dbz');
const lblVento = document.getElementById('lbl-vento');
const lblDesloc = document.getElementById('lbl-desloc');
const alertsList = document.getElementById('alerts-list');
const radarTitle = document.getElementById('radar-title');

const btnDbz = document.getElementById('btn-dbz');
const btnVento = document.getElementById('btn-vento');
const btnCc = document.getElementById('btn-cc');

let produtoAtivo = 'dbz'; 
let anguloVarredura = 0;
let tempestadeX = 140; 
let tempestadeY = 160; 

let tonaTerra = false;
let ultimoEstadoCouplet = "0"; 

if (btnDbz && btnVento && btnCc) {
    btnDbz.addEventListener('click', function() { alternarProduto('dbz', btnDbz); });
    btnVento.addEventListener('click', function() { alternarProduto('vento', btnVento); });
    btnCc.addEventListener('click', function() { alternarProduto('cc', btnCc); });
}

function alternarProduto(produto, botaoAtivo) {
    produtoAtivo = produto;
    [btnDbz, btnVento, btnCc].forEach(function(btn) {
        if (btn) {
            btn.style.background = '#222';
            btn.style.color = '#fff';
            btn.style.fontWeight = 'normal';
            btn.style.border = '1px solid #444';
        }
    });
    if (botaoAtivo) {
        botaoAtivo.style.background = '#00ff00';
        botaoAtivo.style.color = '#000';
        botaoAtivo.style.fontWeight = 'bold';
        botaoAtivo.style.border = 'none';
    }

    if (produto === 'dbz' && radarTitle) radarTitle.innerText = "Display Principal: Refletividade (dBZ)";
    if (produto === 'vento' && radarTitle) radarTitle.innerText = "Display Principal: Velocidade Base (mph)";
    if (produto === 'cc' && radarTitle) radarTitle.innerText = "Display Principal: Coeficiente de Correlação (CC)";
}

function atualizarLabels() {
    if (slDbz && lblDbz) lblDbz.innerText = slDbz.value;
    if (slVento && lblVento) lblVento.innerText = slVento.value;
    if (slDesloc && lblDesloc) lblDesloc.innerText = slDesloc.value;
}

function desenharGrade(contexto, width, height) {
    if (!contexto) return;
    contexto.fillStyle = '#000600';
    contexto.fillRect(0, 0, width, height);

    contexto.strokeStyle = '#002200';
    contexto.lineWidth = 1;
    for (let r = 45; r < width / 2; r += 45) {
        contexto.beginPath();
        contexto.arc(width / 2, height / 2, r, 0, 2 * Math.PI);
        contexto.stroke();
    }
    contexto.beginPath();
    contexto.moveTo(width / 2, 0); contexto.lineTo(width / 2, height);
    contexto.moveTo(0, height / 2); contexto.lineTo(width, height / 2);
    contexto.stroke();
}

function desenharRadar() {
    if (!ctx || !canvas) return;

    desenharGrade(ctx, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const velDesloc = slDesloc ? parseFloat(slDesloc.value) * 0.015 : 0.3;
    tempestadeX += velDesloc * 0.6; 
    tempestadeY += velDesloc * 0.3; 

    if (tempestadeX > canvas.width + 100 || tempestadeY > canvas.height + 100) {
        tempestadeX = 40;
        tempestadeY = 60;
        tonaTerra = false; 
    }

    const dbzMax = slDbz ? parseInt(slDbz.value) : 45;
    const ventoMax = slVento ? parseInt(slVento.value) : 40;
    const estadoCoupletAtual = seCouplet ? seCouplet.value : "0";

    if (estadoCoupletAtual === "1" && ultimoEstadoCouplet === "0") {
        if (Math.random() <= 0.38) { 
            tonaTerra = true; 
        } else {
            tonaTerra = false; 
        }
    }
    if (estadoCoupletAtual === "0") tonaTerra = false;
    ultimoEstadoCouplet = estadoCoupletAtual;

    const mesoX = tempestadeX + 15;
    const mesoY = tempestadeY + 25;

    for (let x = Math.floor(tempestadeX - 90); x < tempestadeX + 120; x++) {
        for (let y = Math.floor(tempestadeY - 90); y < tempestadeY + 120; y++) {
            
            let dxCorpo = x - tempestadeX;
            let dyCorpo = y - tempestadeY;
            let anguloCorpo = Math.atan2(dyCorpo, dxCorpo);
            let raioCorpo = Math.sqrt(dxCorpo * dxCorpo + dyCorpo * dyCorpo);

            let distorcaoRim = 1.0;
            if (anguloCorpo > -1.5 && anguloCorpo < 0.5) distorcaoRim = 0.7; 
            if (anguloCorpo > 1.0 && anguloCorpo < 2.5) distorcaoRim = 1.6;  

            let naSupercelula = (raioCorpo * distorcaoRim) < 45;
            let dbzLocal = 0;

            if (naSupercelula) {
                dbzLocal = dbzMax * (1 - (raioCorpo * distorcaoRim / 45));
            }

            let noGancho = false;
            if (estadoCoupletAtual === "1") {
                let dxMeso = x - mesoX;
                let dyMeso = y - mesoY;
                let raioMeso = Math.sqrt(dxMeso * dxMeso + dyMeso * dyMeso);
                let anguloMeso = Math.atan2(dyMeso, dxMeso);

                if (raioMeso > 8 && raioMeso < 24) {
                    let anguloGanchoDesejado = (raioMeso * 0.18) - 2.4; 
                    let diferencaAngulo = Math.abs(anguloMeso - anguloGanchoDesejado);
                    
                    if (diferencaAngulo < 0.35) {
                        noGancho = true;
                        let dbzGancho = dbzMax * 0.85 * (1 - (raioMeso / 30));
                        if (dbzGancho > dbzLocal) dbzLocal = dbzGancho;
                    }
                }
                
                if (raioMeso <= 8) {
                    noGancho = true;
                    dbzLocal = dbzMax * 0.95; 
                }
            }

            if ((naSupercelula || noGancho) && dbzLocal > 12) {
                let dxMeso = x - mesoX;
                let raioMeso = Math.sqrt(dxMeso * dxMeso + (y - mesoY) * (y - mesoY));

                if (produtoAtivo === 'dbz') {
                    ctx.fillStyle = obterCorDbz(dbzLocal);
                } 
                else if (produtoAtivo === 'vento') {
                    if (estadoCoupletAtual === "1" && raioMeso < 12) {
                        ctx.fillStyle = (dxMeso > 0) ? '#ff0000' : '#00ff00'; 
                    } else {
                        ctx.fillStyle = dxCorpo < 0 ? '#006600' : '#660000';
                    }
                } 
                else if (produtoAtivo === 'cc') {
                    if (estadoCoupletAtual === "1" && tonaTerra && raioMeso < 6 && dbzLocal > 45) {
                        ctx.fillStyle = '#00ffff'; 
                    } else {
                        ctx.fillStyle = '#990000'; 
                    }
                }
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }

    ctx.strokeStyle = 'rgba(0, 255, 0, 0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + cx * Math.cos(anguloVarredura), cy + cy * Math.sin(anguloVarredura));
    ctx.stroke();

    anguloVarredura += 0.03;
}

function obterCorDbz(dbz) {
    if (dbz > 55) return '#ff00ff'; 
    if (dbz > 45) return '#ff0000'; 
    if (dbz > 30) return '#ffff00'; 
    return '#00ff00';                
}

function processarAlertas() {
    if (!slDbz || !slVento || !slDesloc || !alertsList) return;
    const dbz = parseInt(slDbz.value);
    const vento = parseInt(slVento.value);
    const desloc = parseInt(slDesloc.value);

    let alertasHTML = [];

    if (vento >= 58 || dbz > 55) {
        alertasHTML.push('<div class="alerta severe">⚠️ SEVERE THUNDERSTORM WARNING</div>');
    }
    if (desloc < 20) {
        alertasHTML.push('<div class="alerta flood">🌊 FLASH FLOOD WARNING</div>');
    }
    if (seCouplet && seCouplet.value === "1") {
        if (tonaTerra && vento >= 70 && dbz > 60) {
            alertasHTML.push('<div class="alerta tornado" style="background:#4c0519; border:2px solid #ff0000;">🚨 PDS TORNADO WARNING (OBSERVED TDS)</div>');
        } else {
            alertasHTML.push('<div class="alerta tornado">🌪️ TORNADO WARNING (RADAR INDICATED)</div>');
        }
    }

    if (alertasHTML.length === 0) {
        alertsList.innerHTML = '<span style="color: #10b981;">Atmosfera Monitorada. Sem avisos.</span>';
    } else {
        alertsList.innerHTML = alertasHTML.join('');
    }
}

function loopJogo() {
    atualizarLabels();
    processarAlertas();
    desenharRadar();
    requestAnimationFrame(loopJogo);
}

loopJogo();
