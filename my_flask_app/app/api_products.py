from flask import Blueprint, request, jsonify
from app.management import create_product, modify_product, delete_product
from app.helper import get_connection

bp = Blueprint("products_api", __name__)

@bp.get("/api/products")
def list_products():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM product")
    rows = [dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify(rows)

@bp.post("/api/products")
def add_product():
    data = request.get_json()
    if not data or not all(k in data for k in ("name", "description", "price", "quantity")):
        return jsonify({"error": "missing_fields"}), 400
    product = create_product(data["name"], data["description"], data["price"], data["quantity"])
    return jsonify(product), 201

@bp.put("/api/products/<int:pid>")
def update_product(pid):
    data = request.get_json()
    product = modify_product(pid, data.get("name"), data.get("description"),
                             data.get("price"), data.get("quantity"))
    if not product:
        return jsonify({"error": "not_found"}), 404
    return jsonify(product)

@bp.delete("/api/products/<int:pid>")
def remove_product(pid):
    deleted = delete_product(pid)
    if deleted == 0:
        return jsonify({"error": "not_found"}), 404
    return jsonify({"deleted": True})
