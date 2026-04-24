from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from datetime import datetime
from collections import defaultdict
import sqlite3
import uuid
import os

app = Flask(__name__)
CORS(app)

# ── Banco de dados SQLite ──────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "eventos.db")

DEPARTAMENTOS = {
    "Produção":       "#FF6B6B",
    "Logística":      "#4ECDC4",
    "Administrativo": "#45B7D1",
    "RH":             "#96CEB4",
    "Comercial":      "#FFEAA7",
    "Enfermaria":     "#DDA0DD",
}

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS eventos (
            id           TEXT PRIMARY KEY,
            data         TEXT NOT NULL,
            departamento TEXT NOT NULL,
            titulo       TEXT NOT NULL,
            hora         TEXT NOT NULL,
            duracao      TEXT DEFAULT '',
            local        TEXT DEFAULT '',
            descricao    TEXT DEFAULT '',
            criado_em    TEXT DEFAULT (datetime('now'))
        )
    """)

    cur.execute("SELECT COUNT(*) FROM eventos")
    if cur.fetchone()[0] == 0:
        exemplos = [
            ("evt1", "2026-04-16", "Produção",       "Reunião Estratégia",  "09:00", "2h",    "Sala 1",       "Planejamento mensal"),
            ("evt2", "2026-04-16", "RH",              "Onboarding Novos",    "14:00", "3h",    "Auditório",    "Treinamento inicial"),
            ("evt3", "2026-04-17", "Logística",       "Auditoria Estoque",   "10:00", "4h",    "Armazém",      "Inventário completo"),
            ("evt4", "2026-04-20", "Comercial",       "Fechamento Metas",    "15:00", "1h30",  "Sala Exec.",   "Revisão trimestral"),
            ("evt5", "2026-04-20", "Enfermaria",      "Campanha Saúde",      "16:00", "2h",    "Enfermaria",   "Exames preventivos"),
            ("evt6", "2026-04-25", "Administrativo",  "Relatórios Mensais",  "08:00", "3h",    "Sala Adm.",    "Financeiro e RH"),
        ]

        cur.executemany("""
            INSERT INTO eventos (id, data, departamento, titulo, hora, duracao, local, descricao)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, exemplos)

    conn.commit()
    conn.close()

# Inicializa banco
init_db()

# ── Rotas ──────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/config")
def get_config():
    return jsonify({
        "departamentos": list(DEPARTAMENTOS.keys()),
        "data_atual": datetime.now().strftime("%Y-%m-%d"),
    })


@app.route("/api/eventos")
def get_eventos():
    mes = request.args.get("mes", datetime.now().strftime("%Y-%m"))
    departamento = request.args.get("departamento", "Todos")

    conn = get_db()
    cur = conn.cursor()

    if departamento == "Todos":
        cur.execute(
            "SELECT * FROM eventos WHERE data LIKE ? ORDER BY data, hora",
            (f"{mes}%",)
        )
    else:
        cur.execute(
            "SELECT * FROM eventos WHERE data LIKE ? AND departamento = ? ORDER BY data, hora",
            (f"{mes}%", departamento)
        )

    rows = cur.fetchall()

    eventos_filtrados = defaultdict(list)
    for row in rows:
        eventos_filtrados[row["data"]].append({
            "id": row["id"],
            "departamento": row["departamento"],
            "titulo": row["titulo"],
            "hora": row["hora"],
            "duracao": row["duracao"],
            "local": row["local"],
            "descricao": row["descricao"],
        })

    cur.execute(
        "SELECT departamento, COUNT(*) as total FROM eventos WHERE data LIKE ? GROUP BY departamento",
        (f"{mes}%",)
    )
    contadores = {row["departamento"]: row["total"] for row in cur.fetchall()}

    conn.close()

    total = sum(len(v) for v in eventos_filtrados.values())

    return jsonify({
        "eventos": dict(eventos_filtrados),
        "departamentos": DEPARTAMENTOS,
        "contadores": contadores,
        "total_eventos": total,
    })


@app.route("/api/eventos", methods=["POST"])
def criar_evento():
    data = request.get_json(silent=True) or {}

    data_str = (data.get("data") or "").strip()
    departamento = (data.get("departamento") or "").strip()
    titulo = (data.get("titulo") or "").strip()
    hora = (data.get("hora") or "").strip()

    if not data_str:
        return jsonify({"success": False, "message": "Campo 'data' obrigatório"}), 400
    if not departamento:
        return jsonify({"success": False, "message": "Campo 'departamento' obrigatório"}), 400
    if not titulo:
        return jsonify({"success": False, "message": "Campo 'titulo' obrigatório"}), 400
    if not hora:
        return jsonify({"success": False, "message": "Campo 'hora' obrigatório"}), 400
    if departamento not in DEPARTAMENTOS:
        return jsonify({"success": False, "message": "Departamento inválido"}), 400

    try:
        datetime.strptime(data_str, "%Y-%m-%d")
    except ValueError:
        return jsonify({"success": False, "message": "Formato de data inválido"}), 400

    evento_id = str(uuid.uuid4())[:8]

    conn = get_db()
    conn.execute("""
        INSERT INTO eventos (id, data, departamento, titulo, hora, duracao, local, descricao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        evento_id,
        data_str,
        departamento,
        titulo,
        hora,
        (data.get("duracao") or "").strip(),
        (data.get("local") or "").strip(),
        (data.get("descricao") or "").strip(),
    ))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "evento": {"id": evento_id, **data}}), 201


@app.route("/api/eventos/<evento_id>", methods=["DELETE"])
def excluir_evento(evento_id):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("DELETE FROM eventos WHERE id = ?", (evento_id,))
    conn.commit()

    if cur.rowcount:
        conn.close()
        return jsonify({"success": True}), 200

    conn.close()
    return jsonify({"success": False, "message": "Evento não encontrado"}), 404


# ── Entry point ────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run()
