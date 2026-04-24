class CalendarioMarinaDark {
    constructor() {
        this.mesAtual = new Date().getMonth();
        this.anoAtual = new Date().getFullYear();
        this.filtroDepartamento = "Todos";
        this.eventos = {};
        this.departamentos = {};
        this.contadores = {};
        this.totalEventos = 0;
        this.dataSelecionada = "";

        this.init();
    }

    async init() {
        this.cacheElements();
        this.bindEvents();
        await this.showLoading();
        await this.loadConfig();
        await this.loadData();
        this.hideLoading();
        this.renderAll();
        this.updateToday();
    }

    cacheElements() {
        this.loadingScreen       = document.getElementById("loadingScreen");
        this.filtroSelect        = document.getElementById("filtroDepartamento");
        this.mesAnteriorBtn      = document.getElementById("mesAnterior");
        this.mesProximoBtn       = document.getElementById("mesProximo");
        this.mesAno              = document.getElementById("mesAno");
        this.calendarioGrid      = document.getElementById("calendarioGrid");
        this.modalViz            = document.getElementById("modalVisualizar");
        this.modalAdd            = document.getElementById("modalAdicionar");
        this.modalDataViz        = document.getElementById("modalDataViz");
        this.modalBodyViz        = document.getElementById("modalBodyViz");
        this.modalContadorViz    = document.getElementById("modalContadorViz");
        this.formEvento          = document.getElementById("formEvento");
        this.eventoDataInput     = document.getElementById("eventoData");
        this.modalTituloAdd      = document.getElementById("modalTituloAdd");
        this.addDepartamento     = document.getElementById("addDepartamento");
        this.addTitulo           = document.getElementById("addTitulo");
        this.addHora             = document.getElementById("addHora");
        this.addDuracao          = document.getElementById("addDuracao");
        this.addLocal            = document.getElementById("addLocal");
        this.addDescricao        = document.getElementById("addDescricao");
        this.contadoresContainer = document.getElementById("contadores");
        this.dataHoje            = document.getElementById("dataHoje");
        this.totalEventosEl      = document.getElementById("totalEventos");
        this.resumoMes           = document.getElementById("resumoMes");
        this.btnHoje             = document.getElementById("btnHoje");
        this.toastContainer      = document.getElementById("toastContainer");
        this.fechars             = document.querySelectorAll(".fechar-modal");
        this.overlays            = document.querySelectorAll(".modal-overlay");
        this.btnCancelarAdd      = document.getElementById("btnCancelarAdd");
    }

    bindEvents() {
        this.filtroSelect.addEventListener("change", (e) => {
            this.filtroDepartamento = e.target.value || "Todos";
            this.loadData().then(() => this.renderAll());
        });

        this.mesAnteriorBtn.addEventListener("click", () => this.changeMonth(-1));
        this.mesProximoBtn.addEventListener("click",  () => this.changeMonth(1));
        this.btnHoje.addEventListener("click",        () => this.goToday());

        this.formEvento.addEventListener("submit", (e) => this.createEvent(e));
        this.btnCancelarAdd.addEventListener("click", () => this.closeModals());

        this.fechars.forEach(btn => btn.addEventListener("click", () => this.closeModals()));
        this.overlays.forEach(overlay => overlay.addEventListener("click", () => this.closeModals()));

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") this.closeModals();
        });
    }

    showLoading() {
        return new Promise(resolve => setTimeout(resolve, 1000));
    }

    hideLoading() {
        this.loadingScreen.style.opacity = "0";
        setTimeout(() => {
            this.loadingScreen.style.display = "none";
        }, 500);
    }

    async loadConfig() {
        try {
            const response = await fetch("/api/config");
            if (!response.ok) throw new Error("Falha ao carregar config");
            const config = await response.json();
            this.departamentosList = config.departamentos || [];

            const selects = [this.filtroSelect, this.addDepartamento];
            selects.forEach(select => {
                const currentValue = select.value;
                select.innerHTML = "";

                if (select === this.filtroSelect) {
                    const opt = document.createElement("option");
                    opt.value = "Todos";
                    opt.textContent = "👥 Todos";
                    select.appendChild(opt);
                } else {
                    const opt = document.createElement("option");
                    opt.value = "";
                    opt.textContent = "Selecione...";
                    select.appendChild(opt);
                }

                this.departamentosList.forEach(dep => {
                    const option = document.createElement("option");
                    option.value = dep;
                    option.textContent = dep;
                    select.appendChild(option);
                });

                select.value = currentValue || (select === this.filtroSelect ? "Todos" : "");
            });
        } catch (error) {
            console.error("Erro ao carregar config:", error);
            this.departamentosList = [];
        }
    }

    async loadData() {
        try {
            const params = new URLSearchParams({
                mes: `${this.anoAtual}-${String(this.mesAtual + 1).padStart(2, "0")}`,
                departamento: this.filtroDepartamento
            });

            const response = await fetch(`/api/eventos?${params}`);
            if (!response.ok) throw new Error("Falha ao carregar eventos");
            const data = await response.json();

            this.eventos      = data.eventos       || {};
            this.departamentos = data.departamentos || {};
            this.contadores   = data.contadores    || {};
            this.totalEventos = data.total_eventos || 0;
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            this.eventos      = {};
            this.departamentos = {};
            this.contadores   = {};
            this.totalEventos = 0;
        }
    }

    async changeMonth(direction) {
        this.calendarioGrid.classList.add("slide-left");

        this.mesAtual += direction;
        if (this.mesAtual > 11) {
            this.mesAtual = 0;
            this.anoAtual++;
        } else if (this.mesAtual < 0) {
            this.mesAtual = 11;
            this.anoAtual--;
        }

        await this.loadData();
        this.renderAll();

        setTimeout(() => {
            this.calendarioGrid.classList.remove("slide-left");
        }, 500);
    }

    goToday() {
        const today = new Date();
        if (this.mesAtual !== today.getMonth() || this.anoAtual !== today.getFullYear()) {
            this.mesAtual = today.getMonth();
            this.anoAtual = today.getFullYear();
            this.loadData().then(() => {
                this.renderAll();
                this.toast("🗓️ Voltou para hoje!");
            });
        } else {
            this.toast("🗓️ Você já está no mês atual!");
        }
    }

    renderCalendar() {
        this.calendarioGrid.innerHTML = "";
        const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

        diasSemana.forEach(dia => {
            const div = document.createElement("div");
            div.className = "dia-semana";
            div.textContent = dia;
            this.calendarioGrid.appendChild(div);
        });

        const primeiroDiaMes = new Date(this.anoAtual, this.mesAtual, 1);
        const dataInicio = new Date(primeiroDiaMes);
        dataInicio.setDate(dataInicio.getDate() - primeiroDiaMes.getDay());

        for (let i = 0; i < 42; i++) {
            const dataAtual = new Date(dataInicio);
            dataInicio.setDate(dataInicio.getDate() + 1);

            // Constrói dataStr manualmente para evitar problemas de timezone
            const ano = dataAtual.getFullYear();
            const mes = String(dataAtual.getMonth() + 1).padStart(2, "0");
            const dia = String(dataAtual.getDate()).padStart(2, "0");
            const dataStr = `${ano}-${mes}-${dia}`;

            const diaBtn = document.createElement("button");
            diaBtn.className = "dia";
            diaBtn.type = "button";

            if (dataAtual.getMonth() !== this.mesAtual) {
                diaBtn.classList.add("vazio");
            } else {
                diaBtn.textContent = dataAtual.getDate();

                if (this.isToday(dataAtual)) {
                    diaBtn.classList.add("hoje");
                }

                const eventosDia      = this.eventos[dataStr] || [];
                const eventosFiltrados = this.filterEvents(eventosDia);

                if (eventosFiltrados.length > 0) {
                    diaBtn.classList.add("eventos");
                    if (eventosFiltrados.length > 1) {
                        diaBtn.classList.add("multi-eventos");
                    }
                    diaBtn.setAttribute("title", `${eventosFiltrados.length} evento(s)`);
                    diaBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        this.openViewModal(dataStr, eventosFiltrados, dataAtual);
                    });
                } else {
                    diaBtn.classList.add("adicionar");
                    diaBtn.setAttribute("title", "Clique para adicionar evento");
                    diaBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        this.openAddModal(dataStr, dataAtual);
                    });
                }
            }

            this.calendarioGrid.appendChild(diaBtn);
        }
    }

    isToday(data) {
        const hoje = new Date();
        return data.getFullYear() === hoje.getFullYear() &&
               data.getMonth()   === hoje.getMonth()   &&
               data.getDate()    === hoje.getDate();
    }

    filterEvents(eventos) {
        if (this.filtroDepartamento === "Todos") return eventos;
        return eventos.filter(e => e.departamento === this.filtroDepartamento);
    }

    openViewModal(dataStr, eventos, dataObj) {
        const dataFormatada = dataObj.toLocaleDateString("pt-BR", {
            weekday: "long",
            year:    "numeric",
            month:   "long",
            day:     "numeric"
        });

        this.modalDataViz.textContent    = dataFormatada;
        this.modalContadorViz.textContent = `${eventos.length} evento(s)`;

        this.modalBodyViz.innerHTML = eventos.map(evento => `
            <div class="evento-item" style="border-left-color: ${this.departamentos[evento.departamento] || "#6366f1"}">
                <div class="evento-cor" style="background-color: ${this.departamentos[evento.departamento] || "#6366f1"}"></div>
                <div style="flex: 1;">
                    <div class="evento-titulo">${this.escapeHtml(evento.titulo)}</div>
                    <div class="evento-detalhes">
                        <span>🕒 ${this.escapeHtml(evento.hora)}</span>
                        <span>• ${this.escapeHtml(evento.duracao || "-")}</span>
                        <span>📍 ${this.escapeHtml(evento.local || "-")}</span>
                    </div>
                    ${evento.descricao ? `<div style="color: var(--text-muted); margin-top: 8px; font-size: 0.9rem;">${this.escapeHtml(evento.descricao)}</div>` : ""}
                    <div style="margin-top: 14px;">
                        <button class="btn-secundario btn-excluir" data-id="${this.escapeHtml(evento.id)}" type="button">🗑️ Excluir</button>
                    </div>
                </div>
            </div>
        `).join("");

        this.modalBodyViz.querySelectorAll(".btn-excluir").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                await this.deleteEvent(id);
            });
        });

        this.modalViz.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    openAddModal(dataStr, dataObj) {
        this.dataSelecionada      = dataStr;
        this.eventoDataInput.value = dataStr;
        this.modalTituloAdd.textContent = `Novo Evento — ${dataObj.toLocaleDateString("pt-BR", {
            day: "2-digit", month: "2-digit", year: "numeric"
        })}`;

        // Limpa o formulário
        this.addDepartamento.value = "";
        this.addTitulo.value       = "";
        this.addHora.value         = "";
        this.addDuracao.value      = "";
        this.addLocal.value        = "";
        this.addDescricao.value    = "";

        this.modalAdd.classList.add("active");
        document.body.style.overflow = "hidden";

        // Foca no campo título após a animação
        setTimeout(() => this.addTitulo.focus(), 100);
    }

    async createEvent(event) {
        event.preventDefault();

        const eventoData = {
            data:        this.eventoDataInput.value,
            departamento: this.addDepartamento.value.trim(),
            titulo:      this.addTitulo.value.trim(),
            hora:        this.addHora.value.trim(),
            duracao:     this.addDuracao.value.trim(),
            local:       this.addLocal.value.trim(),
            descricao:   this.addDescricao.value.trim()
        };

        // Validação básica no cliente
        if (!eventoData.departamento) {
            this.toast("⚠️ Selecione um departamento", "error");
            return;
        }

        try {
            const response = await fetch("/api/eventos", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(eventoData)
            });

            if (response.ok) {
                this.toast("✅ Evento criado com sucesso!");
                this.closeModals();
                await this.loadData();
                this.renderAll();
            } else {
                const err = await response.json().catch(() => ({}));
                this.toast(`❌ ${err.message || "Erro ao criar evento"}`, "error");
            }
        } catch (error) {
            console.error("Erro ao criar evento:", error);
            this.toast("❌ Erro de conexão", "error");
        }
    }

    async deleteEvent(id) {
        try {
            const response = await fetch(`/api/eventos/${id}`, { method: "DELETE" });
            if (response.ok) {
                this.toast("🗑️ Evento excluído com sucesso!");
                this.closeModals();
                await this.loadData();
                this.renderAll();
            } else {
                this.toast("❌ Não foi possível excluir", "error");
            }
        } catch (error) {
            console.error("Erro ao excluir evento:", error);
            this.toast("❌ Erro de conexão", "error");
        }
    }

    closeModals() {
        this.modalViz.classList.remove("active");
        this.modalAdd.classList.remove("active");
        document.body.style.overflow = "auto";
    }

    renderCounters() {
        if (Object.keys(this.contadores).length === 0) {
            this.contadoresContainer.innerHTML =
                '<div class="contador-item" style="justify-content:center;">Nenhum evento neste mês</div>';
            return;
        }

        this.contadoresContainer.innerHTML = Object.entries(this.contadores)
            .map(([dep, count]) => {
                const cor = this.departamentos[dep] || "#6366f1";
                return `
                    <div class="contador-item" title="${this.escapeHtml(dep)}">
                        <div class="contador-cor" style="background-color: ${cor};"></div>
                        <span style="color: var(--text-secondary); font-size: 0.9rem; flex:1;">${this.escapeHtml(dep.substring(0, 12))}</span>
                        <strong style="color: ${cor};">${count}</strong>
                    </div>
                `;
            })
            .join("");
    }

    updateToday() {
        const hoje = new Date();
        const dataHojeFmt = hoje.toLocaleDateString("pt-BR", {
            weekday: "short",
            day:     "numeric",
            month:   "short"
        });
        this.dataHoje.textContent    = dataHojeFmt;
        this.totalEventosEl.textContent = this.totalEventos.toLocaleString("pt-BR");
    }

    updateMonthHeader() {
        const meses = [
            "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
        ];
        this.mesAno.textContent = `${meses[this.mesAtual]} ${this.anoAtual}`;

        let totalMes = 0;
        Object.values(this.eventos).forEach(eventosDia => {
            const filtrados = this.filterEvents(eventosDia);
            totalMes += filtrados.length;
        });

        this.resumoMes.textContent = `${totalMes} evento(s) neste mês`;
    }

    renderAll() {
        this.renderCalendar();
        this.renderCounters();
        this.updateMonthHeader();
        this.updateToday();
    }

    toast(mensagem, tipo = "success") {
        const toast = document.createElement("div");
        toast.className = `toast ${tipo}`;
        toast.textContent = mensagem;
        this.toastContainer.appendChild(toast);

        // Força reflow para a animação funcionar
        void toast.offsetWidth;
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 350);
        }, 3500);
    }

    // Previne XSS ao inserir texto do usuário via innerHTML
    escapeHtml(str) {
        if (typeof str !== "string") return String(str ?? "");
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

document.addEventListener("DOMContentLoaded", () => new CalendarioMarinaDark());
