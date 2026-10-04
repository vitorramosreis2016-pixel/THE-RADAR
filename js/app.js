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
let tempestadeX = 140; 
let tempestadeY = 160; 

// CONFIGURAÇÃO DO TDS: Chance exata de 38% 
let tonaTerra = false; 
let ultimoEstadoCouplet = "0"; 

if (btnDbz && btnVento && btnCc) { 
    btnDbz.addEventListener('click', () => alternarProduto('dbz', btnDbz)); 
    btnVento.addEventListener('click', () => alternarProduto('vento', btnVento)); 
    btnCc.addEventListener('click', () => alternarProduto('cc', btnCc)); 
} 

function alternarProduto(produto, botaoAtivo) { 
    produtoAtivo = produto; 
    [btnDbz, btnVento, btnCc].forEach(btn => { 
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

    if (radarTitle) {
        if (produto === 'dbz') radarTitle.innerText = "Display Principal: Refletividade (dBZ)"; 
        if (produto === 'vento') radarTitle.innerText = "Display Principal: Velocidade Base (mph)"; 
        if (produto === 'cc') radarTitle.innerText = "Display Principal: Coeficiente de Correlação (CC)"; 
    }
} 

function atualizarLabels() { 
    if (slDbz && lblDbz) lblDbz.innerText = slDbz.value; 
    if (slVento && lblVento) lblVento.innerText = slVento.value; 
    if (slDesloc && lblDesloc) lblDesloc.innerText = slDesloc.value; 
} 

function desenharGrade(ctx, width, height) { 
    if (!ctx) return; 
    ctx.fillStyle = '#000600'; 
    ctx.fillRect(0, 0, width, height); 
    ctx.strokeStyle = '#002200'; 
    ctx.lineWidth = 1; 
    
    for (let r = 45; r < width / 2; r += 45) { 
        ctx.beginPath(); 
        ctx.arc(width / 2, height / 2, r, 0, 2 * Math.PI); 
        ctx.stroke(); 
    } 
    
    ctx.beginPath(); 
    ctx.moveTo(width / 2, 0); 
    ctx.lineTo(width / 2, height); 
    ctx.moveTo(0, height / 2); 
    ctx.lineTo(width, height / 2); 
    ctx.stroke(); 
} 

function desenharRadar() { 
    if (!ctx || !canvas) return; 
    
    // Inicializa a tela de varredura 
    desenharGrade(ctx, canvas.width, canvas.height); 
    const cx = canvas.width / 2; 
    const cy = canvas.height / 2; 

    // Deslocamento contínuo real da supercélula pela tela 
    const velDesloc = slDesloc ? parseFloat(slDesloc.value) * 0.015 : 0; 
    tempestadeX += velDesloc * 0.6; 
    tempestadeY += velDesloc * 0.3; 

    if (tempestadeX > canvas.width + 100 || tempestadeY > canvas.height + 100) { 
        tempestadeX = 40; 
        tempestadeY = 60; 
        tonaTerra = false; 
    } 

    const dbzMax = slDbz ? parseInt(slDbz.value) : 0; 
    const ventoMax = slVento ? parseInt(slVento.value) : 0; 
    const estadoCoupletAtual = seCouplet ? seCouplet.value : "0"; 

    // Sorteio cirúrgico de 38% executado apenas na ativação do botão 
    if (estadoCoupletAtual === "1" && ultimoEstadoCouplet === "0") { 
        if (Math.random() <= 0.38) { 
            tonaTerra = true; 
        } else { 
            tonaTerra = false; 
        } 
    } 
    if (estadoCoupletAtual === "0") tonaTerra = false; 
    ultimoEstadoCouplet = estadoCoupletAtual; 

    // Centro do mesociclone (o ponto de rotação extrema) 
    const mesoX = tempestadeX + 15; 
    const mesoY = tempestadeY + 25; 

    // Varredura da área convectiva 
    for (let x = Math.floor(tempestadeX - 90); x < tempestadeX + 120; x++) { 
        for (let y = Math.floor(tempestadeY - 90); y < tempestadeY + 120; y++) { 
            
            // 1. EQUAÇÃO DO CORPO PRINCIPAL DA SUPERCÉLULA (Formato assimétrico de rim) 
            let dxCorpo = x - tempestadeX; 
            let dyCorpo = y - tempestadeY; 
            let anguloCorpo = Math.atan2(dyCorpo, dxCorpo); 
            let raioCorpo = Math.sqrt(dxCorpo * dxCorpo + dyCorpo * dyCorpo); 
            
            // Deforma a massa de chuva empurrando-a para Nordeste/Leste (FFD real) 
            let distorcaoRim = 1.0; 
            if (anguloCorpo > -1.5 && anguloCorpo < 0.5) distorcaoRim = 0.7; 
            
            // Expande a chuva de granizo 
            if (anguloCorpo > 1.0 && anguloCorpo < 2.5) distorcaoRim = 1.6; 
            
            // Cavidade do ar limpo (Inflow) 
            let naSupercelula = (raioCorpo * distorcaoRim) < 45; 
            let dbzLocal = 0; 
            if (naSupercelula) { 
                dbzLocal = dbzMax * (1 - (raioCorpo * distorcaoRim / 45)); 
            } 

            // 2. EQUAÇÃO DA CAUDA DO GANCHO (Ativada apenas com a rotação ligada) 
            let noGancho = false; 
            if (estadoCoupletAtual === "1") { 
                let dxMeso = x - mesoX; 
                let dyMeso = y - mesoY; 
                let raioMeso = Math.sqrt(dxMeso * dxMeso + dyMeso * dyMeso); 
                let anguloMeso = Math.atan2(dyMeso, dxMeso); 
                
                // Cria uma linha fina espiralada curvando em gancho ao redor do mesociclone 
                if (raioMeso > 8 && raioMeso < 24) { 
                    let anguloGanchoDesejado = (raioMeso * 0.18) - 2.4; 
                    let diferencaAngulo = Math.abs(anguloMeso - anguloGanchoDesejado); 
                    if (diferencaAngulo < 0.35) { 
                        noGancho = true; 
                        // Alimenta o gancho com alta refletividade vinda do núcleo 
                        let dbzGancho = dbzMax * 0.85 * (1 - (raioMeso / 30)); 
                        if (dbzGancho > dbzLocal) dbzLocal = dbzGancho; 
                    } 
                } 
                
                // Núcleo central do tornado (Bounded Weak Echo Region - BWER) 
                if (raioMeso <= 8) { 
                    noGancho = true; 
                    dbzLocal = dbzMax * 0.95; 
                } 
            } 

            // Renderiza o pixel se pertencer a estrutura clássica 
            if ((naSupercelula || noGancho) && dbzLocal > 12) { 
                let dxMeso = x - mesoX; 
                let raioMeso = Math.sqrt(dxMeso * dxMeso + (y - mesoY) * (y - mesoY)); 
                
                if (produtoAtivo === 'dbz') { 
                    ctx.fillStyle = obterCorDbz(dbzLocal); 
                } else if (produtoAtivo === 'vento') { 
                    // O par de cores fica focado de forma cirúrgica apenas no miolo do gancho 
                    if (estadoCoupletAtual === "1" && raioMeso < 12) { 
                        ctx.fillStyle = (dxMeso > 0) ? '#ff0000' : '#00ff00'; // Dipolo puro 
                    } else { 
                        ctx.fillStyle = dxCorpo < 0 ? '#006600' : '#660000'; 
                    } 
                } else if (produtoAtivo === 'cc') { 
                    // Sorteio de TDS: Só reduz o CC no miolo do gancho se bater os 38% de chance 
                    if (estadoCoupletAtual === "1" && tonaTerra && raioMeso < 6 && dbzLocal > 45) { 
                        ctx.fillStyle = '#00ffff'; // TDS ativado na sorte 
                    } else { 
                        ctx.fillStyle = '#990000'; // CC alto de chuva limpa 
                    } 
                } 
                ctx.fillRect(x, y, 1, 1); 
            } 
        } 
    } 

    // Linha de varredura giratória clássica do NEXRAD 
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.18)'; 
    ctx.lineWidth = 2; 
    ctx.beginPath(); 
    ctx.moveTo(cx, cy); 
    ctx.lineTo(cx + cx * Math.cos(anguloVarredura), cy + cy * Math.sin(anguloVarredura)); 
    ctx.stroke(); 
    anguloVarredura += 0.03; 
} 

function obterCorDbz(dbz) { 
    if (dbz > 55) return '#ff00ff'; // Roxo 
    if (dbz > 45) return '#ff0000'; // Vermelho 
    if (dbz > 30) return '#ffff00'; // Amarelo 
    return '#00ff00'; // Verde 
} 

function processarAlertas() { 
    if (!slDbz || !slVento || !slDesloc || !alertsList) return; 
    const dbz = parseInt(slDbz.value); 
    const vento = parseInt(slVento.value); 
    const desloc = parseInt(slDesloc.value); 
    let alertasHTML = []; 
    
    if (vento >= 58 || dbz > 55) { 
        alertasHTML.push('<div>⚠️ SEVERE THUNDERSTORM WARNING</div>'); 
    } 
    if (desloc < 20) { 
        alertasHTML.push('<div>🌊 FLASH FLOOD WARNING</div>'); 
    } 
    if (seCouplet && seCouplet.value === "1") { 
        if (tonaTerra && vento >= 70 && dbz > 60) { 
            alertasHTML.push('<div>🚨 PDS TORNADO WARNING (OBSERVED TDS)</div>'); 
        } else { 
            alertasHTML.push('<div>🌪️ TORNADO WARNING (RADAR INDICATED)</div>'); 
        } 
    } 
    
    if (alertasHTML.length === 0) { 
        alertsList.innerHTML = '<div>Atmosfera Monitorada. Sem avisos.</div>'; 
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

// Inicializa a simulação
loopJogo();
