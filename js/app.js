const canvas = document.getElementById('radarCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

// Controles da UI
const slDbz = document.getElementById('sl-dbz');
const slVento = document.getElementById('sl-vento');
const slDesloc = document.getElementById('sl-desloc');
const seCouplet = document.getElementById('se-couplet');

const lblDbz = document.getElementById('lbl-dbz');
const lblVento = document.getElementById('lbl-vento');
const lblDesloc = document.getElementById('lbl-desloc');
const alertsList = document.getElementById('alerts-list');
const radarTitle = document.getElementById('radar-title');

// Botões de Produto
const btnDbz = document.getElementById('btn-dbz');
const btnVento = document.getElementById('btn-vento');
const btnCc = document.getElementById('btn-cc');

// Variáveis de Estado e Movimento
let produtoAtivo = 'dbz'; // Pode ser: dbz, vento, cc
let anguloVarredura = 0;
let tempestadeX = 150; // Posição inicial X
let tempestadeY = 120; // Posição inicial Y

// Gerenciador de cliques nos botões de produto
if(btnDbz && btnVento && btnCc) {
    btnDbz.addEventListener('click', () => alternarProduto('dbz', btnDbz));
    btnVento.addEventListener('click', () => alternarProduto('vento', btnVento));
    btnCc.addEventListener('click', () => alternarProduto('cc', btnCc));
}

function alternarProduto(produto, botaoAtivo) {
    produtoAtivo = produto;
    [btnDbz, btnVento, btnCc].forEach(btn => {
        btn.style.background = '#222';
        btn.style.color = '#fff';
        btn.style.fontWeight = 'normal';
        btn.style.border = '1px solid #444';
    });
    botaoAtivo.style.background = '#00ff00';
    botaoAtivo.style.color = '#000';
    botaoAtivo.style.fontWeight = 'bold';
    botaoAtivo.style.border = 'none';

    if(produto === 'dbz') radarTitle.innerText = "Display Principal: Refletividade (dBZ)";
    if(produto === 'vento') radarTitle.innerText = "Display Principal: Velocidade Base (mph)";
    if(produto === 'cc') radarTitle.innerText = "Display Principal: Correlação (CC)";
}

function atualizarLabels() {
    if (slDbz && lblDbz) lblDbz.innerText = slDbz.value;
    if (slVento && lblVento) lblVento.innerText = slVento.value;
    if (slDesloc && lblDesloc) lblDesloc.innerText = slDesloc.value;
}

function desenharRadar() {
    if (!ctx || !canvas) return;

    // Fundo do radar
    ctx.fillStyle = '#000600';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Movimento Contínuo (A tempestade anda de verdade baseada no slider!)
    const velDesloc = parseFloat(slDesloc.value) * 0.015;
    tempestadeX += velDesloc * 0.6; // Desloca para Leste
    tempestadeY += velDesloc * 0.3; // Desloca para Sul

    // Reseta a posição se sair totalmente da tela redonda
    if (tempestadeX > canvas.width + 60 || tempestadeY > canvas.height + 60) {
        tempestadeX = 40;
        tempestadeY = 60;
    }

    // Desenha anéis concêntricos do radar
    ctx.strokeStyle = '#002200';
    ctx.lineWidth = 1;
    for (let r = 45; r < cx; r += 45) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, canvas.height);
    ctx.moveTo(0, cy); ctx.lineTo(canvas.width, cy);
    ctx.stroke();

    const dbzMax = parseInt(slDbz.value);
    const ventoMax = parseInt(slVento.value);
    const temCouplet = seCouplet.value === "1";

    // Processamento de pixels da tempestade
    for (let x = Math.floor(tempestadeX - 80); x < tempestadeX + 80; x++) {
        for (let y = Math.floor(tempestadeY - 80); y < tempestadeY + 80; y++) {
            
            let dx = x - tempestadeX;
            let dy = y - tempestadeY;
            let raioOriginal = Math.sqrt(dx * dx + dy * dy);

            if (raioOriginal < 60) {
                let angulo = Math.atan2(dy, dx);
                let raioModificado = raioOriginal;

                if (temCouplet) {
                    // MATEMÁTICA DO GANCHO EM ESPIRAL (Fim da Lua Crescente)
                    let torcao = (60 - raioOriginal) * 0.055;
                    angulo += torcao;
                    
                    // Inflow Notch (Corta e molda a entrada de ar do gancho)
                    if (angulo > -0.1 && angulo < 1.9) {
                        raioModificado *= 1.55; 
                    }
                } else {
                    // MATEMÁTICA DO RIM (Fim da Bola Perfeita)
                    if (angulo > 0.8 && angulo < 2.3) {
                        raioModificado *= 1.3;
                    }
                }

                // Se o pixel processado estiver dentro do limite físico, renderiza
                if (raioModificado < 36) {
                    let dbzLocal = dbzMax * (1 - (raioModificado / 36));

                    if (dbzLocal > 12) {
                        // EXIBE O PRODUTO SELECIONADO PELO BOTÃO
                        if (produtoAtivo === 'dbz') {
                            ctx.fillStyle = obterCorDbz(dbzLocal);
                        } 
                        else if (produtoAtivo === 'vento') {
                            if (temCouplet && raioOriginal < 15) {
                                // Dipolo de velocidade Gate-to-Gate (Verde entra, Vermelho sai)
                                ctx.fillStyle = (dx > 0) ? '#ff0000' : '#00ff00';
                            } else {
                                ctx.fillStyle = dx < 0 ? '#007700' : '#770000';
                            }
                        } 
                        else if (produtoAtivo === 'cc') {
                            // Se tiver tornado tocando o chão no miolo do gancho -> Queda de CC (TDS)
                            if (temCouplet && raioOriginal < 7 && dbzLocal > 46) {
                                ctx.fillStyle = '#00ffff'; // Ciano (Detritos coletados)
                            } else {
                                ctx.fillStyle = '#990000'; // Vermelho Escuro (Precipitação uniforme)
                            }
                        }
                        ctx.fillRect(x, y, 1, 1);
                    }
                }
            }
        }
    }

    // Linha de varredura giratória por cima
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
    const temCouplet = seCouplet.value === "1";

    let alertasHTML = [];

    if (vento >= 58 || dbz > 55) {
        alertasHTML.push('<div class="alerta severe">⚠️ SEVERE THUNDERSTORM WARNING</div>');
    }
    if (desloc < 20) {
        alertasHTML.push('<div class="alerta flood">🌊 FLASH FLOOD WARNING</div>');
    }
    if (temCouplet) {
        if (vento >= 70 && dbz > 60) {
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
