"""
management.py

Product CRUD logic and API endpoints as a Flask Blueprint.
"""

from flask import Blueprint, jsonify, request
import sqlite3

# -----------------------------
# DB helper
# -----------------------------
DB_FILE = "database/database.db"

def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

# -----------------------------
# CRUD functions
# -----------------------------
def create_product(name, description, price, quantity):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO product (name, description, price, quantity) VALUES (?, ?, ?, ?)",
        (name, description, price, quantity),
    )
    conn.commit()
    product_id = cur.lastrowid
    conn.close()
    return {"product_id": product_id, "name": name, "description": description, "price": price, "quantity": quantity}

def modify_product(product_id, name=None, description=None, price=None, quantity=None):
    conn = get_connection()
    cur = conn.cursor()

    updates = []
    values = []

    if name is not None:
        updates.append("name = ?")
        values.append(name)
    if description is not None:
        updates.append("description = ?")
        values.append(description)
    if price is not None:
        updates.append("price = ?")
        values.append(price)
    if quantity is not None:
        updates.append("quantity = ?")
        values.append(quantity)

    if not updates:
        conn.close()
        return None

    values.append(product_id)
    sql = f"UPDATE product SET {', '.join(updates)} WHERE product_id = ?"
    cur.execute(sql, values)
    conn.commit()
    cur.execute("SELECT * FROM product WHERE product_id = ?", (product_id,))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None

def delete_product(product_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM product WHERE product_id = ?", (product_id,))
    conn.commit()
    deleted = cur.rowcount
    conn.close()
    return deleted

def get_all_products():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM product")
    rows = [dict(row) for row in cur.fetchall()]
    conn.close()
    return rows

# -----------------------------
# Blueprint
# -----------------------------
products_bp = Blueprint("products", __name__, url_prefix="/api/products")

@products_bp.route("", methods=["GET"])
def list_products():
    return jsonify(get_all_products()), 200

@products_bp.route("", methods=["POST"])
def add_product():
    data = request.get_json()
    if not data or not all(k in data for k in ("name", "description", "price", "quantity")):
        return jsonify({"error": "Missing required fields"}), 400
    product = create_product(
        data["name"], data["description"], float(data["price"]), int(data["quantity"])
    )
    return jsonify(product), 201

@products_bp.route("/<int:product_id>", methods=["PUT"])
def update_product(product_id):
    data = request.get_json() or {}
    product = modify_product(
        product_id,
        name=data.get("name"),
        description=data.get("description"),
        price=data.get("price"),
        quantity=data.get("quantity")
    )
    if product is None:
        return jsonify({"error": "Product not found or no fields updated"}), 404
    return jsonify(product), 200

@products_bp.route("/<int:product_id>", methods=["DELETE"])
def remove_product(product_id):
    deleted = delete_product(product_id)
    if deleted == 0:
        return jsonify({"error": "Product not found"}), 404
    return jsonify({"message": "Product deleted successfully"}), 200
