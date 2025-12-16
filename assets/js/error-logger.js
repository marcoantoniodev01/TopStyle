/**
 * ERROR LOGGER - TOPSTYLE (VERSÃO COMPLETA)
 * Deve ser carregado no <head> antes de tudo.
 */
(function() {
    // --- SUAS CONFIGURAÇÕES ---
    const SUPABASE_URL = "https://xhzdyatnfaxnvvrllhvs.supabase.co"; 
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoemR5YXRuZmF4bnZ2cmxsaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzc1MjQsImV4cCI6MjA3NDkxMzUyNH0.uQtOn1ywQPogKxvCOOCLYngvgWCbMyU9bXV1hUUJ_Xo";
    // --------------------------

    function sendLog(data) {
        // Evita loop infinito se o próprio envio falhar
        if (data.source_url && data.source_url.includes('error_logs')) return;

        // Usa sendBeacon se disponível (mais garantido ao fechar aba), senão fetch
        const payload = JSON.stringify(data);
        const url = `${SUPABASE_URL}/rest/v1/error_logs`;
        
        if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'application/json' });
            // sendBeacon não suporta headers customizados facilmente para Supabase Auth,
            // então usamos fetch com keepalive para garantir.
        }

        fetch(url, {
            method: 'POST',
            keepalive: true,
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: payload
        }).catch(e => console.warn("Logger offline:", e));
    }

    // 1. Erros Globais de Script (Runtime)
    const oldOnError = window.onerror;
    window.onerror = function(msg, url, line, col, error) {
        if (url && url.includes('chrome-extension')) return; // Ignora extensões

        sendLog({
            message: msg,
            source_url: url || window.location.href,
            line_no: line,
            col_no: col,
            stack_trace: error ? error.stack : null,
            user_agent: navigator.userAgent,
            error_type: 'CRASH'
        });

        if (oldOnError) return oldOnError(msg, url, line, col, error);
    };

    // 2. Erros de Promessa (Async/Await, Fetch falhou)
    window.addEventListener('unhandledrejection', function(e) {
        sendLog({
            message: `Uncaught Promise: ${e.reason ? (e.reason.message || e.reason) : 'Desconhecido'}`,
            source_url: window.location.href,
            stack_trace: e.reason ? e.reason.stack : null,
            user_agent: navigator.userAgent,
            error_type: 'PROMISE'
        });
    });

    // 3. Recursos não encontrados (404 em imagens, scripts, css)
    // 'true' no final ativa a fase de captura, essencial para eventos que não borbulham
    window.addEventListener('error', function(e) {
        // Se for um erro de script, já foi pego pelo window.onerror
        if (e.message) return; 
        
        // Se o elemento for img, script, link, etc.
        const target = e.target;
        const src = target.src || target.href;
        
        if (src) {
            sendLog({
                message: `Recurso não carregou (404): <${target.tagName}>`,
                source_url: src,
                user_agent: navigator.userAgent,
                error_type: 'RESOURCE_404'
            });
        }
    }, true);

    // 4. Interceptar console.error (Erros que o desenvolvedor logou mas não travou o site)
    const originalConsoleError = console.error;
    console.error = function(...args) {
        // Envia para o Supabase
        const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        
        sendLog({
            message: `Console Error: ${msg}`,
            source_url: window.location.href,
            stack_trace: new Error().stack, // Cria um stack fake para saber onde foi chamado
            user_agent: navigator.userAgent,
            error_type: 'CONSOLE'
        });

        // Continua exibindo no console do navegador
        originalConsoleError.apply(console, args);
    };

    console.log("✅ Monitoramento de Erros Iniciado (v2)");
})();