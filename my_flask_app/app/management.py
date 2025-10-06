from app.storage import get_connection
from datetime import datetime

def create_product(name, description, price, quantity):
    conn = get_connection()
    cur = conn.cursor()

    # Insert product; total_sales defaults to 0
    cur.execute(
        """
        INSERT INTO product (name, description, price, quantity)
        VALUES (?, ?, ?, ?)
        """,
        (name, description, price, quantity)
    )

    conn.commit()
    product_id = cur.lastrowid
    cur.execute("SELECT * FROM product WHERE product_id = ?", (product_id,))
    row = cur.fetchone()
    conn.close()
    return dict(row)

def modify_product(product_id, name=None, description=None, price=None, quantity=None):
    conn = get_connection()
    cur = conn.cursor()

    # Only update fields provided (ignore None)
    fields = []
    values = []

    if name is not None:
        fields.append("name = ?")
        values.append(name)
    if description is not None:
        fields.append("description = ?")
        values.append(description)
    if price is not None:
        fields.append("price = ?")
        values.append(price)
    if quantity is not None:
        fields.append("quantity = ?")
        values.append(quantity)

    if not fields:
        conn.close()
        return None  # Nothing to update

    values.append(product_id)
    sql = f"UPDATE product SET {', '.join(fields)} WHERE product_id = ?"
    cur.execute(sql, values)
    conn.commit()

    # Fetch updated row
    cur.execute("SELECT * FROM product WHERE product_id = ?", (product_id,))
    row = cur.fetchone()
    conn.close()

    return dict(row) if row else None

def delete_product(product_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM product WHERE product_id = ?", (product_id,))
    conn.commit()
    conn.close()
    return cur.rowcount
