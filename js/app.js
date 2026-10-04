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
let produtoAtivo = 'dbz'; 
let anguloVarredura = 0;
let tempestadeX = 120; 
let tempestadeY = 140; 

// ========================================================
// SISTEMA DE TDS CONFIGURADO PARA 38% DE CHANCE FIXA
// ========================================================
let tonaTerra = false;
let ultimoEstadoCouplet = "0"; // Monitora quando o jogador ativa a rotação

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
    if(produto === 'cc') radarTitle.innerText = "Display Principal: Coeficiente de Correlação (CC)";
}

function atualizarLabels() {
    if (slDbz && lblDbz) lblDbz.innerText = slDbz.value;
    if (slVento && lblVento) lblVento.innerText = slVento.value;
    if (slDesloc && lblDesloc) lblDesloc.innerText = slDesloc.value;
}

function desenharRadar() {
    if (!ctx || !canvas) return;

    ctx.fillStyle = '#000600';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Deslocamento contínuo da supercélula
    const velDesloc = parseFloat(slDesloc.value) * 0.012;
    tempestadeX += velDesloc * 0.65; 
    tempestadeY += velDesloc * 0.35; 

    if (tempestadeX > canvas.width + 80 || tempestadeY > canvas.height + 80) {
        tempestadeX = 40;
        tempestadeY = 60;
        // Ao resetar a célula, desliga o tornado anterior para o próximo teste
        tonaTerra = false; 
    }

    // Grade concêntrica do NEXRAD
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
    const estadoCoupletAtual = seCouplet.value;

    // GATILHO MATEMÁTICO: Roda o sorteio de 38% apenas no momento em que a rotação é ligada
    if (estadoCoupletAtual === "1" && ultimoEstadoCouplet === "0") {
        let sorteio = Math.random(); // Gera um número quebrado entre 0 e 1
        if (sorteio <= 0.38) { // 0.38 equivale a exatamente 38% de chance
            tonaTerra = true; // Tornado confirmado tocando solo e erguendo detritos!
        } else {
            tonaTerra = false; // Rotação ficou apenas em altitude (Funnel Cloud/Sem TDS)
        }
    }
    
    // Se o jogador desligar a rotação, limpa o estado imediatamente
    if (estadoCoupletAtual === "0") {
        tonaTerra = false;
    }
    
    // Salva o estado atual para comparar no próximo ciclo do frame
    ultimoEstadoCouplet = estadoCoupletAtual;

    // Renderização da Supercélula Clássica
    for (let x = Math.floor(tempestadeX - 90); x < tempestadeX + 90; x++) {
        for (let y = Math.floor(tempestadeY - 90); y < tempestadeY + 90; y++) {
            
            let dx = x - tempestadeX;
            let dy = y - tempestadeY;
            let raioOriginal = Math.sqrt(dx * dx + dy * dy);

            if (raioOriginal < 70) {
                let angulo = Math.atan2(dy, dx);
                let raioModificado = raioOriginal;

                if (estadoCoupletAtual === "1") {
                    // Torção em espiral concentrada perto do mesociclone
                    if (raioOriginal < 55) {
                        let efeitoPertoDoMesociclone = (55 - raioOriginal) * 0.065;
                        angulo += efeitoPertoDoMesociclone;
                    }
                    
                    // Inflow Notch assimétrico (Formato de Rim acentuado com gancho)
                    if (angulo > -0.3 && angulo < 1.6) {
                        raioModificado *= 1.7; 
                    }
                    // Linha de instabilidade traseira (Flanking Line)
                    if (angulo > 2.5 && angulo < 3.5) {
                        raioModificado *= 0.85;
                    }
                } else {
                    // Formato convectivo de Rim/Feijão padrão sem rotação
                    if (angulo > 0.8 && angulo < 2.2) {
                        raioModificado *= 1.4;
                    }
                }

                if (raioModificado < 38) {
                    let dbzLocal = dbzMax * (1 - (raioModificado / 38));

                    // Cria o V-Notch na borda dianteira se não houver rotação
                    if (estadoCoupletAtual === "0" && dx > 15 && Math.abs(dy) < 20) {
                        dbzLocal += 8;
                    }

                    if (dbzLocal > 12) {
                        if (produtoAtivo === 'dbz') {
                            ctx.fillStyle = obterCorDbz(dbzLocal);
                        } 
                        else if (produtoAtivo === 'vento') {
                            if (estadoCoupletAtual === "1" && raioOriginal < 12) {
                                // Par de velocidades colado (Velocity Couplet Gate-to-Gate)
                                ctx.fillStyle = (dx > 0) ? '#ff0000' : '#00ff00';
                            } else {
                                ctx.fillStyle = dx < -10 ? '#007700' : '#770000';
                            }
                        } 
                        else if (produtoAtivo === 'cc') {
                            // Se a chance de 38% bateu, renderiza a mancha azul no centro do gancho
                            if (estadoCoupletAtual === "1" && tonaTerra && raioOriginal < 6 && dbzLocal > 45) {
                                ctx.fillStyle = '#00ffff'; // TDS Ativo!
                            } else {
                                ctx.fillStyle = '#990000'; // CC Alto limpo (Chuva uniforme)
                            }
                        }
                        ctx.fillRect(x, y, 1, 1);
                    }
                }
            }
        }
    }

    // Linha de varredura giratória
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
    if (seCouplet.value === "1") {
        // Alerta máximo NWS responde se o tornado de fato gerou detritos nos 38% de chance
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
