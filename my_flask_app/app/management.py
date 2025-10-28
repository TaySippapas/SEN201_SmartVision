"""
management.py

Product CRUD logic and API endpoints as a Flask Blueprint.
"""

from flask import Blueprint, jsonify, request
import sqlite3
from app.helper import get_connection

# -----------------------------
# CRUD functions (with rollback)
# -----------------------------
def create_product(name, description, price, quantity):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO product (name, description, price, quantity) VALUES (?, ?, ?, ?)",
            (name, description, price, quantity),
        )
        conn.commit()
        product_id = cur.lastrowid
        return {
            "product_id": product_id,
            "name": name,
            "description": description,
            "price": price,
            "quantity": quantity,
        }
    except sqlite3.IntegrityError as e:
        conn.rollback()
        raise e
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def modify_product(product_id, name=None, description=None, price=None, quantity=None):
    conn = get_connection()
    cur = conn.cursor()
    try:
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
            return None

        values.append(product_id)
        sql = f"UPDATE product SET {', '.join(updates)} WHERE product_id = ?"
        cur.execute(sql, values)
        conn.commit()

        cur.execute("SELECT * FROM product WHERE product_id = ?", (product_id,))
        row = cur.fetchone()
        return dict(row) if row else None

    except sqlite3.IntegrityError as e:
        conn.rollback()
        raise e
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def delete_product(product_id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM product WHERE product_id = ?", (product_id,))
        conn.commit()
        return cur.rowcount
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def get_all_products():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM product")
        rows = [dict(row) for row in cur.fetchall()]
        return rows
    except Exception as e:
        raise e
    finally:
        conn.close()

# -----------------------------
# Blueprint
# -----------------------------
products_bp = Blueprint("products", __name__, url_prefix="/api/products")

@products_bp.route("", methods=["GET"])
def list_products():
    try:
        return jsonify(get_all_products()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@products_bp.route("", methods=["POST"])
def add_product():
    data = request.get_json()
    if not data or not all(k in data for k in ("name", "description", "price", "quantity")):
        return jsonify({"error": "Missing required fields"}), 400
    try:
        product = create_product(
            data["name"],
            data["description"],
            float(data["price"]),
            int(data["quantity"]),
        )
        return jsonify(product), 201
    except sqlite3.IntegrityError as e:
        return jsonify({"error": f"Integrity error: {e}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@products_bp.route("/<int:product_id>", methods=["PUT"])
def update_product(product_id):
    data = request.get_json() or {}
    try:
        product = modify_product(
            product_id,
            name=data.get("name"),
            description=data.get("description"),
            price=data.get("price"),
            quantity=data.get("quantity"),
        )
        if product is None:
            return jsonify({"error": "Product not found or no fields updated"}), 404
        return jsonify(product), 200
    except sqlite3.IntegrityError as e:
        return jsonify({"error": f"Integrity error: {e}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@products_bp.route("/<int:product_id>", methods=["DELETE"])
def remove_product(product_id):
    try:
        deleted = delete_product(product_id)
        if deleted == 0:
            return jsonify({"error": "Product not found"}), 404
        return jsonify({"message": "Product deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
