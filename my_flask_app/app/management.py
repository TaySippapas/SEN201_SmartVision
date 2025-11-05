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

# Create a new product record in the database
def createProduct(name, description, price, quantity):
    """
    Insert a new product into the product table with provided details.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            'INSERT INTO product (name, description, price, quantity) '
            'VALUES (?, ?, ?, ?)',
            (name, description, price, quantity),
        )
        conn.commit()
        productId = cur.lastrowid
        return {
            'product_id': productId,
            'name': name,
            'description': description,
            'price': price,
            'quantity': quantity,
        }
    except sqlite3.IntegrityError as e:
        conn.rollback()
        raise e
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


# Update product information by ID
def modifyProduct(productId, name=None, description=None, price=None, quantity=None):
    """
    Update the fields of an existing product identified by productId.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        updates = []
        values = []

        if name is not None:
            updates.append('name = ?')
            values.append(name)
        if description is not None:
            updates.append('description = ?')
            values.append(description)
        if price is not None:
            updates.append('price = ?')
            values.append(price)
        if quantity is not None:
            updates.append('quantity = ?')
            values.append(quantity)

        if not updates:
            return None

        values.append(productId)
        sql = f"UPDATE product SET {', '.join(updates)} WHERE product_id = ?"
        cur.execute(sql, values)
        conn.commit()

        cur.execute('SELECT * FROM product WHERE product_id = ?', (productId,))
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


# Delete a product record by ID
def deleteProduct(productId):
    """
    Delete a product record identified by productId.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute('DELETE FROM product WHERE product_id = ?', (productId,))
        conn.commit()
        return cur.rowcount
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


# Retrieve all product records
def getAllProducts():
    """
    Fetch and return all products from the product table.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute('SELECT * FROM product')
        rows = [dict(row) for row in cur.fetchall()]
        return rows
    except Exception as e:
        raise e
    finally:
        conn.close()

# -----------------------------
# Blueprint
# -----------------------------
product_bp = Blueprint('products', __name__, url_prefix='/api/products')


@product_bp.route('', methods=['GET'])
def listProducts():
    """
    Endpoint to list all products in JSON format.
    """
    try:
        return jsonify(getAllProducts()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@product_bp.route('', methods=['POST'])
def addProduct():
    """
    Endpoint to add a new product with JSON payload.
    """
    data = request.get_json()
    if not data or not all(
        k in data for k in ('name', 'description', 'price', 'quantity')
    ):
        return jsonify({'error': 'Missing required fields'}), 400
    try:
        product = createProduct(
            data['name'],
            data['description'],
            float(data['price']),
            int(data['quantity']),
        )
        return jsonify(product), 201
    except sqlite3.IntegrityError as e:
        return jsonify({'error': f'Integrity error: {e}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@product_bp.route('/<int:productId>', methods=['PUT'])
def updateProduct(productId):
    """
    Endpoint to update an existing product’s information by productId.
    """
    data = request.get_json() or {}
    try:
        product = modifyProduct(
            productId,
            name=data.get('name'),
            description=data.get('description'),
            price=data.get('price'),
            quantity=data.get('quantity'),
        )
        if product is None:
            return jsonify(
                {'error': 'Product not found or no fields updated'}
            ), 404
        return jsonify(product), 200
    except sqlite3.IntegrityError as e:
        return jsonify({'error': f'Integrity error: {e}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@product_bp.route('/<int:productId>', methods=['DELETE'])
def removeProduct(productId):
    """
    Endpoint to delete a product by productId.
    """
    try:
        deleted = deleteProduct(productId)
        if deleted == 0:
            return jsonify({'error': 'Product not found'}), 404
        return jsonify({'message': 'Product deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
