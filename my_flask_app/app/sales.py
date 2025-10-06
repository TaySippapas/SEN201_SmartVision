from app.storage import get_connection
from datetime import datetime

def sell_product(product_id: int, quantity_sold: int, payment_method: str = "cash", low_stock_threshold: int = 5):
    conn = get_connection()
    try:
        cur = conn.cursor()

        # Check product exists and stock is sufficient
        cur.execute(
            "SELECT product_id, name, price, quantity, total_sales FROM product WHERE product_id = ?",
            (product_id,)
        )
        prod = cur.fetchone()
        if not prod:
            return {"error": "product_not_found"}

        current_qty = int(prod["quantity"])
        price = float(prod["price"])

        if quantity_sold > current_qty:
            return {
                "error": "not_enough_stock",
                "detail": f"have {current_qty}, tried to sell {quantity_sold}"
            }

        # Compute totals
        total_amount = round(price * quantity_sold, 2)
        now_str = datetime.now().isoformat(timespec="seconds")

        # Insert into total_transaction
        cur.execute(
            """
            INSERT INTO total_transaction (total_amount, date_and_time, payment_method)
            VALUES (?, ?, ?)
            """,
            (total_amount, now_str, payment_method)
        )
        transaction_id = cur.lastrowid

        # Insert into each_transaction
        cur.execute(
            """
            INSERT INTO each_transaction (transaction_id, product_id, quantity)
            VALUES (?, ?, ?)
            """,
            (transaction_id, product_id, quantity_sold)
        )

        # Update product stock and total_sales
        cur.execute(
            """
            UPDATE product
            SET quantity = quantity - ?, total_sales = total_sales + ?
            WHERE product_id = ?
            """,
            (quantity_sold, quantity_sold, product_id)
        )

        # Check remaining stock after update
        new_stock = current_qty - quantity_sold

        conn.commit()

        response = {
            "transaction_id": transaction_id,
            "product": {
                "product_id": prod["product_id"],
                "name": prod["name"],
                "unit_price": price
            },
            "quantity_sold": quantity_sold,
            "total_amount": total_amount,
            "payment_method": payment_method,
            "timestamp": now_str
        }

        # Add low stock warning if needed
        if new_stock <= low_stock_threshold:
            response["warning"] = f"⚠️ Stock for '{prod['name']}' is low ({new_stock} left)"

        return response

    except Exception as e:
        conn.rollback()
        return {"error": "db_error", "detail": str(e)}
    finally:
        conn.close()
